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
    const q = searchParams.get("q")?.trim() || "";
    const categoryId = searchParams.get("categoryId");
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const whereClause: any = {
      shopId: session.shopId,
      active: true,
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (q) {
      whereClause.OR = [
        { name: { contains: q } },
        { barcode: { contains: q } },
        { sku: { contains: q } },
        { brand: { contains: q } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        batches: {
          orderBy: { expiryDate: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();

    // Map and enrich with calculated stock and batch summaries
    const enriched = products.map((p) => {
      const totalStock = p.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      const isLowStock = totalStock <= p.minStockThreshold;
      const isOutOfStock = totalStock === 0;

      // Find earliest active batch expiry
      const activeBatchesWithExpiry = p.batches
        .filter((b) => b.currentQuantity > 0 && b.expiryDate)
        .map((b) => ({
          ...b,
          expiryTime: new Date(b.expiryDate!).getTime(),
        }))
        .sort((a, b) => a.expiryTime - b.expiryTime);

      const earliestBatch = activeBatchesWithExpiry[0] || null;
      let earliestDaysRemaining: number | null = null;

      if (earliestBatch && earliestBatch.expiryDate) {
        const diff = new Date(earliestBatch.expiryDate).getTime() - now.getTime();
        earliestDaysRemaining = Math.round(diff / (1000 * 60 * 60 * 24));
      }

      return {
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        sku: p.sku,
        brand: p.brand,
        unit: p.unit,
        minStockThreshold: p.minStockThreshold,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        hasExpiry: p.hasExpiry,
        imageUrl: p.imageUrl,
        category: p.category ? { id: p.category.id, name: p.category.name } : null,
        totalStock,
        isLowStock,
        isOutOfStock,
        earliestBatchNumber: earliestBatch?.batchNumber || null,
        earliestExpiryDate: earliestBatch?.expiryDate || null,
        earliestDaysRemaining,
        batchesCount: p.batches.length,
        batches: p.batches.map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          currentQuantity: b.currentQuantity,
          quantityReceived: b.quantityReceived,
          purchasePrice: b.purchasePrice,
          sellingPrice: b.sellingPrice,
          mfgDate: b.mfgDate,
          expiryDate: b.expiryDate,
          isExpired: b.expiryDate ? new Date(b.expiryDate) < now : false,
          isWasted: b.isWasted,
          supplierId: b.supplierId,
        })),
      };
    });

    const result = lowStockOnly ? enriched.filter((p) => p.isLowStock) : enriched;

    return NextResponse.json({ products: result });
  } catch (error: any) {
    console.error("Products GET Error:", error);
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
    const {
      name,
      barcode,
      sku,
      categoryId,
      brand,
      unit,
      minStockThreshold,
      purchasePrice,
      sellingPrice,
      hasExpiry,
      imageUrl,
      initialQuantity,
      batchNumber,
      expiryDate,
      mfgDate,
      supplierId,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const pPrice = Number(purchasePrice) || 0;
    const sPrice = Number(sellingPrice) || 0;
    const minThreshold = Number(minStockThreshold) || 10;
    const initQty = Number(initialQuantity) || 0;

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          shopId: session.shopId!,
          name: name.trim(),
          barcode: barcode?.trim() || null,
          sku: sku?.trim() || null,
          categoryId: categoryId || null,
          brand: brand?.trim() || null,
          unit: unit || "pcs",
          minStockThreshold: minThreshold,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          hasExpiry: hasExpiry !== undefined ? Boolean(hasExpiry) : true,
          imageUrl: imageUrl || null,
        },
      });

      if (initQty > 0) {
        const batchNo = batchNumber?.trim() || `BAT-${Date.now().toString().slice(-6)}`;
        const expDate = hasExpiry && expiryDate ? new Date(expiryDate) : null;
        const mfg = mfgDate ? new Date(mfgDate) : null;

        const batch = await tx.inventoryBatch.create({
          data: {
            shopId: session.shopId!,
            productId: product.id,
            batchNumber: batchNo,
            quantityReceived: initQty,
            currentQuantity: initQty,
            purchasePrice: pPrice,
            sellingPrice: sPrice,
            mfgDate: mfg,
            expiryDate: expDate,
            supplierId: supplierId || null,
            qrCodeData: `BATCH:${batchNo}|P:${product.name}`,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            shopId: session.shopId!,
            productId: product.id,
            batchId: batch.id,
            type: "PURCHASE",
            quantity: initQty,
            unitCost: pPrice,
            unitPrice: sPrice,
            reason: "Initial product registration stock",
            createdByUserId: session.userId,
          },
        });
      }

      return product;
    });

    return NextResponse.json({ success: true, product: created }, { status: 201 });
  } catch (error: any) {
    console.error("Products POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
