import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  shopName: z.string().min(2, "Shop name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  category: z.string().default("Grocery & Supermarket"),
  address: z.string().optional(),
  currency: z.string().default("₹"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { shopName, ownerName, email, phone, password, category, address, currency } = parsed.data;

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user and shop in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email: email.toLowerCase(),
          phone: phone || null,
          passwordHash,
          role: "OWNER",
        },
      });

      const shop = await tx.shop.create({
        data: {
          name: shopName,
          ownerName,
          email: email.toLowerCase(),
          phone: phone || null,
          category,
          address: address || null,
          currency: currency || "₹",
          taxRatePercent: 5.0,
          invoicePrefix: shopName.substring(0, 3).toUpperCase() + "-",
        },
      });

      await tx.shopMember.create({
        data: {
          shopId: shop.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      // Default categories
      await tx.productCategory.createMany({
        data: [
          { shopId: shop.id, name: "Grocery & Staples" },
          { shopId: shop.id, name: "Dairy & Cold Storage" },
          { shopId: shop.id, name: "Snacks & Packaged Food" },
          { shopId: shop.id, name: "Beverages" },
          { shopId: shop.id, name: "Personal Care" },
          { shopId: shop.id, name: "Household & Cleaning" },
        ],
      });

      return { user, shop };
    });

    // Create JWT token
    const token = await createSessionToken({
      userId: result.user.id,
      email: result.user.email,
      role: "OWNER",
      shopId: result.shop.id,
      shopName: result.shop.name,
    });

    const response = NextResponse.json({
      success: true,
      message: "Shop registered successfully",
      shop: result.shop,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    });

    response.cookies.set({
      name: "retail_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
