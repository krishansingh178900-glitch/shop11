import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface StockEntryItem {
  productId?: string;
  name?: string;
  barcode?: string;
  sku?: string;
  categoryId?: string;
  brand?: string;
  unit?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  batchNumber: string;
  mfgDate?: string | null;
  expiryDate?: string | null;
  supplierId?: string | null;
  minStockThreshold?: number;
  hasExpiry?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthFromRequest(req);
    if (!session?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const items: StockEntryItem[] = Array.isArray(body.items) ? body.items : [body];

    if (!items.length) {
      return NextResponse.json({ error: "No items provided for stock entry" }, { status: 400 });
    }

    const results = await prisma.$transaction(async (tx) => {
      const receiptNumber = `RCV-${Date.now().toString().slice(-6)}`;
      const savedEntries = [];
      let totalSessionCost = 0;

      for (const item of items) {
        let product;
        const qty = Number(item.quantity) || 0;
        const pPrice = Number(item.purchasePrice) || 0;
        const sPrice = Number(item.sellingPrice) || 0;
        const minThreshold = Number(item.minStockThreshold) || 10;
        const hasExp = item.hasExpiry !== undefined ? Boolean(item.hasExpiry) : true;

        if (qty <= 0) continue;

        // If existing product ID provided
        if (item.productId) {
          product = await tx.product.findFirst({
            where: { id: item.productId, shopId: session.shopId! },
          });

          if (product) {
            // Update latest purchase & selling price if provided
            await tx.product.update({
              where: { id: product.id },
              data: {
                purchasePrice: pPrice > 0 ? pPrice : product.purchasePrice,
                sellingPrice: sPrice > 0 ? sPrice : product.sellingPrice,
              },
            });
          }
        }

        // If not found by ID, try barcode
        if (!product && item.barcode?.trim()) {
          product = await tx.product.findFirst({
            where: {
              shopId: session.shopId!,
              barcode: item.barcode.trim(),
            },
          });
        }

        // If still not found, create new product
        if (!product) {
          if (!item.name?.trim()) {
            throw new Error(`Product name is required for new item with barcode ${item.barcode || 'N/A'}`);
          }

          product = await tx.product.create({
            data: {
              shopId: session.shopId!,
              name: item.name.trim(),
              barcode: item.barcode?.trim() || null,
              sku: item.sku?.trim() || null,
              categoryId: item.categoryId || null,
              brand: item.brand?.trim() || null,
              unit: item.unit || "pcs",
              minStockThreshold: minThreshold,
              purchasePrice: pPrice,
              sellingPrice: sPrice,
              hasExpiry: hasExp,
            },
          });
        }

        // Create the new distinct batch (preserving separate batch tracking & FEFO)
        const batchNum = item.batchNumber?.trim() || `BAT-${Date.now().toString().slice(-6)}`;
        const expDate = hasExp && item.expiryDate ? new Date(item.expiryDate) : null;
        const mfg = item.mfgDate ? new Date(item.mfgDate) : null;

        const batch = await tx.inventoryBatch.create({
          data: {
            shopId: session.shopId!,
            productId: product.id,
            batchNumber: batchNum,
            quantityReceived: qty,
            currentQuantity: qty,
            purchasePrice: pPrice,
            sellingPrice: sPrice,
            mfgDate: mfg,
            expiryDate: expDate,
            supplierId: item.supplierId || null,
            qrCodeData: `BATCH:${batchNum}|EXP:${expDate ? expDate.toISOString().slice(0, 10) : 'NO_EXP'}`,
          },
        });

        // Record inventory movement
        await tx.inventoryMovement.create({
          data: {
            shopId: session.shopId!,
            productId: product.id,
            batchId: batch.id,
            type: "PURCHASE",
            quantity: qty,
            unitCost: pPrice,
            unitPrice: sPrice,
            reason: `Stock receipt ${receiptNumber}`,
            createdByUserId: session.userId,
          },
        });

        totalSessionCost += qty * pPrice;
        savedEntries.push({
          productId: product.id,
          productName: product.name,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: qty,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          totalCost: qty * pPrice,
          expectedSalesValue: qty * sPrice,
          expectedGrossProfit: (qty * sPrice) - (qty * pPrice),
        });
      }

      // Log receipt
      const receipt = await tx.stockReceipt.create({
        data: {
          shopId: session.shopId!,
          supplierId: items[0]?.supplierId || null,
          receiptNumber,
          totalCost: totalSessionCost,
          notes: `Stock arrival session with ${savedEntries.length} items`,
        },
      });

      return { receipt, entries: savedEntries, totalCost: totalSessionCost };
    });

    return NextResponse.json({
      success: true,
      message: `Stock entry completed. ${results.entries.length} items recorded.`,
      data: results,
    });
  } catch (error: any) {
    console.error("Stock Add Error:", error);
    return NextResponse.json({ error: error.message || "Failed to record stock entry" }, { status: 500 });
  }
}
