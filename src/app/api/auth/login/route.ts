import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Valid email and password required" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        shopMembers: {
          include: {
            shop: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const primaryMembership = user.shopMembers[0];
    const shop = primaryMembership?.shop;

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: primaryMembership?.role || user.role,
      shopId: shop?.id,
      shopName: shop?.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: primaryMembership?.role || user.role,
      },
      shop: shop
        ? {
            id: shop.id,
            name: shop.name,
            ownerName: shop.ownerName,
            category: shop.category,
            currency: shop.currency,
            taxRatePercent: shop.taxRatePercent,
            invoicePrefix: shop.invoicePrefix,
          }
        : null,
    });

    response.cookies.set({
      name: "retail_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
