"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  Boxes,
  Search,
  Plus,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Calendar,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";


import { getCachedData, fetchWithCache } from "@/lib/cached-fetch";

export default function InventoryPage() {
  const { t } = useLanguage();
  const { shop } = useAuth();

  const cached = getCachedData("/api/products");
  const [products, setProducts] = useState<any[]>(cached?.products || []);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
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

  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Categories list
  const categories = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean))
  );

  // Filtered list
  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "ALL" || p.category?.name === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Export to Excel / CSV
  const handleExportCSV = async () => {
    if (products.length === 0) return;
    const XLSX = await import("xlsx");
    const exportRows: any[] = [];
    for (const p of products) {
      if (p.batches && p.batches.length > 0) {
        for (const b of p.batches) {
          exportRows.push({
            "Product Name": p.name,
            Barcode: p.barcode || "",
            SKU: p.sku || "",
            Category: p.category?.name || "General",
            Brand: p.brand || "",
            "Total Product Stock": p.totalStock,
            "Batch Number": b.batchNumber,
            "Batch Qty": b.currentQuantity,
            "Purchase Cost (₹)": b.purchasePrice,
            "Selling Price (₹)": b.sellingPrice,
            "Expiry Date": b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "No Expiry",
            "Expired?": b.isExpired ? "YES" : "NO",
          });
        }
      } else {
        exportRows.push({
          "Product Name": p.name,
          Barcode: p.barcode || "",
          SKU: p.sku || "",
          Category: p.category?.name || "General",
          Brand: p.brand || "",
          "Total Product Stock": p.totalStock,
          "Batch Number": "N/A",
          "Batch Qty": 0,
          "Purchase Cost (₹)": p.purchasePrice,
          "Selling Price (₹)": p.sellingPrice,
          "Expiry Date": "N/A",
          "Expired?": "NO",
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Batches");
    XLSX.writeFile(wb, `Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const currency = shop?.currency || "₹";

  return (
    <div>
      <Header
        title={t.inventory}
        subtitle="Complete Store Inventory • Multi-Batch Tracking, FEFO Inspection & Stock Master"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        {/* Top Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name, barcode, SKU, brand..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              title="Download Excel spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <Link
              href="/dashboard/add-stock"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addStock}</span>
            </Link>
          </div>
        </div>

        {/* Products Table with Expandable Batches */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-8"></th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-3">Category & Brand</th>
                  <th className="py-3 px-3">Batches</th>
                  <th className="py-3 px-3">Cost Price</th>
                  <th className="py-3 px-3">Selling Price</th>
                  <th className="py-3 px-3 text-center">Available Stock</th>
                  <th className="py-3 px-4 text-right">Earliest Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading inventory products...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No products match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((product) => {
                    const isExpanded = Boolean(expandedProductIds[product.id]);
                    const hasMultipleBatches = product.batches && product.batches.length > 1;

                    return (
                      <React.Fragment key={product.id}>
                        <tr
                          className={`hover:bg-slate-50/80 transition cursor-pointer ${
                            isExpanded ? "bg-blue-50/20" : ""
                          }`}
                          onClick={() => toggleExpand(product.id)}
                        >
                          <td className="py-3 px-3 text-slate-400 text-center">
                            {product.batches && product.batches.length > 0 ? (
                              isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )
                            ) : null}
                          </td>

                          {/* Product Details */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-800">{product.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>Barcode: {product.barcode || "None"}</span>
                              {product.sku && <span>• SKU: {product.sku}</span>}
                            </div>
                          </td>

                          {/* Category & Brand */}
                          <td className="py-3 px-3">
                            <span className="text-slate-700 font-medium">
                              {product.category?.name || "General"}
                            </span>
                            {product.brand && (
                              <p className="text-[10px] text-slate-400">{product.brand}</p>
                            )}
                          </td>

                          {/* Batches count badge */}
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                                hasMultipleBatches
                                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              <Layers className="w-3 h-3" />
                              {product.batchesCount} {product.batchesCount === 1 ? "Batch" : "Batches"}
                            </span>
                          </td>

                          {/* Purchase Price */}
                          <td className="py-3 px-3 text-slate-600 font-medium">
                            {currency}{product.purchasePrice.toFixed(2)}
                          </td>

                          {/* Selling Price */}
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {currency}{product.sellingPrice.toFixed(2)}
                          </td>

                          {/* Stock Status Badge */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  product.isOutOfStock
                                    ? "bg-red-100 text-red-800 border border-red-200"
                                    : product.isLowStock
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {product.totalStock} {product.unit}
                              </span>
                              {product.isLowStock && !product.isOutOfStock && (
                                <span className="text-[9px] text-amber-700 font-bold mt-0.5">
                                  LOW STOCK
                                </span>
                              )}
                              {product.isOutOfStock && (
                                <span className="text-[9px] text-red-700 font-bold mt-0.5">
                                  OUT OF STOCK
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Earliest Expiry */}
                          <td className="py-3 px-4 text-right">
                            {product.earliestExpiryDate ? (
                              <div>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    product.earliestDaysRemaining !== null && product.earliestDaysRemaining <= 3
                                      ? "bg-red-100 text-red-700 border border-red-200"
                                      : product.earliestDaysRemaining !== null && product.earliestDaysRemaining <= 15
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {new Date(product.earliestExpiryDate).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                {product.earliestDaysRemaining !== null && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {product.earliestDaysRemaining < 0
                                      ? "Expired"
                                      : `${product.earliestDaysRemaining} days remaining`}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">No Expiry</span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Batches View */}
                        {isExpanded && product.batches && product.batches.length > 0 && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={8} className="p-3 pl-12">
                              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                                    Active Stock Batches for &quot;{product.name}&quot; (FEFO Order):
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    Total: {product.batches.length} batch(es)
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                  {product.batches.map((b: any) => (
                                    <div
                                      key={b.id}
                                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1"
                                    >
                                      <div className="flex justify-between items-start">
                                        <span className="font-mono font-bold text-blue-700">
                                          {b.batchNumber}
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                                          Qty: {b.currentQuantity}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-[11px] text-slate-500">
                                        <span>Cost: {currency}{b.purchasePrice.toFixed(2)}</span>
                                        <span>Sale: {currency}{b.sellingPrice.toFixed(2)}</span>
                                      </div>
                                      <div className="text-[11px] pt-1 border-t border-slate-200/70 flex justify-between items-center">
                                        <span className="text-slate-500">Expiry:</span>
                                        {b.expiryDate ? (
                                          <span
                                            className={`font-semibold ${
                                              b.isExpired ? "text-red-700" : "text-slate-800"
                                            }`}
                                          >
                                            {new Date(b.expiryDate).toLocaleDateString([], {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                            })}
                                            {b.isExpired && " (Expired)"}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No Expiry</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
