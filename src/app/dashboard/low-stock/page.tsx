"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle,
  AlertCircle,
  PackagePlus,
  RotateCcw,
  Search,
  Truck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

import { getCachedData, fetchWithCache } from "@/lib/cached-fetch";

export default function LowStockPage() {
  const { t } = useLanguage();
  const { shop } = useAuth();

  const cached = getCachedData("/api/products");
  const [products, setProducts] = useState<any[]>(cached?.products || []);
  const [filter, setFilter] = useState<"ALL" | "OUT" | "LOW">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!cached?.products);

  const fetchProducts = async (force = false) => {
    try {
      const data = await fetchWithCache("/api/products", {
        force,
        onBackgroundUpdate: (fresh) => {
          if (fresh?.products) setProducts(fresh.products);
        },
      });
      if (data?.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const lowStockItems = products.filter((p) => p.isLowStock || p.isOutOfStock);

  const filtered = lowStockItems.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.name?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "OUT") return p.isOutOfStock;
    if (filter === "LOW") return p.isLowStock && !p.isOutOfStock;
    return true;
  });

  const outOfStockCount = lowStockItems.filter((p) => p.isOutOfStock).length;
  const lowCount = lowStockItems.filter((p) => p.isLowStock && !p.isOutOfStock).length;

  const currency = shop?.currency || "₹";

  return (
    <div>
      <Header
        title={t.lowStock}
        subtitle="Automatic Low-Stock & Out-of-Stock Detection • Safety Threshold Warnings"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">All Replenishment Alerts</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                {lowStockItems.length}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t.outOfStock}</p>
              <p className="text-xl font-extrabold text-red-700 mt-0.5">
                {outOfStockCount}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              ⚠️
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Below Safety Threshold</p>
              <p className="text-xl font-extrabold text-amber-700 mt-0.5">
                {lowCount}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Alerts ({lowStockItems.length})
            </button>
            <button
              onClick={() => setFilter("OUT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === "OUT"
                  ? "bg-red-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Out of Stock ({outOfStockCount})
            </button>
            <button
              onClick={() => setFilter("LOW")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === "LOW"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Low Stock ({lowCount})
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alert items..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Table of Low Stock Items */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Current Stock</th>
                  <th className="py-3 px-3 text-center">Safety Threshold</th>
                  <th className="py-3 px-3">Selling Price</th>
                  <th className="py-3 px-3">Alert Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Checking stock levels...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No products are currently in low stock or out of stock! Your inventory is healthy.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Barcode: {item.barcode || "N/A"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {item.category?.name || "General"}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            item.isOutOfStock
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.totalStock} {item.unit}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {item.minStockThreshold} {item.unit}
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {currency}{item.sellingPrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3">
                        {item.isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" /> OUT OF STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" /> LOW STOCK
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href="/dashboard/add-stock"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>Add Stock</span>
                          </Link>

                          <Link
                            href="/dashboard/reorder"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reorder</span>
                          </Link>
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
    </div>
  );
}
