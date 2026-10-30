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

    const shopId = session.shopId;
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // Run all database operations in parallel with Promise.all for maximum speed
    const [
      products,
      expiringBatches,
      expiredBatches,
      todaySales,
      topItems,
      last7DaysSales,
      recentSales,
      urgentAlerts,
    ] = await Promise.all([
      // 1. All products with active batches
      prisma.product.findMany({
        where: { shopId, active: true },
        select: {
          id: true,
          minStockThreshold: true,
          batches: {
            where: { currentQuantity: { gt: 0 } },
            select: { currentQuantity: true },
          },
        },
      }),

      // 2. Expiring soon batches (within 30 days)
      prisma.inventoryBatch.findMany({
        where: {
          shopId,
          currentQuantity: { gt: 0 },
          expiryDate: {
            lte: thirtyDaysLater,
            gte: startOfToday,
          },
        },
        select: { id: true },
      }),

      // 3. Expired batches
      prisma.inventoryBatch.findMany({
        where: {
          shopId,
          currentQuantity: { gt: 0 },
          expiryDate: {
            lt: startOfToday,
          },
        },
        select: { id: true },
      }),

      // 4. Today's sales
      prisma.sale.findMany({
        where: {
          shopId,
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
        select: {
          grandTotal: true,
          grossProfit: true,
        },
      }),

      // 5. Best selling products (grouped)
      prisma.saleItem.groupBy({
        by: ["productId", "productName"],
        where: {
          sale: {
            shopId,
            createdAt: { gte: thirtyDaysAgo },
          },
        },
        _sum: {
          quantity: true,
          totalAmount: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 5,
      }),

      // 6. Last 7 days sales in ONE single query (no loop roundtrips)
      prisma.sale.findMany({
        where: {
          shopId,
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          grandTotal: true,
          grossProfit: true,
          createdAt: true,
        },
      }),

      // 7. Recent transactions (last 5)
      prisma.sale.findMany({
        where: { shopId },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          paymentMethod: true,
          grandTotal: true,
          createdAt: true,
          items: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // 8. Urgent unread notifications
      prisma.notification.findMany({
        where: {
          shopId,
          isRead: false,
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);

    // In-memory stock calculations
    let totalAvailableStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const stock = p.batches.reduce((s, b) => s + b.currentQuantity, 0);
      totalAvailableStock += stock;
      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= p.minStockThreshold) {
        lowStockCount++;
      }
    }

    // In-memory today's revenue & gross profit
    const todaySalesRevenue = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);
    const todayGrossProfit = todaySales.reduce((sum, s) => sum + s.grossProfit, 0);

    // In-memory best selling product
    const bestSellingProduct = topItems[0]
      ? {
          name: topItems[0].productName,
          quantity: topItems[0]._sum.quantity || 0,
          revenue: topItems[0]._sum.totalAmount || 0,
        }
      : null;

    // In-memory 7-day trend aggregation (blazing fast, 0 extra DB queries)
    const last7DaysTrend: Array<{ day: string; date: string; sales: number; profit: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      let dayRev = 0;
      let dayProf = 0;

      for (const sale of last7DaysSales) {
        const saleDateStr = new Date(sale.createdAt).toISOString().slice(0, 10);
        if (saleDateStr === targetDateStr) {
          dayRev += sale.grandTotal;
          dayProf += sale.grossProfit;
        }
      }

      last7DaysTrend.push({
        day: targetDate.toLocaleDateString("en-US", { weekday: "short" }),
        date: targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sales: Math.round(dayRev * 100) / 100,
        profit: Math.round(dayProf * 100) / 100,
      });
    }

    return NextResponse.json(
      {
        cards: {
          totalProducts: products.length,
          totalAvailableStock,
          todaySalesRevenue: Math.round(todaySalesRevenue * 100) / 100,
          todayGrossProfit: Math.round(todayGrossProfit * 100) / 100,
          lowStockCount,
          expiringSoonCount: expiringBatches.length,
          expiredCount: expiredBatches.length,
          outOfStockCount,
          bestSellingProduct,
        },
        last7DaysTrend,
        top5Products: topItems.map((item) => ({
          name: item.productName,
          quantity: item._sum.quantity || 0,
          revenue: item._sum.totalAmount || 0,
        })),
        recentTransactions: recentSales.map((s) => ({
          id: s.id,
          invoiceNumber: s.invoiceNumber,
          customerName: s.customerName || "Walk-in Customer",
          itemsCount: s.items.length,
          grandTotal: s.grandTotal,
          paymentMethod: s.paymentMethod,
          time: new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          date: new Date(s.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
        })),
        urgentAlerts: urgentAlerts.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          priority: a.priority,
          link: a.link,
        })),
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
