import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { calculateReorderSuggestion } from "@/lib/reorder-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Parallelize products fetch and 30-day grouped sales
    const [products, salesItems] = await Promise.all([
      prisma.product.findMany({
        where: { shopId: session.shopId, active: true },
        select: {
          id: true,
          name: true,
          hasExpiry: true,
          purchasePrice: true,
          minStockThreshold: true,
          category: { select: { name: true } },
          batches: {
            select: {
              currentQuantity: true,
              expiryDate: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                  leadTimeDays: true,
                },
              },
            },
            orderBy: { expiryDate: "asc" },
          },
        },
      }),
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: {
          sale: {
            shopId: session.shopId,
            createdAt: { gte: thirtyDaysAgo },
          },
        },
        _sum: {
          quantity: true,
        },
      }),
    ]);

    const salesVolumeMap: Record<string, number> = {};
    for (const item of salesItems) {
      salesVolumeMap[item.productId] = item._sum.quantity || 0;
    }

    const now = new Date();
    const recommendations = [];

    for (const p of products) {
      const currentStock = p.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      const totalSold30d = salesVolumeMap[p.id] || 0;

      const latestBatchWithSupplier = p.batches.find((b) => b.supplier);
      const supplier = latestBatchWithSupplier?.supplier;

      let minExpiryDays: number | null = null;
      const expiringBatch = p.batches.find((b) => b.currentQuantity > 0 && b.expiryDate);
      if (expiringBatch && expiringBatch.expiryDate) {
        const diff = new Date(expiringBatch.expiryDate).getTime() - now.getTime();
        minExpiryDays = Math.round(diff / (1000 * 60 * 60 * 24));
      }

      const rec = calculateReorderSuggestion({
        productId: p.id,
        productName: p.name,
        category: p.category?.name || "General",
        currentStock,
        minStockThreshold: p.minStockThreshold,
        totalSoldLast30Days: totalSold30d,
        daysAnalyzed: 30,
        supplierLeadTimeDays: supplier?.leadTimeDays || 3,
        supplierName: supplier?.name || "Direct Wholesale",
        supplierId: supplier?.id || null,
        purchasePrice: p.purchasePrice,
        hasExpiry: p.hasExpiry,
        minExpiryDaysRemaining: minExpiryDays,
      });

      recommendations.push(rec);
    }

    const urgencyWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, NORMAL: 1 };
    recommendations.sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]);

    return NextResponse.json(
      { recommendations },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (error: any) {
    console.error("Reorder GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { supplierId, items, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items selected for purchase order" }, { status: 400 });
    }

    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    let totalCost = 0;

    const po = await prisma.$transaction(async (tx) => {
      const createdPO = await tx.purchaseOrder.create({
        data: {
          shopId: session.shopId!,
          supplierId: supplierId || null,
          poNumber,
          status: "DRAFT",
          totalEstimatedCost: 0,
          notes: notes || "Auto-generated from Smart Reorder Engine",
        },
      });

      for (const item of items) {
        const itemTotal = (item.suggestedQuantity || 1) * (item.unitCost || 0);
        totalCost += itemTotal;

        await tx.purchaseOrderItem.create({
          data: {
            poId: createdPO.id,
            productId: item.productId,
            quantity: item.suggestedQuantity || 1,
            estimatedUnitCost: item.unitCost || 0,
            totalCost: itemTotal,
          },
        });
      }

      await tx.purchaseOrder.update({
        where: { id: createdPO.id },
        data: { totalEstimatedCost: totalCost },
      });

      return createdPO;
    });

    return NextResponse.json({
      success: true,
      poNumber: po.poNumber,
      totalEstimatedCost: totalCost,
    });
  } catch (error: any) {
    console.error("Purchase Order Creation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
