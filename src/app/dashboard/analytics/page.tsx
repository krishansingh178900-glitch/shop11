"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  TrendingUp,
  Award,
  Zap,
  Clock,
  AlertTriangle,
  IndianRupee,
  Layers,
  Sparkles,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { getCachedData, fetchWithCache } from "@/lib/cached-fetch";

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const { shop } = useAuth();

  const [period, setPeriod] = useState<string>("30d"); // "today", "7d", "30d", "this_month"
  const [activeTab, setActiveTab] = useState<"best" | "least" | "revenue" | "profit" | "fast" | "dead">("best");
  const cached = getCachedData(`/api/analytics?period=30d`);
  const [data, setData] = useState<any>(cached);
  const [loading, setLoading] = useState(!cached);

  const fetchAnalytics = async (selectedPeriod: string, force = false) => {
    const url = `/api/analytics?period=${selectedPeriod}`;
    const localCached = getCachedData(url);
    if (localCached && !data) {
      setData(localCached);
      setLoading(false);
    } else if (!localCached) {
      setLoading(true);
    }

    try {
      const json = await fetchWithCache(url, {
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
    fetchAnalytics(period);
  }, [period]);

  const currency = shop?.currency || "₹";

  const getActiveList = () => {
    if (!data) return [];
    switch (activeTab) {
      case "best": return data.bestSelling || [];
      case "least": return data.leastSelling || [];
      case "revenue": return data.highestRevenue || [];
      case "profit": return data.highestGrossProfit || [];
      case "fast": return data.fastMoving || [];
      case "dead": return data.deadStock || [];
      default: return [];
    }
  };

  const activeList = getActiveList();

  return (
    <div>
      <Header
        title={t.salesAnalytics}
        subtitle="Intelligent Product Velocity Engine • Best & Least Sellers, Fast Moving & Dead Stock"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* Natural Language AI Insights Card */}
        {data?.insights && data.insights.length > 0 && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 shadow-lg border border-blue-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-300" />
              <span>Smart Retail AI Insights ({period.toUpperCase()})</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {data.insights.map((insight: string, idx: number) => (
                <p key={idx} className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                  {insight}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Period Selector Tabs */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "Last 7 Days" },
              { id: "30d", label: "Last 30 Days" },
              { id: "this_month", label: "This Month" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  period === p.id
                    ? "bg-blue-600 text-white shadow"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Categories Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => setActiveTab("best")}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              activeTab === "best"
                ? "bg-blue-600 text-white border-blue-600 shadow"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Award className="w-4 h-4 mb-2" />
            <span className="text-xs font-bold">Best Selling</span>
            <span className={`text-[10px] ${activeTab === "best" ? "text-blue-100" : "text-slate-400"}`}>
              Top quantity sold
            </span>
          </button>

          <button
            onClick={() => setActiveTab("least")}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              activeTab === "least"
                ? "bg-slate-900 text-white border-slate-900 shadow"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Clock className="w-4 h-4 mb-2" />
            <span className="text-xs font-bold">Least Selling</span>
            <span className={`text-[10px] ${activeTab === "least" ? "text-slate-300" : "text-slate-400"}`}>
              Lowest sales count
            </span>
          </button>

          <button
            onClick={() => setActiveTab("revenue")}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              activeTab === "revenue"
                ? "bg-indigo-600 text-white border-indigo-600 shadow"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <IndianRupee className="w-4 h-4 mb-2" />
            <span className="text-xs font-bold">Top Revenue</span>
            <span className={`text-[10px] ${activeTab === "revenue" ? "text-indigo-100" : "text-slate-400"}`}>
              Highest ₹ turnover
            </span>
          </button>

          <button
            onClick={() => setActiveTab("profit")}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              activeTab === "profit"
                ? "bg-emerald-600 text-white border-emerald-600 shadow"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <TrendingUp className="w-4 h-4 mb-2" />
            <span className="text-xs font-bold">Top Profit</span>
            <span className={`text-[10px] ${activeTab === "profit" ? "text-emerald-100" : "text-slate-400"}`}>
              Highest gross profit
            </span>
          </button>

          <button
            onClick={() => setActiveTab("fast")}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              activeTab === "fast"
                ? "bg-purple-600 text-white border-purple-600 shadow"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Zap className="w-4 h-4 mb-2" />
            <span className="text-xs font-bold">Fast Moving</span>
            <span className={`text-[10px] ${activeTab === "fast" ? "text-purple-100" : "text-slate-400"}`}>
              High velocity ratio
            </span>
          </button>

          <button
            onClick={() => setActiveTab("dead")}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              activeTab === "dead"
                ? "bg-rose-600 text-white border-rose-600 shadow"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-4 h-4 mb-2" />
            <span className="text-xs font-bold">Dead Stock</span>
            <span className={`text-[10px] ${activeTab === "dead" ? "text-rose-100" : "text-slate-400"}`}>
              0 sales holding stock
            </span>
          </button>
        </div>

        {/* Visual Chart of Top Ranked Items */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Visual Volume / Revenue Comparison
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Showing top items for &quot;{activeTab.toUpperCase()}&quot;
          </p>

          <div className="h-64 w-full">
            {activeList.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeList.slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(val: any) => [`${val}`, "Quantity / Metric"]}
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#fff", fontSize: "11px" }}
                  />
                  <Bar dataKey="quantitySold" name="Quantity Sold" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenue (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No items in this category.
              </div>
            )}
          </div>
        </div>

        {/* Detailed Ranked Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Current Stock</th>
                  <th className="py-3 px-3 text-center">Units Sold</th>
                  <th className="py-3 px-3 text-right">Revenue (₹)</th>
                  <th className="py-3 px-4 text-right">Gross Profit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Analyzing transaction history...
                    </td>
                  </tr>
                ) : activeList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  activeList.map((p: any, idx: number) => (
                    <tr key={p.productId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {p.name}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {p.category}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold text-[11px]">
                          {p.currentStock} units
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-700">
                        {p.quantitySold}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-800">
                        {currency}{p.revenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {currency}{p.grossProfit.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
