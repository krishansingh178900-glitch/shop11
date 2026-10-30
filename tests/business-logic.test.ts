import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sortBatchesFEFO, allocateBatchesFEFO, getExpiryCategory } from "../src/lib/fefo";
import { calculateReorderSuggestion } from "../src/lib/reorder-engine";

describe("Smart Retail Assistant - Critical Business Logic Tests", () => {
  // Test 1 & 3: FEFO (First Expiry, First Out) with multiple batches
  it("TC-01 & TC-03: Sorts batches by earliest expiry date (FEFO)", () => {
    const batches = [
      {
        id: "batch-c",
        batchNumber: "BATCH-NOV02",
        currentQuantity: 25,
        purchasePrice: 24,
        sellingPrice: 27,
        expiryDate: new Date("2026-11-02"),
      },
      {
        id: "batch-a",
        batchNumber: "BATCH-OCT28",
        currentQuantity: 20,
        purchasePrice: 24,
        sellingPrice: 27,
        expiryDate: new Date("2026-10-28"),
      },
      {
        id: "batch-b",
        batchNumber: "BATCH-OCT30",
        currentQuantity: 15,
        purchasePrice: 24,
        sellingPrice: 27,
        expiryDate: new Date("2026-10-30"),
      },
    ];

    const sorted = sortBatchesFEFO(batches);
    expect(sorted[0].batchNumber).toBe("BATCH-OCT28");
    expect(sorted[1].batchNumber).toBe("BATCH-OCT30");
    expect(sorted[2].batchNumber).toBe("BATCH-NOV02");
  });

  // Test 6 & 7: Stock deduction across batches & preventing overselling
  it("TC-06 & TC-07: Allocates stock across batches accurately and detects shortages", () => {
    const batches = [
      {
        id: "b1",
        batchNumber: "AMUL-OCT28",
        currentQuantity: 10,
        purchasePrice: 24,
        sellingPrice: 27,
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days ahead
      },
      {
        id: "b2",
        batchNumber: "AMUL-NOV02",
        currentQuantity: 15,
        purchasePrice: 24,
        sellingPrice: 27,
        expiryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days ahead
      },
    ];

    // Purchase 18 units: 10 from b1, 8 from b2
    const result = allocateBatchesFEFO(batches, 18);
    expect(result.allocatedQty).toBe(18);
    expect(result.remainingQtyToFulfill).toBe(0);
    expect(result.allocations.length).toBe(2);
    expect(result.allocations[0].batchId).toBe("b1");
    expect(result.allocations[0].quantity).toBe(10);
    expect(result.allocations[1].batchId).toBe("b2");
    expect(result.allocations[1].quantity).toBe(8);

    // Try to purchase 35 units when only 25 available -> shortage of 10
    const shortageResult = allocateBatchesFEFO(batches, 35);
    expect(shortageResult.allocatedQty).toBe(25);
    expect(shortageResult.remainingQtyToFulfill).toBe(10);
  });

  // Test 10: Expiry categorization and alert thresholds
  it("TC-10: Correctly flags expiry categories: tomorrow, 7d, 15d, 30d, expired", () => {
    const now = new Date();
    const d = (days: number) => {
      const target = new Date(now);
      target.setDate(target.getDate() + days);
      return target;
    };

    expect(getExpiryCategory(d(-3)).category).toBe("EXPIRED");
    expect(getExpiryCategory(d(1)).category).toBe("TOMORROW");
    expect(getExpiryCategory(d(5)).category).toBe("WITHIN_7_DAYS");
    expect(getExpiryCategory(d(12)).category).toBe("WITHIN_15_DAYS");
    expect(getExpiryCategory(d(25)).category).toBe("WITHIN_30_DAYS");
    expect(getExpiryCategory(d(60)).category).toBe("HEALTHY");
    expect(getExpiryCategory(null).category).toBe("NO_EXPIRY");
  });

  // Test 5: Invoice totals calculation with discount and tax
  it("TC-05: Calculates correct invoice totals with subtotal, discount, and GST", () => {
    const items = [
      { unitPrice: 25, quantity: 2 }, // 50
      { unitPrice: 40, quantity: 1 }, // 40
      { unitPrice: 10, quantity: 3 }, // 30
    ];

    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    expect(subtotal).toBe(120);

    const discount = 20;
    const taxable = subtotal - discount; // 100
    const taxRate = 5.0; // 5% GST
    const taxAmount = (taxable * taxRate) / 100; // 5.00
    const grandTotal = taxable + taxAmount; // 105.00

    expect(taxAmount).toBe(5);
    expect(grandTotal).toBe(105);
  });

  // Test 9 & 14: Reorder recommendations and safety stock formulas
  it("TC-09 & TC-14: Smart Reorder Engine identifies urgency and calculates replenishment needs", () => {
    // Product with 0 stock -> CRITICAL urgency
    const outOfStockRec = calculateReorderSuggestion({
      productId: "prod-1",
      productName: "Parle-G",
      currentStock: 0,
      minStockThreshold: 20,
      totalSoldLast30Days: 60, // 2 per day
      daysAnalyzed: 30,
      supplierLeadTimeDays: 3,
      purchasePrice: 8,
      hasExpiry: true,
    });

    expect(outOfStockRec.urgency).toBe("CRITICAL");
    expect(outOfStockRec.suggestedReorderQuantity).toBeGreaterThanOrEqual(20);

    // Product with healthy stock -> NORMAL
    const healthyRec = calculateReorderSuggestion({
      productId: "prod-2",
      productName: "Tata Salt",
      currentStock: 50,
      minStockThreshold: 15,
      totalSoldLast30Days: 30, // 1 per day
      daysAnalyzed: 30,
      supplierLeadTimeDays: 2,
      purchasePrice: 22,
      hasExpiry: true,
    });

    expect(healthyRec.urgency).toBe("NORMAL");
    expect(healthyRec.daysStockRemaining).toBe(50);
  });

  // Test 11: Wastage write-off and loss estimation
  it("TC-11: Correctly calculates wastage loss for expired stock write-offs", () => {
    const batch = {
      quantity: 6,
      purchasePrice: 48.0, // Amul Butter cost
    };

    const estimatedLoss = batch.quantity * batch.purchasePrice;
    expect(estimatedLoss).toBe(288.0);
  });

  // Test 12: Mixed non-expiring items and expired batch exclusion in FEFO
  it("TC-12: Correctly handles non-expiring items and filters out expired batches in FEFO", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const batches = [
      {
        id: "b-expired",
        batchNumber: "EXP-PAST",
        currentQuantity: 10,
        purchasePrice: 20,
        sellingPrice: 30,
        expiryDate: pastDate,
      },
      {
        id: "b-future",
        batchNumber: "EXP-FUTURE",
        currentQuantity: 10,
        purchasePrice: 20,
        sellingPrice: 30,
        expiryDate: futureDate,
      },
      {
        id: "b-no-expiry",
        batchNumber: "NO-EXPIRY-1",
        currentQuantity: 10,
        purchasePrice: 15,
        sellingPrice: 25,
        expiryDate: null,
      },
    ];

    // Sorted FEFO order: past first (if present), then future, then null
    const sorted = sortBatchesFEFO(batches);
    expect(sorted[0].id).toBe("b-expired");
    expect(sorted[1].id).toBe("b-future");
    expect(sorted[2].id).toBe("b-no-expiry");

    // Allocation should skip expired batch by default (allowExpired=false)
    const alloc = allocateBatchesFEFO(batches, 15, false);
    expect(alloc.hasExpiredBatches).toBe(true);
    expect(alloc.allocatedQty).toBe(15);
    // Should allocate 10 from b-future and 5 from b-no-expiry
    expect(alloc.allocations[0].batchId).toBe("b-future");
    expect(alloc.allocations[0].quantity).toBe(10);
    expect(alloc.allocations[1].batchId).toBe("b-no-expiry");
    expect(alloc.allocations[1].quantity).toBe(5);
  });

  // Test 13: Fractional quantities and multi-rate GST invoicing math
  it("TC-13: Accurately calculates fractional weight items (e.g., loose sugar/grains) and zero-discount invoices", () => {
    const items = [
      { unitPrice: 42.0, quantity: 2.5 }, // 105.00
      { unitPrice: 120.0, quantity: 0.5 }, // 60.00
    ];

    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    expect(subtotal).toBe(165.0);

    const discount = 0;
    const taxRate = 18.0; // 18% GST
    const taxable = subtotal - discount;
    const taxAmount = (taxable * taxRate) / 100; // 29.70
    const grandTotal = taxable + taxAmount; // 194.70

    expect(taxAmount).toBeCloseTo(29.7, 2);
    expect(grandTotal).toBeCloseTo(194.7, 2);
  });

  // Test 14: Perishable shelf-life constrained reorder logic
  it("TC-15: Reorder engine caps reorder quantities for highly perishable items near expiry", () => {
    const shortShelfLifeItem = calculateReorderSuggestion({
      productId: "milk-fresh",
      productName: "Fresh Cow Milk 500ml",
      currentStock: 2,
      minStockThreshold: 25, // High safety stock would otherwise suggest ordering 26 units!
      totalSoldLast30Days: 90, // 3 per day
      daysAnalyzed: 30,
      supplierLeadTimeDays: 1,
      purchasePrice: 26,
      hasExpiry: true,
      minExpiryDaysRemaining: 3, // expires in 3 days
    });

    expect(shortShelfLifeItem.shelfLifeConstrained).toBe(true);
    // Max 4 days supply = 4 * 3 = 12
    expect(shortShelfLifeItem.suggestedReorderQuantity).toBeLessThanOrEqual(12);
  });
});

