"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  Package,
  Boxes,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  CalendarClock,
  AlertCircle,
  Award,
  ShoppingCart,
  PackagePlus,
  ArrowUpRight,
  RotateCcw,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import { getCachedData, fetchWithCache } from "@/lib/cached-fetch";

export default function DashboardPage() {
  const { t } = useLanguage();
  const { shop } = useAuth();
  const cached = getCachedData("/api/dashboard");
  const [data, setData] = useState<any>(cached);
  const [loading, setLoading] = useState(!cached);

  const fetchDashboardData = async (force = false) => {
    try {
      const json = await fetchWithCache("/api/dashboard", {
        force,
        onBackgroundUpdate: (fresh) => setData(fresh),
      });
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const currency = shop?.currency || "₹";

  return (
    <div>
      <Header
        title={t.dashboard}
        subtitle={`${shop?.name || "Retail Supermarket"} • Real-Time Operations & Multi-Batch Tracking`}
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Quick POS & Inventory Launcher Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 border border-slate-800 text-white p-6 shadow-xl">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Intelligent Retail Counter
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Welcome back, {shop?.ownerName || "Retailer"}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                FEFO batch tracking is active. Check expirations, monitor low stock items, or start customer billing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/dashboard/billing"
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 px-5 py-3 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/25 transition transform hover:scale-[1.02] active:scale-95"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Open POS Counter (F2)</span>
              </Link>

              <Link
                href="/dashboard/add-stock"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white px-4 py-3 rounded-2xl text-xs font-bold transition transform hover:scale-[1.02]"
              >
                <PackagePlus className="w-4 h-4 text-emerald-400" />
                <span>{t.addStock}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Urgent Alerts Banner (if any) */}
        {data?.urgentAlerts && data.urgentAlerts.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest bg-amber-200/60 px-2 py-0.5 rounded">
                  Action Required
                </span>
                <p className="text-xs text-amber-950 font-bold mt-1">
                  {data.urgentAlerts[0].message}
                </p>
              </div>
            </div>
            <Link
              href={data.urgentAlerts[0].link || "/dashboard/expiry"}
              className="text-xs font-black text-amber-900 hover:text-amber-950 underline flex items-center gap-1 self-end sm:self-center"
            >
              Resolve Alert <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* 8 Modern Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Products */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-premium flex flex-col justify-between hover:border-slate-300 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{t.totalProducts}</span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {loading ? "..." : data?.cards?.totalProducts ?? 0}
              </p>
              <span className="text-[11px] text-emerald-600 font-bold mt-0.5 inline-block">
                All categories cataloged
              </span>
            </div>
          </div>

          {/* 2. Total Units in Stock */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-premium flex flex-col justify-between hover:border-indigo-200 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{t.availableStock}</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-indigo-700 tracking-tight">
                {loading ? "..." : data?.cards?.totalAvailableStock ?? 0}
                <span className="text-xs font-bold text-slate-400 ml-1">units</span>
              </p>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 inline-block">
                Live inventory balance
              </span>
            </div>
          </div>

          {/* 3. Today's Sales */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-premium ring-1 ring-emerald-500/10 flex flex-col justify-between hover:border-emerald-300 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">{t.todaySales}</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-emerald-700 tracking-tight">
                {loading ? "..." : `${currency}${data?.cards?.todaySalesRevenue?.toFixed(2) ?? "0.00"}`}
              </p>
              <span className="text-[11px] text-emerald-700 font-bold mt-0.5 inline-flex items-center gap-1">
                ↑ Real-time counter sales
              </span>
            </div>
          </div>

          {/* 4. Today's Gross Profit */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200 shadow-premium ring-1 ring-blue-500/10 flex flex-col justify-between hover:border-blue-300 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800">{t.todayProfit}</span>
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-blue-700 tracking-tight">
                {loading ? "..." : `${currency}${data?.cards?.todayGrossProfit?.toFixed(2) ?? "0.00"}`}
              </p>
              <span className="text-[11px] text-blue-600 font-bold mt-0.5 inline-block">
                Revenue − Cost of Goods
              </span>
            </div>
          </div>

          {/* 5. Low Stock Items */}
          <Link
            href="/dashboard/low-stock"
            className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-premium flex flex-col justify-between hover:bg-amber-50/30 transition hover:-translate-y-0.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800">{t.lowStockProducts}</span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-amber-700 tracking-tight">
                {loading ? "..." : data?.cards?.lowStockCount ?? 0}
              </p>
              <span className="text-[11px] text-amber-700 font-bold mt-0.5 inline-flex items-center gap-1">
                Below safety threshold →
              </span>
            </div>
          </Link>

          {/* 6. Expiring Soon (30d) */}
          <Link
            href="/dashboard/expiry"
            className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-premium flex flex-col justify-between hover:bg-rose-50/30 transition hover:-translate-y-0.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800">{t.expiringSoon}</span>
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 transition">
                <CalendarClock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-rose-700 tracking-tight">
                {loading ? "..." : data?.cards?.expiringSoonCount ?? 0}
              </p>
              <span className="text-[11px] text-rose-700 font-bold mt-0.5 inline-flex items-center gap-1">
                Prioritize on billing (FEFO) →
              </span>
            </div>
          </Link>

          {/* 7. Out of Stock */}
          <Link
            href="/dashboard/low-stock"
            className="bg-white p-4 sm:p-5 rounded-2xl border border-red-300 shadow-premium flex flex-col justify-between hover:bg-red-50/40 transition hover:-translate-y-0.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-800">{t.outOfStock}</span>
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center group-hover:scale-110 transition">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-red-700 tracking-tight">
                {loading ? "..." : data?.cards?.outOfStockCount ?? 0}
              </p>
              <span className="text-[11px] text-red-600 font-bold mt-0.5 inline-block">
                0 Units (Parle-G) →
              </span>
            </div>
          </Link>

          {/* 8. Best Selling Product */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-200 shadow-premium flex flex-col justify-between hover:border-purple-300 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-800">{t.bestSelling}</span>
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 overflow-hidden">
              <p className="text-sm font-black text-slate-900 truncate">
                {loading ? "..." : data?.cards?.bestSellingProduct?.name || "No sales"}
              </p>
              {data?.cards?.bestSellingProduct && (
                <span className="text-[11px] text-purple-700 font-bold mt-0.5 block">
                  {data.cards.bestSellingProduct.quantity} units sold (Revenue: {currency}{data.cards.bestSellingProduct.revenue.toFixed(0)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7 Days Revenue Trend */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-premium">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">{t.salesTrend}</h3>
                <p className="text-xs text-slate-500 font-medium">Daily revenue and gross profit over last 7 days</p>
              </div>
              <span className="text-[11px] text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                ● Live Database Sync
              </span>
            </div>

            <div className="h-64 w-full">
              {data?.last7DaysTrend ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.last7DaysTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip
                      formatter={(val: any) => [`${currency}${val}`, ""]}
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff", fontSize: "11px", fontWeight: "bold" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px", fontWeight: "600" }} />
                    <Bar dataKey="sales" name="Sales (₹)" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="profit" name="Gross Profit (₹)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Loading sales trends...
                </div>
              )}
            </div>
          </div>

          {/* Top 5 Selling Products */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-premium flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Top 5 Selling Items</h3>
                <Link
                  href="/dashboard/analytics"
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  {t.viewAll}
                </Link>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-4">Highest volume items sold in store</p>

              <div className="space-y-3.5">
                {data?.top5Products && data.top5Products.length > 0 ? (
                  data.top5Products.map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{p.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-black text-slate-900">{p.quantity} units</span>
                        <p className="text-[10px] text-slate-400 font-semibold">{currency}{p.revenue.toFixed(0)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No sales recorded yet</p>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100">
              <Link
                href="/dashboard/reorder"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition"
              >
                <span>View Smart Reorder Plan</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-premium overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">{t.recentSales}</h3>
              <p className="text-xs text-slate-500 font-medium">Latest customer checkout invoices recorded in real-time</p>
            </div>
            <Link
              href="/dashboard/sales"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>{t.salesHistory}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5">Invoice No</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data?.recentTransactions && data.recentTransactions.length > 0 ? (
                  data.recentTransactions.map((tx: any) => {
                    const initials = (tx.customerName || "Walk in")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-5 font-mono font-bold text-blue-600">
                          {tx.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">
                              {initials}
                            </span>
                            <span className="font-bold text-slate-800">{tx.customerName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {tx.itemsCount} items
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              tx.paymentMethod === "UPI"
                                ? "bg-purple-100 text-purple-800"
                                : tx.paymentMethod === "CARD"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px] flex items-center gap-1.5 pt-4">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {tx.date}, {tx.time}
                        </td>
                        <td className="py-3.5 px-5 text-right font-black text-slate-900 text-sm">
                          {currency}{tx.grandTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No transactions recorded today yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
