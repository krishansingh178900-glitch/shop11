"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Layers,
  Trash2,
  DollarSign,
  BarChart2,
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

export default function MonthlyReportsPage() {

  const { t } = useLanguage();
  const { shop } = useAuth();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const initialUrl = `/api/reports/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`;
  const cached = getCachedData(initialUrl);
  const [reportData, setReportData] = useState<any>(cached);
  const [loading, setLoading] = useState(!cached);

  const fetchMonthlyReport = async (y: number, m: number, force = false) => {
    const url = `/api/reports/monthly?year=${y}&month=${m}`;
    const localCached = getCachedData(url);
    if (localCached && !reportData) {
      setReportData(localCached);
      setLoading(false);
    } else if (!localCached) {
      setLoading(true);
    }

    try {
      const json = await fetchWithCache(url, {
        force,
        onBackgroundUpdate: (fresh) => setReportData(fresh),
      });
      setReportData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyReport(year, month);
  }, [year, month]);

  // Dynamic Export to Excel
  const handleExportExcel = async () => {
    if (!reportData) return;
    const XLSX = await import("xlsx");
    const items = reportData.bestSelling.map((p: any) => ({
      "Product Name": p.name,
      "Quantity Sold": p.quantity,
      "Revenue (₹)": p.revenue,
      "Gross Profit (₹)": p.profit,
    }));

    const ws = XLSX.utils.json_to_sheet(items);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly_Top_Products");
    XLSX.writeFile(wb, `Monthly_Report_${year}_${month}.xlsx`);
  };

  // Dynamic Export to PDF
  const handleExportPDF = async () => {
    if (!reportData) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(shop?.name || "SMART RETAIL STORE", 14, 15);
    doc.setFontSize(12);
    doc.text(`Monthly Business & Inventory Valuation Report — ${reportData.monthName} ${year}`, 14, 23);

    const s = reportData.summary;
    doc.setFontSize(10);
    doc.text(`Total Monthly Revenue: INR ${s.monthlyRevenue.toFixed(2)}`, 14, 32);
    doc.text(`Cost of Goods Sold: INR ${s.monthlyCOGS.toFixed(2)}`, 14, 38);
    doc.text(`Estimated Gross Profit: INR ${s.monthlyGrossProfit.toFixed(2)}`, 14, 44);
    doc.text(`Growth vs Prev Month: ${s.growthPercent}%`, 14, 50);

    doc.text(`Total Units Sold: ${s.totalUnitsSold}`, 120, 32);
    doc.text(`Inventory Remaining Stock: ${s.totalRemainingUnits} units`, 120, 38);
    doc.text(`Current Inventory Valuation: INR ${s.inventoryValuation.toFixed(2)}`, 120, 44);
    doc.text(`Expired Stock Losses: INR ${s.expiredStockLosses.toFixed(2)}`, 120, 50);

    const rows = reportData.bestSelling.map((p: any) => [
      p.name,
      `${p.quantity}`,
      `INR ${p.revenue.toFixed(2)}`,
      `INR ${p.profit.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 58,
      head: [["Best Selling Products", "Units Sold", "Total Revenue", "Gross Profit"]],
      body: rows,
      theme: "striped",
    });

    doc.save(`Monthly_Report_${year}_${month}.pdf`);
  };

  const currency = shop?.currency || "₹";
  const s = reportData?.summary;

  return (
    <div>
      <Header
        title={t.monthlyReports}
        subtitle="Comprehensive Monthly Business Audit • Profit, Inventory Valuation & Expired Stock Loss"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* Month / Year Selector & Exports */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {[
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December",
              ].map((mName, i) => (
                <option key={i} value={i + 1}>
                  {mName}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Financial Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Monthly Revenue</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {loading ? "..." : `${currency}${s?.monthlyRevenue?.toFixed(2) ?? "0.00"}`}
            </p>
            {s && (
              <span className={`text-[11px] font-bold mt-1 inline-flex items-center gap-1 ${s.growthPercent >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {s.growthPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {s.growthPercent > 0 ? `+${s.growthPercent}%` : `${s.growthPercent}%`} vs prev month
              </span>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs ring-1 ring-emerald-500/10">
            <p className="text-xs text-slate-500 font-medium">Estimated Gross Profit</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-1">
              {loading ? "..." : `${currency}${s?.monthlyGrossProfit?.toFixed(2) ?? "0.00"}`}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              COGS: {currency}{s?.monthlyCOGS?.toFixed(0) ?? 0}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs ring-1 ring-blue-500/10">
            <p className="text-xs text-slate-500 font-medium">Inventory Valuation</p>
            <p className="text-xl font-extrabold text-blue-700 mt-1">
              {loading ? "..." : `${currency}${s?.inventoryValuation?.toFixed(2) ?? "0.00"}`}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {s?.totalRemainingUnits ?? 0} units in stock
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Expired Stock Losses</p>
            <p className="text-xl font-extrabold text-red-700 mt-1">
              {loading ? "..." : `${currency}${s?.expiredStockLosses?.toFixed(2) ?? "0.00"}`}
            </p>
            <span className="text-[11px] text-red-600 mt-1 block font-semibold">
              Disposed as wastage
            </span>
          </div>
        </div>

        {/* Daily Revenue Trend Chart in this month */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Day-by-Day Revenue in {reportData?.monthName} {year}
          </h3>
          <p className="text-xs text-slate-500 mb-4">Daily store performance distribution</p>

          <div className="h-64 w-full">
            {reportData?.dailyTrends ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.dailyTrends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(val: any) => [`${currency}${val}`, "Revenue"]}
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#fff", fontSize: "11px" }}
                  />
                  <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Best Selling Products Ranking */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Top Revenue & Volume Items for {reportData?.monthName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {reportData?.bestSelling && reportData.bestSelling.length > 0 ? (
              reportData.bestSelling.map((item: any, i: number) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 truncate">{item.name}</span>
                    <span className="font-mono bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold text-[10px]">
                      #{i + 1}
                    </span>
                  </div>
                  <p className="text-slate-500">Volume: <strong>{item.quantity} units</strong></p>
                  <p className="text-emerald-700 font-bold">
                    Revenue: {currency}{item.revenue.toFixed(2)} • Profit: {currency}{item.profit.toFixed(2)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 col-span-3 text-center">
                No products sold in this month.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
