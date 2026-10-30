"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  FileBarChart2,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  Award,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
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

export default function DailyReportsPage() {
  const { t } = useLanguage();
  const { shop } = useAuth();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const cached = getCachedData(`/api/reports/daily?date=${new Date().toISOString().slice(0, 10)}`);
  const [reportData, setReportData] = useState<any>(cached);
  const [loading, setLoading] = useState(!cached);

  const fetchDailyReport = async (targetDate: string, force = false) => {
    const url = `/api/reports/daily?date=${targetDate}`;
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
    fetchDailyReport(date);
  }, [date]);

  // Dynamic Excel Export
  const handleExportExcel = async () => {
    if (!reportData) return;
    const XLSX = await import("xlsx");
    const items = reportData.productSalesList.map((p: any) => ({
      Product: p.name,
      "Quantity Sold": p.quantity,
      "Revenue (₹)": p.revenue,
      "Gross Profit (₹)": p.profit,
    }));

    const ws = XLSX.utils.json_to_sheet(items);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily_Product_Sales");
    XLSX.writeFile(wb, `Daily_Report_${date}.xlsx`);
  };

  // Dynamic PDF Export
  const handleExportPDF = async () => {
    if (!reportData) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(shop?.name || "SMART RETAIL STORE", 14, 15);
    doc.setFontSize(12);
    doc.text(`Daily Sales & Profit Report — ${date}`, 14, 23);

    doc.setFontSize(10);
    const summary = reportData.summary;
    doc.text(`Total Revenue: INR ${summary.totalRevenue.toFixed(2)}`, 14, 32);
    doc.text(`Cost of Goods Sold (COGS): INR ${summary.totalCOGS.toFixed(2)}`, 14, 38);
    doc.text(`Estimated Gross Profit: INR ${summary.totalGrossProfit.toFixed(2)}`, 14, 44);
    doc.text(`Total Invoices: ${summary.totalBills}`, 120, 32);
    doc.text(`Total Units Sold: ${summary.totalUnitsSold}`, 120, 38);
    doc.text(`Avg Invoice Value: INR ${summary.avgBillValue.toFixed(2)}`, 120, 44);

    const tableRows = reportData.productSalesList.map((p: any) => [
      p.name,
      `${p.quantity}`,
      `INR ${p.revenue.toFixed(2)}`,
      `INR ${p.profit.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 52,
      head: [["Product Name", "Units Sold", "Total Revenue", "Gross Profit"]],
      body: tableRows,
      theme: "striped",
    });

    doc.save(`Daily_Report_${date}.pdf`);
  };

  const currency = shop?.currency || "₹";
  const summary = reportData?.summary;

  return (
    <div>
      <Header
        title={t.dailyReports}
        subtitle={`Audit-Ready Transaction Summary • ${date}`}
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* Date Selector & Action Buttons */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <label className="text-xs font-bold text-slate-700">Select Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500"
            />
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

        {/* Daily Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {loading ? "..." : `${currency}${summary?.totalRevenue?.toFixed(2) ?? "0.00"}`}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {summary?.totalBills ?? 0} Invoices Generated
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Cost of Goods (COGS)</p>
            <p className="text-xl font-bold text-slate-700 mt-1">
              {loading ? "..." : `${currency}${summary?.totalCOGS?.toFixed(2) ?? "0.00"}`}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Total wholesale cost
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs ring-1 ring-emerald-500/10">
            <p className="text-xs text-slate-500 font-medium">{t.todayProfit}</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-1">
              {loading ? "..." : `${currency}${summary?.totalGrossProfit?.toFixed(2) ?? "0.00"}`}
            </p>
            <span className="text-[11px] text-emerald-600 mt-0.5 block font-semibold">
              Revenue - Purchase Cost
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Units Sold</p>
            <p className="text-xl font-bold text-blue-700 mt-1">
              {loading ? "..." : summary?.totalUnitsSold ?? 0}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Avg ticket: {currency}{summary?.avgBillValue?.toFixed(0) ?? 0}
            </span>
          </div>
        </div>

        {/* Highlights: Best Selling vs Least Selling Product */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Best Selling Item Today</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {summary?.bestSelling?.name || "None"}
              </p>
              {summary?.bestSelling && (
                <p className="text-[11px] text-emerald-700 font-semibold">
                  {summary.bestSelling.quantity} units sold (Revenue: {currency}{summary.bestSelling.revenue.toFixed(2)})
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Lowest Selling Item Among Sales</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {summary?.leastSelling?.name || "None"}
              </p>
              {summary?.leastSelling && (
                <p className="text-[11px] text-amber-700 font-semibold">
                  {summary.leastSelling.quantity} units sold (Revenue: {currency}{summary.leastSelling.revenue.toFixed(2)})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Hourly Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Hourly Revenue Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Store sales volume throughout the hours of {date}</p>

          <div className="h-56 w-full">
            {reportData?.hourlyChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.hourlyChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(val: any) => [`${currency}${val}`, "Sales"]}
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#fff", fontSize: "11px" }}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Product Sales Breakdown Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Products Sold on {date}</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3 text-center">Quantity Sold</th>
                  <th className="py-3 px-3 text-right">Revenue (₹)</th>
                  <th className="py-3 px-4 text-right">Gross Profit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.productSalesList && reportData.productSalesList.length > 0 ? (
                  reportData.productSalesList.map((p: any) => (
                    <tr key={p.productId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">{p.quantity}</td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {currency}{p.revenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {currency}{p.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No products sold on this date.
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
