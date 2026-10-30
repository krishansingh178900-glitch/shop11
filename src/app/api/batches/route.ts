import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { getExpiryCategory, sortBatchesFEFO } from "@/lib/fefo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const filter = searchParams.get("filter"); // "expiring_soon", "expired", "active"

    const where: any = {
      shopId: session.shopId,
      currentQuantity: { gt: 0 },
    };

    if (productId) {
      where.productId = productId;
    }

    const batches = await prisma.inventoryBatch.findMany({
      where,
      include: {
        product: {
          include: { category: true },
        },
        supplier: true,
      },
      orderBy: { expiryDate: "asc" },
    });

    const now = new Date();
    const enriched = batches.map((b) => {
      const expInfo = getExpiryCategory(b.expiryDate);
      return {
        id: b.id,
        batchNumber: b.batchNumber,
        productId: b.productId,
        productName: b.product.name,
        category: b.product.category?.name || "Uncategorized",
        barcode: b.product.barcode,
        quantityReceived: b.quantityReceived,
        currentQuantity: b.currentQuantity,
        purchasePrice: b.purchasePrice,
        sellingPrice: b.sellingPrice,
        mfgDate: b.mfgDate,
        expiryDate: b.expiryDate,
        supplierName: b.supplier?.name || "Direct / Local",
        daysRemaining: expInfo.daysRemaining,
        expiryCategory: expInfo.category,
        badgeColor: expInfo.badgeColor,
        isExpired: expInfo.category === "EXPIRED",
        isWasted: b.isWasted,
        qrCodeData: b.qrCodeData,
      };
    });

    let filtered = enriched;
    if (filter === "expiring_soon") {
      filtered = enriched.filter(
        (b) => b.daysRemaining !== null && b.daysRemaining >= 0 && b.daysRemaining <= 30
      );
    } else if (filter === "expired") {
      filtered = enriched.filter((b) => b.isExpired);
    }

    // Sort by FEFO
    const sorted = sortBatchesFEFO(filtered);

    return NextResponse.json({ batches: sorted });
  } catch (error: any) {
    console.error("Batches GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
