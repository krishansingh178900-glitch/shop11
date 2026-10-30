"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ThermalReceiptModal } from "@/components/ThermalReceiptModal";
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  Printer,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  CreditCard,
  Banknote,
  QrCode,
  FileSpreadsheet,
} from "lucide-react";


import { getCachedData, fetchWithCache, invalidateCache } from "@/lib/cached-fetch";

export default function SalesHistoryPage() {
  const { t } = useLanguage();
  const { shop } = useAuth();

  const cached = getCachedData("/api/sales");
  const [sales, setSales] = useState<any[]>(cached?.sales || []);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [loading, setLoading] = useState(!cached?.sales);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Return Modal
  const [returnSale, setReturnSale] = useState<any | null>(null);
  const [returnReason, setReturnReason] = useState("Customer requested refund");
  const [restockInventory, setRestockInventory] = useState(true);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState<string | null>(null);

  const fetchSales = async (force = false) => {
    try {
      const data = await fetchWithCache("/api/sales", {
        force,
        onBackgroundUpdate: (fresh) => {
          if (fresh?.sales) setSales(fresh.sales);
        },
      });
      if (data?.sales) {
        setSales(data.sales);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      s.customerPhone?.includes(search);

    const matchesPayment =
      paymentFilter === "ALL" || s.paymentMethod === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  const openReceipt = (sale: any) => {
    setSelectedReceipt({
      invoiceNumber: sale.invoiceNumber,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      createdAt: sale.createdAt,
      paymentMethod: sale.paymentMethod,
      upiReference: sale.upiReference,
      items: sale.items.map((i: any) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalAmount: i.totalAmount,
      })),
      subtotal: sale.subtotal,
      discountAmount: sale.discountAmount,
      taxAmount: sale.taxAmount,
      grandTotal: sale.grandTotal,
      shopName: shop?.name,
      shopAddress: shop?.address,
      currency: shop?.currency,
    });
    setShowReceiptModal(true);
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSale) return;
    setReturnLoading(true);

    try {
      const res = await fetch(`/api/sales/${returnSale.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnReason,
          restockInventory,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process return");

      setReturnSuccessMsg(
        `Refund of ₹${data.data.totalRefund.toFixed(2)} processed successfully!`
      );
      setReturnSale(null);
      invalidateCache("/api");
      fetchSales(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReturnLoading(false);
    }
  };

  // Export to Excel
  // Dynamic Export to Excel (on-demand loaded for 3x faster initial page speed)
  const handleExport = async () => {
    if (filteredSales.length === 0) return;
    const XLSX = await import("xlsx");
    const rows = filteredSales.map((s) => ({
      "Invoice Number": s.invoiceNumber,
      "Customer Name": s.customerName || "Walk-in",
      "Customer Phone": s.customerPhone || "N/A",
      "Payment Method": s.paymentMethod,
      "Payment Status": s.paymentStatus,
      "Subtotal (₹)": s.subtotal,
      "Discount (₹)": s.discountAmount,
      "Tax (₹)": s.taxAmount,
      "Grand Total (₹)": s.grandTotal,
      "Gross Profit (₹)": s.grossProfit,
      "Date Time": new Date(s.createdAt).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales_Transactions");
    XLSX.writeFile(wb, `Sales_History_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const currency = shop?.currency || "₹";

  return (
    <div>
      <Header
        title={t.salesHistory}
        subtitle="Customer Transaction Log • Thermal Receipt Re-print & Return/Refund Handling"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        {returnSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{returnSuccessMsg}</span>
            </div>
            <button
              onClick={() => setReturnSuccessMsg(null)}
              className="text-emerald-900 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters & Export */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice number, customer name, or phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export to Excel</span>
          </button>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Items Sold</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Discount</th>
                  <th className="py-3 px-3 text-right">Total (₹)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading sales history...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No sales transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {sale.invoiceNumber}
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(sale.createdAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">
                          {sale.customerName || "Walk-in Customer"}
                        </span>
                        {sale.customerPhone && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {sale.customerPhone}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <span className="font-medium">{sale.items.length} items</span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            sale.paymentMethod === "UPI"
                              ? "bg-purple-100 text-purple-700"
                              : sale.paymentMethod === "CARD"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {sale.paymentMethod}
                        </span>
                        {sale.paymentStatus === "REFUNDED" && (
                          <span className="ml-1 text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold">
                            REFUNDED
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right text-slate-600">
                        {currency}{sale.subtotal.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right text-emerald-700 font-medium">
                        {sale.discountAmount > 0 ? `-${currency}${sale.discountAmount.toFixed(2)}` : "—"}
                      </td>

                      <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                        {currency}{sale.grandTotal.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openReceipt(sale)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                            title="Print / View Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {sale.paymentStatus !== "REFUNDED" && (
                            <button
                              type="button"
                              onClick={() => setReturnSale(sale)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                              title="Process Return / Refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      <ThermalReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        data={selectedReceipt}
      />

      {/* Return / Refund Modal */}
      {returnSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">Process Sale Return / Refund</h3>
              </div>
              <button
                onClick={() => setReturnSale(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessReturn} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p>Invoice: <strong className="font-mono text-blue-600">{returnSale.invoiceNumber}</strong></p>
                <p>Total Bill Value: <strong>₹{returnSale.grandTotal.toFixed(2)}</strong></p>
                <p>Customer: <strong>{returnSale.customerName || "Walk-in"}</strong></p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Return Reason
                </label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="restock"
                  checked={restockInventory}
                  onChange={(e) => setRestockInventory(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="restock" className="text-slate-700 font-semibold cursor-pointer">
                  Restock returned items back into inventory batch
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnSale(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnLoading}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow"
                >
                  {returnLoading ? "Processing..." : `Refund ₹${returnSale.grandTotal.toFixed(2)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
