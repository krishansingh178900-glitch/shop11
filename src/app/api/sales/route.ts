import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";
import { allocateBatchesFEFO } from "@/lib/fefo";

export const dynamic = "force-dynamic";

interface CartRequestItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  batchId?: string; // Optional: user may manually select batch, or auto FEFO
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const paymentMethod = searchParams.get("paymentMethod");

    const where: any = {
      shopId: session.shopId,
    };

    if (q) {
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customerName: { contains: q } },
        { customerPhone: { contains: q } },
      ];
    }

    if (paymentMethod && paymentMethod !== "ALL") {
      where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            allocations: {
              include: {
                batch: true,
              },
            },
          },
        },
        cashier: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ sales });
  } catch (error: any) {
    console.error("Sales GET Error:", error);
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
      items,
      customerName,
      customerPhone,
      discountAmount = 0,
      discountPercent = 0,
      taxPercent = 0,
      paymentMethod = "CASH",
      upiReference,
      notes,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Execute atomic sale and stock deduction in a database transaction
    const saleResult = await prisma.$transaction(async (tx) => {
      // 1. Fetch shop invoice prefix
      const shop = await tx.shop.findUnique({
        where: { id: session.shopId },
      });
      const prefix = shop?.invoicePrefix || "INV-";
      const invoiceNumber = `${prefix}${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      let subtotal = 0;
      let totalCost = 0;
      const preparedSaleItems = [];

      for (const item of items as CartRequestItem[]) {
        const reqQty = Number(item.quantity);
        if (reqQty <= 0) continue;

        const product = await tx.product.findFirst({
          where: { id: item.productId, shopId: session.shopId },
          include: {
            batches: {
              where: { currentQuantity: { gt: 0 } },
              orderBy: { expiryDate: "asc" },
            },
          },
        });

        if (!product) {
          throw new Error(`Product ID ${item.productId} not found`);
        }

        // Determine batch allocations: explicit batch or automatic FEFO
        let allocationsToDeduct: Array<{
          batchId: string;
          quantity: number;
          unitCost: number;
          unitPrice: number;
        }> = [];

        if (item.batchId) {
          const targetBatch = product.batches.find((b) => b.id === item.batchId);
          if (!targetBatch || targetBatch.currentQuantity < reqQty) {
            throw new Error(
              `Insufficient stock in batch ${targetBatch?.batchNumber || item.batchId} for ${product.name}. Available: ${targetBatch?.currentQuantity || 0}`
            );
          }
          allocationsToDeduct.push({
            batchId: targetBatch.id,
            quantity: reqQty,
            unitCost: targetBatch.purchasePrice,
            unitPrice: Number(item.unitPrice) || targetBatch.sellingPrice,
          });
        } else {
          // Automatic FEFO allocation
          const fefoResult = allocateBatchesFEFO(product.batches, reqQty, false);
          if (fefoResult.remainingQtyToFulfill > 0) {
            const available = product.batches.reduce((s, b) => s + b.currentQuantity, 0);
            throw new Error(
              `Insufficient non-expired stock for "${product.name}". Requested: ${reqQty}, Available: ${available}`
            );
          }
          allocationsToDeduct = fefoResult.allocations.map((a) => ({
            batchId: a.batchId,
            quantity: a.quantity,
            unitCost: a.unitCost,
            unitPrice: Number(item.unitPrice) || a.unitPrice,
          }));
        }

        // Calculate item totals & costs
        let itemTotalCost = 0;
        let itemTotalAmount = 0;

        for (const alloc of allocationsToDeduct) {
          // Deduct from batch atomically
          await tx.inventoryBatch.update({
            where: { id: alloc.batchId },
            data: {
              currentQuantity: {
                decrement: alloc.quantity,
              },
            },
          });

          // Log inventory movement
          await tx.inventoryMovement.create({
            data: {
              shopId: session.shopId!,
              productId: product.id,
              batchId: alloc.batchId,
              type: "SALE",
              quantity: -alloc.quantity,
              unitCost: alloc.unitCost,
              unitPrice: alloc.unitPrice,
              reason: `Sale ${invoiceNumber}`,
              referenceId: invoiceNumber,
              createdByUserId: session.userId,
            },
          });

          itemTotalCost += alloc.quantity * alloc.unitCost;
          itemTotalAmount += alloc.quantity * alloc.unitPrice;
        }

        subtotal += itemTotalAmount;
        totalCost += itemTotalCost;

        preparedSaleItems.push({
          productId: product.id,
          productName: product.name,
          quantity: reqQty,
          unitPrice: Number(item.unitPrice) || product.sellingPrice,
          totalAmount: itemTotalAmount,
          unitCost: itemTotalCost / reqQty,
          grossProfit: itemTotalAmount - itemTotalCost,
          allocations: allocationsToDeduct,
        });
      }

      // Calculate final pricing with discount & tax
      const numDiscount = Number(discountAmount) || 0;
      const taxable = Math.max(0, subtotal - numDiscount);
      const numTaxPercent = Number(taxPercent) || 0;
      const taxAmount = Number(((taxable * numTaxPercent) / 100).toFixed(2));
      const grandTotal = Number((taxable + taxAmount).toFixed(2));
      const grossProfit = Number((grandTotal - totalCost).toFixed(2));

      // Create Sale record
      const sale = await tx.sale.create({
        data: {
          shopId: session.shopId!,
          invoiceNumber,
          customerName: customerName?.trim() || null,
          customerPhone: customerPhone?.trim() || null,
          subtotal,
          discountAmount: numDiscount,
          discountPercent: Number(discountPercent) || 0,
          taxAmount,
          taxPercent: numTaxPercent,
          grandTotal,
          totalCost,
          grossProfit,
          paymentMethod: paymentMethod || "CASH",
          paymentStatus: "PAID",
          upiReference: upiReference?.trim() || null,
          notes: notes?.trim() || null,
          cashierId: session.userId,
        },
      });

      // Create Sale Items and Batch Allocations
      for (const pItem of preparedSaleItems) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: pItem.productId,
            productName: pItem.productName,
            quantity: pItem.quantity,
            unitPrice: pItem.unitPrice,
            totalAmount: pItem.totalAmount,
            unitCost: pItem.unitCost,
            grossProfit: pItem.grossProfit,
          },
        });

        for (const alloc of pItem.allocations) {
          await tx.saleItemBatchAllocation.create({
            data: {
              saleItemId: saleItem.id,
              batchId: alloc.batchId,
              quantity: alloc.quantity,
              unitCost: alloc.unitCost,
              unitPrice: alloc.unitPrice,
            },
          });
        }
      }

      // Record payment
      await tx.payment.create({
        data: {
          saleId: sale.id,
          amount: grandTotal,
          paymentMethod: paymentMethod || "CASH",
          reference: upiReference?.trim() || null,
        },
      });

      return { sale, items: preparedSaleItems };
    });

    return NextResponse.json({
      success: true,
      message: "Sale completed successfully",
      sale: saleResult.sale,
      items: saleResult.items,
    });
  } catch (error: any) {
    console.error("Sale Checkout Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete transaction" },
      { status: 400 }
    );
  }
}
