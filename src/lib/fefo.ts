export interface BatchForAllocation {
  id: string;
  batchNumber: string;
  currentQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expiryDate: Date | string | null;
  isExpired?: boolean;
}

export interface AllocationResult {
  batchId: string;
  batchNumber: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  expiryDate: string | null;
}

/**
 * Sort batches using FEFO (First Expiry First Out):
 * 1. Batches that expire sooner come first.
 * 2. Non-expiring items or items without expiry date come last.
 * 3. Already expired items are flagged or excluded unless explicitly permitted.
 */
export function sortBatchesFEFO<T extends BatchForAllocation>(batches: T[]): T[] {
  const now = new Date();
  
  return [...batches].sort((a, b) => {
    // Both have expiry
    if (a.expiryDate && b.expiryDate) {
      const dateA = new Date(a.expiryDate).getTime();
      const dateB = new Date(b.expiryDate).getTime();
      return dateA - dateB;
    }
    // Only A has expiry (A should be sold before non-expiry B)
    if (a.expiryDate && !b.expiryDate) return -1;
    // Only B has expiry
    if (!a.expiryDate && b.expiryDate) return 1;
    // Neither has expiry, sort by batch ID or FIFO
    return a.batchNumber.localeCompare(b.batchNumber);
  });
}

/**
 * Calculates FEFO allocation across multiple batches for a requested quantity.
 * If allowExpired is false (default), batches whose expiryDate < today will be skipped.
 */
export function allocateBatchesFEFO(
  batches: BatchForAllocation[],
  requestedQty: number,
  allowExpired: boolean = false
): {
  allocations: AllocationResult[];
  allocatedQty: number;
  remainingQtyToFulfill: number;
  hasExpiredBatches: boolean;
} {
  const now = new Date();
  const sorted = sortBatchesFEFO(batches);
  const allocations: AllocationResult[] = [];
  let remaining = requestedQty;
  let hasExpiredBatches = false;

  for (const batch of sorted) {
    if (remaining <= 0) break;
    if (batch.currentQuantity <= 0) continue;

    const isExpired = batch.expiryDate ? new Date(batch.expiryDate) < now : false;
    if (isExpired) {
      hasExpiredBatches = true;
      if (!allowExpired) {
        continue; // Skip expired batch in automatic FEFO
      }
    }

    const takeQty = Math.min(remaining, batch.currentQuantity);
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      quantity: takeQty,
      unitCost: batch.purchasePrice,
      unitPrice: batch.sellingPrice,
      expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toISOString() : null,
    });

    remaining -= takeQty;
  }

  return {
    allocations,
    allocatedQty: requestedQty - remaining,
    remainingQtyToFulfill: remaining,
    hasExpiredBatches,
  };
}

/**
 * Days remaining calculation with category breakdown
 */
export function getExpiryCategory(expiryDate: Date | string | null | undefined): {
  category: "EXPIRED" | "TOMORROW" | "WITHIN_7_DAYS" | "WITHIN_15_DAYS" | "WITHIN_30_DAYS" | "HEALTHY" | "NO_EXPIRY";
  daysRemaining: number | null;
  badgeColor: string;
} {
  if (!expiryDate) {
    return { category: "NO_EXPIRY", daysRemaining: null, badgeColor: "text-slate-600 bg-slate-100" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(expiryDate);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { category: "EXPIRED", daysRemaining: days, badgeColor: "text-red-700 bg-red-100 border-red-300" };
  } else if (days <= 1) {
    return { category: "TOMORROW", daysRemaining: days, badgeColor: "text-red-800 bg-red-200 border-red-400 font-bold" };
  } else if (days <= 7) {
    return { category: "WITHIN_7_DAYS", daysRemaining: days, badgeColor: "text-orange-700 bg-orange-100 border-orange-300" };
  } else if (days <= 15) {
    return { category: "WITHIN_15_DAYS", daysRemaining: days, badgeColor: "text-amber-700 bg-amber-100 border-amber-300" };
  } else if (days <= 30) {
    return { category: "WITHIN_30_DAYS", daysRemaining: days, badgeColor: "text-yellow-700 bg-yellow-100 border-yellow-300" };
  } else {
    return { category: "HEALTHY", daysRemaining: days, badgeColor: "text-emerald-700 bg-emerald-100 border-emerald-300" };
  }
}
