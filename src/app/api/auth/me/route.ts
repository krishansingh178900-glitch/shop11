import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        shopMembers: {
          select: {
            role: true,
            shopId: true,
            shop: {
              select: {
                id: true,
                name: true,
                ownerName: true,
                category: true,
                currency: true,
                taxRatePercent: true,
                invoicePrefix: true,
                address: true,
                alertExpiryDays: true,
                alertLowStockThreshold: true,
                language: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentMember = session.shopId
      ? user.shopMembers.find((m) => m.shopId === session.shopId)
      : user.shopMembers[0];

    const shop = currentMember?.shop;

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: currentMember?.role || user.role,
        },
        shop: shop || null,
        role: currentMember?.role || user.role,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
