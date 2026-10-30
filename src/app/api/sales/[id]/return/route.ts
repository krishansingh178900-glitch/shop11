import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const saleId = params.id;
    const body = await req.json();
    const { returnReason = "Customer Return", restockInventory = true, returnItems } = body;

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, shopId: session.shopId },
      include: {
        items: {
          include: {
            allocations: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale record not found" }, { status: 404 });
    }

    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
      let totalRefund = 0;
      const createdReturn = await tx.return.create({
        data: {
          shopId: session.shopId!,
          saleId: sale.id,
          returnNumber,
          returnReason,
          totalRefundAmount: 0,
          status: "COMPLETED",
        },
      });

      // If specific items to return provided, or entire sale
      const itemsToProcess = returnItems && Array.isArray(returnItems)
        ? returnItems
        : sale.items.map((i) => ({ saleItemId: i.id, quantity: i.quantity }));

      for (const reqItem of itemsToProcess) {
        const saleItem = sale.items.find((si) => si.id === reqItem.saleItemId);
        if (!saleItem) continue;

        const qtyToReturn = Math.min(saleItem.quantity, Number(reqItem.quantity) || 0);
        if (qtyToReturn <= 0) continue;

        const itemRefundAmount = (qtyToReturn / saleItem.quantity) * saleItem.totalAmount;
        totalRefund += itemRefundAmount;

        // Find which batch it came from
        const allocation = saleItem.allocations[0];
        const batchId = allocation?.batchId || null;

        await tx.returnItem.create({
          data: {
            returnId: createdReturn.id,
            saleItemId: saleItem.id,
            productId: saleItem.productId,
            batchId,
            quantity: qtyToReturn,
            refundAmount: itemRefundAmount,
            restockInventory: Boolean(restockInventory),
          },
        });

        // Restock inventory if requested
        if (restockInventory && batchId) {
          await tx.inventoryBatch.update({
            where: { id: batchId },
            data: {
              currentQuantity: {
                increment: qtyToReturn,
              },
            },
          });

          await tx.inventoryMovement.create({
            data: {
              shopId: session.shopId!,
              productId: saleItem.productId,
              batchId,
              type: "RETURN",
              quantity: qtyToReturn,
              unitCost: allocation?.unitCost || saleItem.unitCost,
              unitPrice: allocation?.unitPrice || saleItem.unitPrice,
              reason: `Customer return ${returnNumber}`,
              referenceId: returnNumber,
              createdByUserId: session.userId,
            },
          });
        }
      }

      // Update return total
      await tx.return.update({
        where: { id: createdReturn.id },
        data: { totalRefundAmount: totalRefund },
      });

      // Update sale paymentStatus
      await tx.sale.update({
        where: { id: sale.id },
        data: { paymentStatus: "REFUNDED" },
      });

      return { returnRecord: createdReturn, totalRefund };
    });

    return NextResponse.json({
      success: true,
      message: `Return processed. Refund amount: ₹${result.totalRefund.toFixed(2)}`,
      data: result,
    });
  } catch (error: any) {
    console.error("Return error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
