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

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    let start = new Date();

    if (period === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (period === "7d") {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (period === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "custom" && startDateParam) {
      start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }

    const end = period === "custom" && endDateParam ? new Date(endDateParam) : new Date();
    if (period === "custom") end.setHours(23, 59, 59, 999);

    // Run product and sales queries concurrently
    const [products, sales] = await Promise.all([
      prisma.product.findMany({
        where: { shopId: session.shopId, active: true },
        select: {
          id: true,
          name: true,
          unit: true,
          sellingPrice: true,
          purchasePrice: true,
          category: { select: { name: true } },
          batches: {
            select: { currentQuantity: true },
          },
        },
      }),
      prisma.sale.findMany({
        where: {
          shopId: session.shopId,
          createdAt: { gte: start, lte: end },
        },
        select: {
          items: {
            select: {
              productId: true,
              quantity: true,
              totalAmount: true,
              grossProfit: true,
            },
          },
        },
      }),
    ]);

    // Calculate aggregations per product
    const statsMap: Record<
      string,
      {
        id: string;
        name: string;
        categoryName: string;
        currentStock: number;
        quantitySold: number;
        revenue: number;
        grossProfit: number;
      }
    > = {};

    for (const p of products) {
      const stock = p.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      statsMap[p.id] = {
        id: p.id,
        name: p.name,
        categoryName: p.category?.name || "General",
        currentStock: stock,
        quantitySold: 0,
        revenue: 0,
        grossProfit: 0,
      };
    }

    for (const sale of sales) {
      for (const item of sale.items) {
        if (statsMap[item.productId]) {
          statsMap[item.productId].quantitySold += item.quantity;
          statsMap[item.productId].revenue += item.totalAmount;
          statsMap[item.productId].grossProfit += item.grossProfit;
        }
      }
    }

    const allStats = Object.values(statsMap);

    const bestSelling = [...allStats].sort((a, b) => b.quantitySold - a.quantitySold);
    const leastSelling = [...allStats]
      .filter((p) => p.currentStock > 0)
      .sort((a, b) => a.quantitySold - b.quantitySold);
    const highestRevenue = [...allStats].sort((a, b) => b.revenue - a.revenue);
    const highestGrossProfit = [...allStats].sort((a, b) => b.grossProfit - a.grossProfit);

    const fastMoving = [...allStats]
      .filter((p) => p.quantitySold > 0)
      .sort((a, b) => {
        const velA = a.quantitySold / (a.currentStock + 1);
        const velB = b.quantitySold / (b.currentStock + 1);
        return velB - velA;
      });

    const deadStock = [...allStats]
      .filter((p) => p.quantitySold === 0 && p.currentStock > 0)
      .sort((a, b) => b.currentStock - a.currentStock);

    const insights: string[] = [];
    if (bestSelling[0]) {
      insights.push(
        `🏆 ${bestSelling[0].name} is your top seller in this period with ${bestSelling[0].quantitySold} units sold (Revenue: ₹${bestSelling[0].revenue.toFixed(2)}).`
      );
    }
    if (highestGrossProfit[0]) {
      insights.push(
        `💰 ${highestGrossProfit[0].name} yielded the highest profit of ₹${highestGrossProfit[0].grossProfit.toFixed(2)}.`
      );
    }
    if (deadStock.length > 0) {
      insights.push(
        `⚠️ ${deadStock.length} items have 0 sales in this period while holding inventory (e.g., ${deadStock[0].name}). Consider discount promotions.`
      );
    }

    return NextResponse.json(
      {
        period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        insights,
        bestSelling: bestSelling.slice(0, 10),
        leastSelling: leastSelling.slice(0, 10),
        highestRevenue: highestRevenue.slice(0, 10),
        highestGrossProfit: highestGrossProfit.slice(0, 10),
        fastMoving: fastMoving.slice(0, 10),
        deadStock: deadStock.slice(0, 10),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (error: any) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
