export interface ProductReorderInput {
  productId: string;
  productName: string;
  category?: string | null;
  currentStock: number;
  minStockThreshold: number;
  totalSoldLast30Days: number;
  daysAnalyzed?: number; // default 30
  supplierLeadTimeDays?: number; // default 3
  supplierName?: string | null;
  supplierId?: string | null;
  purchasePrice: number;
  hasExpiry: boolean;
  minExpiryDaysRemaining?: number | null;
}

export interface ReorderRecommendation {
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  minStockThreshold: number;
  avgDailySales: number;
  daysStockRemaining: number;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "NORMAL";
  suggestedReorderQuantity: number;
  estimatedCost: number;
  supplierId: string | null;
  supplierName: string;
  reason: string;
  leadTimeDays: number;
  shelfLifeConstrained: boolean;
}

/**
 * Transparent, rule-based retail replenishment calculation.
 */
export function calculateReorderSuggestion(input: ProductReorderInput): ReorderRecommendation {
  const days = input.daysAnalyzed && input.daysAnalyzed > 0 ? input.daysAnalyzed : 30;
  const leadTime = input.supplierLeadTimeDays && input.supplierLeadTimeDays > 0 ? input.supplierLeadTimeDays : 3;
  const avgDailySales = Number((input.totalSoldLast30Days / days).toFixed(2));
  
  // Stock coverage in days (avoid division by zero)
  let daysStockRemaining = 999;
  if (avgDailySales > 0) {
    daysStockRemaining = Number((input.currentStock / avgDailySales).toFixed(1));
  } else if (input.currentStock === 0) {
    daysStockRemaining = 0;
  }

  // Safety stock: default to minStockThreshold or 2 days of avg sales
  const safetyStock = Math.max(input.minStockThreshold, Math.ceil(avgDailySales * 2));
  
  // Expected demand during replenishment lead time: (leadTimeDays * avgDailySales)
  const leadTimeDemand = Math.ceil(leadTime * avgDailySales);

  // Suggested reorder = (Lead Time Demand + Safety Stock) - Current Available Stock
  let rawSuggestedQty = (leadTimeDemand + safetyStock) - input.currentStock;
  if (rawSuggestedQty < 0) rawSuggestedQty = 0;

  // Round up to sensible pack/unit sizing (e.g. at least 5 or nearest integer)
  let suggestedQty = Math.max(0, Math.ceil(rawSuggestedQty));

  // If currently out of stock or below threshold, ensure at least safetyStock + 5
  if (input.currentStock <= 0) {
    suggestedQty = Math.max(suggestedQty, safetyStock + Math.ceil(avgDailySales * leadTime));
    if (suggestedQty === 0) suggestedQty = Math.max(input.minStockThreshold, 10);
  }

  // Shelf-life guard: If product expires quickly (e.g. fresh milk/dairy within 3-5 days),
  // cap suggested quantity so it won't spoil before selling!
  let shelfLifeConstrained = false;
  if (input.hasExpiry && input.minExpiryDaysRemaining !== null && input.minExpiryDaysRemaining !== undefined) {
    if (input.minExpiryDaysRemaining <= 7 && avgDailySales > 0) {
      const maxSaleableBeforeExpiry = Math.ceil(avgDailySales * 4); // Max 4 days supply
      if (suggestedQty > maxSaleableBeforeExpiry) {
        suggestedQty = Math.max(5, maxSaleableBeforeExpiry);
        shelfLifeConstrained = true;
      }
    }
  }

  // Determine urgency
  let urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "NORMAL" = "NORMAL";
  let reason = "";

  if (input.currentStock === 0) {
    urgency = "CRITICAL";
    reason = `Out of stock! Customers are unable to purchase ${input.productName}. Immediate order needed.`;
  } else if (daysStockRemaining <= leadTime) {
    urgency = "CRITICAL";
    reason = `Stock will run out in ${daysStockRemaining} days, which is less than supplier lead time (${leadTime} days).`;
  } else if (input.currentStock <= input.minStockThreshold) {
    urgency = "HIGH";
    reason = `Stock (${input.currentStock}) is below minimum safety threshold (${input.minStockThreshold}).`;
  } else if (daysStockRemaining <= leadTime + 4) {
    urgency = "MEDIUM";
    reason = `Stock coverage is ${daysStockRemaining} days. Order soon to prevent stockout.`;
  } else {
    urgency = "NORMAL";
    reason = `Stock levels healthy (${daysStockRemaining} days coverage).`;
  }

  const estimatedCost = Number((suggestedQty * input.purchasePrice).toFixed(2));

  return {
    productId: input.productId,
    productName: input.productName,
    category: input.category || "General",
    currentStock: input.currentStock,
    minStockThreshold: input.minStockThreshold,
    avgDailySales,
    daysStockRemaining,
    urgency,
    suggestedReorderQuantity: suggestedQty,
    estimatedCost,
    supplierId: input.supplierId || null,
    supplierName: input.supplierName || "Default Supplier",
    reason,
    leadTimeDays: leadTime,
    shelfLifeConstrained,
  };
}
