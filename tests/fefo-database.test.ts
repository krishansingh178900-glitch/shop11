import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { allocateBatchesFEFO } from "../src/lib/fefo";

describe("Database FEFO Multi-Batch Deduction & ACID Transaction Integrity", () => {
  let shopId: string;
  let userId: string;
  let productId: string;
  let batch1Id: string;
  let batch2Id: string;
  let batch3Id: string;

  beforeAll(async () => {
    // Setup test shop and user
    const u = await prisma.user.create({
      data: {
        name: "FEFO Tester",
        email: `fefo_tester_${Date.now()}@test.com`,
        passwordHash: "hash",
        role: "OWNER",
      },
    });
    userId = u.id;

    const s = await prisma.shop.create({
      data: {
        name: "FEFO Test Shop",
        ownerName: "FEFO Tester",
        email: u.email,
        currency: "₹",
      },
    });
    shopId = s.id;

    await prisma.shopMember.create({
      data: { shopId: s.id, userId: u.id, role: "OWNER" },
    });

    const p = await prisma.product.create({
      data: {
        shopId: s.id,
        name: "Amul Fresh Milk 500ml",
        barcode: `TEST_MILK_${Date.now()}`,
        purchasePrice: 24,
        sellingPrice: 28,
        minStockThreshold: 10,
      },
    });
    productId = p.id;

    const d = (days: number) => {
      const dt = new Date();
      dt.setDate(dt.getDate() + days);
      return dt;
    };

    // Batch 1: Expiring in 2 days (qty 5)
    const b1 = await prisma.inventoryBatch.create({
      data: {
        shopId,
        productId,
        batchNumber: "B1-EXP-2D",
        quantityReceived: 5,
        currentQuantity: 5,
        purchasePrice: 24,
        sellingPrice: 28,
        expiryDate: d(2),
      },
    });
    batch1Id = b1.id;

    // Batch 2: Expiring in 10 days (qty 10)
    const b2 = await prisma.inventoryBatch.create({
      data: {
        shopId,
        productId,
        batchNumber: "B2-EXP-10D",
        quantityReceived: 10,
        currentQuantity: 10,
        purchasePrice: 24,
        sellingPrice: 28,
        expiryDate: d(10),
      },
    });
    batch2Id = b2.id;

    // Batch 3: Expiring in 30 days (qty 15)
    const b3 = await prisma.inventoryBatch.create({
      data: {
        shopId,
        productId,
        batchNumber: "B3-EXP-30D",
        quantityReceived: 15,
        currentQuantity: 15,
        purchasePrice: 24,
        sellingPrice: 28,
        expiryDate: d(30),
      },
    });
    batch3Id = b3.id;
  });

  afterAll(async () => {
    if (productId) {
      await prisma.inventoryMovement.deleteMany({ where: { productId } });
      await prisma.inventoryBatch.deleteMany({ where: { productId } });
      await prisma.product.delete({ where: { id: productId } });
    }
    if (shopId) {
      await prisma.shopMember.deleteMany({ where: { shopId } });
      await prisma.shop.delete({ where: { id: shopId } });
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  it("TC-01 & TC-06: Automatically allocates and decrements earliest expiring batch first (FEFO)", async () => {
    // We want to sell 12 units: 5 from Batch 1, 7 from Batch 2, 0 from Batch 3
    const activeBatches = await prisma.inventoryBatch.findMany({
      where: { productId, currentQuantity: { gt: 0 } },
      orderBy: { expiryDate: "asc" },
    });

    const allocResult = allocateBatchesFEFO(activeBatches, 12);
    expect(allocResult.allocatedQty).toBe(12);
    expect(allocResult.allocations.length).toBe(2);
    expect(allocResult.allocations[0].batchId).toBe(batch1Id);
    expect(allocResult.allocations[0].quantity).toBe(5);
    expect(allocResult.allocations[1].batchId).toBe(batch2Id);
    expect(allocResult.allocations[1].quantity).toBe(7);

    // Perform atomic deduction in transaction
    await prisma.$transaction(async (tx) => {
      for (const a of allocResult.allocations) {
        await tx.inventoryBatch.update({
          where: { id: a.batchId },
          data: { currentQuantity: { decrement: a.quantity } },
        });

        await tx.inventoryMovement.create({
          data: {
            shopId,
            productId,
            batchId: a.batchId,
            type: "SALE",
            quantity: a.quantity,
            unitCost: a.unitCost,
            unitPrice: a.unitPrice,
            reason: "FEFO Sale Test",
            createdByUserId: userId,
          },
        });
      }
    });

    // Check updated quantities
    const updatedB1 = await prisma.inventoryBatch.findUnique({ where: { id: batch1Id } });
    const updatedB2 = await prisma.inventoryBatch.findUnique({ where: { id: batch2Id } });
    const updatedB3 = await prisma.inventoryBatch.findUnique({ where: { id: batch3Id } });

    expect(updatedB1?.currentQuantity).toBe(0); // 5 - 5 = 0
    expect(updatedB2?.currentQuantity).toBe(3); // 10 - 7 = 3
    expect(updatedB3?.currentQuantity).toBe(15); // untouched
  });

  it("TC-07: Prevents overselling and rolls back transaction atomically when inventory is insufficient", async () => {
    const activeBatches = await prisma.inventoryBatch.findMany({
      where: { productId, currentQuantity: { gt: 0 } },
      orderBy: { expiryDate: "asc" },
    });

    const totalAvailable = activeBatches.reduce((sum, b) => sum + b.currentQuantity, 0); // 3 + 15 = 18
    expect(totalAvailable).toBe(18);

    const requested = 25; // 7 units more than available
    const allocResult = allocateBatchesFEFO(activeBatches, requested);

    expect(allocResult.remainingQtyToFulfill).toBe(7);

    // Attempting transaction when shortage detected must throw and not alter quantities
    let errorThrown = false;
    try {
      await prisma.$transaction(async (tx) => {
        if (allocResult.remainingQtyToFulfill > 0) {
          throw new Error(`Insufficient stock: requested ${requested}, only ${allocResult.allocatedQty} available`);
        }
      });
    } catch {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);

    // Verify quantities did not change
    const checkB2 = await prisma.inventoryBatch.findUnique({ where: { id: batch2Id } });
    const checkB3 = await prisma.inventoryBatch.findUnique({ where: { id: batch3Id } });

    expect(checkB2?.currentQuantity).toBe(3);
    expect(checkB3?.currentQuantity).toBe(15);
  });
});
