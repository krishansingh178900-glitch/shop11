import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { batchId, quantity, reason = "Expired Stock / Spoilage" } = body;

    if (!batchId) {
      return NextResponse.json({ error: "Batch ID is required" }, { status: 400 });
    }

    const batch = await prisma.inventoryBatch.findFirst({
      where: { id: batchId, shopId: session.shopId },
      include: { product: true },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const qtyToWriteOff = quantity !== undefined ? Number(quantity) : batch.currentQuantity;

    if (qtyToWriteOff <= 0 || qtyToWriteOff > batch.currentQuantity) {
      return NextResponse.json(
        { error: `Invalid quantity to write off. Available: ${batch.currentQuantity}` },
        { status: 400 }
      );
    }

    const estimatedLoss = Number((qtyToWriteOff * batch.purchasePrice).toFixed(2));

    const updated = await prisma.$transaction(async (tx) => {
      const remaining = batch.currentQuantity - qtyToWriteOff;
      const updatedBatch = await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          currentQuantity: remaining,
          isWasted: remaining === 0,
        },
      });

      // Record inventory movement as WASTAGE
      await tx.inventoryMovement.create({
        data: {
          shopId: session.shopId!,
          productId: batch.productId,
          batchId: batch.id,
          type: "WASTAGE",
          quantity: -qtyToWriteOff,
          unitCost: batch.purchasePrice,
          unitPrice: 0,
          reason: `${reason} (Estimated Loss: ₹${estimatedLoss})`,
          createdByUserId: session.userId,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          shopId: session.shopId!,
          userId: session.userId,
          action: "WASTAGE_WRITE_OFF",
          entityType: "INVENTORY_BATCH",
          entityId: batch.id,
          detailsJson: JSON.stringify({
            productName: batch.product.name,
            batchNumber: batch.batchNumber,
            quantityWasted: qtyToWriteOff,
            estimatedLoss,
            reason,
          }),
        },
      });

      return updatedBatch;
    });

    return NextResponse.json({
      success: true,
      message: `Recorded ${qtyToWriteOff} units as wastage. Estimated loss: ₹${estimatedLoss}`,
      batch: updated,
      estimatedLoss,
    });
  } catch (error: any) {
    console.error("Wastage Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
