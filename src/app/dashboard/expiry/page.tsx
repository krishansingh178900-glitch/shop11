"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  CalendarClock,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { getCachedData, fetchWithCache, invalidateCache } from "@/lib/cached-fetch";

export default function ExpiryPage() {
  const { t } = useLanguage();
  const { shop } = useAuth();

  const cached = getCachedData("/api/batches");
  const [batches, setBatches] = useState<any[]>(cached?.batches || []);
  const [filter, setFilter] = useState<string>("ALL"); // "ALL", "EXPIRED", "7D", "15D", "30D"
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!cached?.batches);

  // Wastage write-off modal
  const [selectedBatchForWastage, setSelectedBatchForWastage] = useState<any | null>(null);
  const [wastageQty, setWastageQty] = useState<number>(0);
  const [wastageReason, setWastageReason] = useState("Expired / Spoiled Stock");
  const [wastageLoading, setWastageLoading] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const fetchBatches = async (force = false) => {
    try {
      const data = await fetchWithCache("/api/batches", {
        force,
        onBackgroundUpdate: (fresh) => {
          if (fresh?.batches) setBatches(fresh.batches);
        },
      });
      if (data?.batches) {
        setBatches(data.batches);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  // Filter calculations
  const filtered = batches.filter((b) => {
    // Only batches with expiry
    if (!b.expiryDate) return false;

    const matchesSearch =
      b.productName.toLowerCase().includes(search.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.category?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "EXPIRED") return b.daysRemaining !== null && b.daysRemaining < 0;
    if (filter === "TOMORROW") return b.daysRemaining !== null && b.daysRemaining >= 0 && b.daysRemaining <= 1;
    if (filter === "7D") return b.daysRemaining !== null && b.daysRemaining >= 0 && b.daysRemaining <= 7;
    if (filter === "15D") return b.daysRemaining !== null && b.daysRemaining >= 0 && b.daysRemaining <= 15;
    if (filter === "30D") return b.daysRemaining !== null && b.daysRemaining >= 0 && b.daysRemaining <= 30;

    return true;
  });

  // Category counts
  const expiredCount = batches.filter((b) => b.daysRemaining !== null && b.daysRemaining < 0).length;
  const tomorrowCount = batches.filter((b) => b.daysRemaining !== null && b.daysRemaining >= 0 && b.daysRemaining <= 1).length;
  const sevenDaysCount = batches.filter((b) => b.daysRemaining !== null && b.daysRemaining >= 0 && b.daysRemaining <= 7).length;
  const thirtyDaysCount = batches.filter((b) => b.daysRemaining !== null && b.daysRemaining >= 0 && b.daysRemaining <= 30).length;

  const openWastageModal = (batch: any) => {
    setSelectedBatchForWastage(batch);
    setWastageQty(batch.currentQuantity);
    setWastageReason("Expired Stock - Disposal");
  };

  const handleRecordWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForWastage) return;
    setWastageLoading(true);

    try {
      const res = await fetch("/api/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatchForWastage.id,
          quantity: wastageQty,
          reason: wastageReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record wastage");

      setNotificationMsg(
        `Recorded ${wastageQty} units as wastage. Estimated loss: ₹${data.estimatedLoss}`
      );
      setSelectedBatchForWastage(null);
      invalidateCache("/api");
      fetchBatches(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setWastageLoading(false);
    }
  };

  const currency = shop?.currency || "₹";

  return (
    <div>
      <Header
        title={t.expiryManagement}
        subtitle="Batch-Aware Expiry Control • Days-Remaining Tiers & Wastage Loss Tracking"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {notificationMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{notificationMsg}</span>
            </div>
            <button
              onClick={() => setNotificationMsg(null)}
              className="text-emerald-900 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Expiry Category Filter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => setFilter("ALL")}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
              filter === "ALL"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className={`text-xs font-semibold ${filter === "ALL" ? "text-blue-100" : "text-slate-500"}`}>
              All Tracked
            </span>
            <p className="text-xl font-extrabold mt-1">{batches.length}</p>
          </button>

          <button
            onClick={() => setFilter("EXPIRED")}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
              filter === "EXPIRED"
                ? "bg-red-700 text-white border-red-700 shadow-md shadow-red-500/20"
                : "bg-white text-slate-800 border-red-200 hover:bg-red-50/50"
            }`}
          >
            <span className={`text-xs font-semibold ${filter === "EXPIRED" ? "text-red-100" : "text-red-600"}`}>
              {t.expired}
            </span>
            <p className="text-xl font-extrabold mt-1 text-red-700">{expiredCount}</p>
          </button>

          <button
            onClick={() => setFilter("TOMORROW")}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
              filter === "TOMORROW"
                ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20"
                : "bg-white text-slate-800 border-rose-200 hover:bg-rose-50/50"
            }`}
          >
            <span className={`text-xs font-semibold ${filter === "TOMORROW" ? "text-rose-100" : "text-rose-600"}`}>
              {t.expiringTomorrow}
            </span>
            <p className="text-xl font-extrabold mt-1 text-rose-700">{tomorrowCount}</p>
          </button>

          <button
            onClick={() => setFilter("7D")}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
              filter === "7D"
                ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20"
                : "bg-white text-slate-800 border-amber-200 hover:bg-amber-50/50"
            }`}
          >
            <span className={`text-xs font-semibold ${filter === "7D" ? "text-amber-100" : "text-amber-600"}`}>
              {t.expiring7Days}
            </span>
            <p className="text-xl font-extrabold mt-1 text-amber-700">{sevenDaysCount}</p>
          </button>

          <button
            onClick={() => setFilter("30D")}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
              filter === "30D"
                ? "bg-yellow-600 text-white border-yellow-600 shadow-md shadow-yellow-500/20"
                : "bg-white text-slate-800 border-yellow-200 hover:bg-yellow-50/50"
            }`}
          >
            <span className={`text-xs font-semibold ${filter === "30D" ? "text-yellow-100" : "text-yellow-600"}`}>
              {t.expiring30Days}
            </span>
            <p className="text-xl font-extrabold mt-1 text-yellow-700">{thirtyDaysCount}</p>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, batch number, or category..."
            className="w-full px-2 py-1 bg-transparent text-xs text-slate-800 focus:outline-none font-medium"
          />
        </div>

        {/* Batches Expiry Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3">Batch Number</th>
                  <th className="py-3 px-3 text-center">Units in Batch</th>
                  <th className="py-3 px-3">Expiry Date</th>
                  <th className="py-3 px-3">Days Remaining</th>
                  <th className="py-3 px-3">Estimated Value</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading expiry records...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No batches found matching this expiry criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((batch) => {
                    const isExpired = batch.daysRemaining !== null && batch.daysRemaining < 0;
                    const estimatedVal = batch.currentQuantity * batch.purchasePrice;

                    return (
                      <tr key={batch.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800">{batch.productName}</p>
                          <span className="text-[10px] text-slate-400">{batch.category}</span>
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-600 font-medium">
                          {batch.batchNumber}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {batch.currentQuantity} units
                          </span>
                        </td>

                        <td className="py-3 px-3 font-medium text-slate-700">
                          {batch.expiryDate
                            ? new Date(batch.expiryDate).toLocaleDateString([], {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "N/A"}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${batch.badgeColor}`}
                          >
                            <Clock className="w-3 h-3" />
                            {isExpired
                              ? `Expired (${Math.abs(batch.daysRemaining)}d ago)`
                              : batch.daysRemaining === 0
                              ? "Expires Today"
                              : `${batch.daysRemaining} days left`}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {currency}{estimatedVal.toFixed(2)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {isExpired ? (
                            <button
                              type="button"
                              onClick={() => openWastageModal(batch)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t.recordWastage}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Saleable (FEFO)
                            </span>
                          )}
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

      {/* Wastage Loss Write-Off Modal */}
      {selectedBatchForWastage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Write-off Expired Stock (Wastage)</h3>
              </div>
              <button
                onClick={() => setSelectedBatchForWastage(null)}
                className="text-white hover:text-red-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordWastage} className="p-5 space-y-4 text-xs">
              <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-red-900 space-y-1">
                <p className="font-bold text-sm">{selectedBatchForWastage.productName}</p>
                <p>Batch: <span className="font-mono">{selectedBatchForWastage.batchNumber}</span></p>
                <p>Available Expired Stock: <strong>{selectedBatchForWastage.currentQuantity} units</strong></p>
                <p>Unit Purchase Cost: <strong>₹{selectedBatchForWastage.purchasePrice}</strong></p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity to Dispose / Write-Off *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedBatchForWastage.currentQuantity}
                  value={wastageQty}
                  onChange={(e) => setWastageQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sm focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Disposal
                </label>
                <input
                  type="text"
                  value={wastageReason}
                  onChange={(e) => setWastageReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Calculated Wastage Loss:</span>
                <span className="text-sm font-bold text-red-700">
                  ₹{(wastageQty * selectedBatchForWastage.purchasePrice).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBatchForWastage(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={wastageLoading}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow"
                >
                  {wastageLoading ? "Recording..." : "Confirm Write-Off"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
