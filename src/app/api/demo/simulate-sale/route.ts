import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allocateBatchesFEFO } from "@/lib/fefo";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 1. Get primary shop
    const shop = await prisma.shop.findFirst();

    if (!shop) {
      return NextResponse.json({ error: "No store found. Please seed the database first." }, { status: 404 });
    }

    // 2. Fetch available products with active batches
    const products = await prisma.product.findMany({
      where: {
        shopId: shop.id,
        active: true,
      },
      include: {
        batches: {
          where: { currentQuantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
        },
      },
    });

    const inStockProducts = products.filter(
      (p) => p.batches.reduce((sum, b) => sum + b.currentQuantity, 0) > 0
    );

    if (inStockProducts.length === 0) {
      return NextResponse.json({ error: "No in-stock products available to simulate sale." }, { status: 400 });
    }

    // 3. Realistic Indian customer demo profiles
    const demoCustomers = [
      { name: "Priya Sharma", phone: "+91 98221 44820", paymentMethod: "UPI", upiApp: "PhonePe" },
      { name: "Vikram Malhotra", phone: "+91 98450 12903", paymentMethod: "CASH", cashGiven: 500 },
      { name: "Ananya Iyer", phone: "+91 97112 88301", paymentMethod: "UPI", upiApp: "Google Pay" },
      { name: "Rajesh Kulkarni", phone: "+91 98902 33419", paymentMethod: "CARD", cardType: "HDFC Visa" },
      { name: "Sunita Verma", phone: "+91 94220 56712", paymentMethod: "UPI", upiApp: "Paytm" },
      { name: "Amit Deshmukh", phone: "+91 98600 77124", paymentMethod: "CASH", cashGiven: 1000 },
    ];

    const customer = demoCustomers[Math.floor(Math.random() * demoCustomers.length)];

    // 4. Select 1 to 3 random items
    const itemCount = Math.min(inStockProducts.length, Math.floor(Math.random() * 2) + 1);
    const shuffled = [...inStockProducts].sort(() => 0.5 - Math.random());
    const selectedProducts = shuffled.slice(0, itemCount);

    const saleItemsToCreate: any[] = [];
    let subtotal = 0;
    let totalCost = 0;

    for (const prod of selectedProducts) {
      const availableStock = prod.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      const qty = Math.min(availableStock, Math.floor(Math.random() * 2) + 1);
      const allocationResult = allocateBatchesFEFO(prod.batches, qty);

      if (allocationResult.allocations.length === 0) continue;

      const unitPrice = prod.sellingPrice;
      const itemSubtotal = unitPrice * qty;
      const itemCost = allocationResult.allocations.reduce(
        (sum, a) => sum + a.unitCost * a.quantity,
        0
      );

      subtotal += itemSubtotal;
      totalCost += itemCost;

      saleItemsToCreate.push({
        product: prod,
        quantity: qty,
        unitPrice,
        totalAmount: itemSubtotal,
        unitCost: itemCost / qty,
        grossProfit: itemSubtotal - itemCost,
        allocations: allocationResult.allocations,
      });
    }

    if (saleItemsToCreate.length === 0) {
      return NextResponse.json({ error: "Could not allocate stock for simulation." }, { status: 400 });
    }

    const taxPercent = shop.taxRatePercent || 5.0;
    const taxAmount = Math.round(((subtotal * taxPercent) / 100) * 100) / 100;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;
    const grossProfit = Math.round((subtotal - totalCost) * 100) / 100;
    const invoiceNumber = `${shop.invoicePrefix || "SGR-"}${Date.now().toString().slice(-6)}`;

    const upiRef =
      customer.paymentMethod === "UPI"
        ? `UPI-${customer.upiApp?.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`
        : customer.paymentMethod === "CARD"
        ? `CARD-AUTH-${Math.floor(100000 + Math.random() * 900000)}`
        : "CASH-PAID";

    // 5. Execute atomic transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create Sale
      const createdSale = await tx.sale.create({
        data: {
          shopId: shop.id,
          invoiceNumber,
          customerName: customer.name,
          customerPhone: customer.phone,
          subtotal,
          discountAmount: 0,
          discountPercent: 0,
          taxAmount,
          taxPercent,
          grandTotal,
          totalCost,
          grossProfit,
          paymentMethod: customer.paymentMethod,
          paymentStatus: "PAID",
          upiReference: customer.paymentMethod === "UPI" ? upiRef : undefined,
          notes: `Simulated Demo Sale • ${customer.paymentMethod} Payment`,
        },
      });

      // Create Sale Items and deduct batch quantities
      for (const item of saleItemsToCreate) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: createdSale.id,
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
            unitCost: item.unitCost,
            grossProfit: item.grossProfit,
          },
        });

        // Batch allocations
        for (const alloc of item.allocations) {
          await tx.saleItemBatchAllocation.create({
            data: {
              saleItemId: saleItem.id,
              batchId: alloc.batchId,
              quantity: alloc.quantity,
              unitCost: alloc.unitCost,
              unitPrice: alloc.unitPrice,
            },
          });

          // Deduct from batch
          await tx.inventoryBatch.update({
            where: { id: alloc.batchId },
            data: {
              currentQuantity: { decrement: alloc.quantity },
            },
          });

          // Log movement
          await tx.inventoryMovement.create({
            data: {
              shopId: shop.id,
              productId: item.product.id,
              batchId: alloc.batchId,
              type: "SALE",
              quantity: -alloc.quantity,
              reason: `Sale ${invoiceNumber} to ${customer.name}`,
              referenceId: createdSale.id,
            },
          });
        }
      }

      // Create Payment Record
      await tx.payment.create({
        data: {
          saleId: createdSale.id,
          amount: grandTotal,
          paymentMethod: customer.paymentMethod,
          reference: upiRef,
        },
      });

      return createdSale;
    });

    return NextResponse.json({
      success: true,
      message: `Simulated Sale #${invoiceNumber} for ${customer.name}`,
      sale: {
        invoiceNumber,
        customerName: customer.name,
        paymentMethod: customer.paymentMethod,
        totalAmount: grandTotal,
        itemCount: saleItemsToCreate.length,
        items: saleItemsToCreate.map((i) => `${i.quantity}x ${i.product.name} (₹${i.totalAmount.toFixed(2)})`),
      },
    });
  } catch (error: any) {
    console.error("Simulation error:", error);
    return NextResponse.json({ error: error.message || "Failed to simulate sale" }, { status: 500 });
  }
}
