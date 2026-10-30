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
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) - 1 : now.getMonth();

    const startOfMonth = new Date(year, month, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const startOfPrevMonth = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfPrevMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Run all 4 independent queries in parallel
    const [currentSales, prevSales, batches, wastageMovements] = await Promise.all([
      // 1. Current month sales
      prisma.sale.findMany({
        where: {
          shopId: session.shopId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: {
          id: true,
          grandTotal: true,
          totalCost: true,
          grossProfit: true,
          createdAt: true,
          items: {
            select: {
              productId: true,
              productName: true,
              quantity: true,
              totalAmount: true,
              grossProfit: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),

      // 2. Previous month sales for comparison
      prisma.sale.findMany({
        where: {
          shopId: session.shopId,
          createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        },
        select: { grandTotal: true },
      }),

      // 3. Batches for stock valuation
      prisma.inventoryBatch.findMany({
        where: {
          shopId: session.shopId,
          currentQuantity: { gt: 0 },
        },
        select: {
          currentQuantity: true,
          purchasePrice: true,
        },
      }),

      // 4. Wastage movements
      prisma.inventoryMovement.findMany({
        where: {
          shopId: session.shopId,
          type: "WASTAGE",
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: {
          quantity: true,
          unitCost: true,
        },
      }),
    ]);

    const prevMonthRevenue = prevSales.reduce((acc, s) => acc + s.grandTotal, 0);

    let monthlyRevenue = 0;
    let monthlyCOGS = 0;
    let monthlyGrossProfit = 0;
    let totalUnitsSold = 0;

    const daysInMonth = endOfMonth.getDate();
    const dailyMap: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) dailyMap[d] = 0;

    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};

    for (const sale of currentSales) {
      monthlyRevenue += sale.grandTotal;
      monthlyCOGS += sale.totalCost;
      monthlyGrossProfit += sale.grossProfit;

      const day = new Date(sale.createdAt).getDate();
      dailyMap[day] = (dailyMap[day] || 0) + sale.grandTotal;

      for (const item of sale.items) {
        totalUnitsSold += item.quantity;
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue += item.totalAmount;
        productSalesMap[item.productId].profit += item.grossProfit;
      }
    }

    const rankedProducts = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);
    const bestSelling = rankedProducts.slice(0, 5);
    const leastSelling = rankedProducts.slice(-5).reverse();

    const totalRemainingUnits = batches.reduce((sum, b) => sum + b.currentQuantity, 0);
    const inventoryValuation = batches.reduce((sum, b) => sum + b.currentQuantity * b.purchasePrice, 0);

    const expiredStockLosses = wastageMovements.reduce(
      (sum, m) => sum + Math.abs(m.quantity) * (m.unitCost || 0),
      0
    );

    let growthPercent = 0;
    if (prevMonthRevenue > 0) {
      growthPercent = Math.round((((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) * 10) / 10;
    }

    const dailyTrends = Object.entries(dailyMap).map(([day, amount]) => ({
      day: `Day ${day}`,
      sales: Math.round(amount * 100) / 100,
    }));

    return NextResponse.json(
      {
        monthName: startOfMonth.toLocaleString("default", { month: "long" }),
        year,
        summary: {
          monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
          monthlyCOGS: Math.round(monthlyCOGS * 100) / 100,
          monthlyGrossProfit: Math.round(monthlyGrossProfit * 100) / 100,
          prevMonthRevenue: Math.round(prevMonthRevenue * 100) / 100,
          growthPercent,
          totalUnitsSold,
          totalBills: currentSales.length,
          totalRemainingUnits,
          inventoryValuation: Math.round(inventoryValuation * 100) / 100,
          expiredStockLosses: Math.round(expiredStockLosses * 100) / 100,
        },
        bestSelling,
        leastSelling,
        dailyTrends,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (error: any) {
    console.error("Monthly Report Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
