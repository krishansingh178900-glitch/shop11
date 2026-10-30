"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Info,
} from "lucide-react";

import { getCachedData, fetchWithCache } from "@/lib/cached-fetch";

export default function ReorderPage() {
  const { t } = useLanguage();
  const { shop } = useAuth();

  const cached = getCachedData("/api/reorder");
  const [recommendations, setRecommendations] = useState<any[]>(cached?.recommendations || []);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [adjustedQuantities, setAdjustedQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(!cached?.recommendations);
  const [poLoading, setPoLoading] = useState(false);
  const [poSuccessMessage, setPoSuccessMessage] = useState<string | null>(null);

  const fetchRecommendations = async (force = false) => {
    try {
      const data = await fetchWithCache("/api/reorder", {
        force,
        onBackgroundUpdate: (fresh) => {
          if (fresh?.recommendations) {
            setRecommendations(fresh.recommendations);
          }
        },
      });
      if (data) {
        const recs = data.recommendations || [];
        setRecommendations(recs);

        // Pre-select items that are CRITICAL or HIGH urgency
        const initSelected: Record<string, boolean> = {};
        const initQty: Record<string, number> = {};
        for (const r of recs) {
          if (r.urgency === "CRITICAL" || r.urgency === "HIGH") {
            initSelected[r.productId] = true;
          }
          initQty[r.productId] = r.suggestedReorderQuantity;
        }
        setSelectedItems(initSelected);
        setAdjustedQuantities(initQty);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const toggleSelect = (productId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const updateQty = (productId: string, val: number) => {
    setAdjustedQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, val),
    }));
  };

  const handleCreatePurchaseOrder = async () => {
    const itemsToOrder = recommendations
      .filter((r) => selectedItems[r.productId])
      .map((r) => ({
        productId: r.productId,
        quantity: adjustedQuantities[r.productId] || r.suggestedReorderQuantity,
        estimatedUnitCost: r.estimatedCost / (r.suggestedReorderQuantity || 1),
      }));

    if (itemsToOrder.length === 0) {
      alert("Please select at least one product to include in the purchase order.");
      return;
    }

    setPoLoading(true);
    try {
      const res = await fetch("/api/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToOrder,
          notes: "Generated from Smart Retail Stock & Expiry Reorder Engine",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create Purchase Order");

      setPoSuccessMessage(data.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPoLoading(false);
    }
  };

  const currency = shop?.currency || "₹";

  return (
    <div>
      <Header
        title={t.reorderSuggestions}
        subtitle="Rule-Based Replenishment Engine • Lead Time, Sales Velocity & Shelf-Life Aware"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {poSuccessMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between font-medium shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">{poSuccessMessage}</span>
            </div>
            <button
              onClick={() => setPoSuccessMessage(null)}
              className="text-emerald-900 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Algorithm Explanation Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">How Smart Reorder Calculates Quantities:</p>
            <p className="text-blue-800 leading-relaxed text-[11px]">
              Order Qty = (Demand during Supplier Lead Time + Safety Stock) − Available Current Stock.
              Perishable items (like milk) are shelf-life constrained so you never over-order and suffer spoilage.
            </p>
          </div>
        </div>

        {/* Recommendation Cards / Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Replenishment Recommendations ({recommendations.length} Products Analyzed)
              </h3>
              <p className="text-xs text-slate-500">
                Select items to include in your wholesale replenishment list
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreatePurchaseOrder}
              disabled={poLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 disabled:bg-slate-300"
            >
              <FileCheck className="w-4 h-4" />
              <span>{poLoading ? "Creating PO..." : "Generate Draft Purchase Order"}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-8 text-center">Select</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-3 text-center">Current Stock</th>
                  <th className="py-3 px-3 text-center">Avg Daily Sales</th>
                  <th className="py-3 px-3 text-center">Stock Days Left</th>
                  <th className="py-3 px-3">Urgency & Reason</th>
                  <th className="py-3 px-3">Supplier (Lead Time)</th>
                  <th className="py-3 px-4 text-center">Suggested Order Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Computing sales velocity and reorder suggestions...
                    </td>
                  </tr>
                ) : recommendations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No reorder recommendations at this time. All stock levels are sufficient!
                    </td>
                  </tr>
                ) : (
                  recommendations.map((rec) => {
                    const isSelected = Boolean(selectedItems[rec.productId]);
                    const qtyVal = adjustedQuantities[rec.productId] ?? rec.suggestedReorderQuantity;

                    return (
                      <tr
                        key={rec.productId}
                        className={`hover:bg-slate-50 transition ${
                          isSelected ? "bg-blue-50/25" : ""
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(rec.productId)}
                            className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800">{rec.productName}</p>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {rec.category}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                              rec.currentStock === 0
                                ? "bg-red-100 text-red-700"
                                : rec.currentStock <= rec.minStockThreshold
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {rec.currentStock} units
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {rec.avgDailySales} / day
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                              rec.daysStockRemaining <= rec.leadTimeDays
                                ? "bg-red-100 text-red-800"
                                : rec.daysStockRemaining <= 5
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {rec.daysStockRemaining > 90 ? "90+ days" : `${rec.daysStockRemaining} days`}
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase mb-0.5 ${
                              rec.urgency === "CRITICAL"
                                ? "bg-red-100 text-red-800"
                                : rec.urgency === "HIGH"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {rec.urgency}
                          </span>
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                            {rec.reason}
                          </p>
                          {rec.shelfLifeConstrained && (
                            <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">
                              ⚠️ Shelf-life capped to prevent spoilage
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          <p className="font-semibold text-slate-800">{rec.supplierName}</p>
                          <span className="text-[10px] text-slate-400">
                            Lead time: {rec.leadTimeDays} days
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={qtyVal}
                              onChange={(e) => updateQty(rec.productId, Number(e.target.value))}
                              className="w-16 px-2 py-1 text-center font-bold text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-[11px] text-slate-400">units</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
