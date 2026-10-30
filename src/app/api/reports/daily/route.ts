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
    const dateParam = searchParams.get("date");

    const selectedDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Parallelize sales fetch and low stock count
    const [sales, lowStockCount] = await Promise.all([
      prisma.sale.findMany({
        where: {
          shopId: session.shopId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          paymentMethod: true,
          grandTotal: true,
          discountAmount: true,
          taxAmount: true,
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
      }),
      prisma.product.count({
        where: {
          shopId: session.shopId,
          batches: {
            none: {
              currentQuantity: { gt: 10 },
            },
          },
        },
      }),
    ]);

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalCOGS = 0;
    let totalGrossProfit = 0;
    let totalUnitsSold = 0;

    const productMap: Record<
      string,
      { productId: string; name: string; quantity: number; revenue: number; profit: number }
    > = {};

    const hourlyMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = 0;

    for (const sale of sales) {
      totalRevenue += sale.grandTotal;
      totalDiscount += sale.discountAmount;
      totalTax += sale.taxAmount;
      totalCOGS += sale.totalCost;
      totalGrossProfit += sale.grossProfit;

      const hour = new Date(sale.createdAt).getHours();
      hourlyMap[hour] = (hourlyMap[hour] || 0) + sale.grandTotal;

      for (const item of sale.items) {
        totalUnitsSold += item.quantity;
        if (!productMap[item.productId]) {
          productMap[item.productId] = {
            productId: item.productId,
            name: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productMap[item.productId].quantity += item.quantity;
        productMap[item.productId].revenue += item.totalAmount;
        productMap[item.productId].profit += item.grossProfit;
      }
    }

    const productSalesList = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
    const bestSelling = productSalesList[0] || null;
    const leastSelling = productSalesList.length > 0 ? productSalesList[productSalesList.length - 1] : null;

    const hourlyChart = Object.entries(hourlyMap).map(([hour, amount]) => ({
      hour: `${hour.padStart(2, "0")}:00`,
      sales: Math.round(amount * 100) / 100,
    }));

    return NextResponse.json(
      {
        date: startOfDay.toISOString().slice(0, 10),
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalCOGS: Math.round(totalCOGS * 100) / 100,
          totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
          totalDiscounts: Math.round(totalDiscount * 100) / 100,
          totalTax: Math.round(totalTax * 100) / 100,
          totalBills: sales.length,
          totalUnitsSold,
          avgBillValue: sales.length > 0 ? Math.round((totalRevenue / sales.length) * 100) / 100 : 0,
          bestSelling,
          leastSelling,
          lowStockCount,
        },
        productSalesList,
        hourlyChart,
        recentBills: sales.map((s) => ({
          id: s.id,
          invoiceNumber: s.invoiceNumber,
          customerName: s.customerName || "Walk-in Customer",
          itemsCount: s.items.length,
          grandTotal: s.grandTotal,
          paymentMethod: s.paymentMethod,
          time: new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=2, stale-while-revalidate=10",
        },
      }
    );
  } catch (error: any) {
    console.error("Daily Report Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
