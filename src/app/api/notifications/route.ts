import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { shopId: session.shopId },
        select: {
          id: true,
          title: true,
          message: true,
          priority: true,
          type: true,
          isRead: true,
          link: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { shopId: session.shopId, isRead: false },
      }),
    ]);

    return NextResponse.json(
      { notifications, unreadCount },
      {
        headers: {
          "Cache-Control": "private, max-age=2, stale-while-revalidate=5",
        },
      }
    );
  } catch (error: any) {
    console.error("Notifications GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, markAll = false } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { shopId: session.shopId },
        data: { isRead: true },
      });
    } else if (id) {
      await prisma.notification.update({
        where: { id, shopId: session.shopId },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notifications PUT Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
