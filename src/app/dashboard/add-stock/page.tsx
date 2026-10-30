"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { getCachedData, fetchWithCache, invalidateCache } from "@/lib/cached-fetch";
import {
  PackagePlus,
  Plus,
  Trash2,
  Barcode,
  Camera,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Truck,
  Sparkles,
  Calculator,
} from "lucide-react";

interface StockRow {
  id: string;
  productId?: string;
  name: string;
  barcode: string;
  sku: string;
  categoryName: string;
  brand: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  hasExpiry: boolean;
  minThreshold: number;
  supplierId: string;
}

export default function AddStockPage() {
  const { t } = useLanguage();
  const { shop } = useAuth();

  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([
    "Grocery & Staples",
    "Dairy & Cold Storage",
    "Instant Foods & Snacks",
    "Beverages & Cold Drinks",
    "Personal & Health Care",
    "Stationery & Office",
    "Household & Cleaning",
  ]);

  const [showScanner, setShowScanner] = useState(false);
  const [scannerTargetRowIdx, setScannerTargetRowIdx] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialRow: StockRow = {
    id: "row-" + Date.now(),
    name: "",
    barcode: "",
    sku: "",
    categoryName: "Grocery & Staples",
    brand: "",
    quantity: 10,
    purchasePrice: 0,
    sellingPrice: 0,
    batchNumber: `BAT-${Date.now().toString().slice(-5)}`,
    mfgDate: "",
    expiryDate: "",
    hasExpiry: true,
    minThreshold: 10,
    supplierId: "",
  };

  const [rows, setRows] = useState<StockRow[]>([initialRow]);

  // Load existing products and suppliers
  useEffect(() => {
    fetchWithCache("/api/products")
      .then((data) => setExistingProducts(data?.products || []))
      .catch(console.error);

    fetchWithCache("/api/suppliers")
      .then((data) => setSuppliers(data?.suppliers || []))
      .catch(console.error);
  }, []);

  const addRow = () => {
    setRows([
      ...rows,
      {
        ...initialRow,
        id: "row-" + Date.now() + Math.random().toString().slice(2, 5),
        batchNumber: `BAT-${Date.now().toString().slice(-5)}`,
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index: number, field: keyof StockRow, value: any) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Select an existing product to auto-fill details
  const handleSelectExisting = (index: number, productId: string) => {
    const found = existingProducts.find((p) => p.id === productId);
    if (found) {
      setRows((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          productId: found.id,
          name: found.name,
          barcode: found.barcode || "",
          sku: found.sku || "",
          brand: found.brand || "",
          categoryName: found.category?.name || "Grocery & Staples",
          purchasePrice: found.purchasePrice || 0,
          sellingPrice: found.sellingPrice || 0,
          hasExpiry: found.hasExpiry !== undefined ? found.hasExpiry : true,
          minThreshold: found.minStockThreshold || 10,
        };
        return updated;
      });
    }
  };

  const openCameraForRow = (index: number) => {
    setScannerTargetRowIdx(index);
    setShowScanner(true);
  };

  const handleBarcodeDetected = (code: string) => {
    // Check if code matches an existing product
    const found = existingProducts.find((p) => p.barcode === code);
    if (found) {
      handleSelectExisting(scannerTargetRowIdx, found.id);
    } else {
      updateRow(scannerTargetRowIdx, "barcode", code);
    }
  };

  // Calculations across all rows in current session
  const totalPurchaseCost = rows.reduce((sum, r) => sum + r.quantity * r.purchasePrice, 0);
  const expectedSalesValue = rows.reduce((sum, r) => sum + r.quantity * r.sellingPrice, 0);
  const expectedGrossProfit = expectedSalesValue - totalPurchaseCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.name.trim()) {
        setErrorMessage(`Item #${i + 1} requires a product name.`);
        setLoading(false);
        return;
      }
      if (r.quantity <= 0) {
        setErrorMessage(`Item #${i + 1} (${r.name}) quantity must be greater than 0.`);
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        items: rows.map((r) => ({
          productId: r.productId,
          name: r.name,
          barcode: r.barcode || undefined,
          sku: r.sku || undefined,
          brand: r.brand || undefined,
          quantity: Number(r.quantity),
          purchasePrice: Number(r.purchasePrice),
          sellingPrice: Number(r.sellingPrice),
          batchNumber: r.batchNumber,
          mfgDate: r.mfgDate || undefined,
          expiryDate: r.hasExpiry && r.expiryDate ? r.expiryDate : undefined,
          hasExpiry: r.hasExpiry,
          minStockThreshold: Number(r.minThreshold),
          supplierId: r.supplierId || undefined,
        })),
      };

      const res = await fetch("/api/stock/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record stock");
      }

      setSuccessMessage(
        `Successfully added ${rows.length} product batch(es) to inventory! Total cost: ₹${totalPurchaseCost.toFixed(2)}`
      );

      // Reset form
      setRows([
        {
          ...initialRow,
          id: "row-" + Date.now(),
          batchNumber: `BAT-${Date.now().toString().slice(-5)}`,
        },
      ]);

      // Invalidate global cache so inventory, billing and dashboard immediately show new stock
      invalidateCache("/api");

      // Refresh existing products
      fetchWithCache("/api/products", { force: true })
        .then((data) => setExistingProducts(data?.products || []));
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currency = shop?.currency || "₹";

  return (
    <div>
      <Header
        title={t.addStock}
        subtitle="Phase 1: New Stock Arrival • Multi-Batch Entry, FEFO Setup & Cost Calculations"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* Alerts */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Real-time Session Cost Calculations Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t.expectedCost}</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {currency}{totalPurchaseCost.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t.expectedRevenue}</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">
                {currency}{expectedSalesValue.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{t.expectedGrossProfit}</p>
              <p className="text-lg font-bold text-indigo-700 mt-0.5">
                {currency}{expectedGrossProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Stock Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {rows.map((row, idx) => (
              <div
                key={row.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 relative"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                      Product Entry #{idx + 1}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Auto-fill from catalog dropdown */}
                    <select
                      onChange={(e) => handleSelectExisting(idx, e.target.value)}
                      defaultValue=""
                      className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1 text-slate-600 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="" disabled>
                        Auto-fill from registered catalog...
                      </option>
                      {existingProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.barcode || "No Barcode"})
                        </option>
                      ))}
                    </select>

                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove product row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Product Name */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.productName} *
                    </label>
                    <input
                      type="text"
                      required
                      value={row.name}
                      onChange={(e) => updateRow(idx, "name", e.target.value)}
                      placeholder="e.g. Amul Taaza Milk 500ml"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  {/* Barcode / SKU + Camera Scan */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.barcode}
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={row.barcode}
                        onChange={(e) => updateRow(idx, "barcode", e.target.value)}
                        placeholder="8901262..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => openCameraForRow(idx)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 flex-shrink-0"
                        title="Scan with camera"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.brand}
                    </label>
                    <input
                      type="text"
                      value={row.brand}
                      onChange={(e) => updateRow(idx, "brand", e.target.value)}
                      placeholder="e.g. Amul, Nestle, ITC"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Quantity Received */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.receivedQty} *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={row.quantity || ""}
                      onChange={(e) => updateRow(idx, "quantity", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold text-slate-900"
                    />
                  </div>

                  {/* Purchase Cost */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.purchaseCost} (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={row.purchasePrice || ""}
                      onChange={(e) => updateRow(idx, "purchasePrice", Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  {/* Selling Price (MRP) */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.sellingPrice} (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={row.sellingPrice || ""}
                      onChange={(e) => updateRow(idx, "sellingPrice", Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-bold text-emerald-700"
                    />
                  </div>

                  {/* Batch Number */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.batchNumber} *
                    </label>
                    <input
                      type="text"
                      required
                      value={row.batchNumber}
                      onChange={(e) => updateRow(idx, "batchNumber", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">
                        {t.expiryDate}
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!row.hasExpiry}
                          onChange={(e) => updateRow(idx, "hasExpiry", !e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span>No Expiry</span>
                      </label>
                    </div>
                    <input
                      type="date"
                      disabled={!row.hasExpiry}
                      value={row.expiryDate}
                      onChange={(e) => updateRow(idx, "expiryDate", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  {/* Mfg Date */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.mfgDate}
                    </label>
                    <input
                      type="date"
                      value={row.mfgDate}
                      onChange={(e) => updateRow(idx, "mfgDate", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.supplier}
                    </label>
                    <select
                      value={row.supplierId}
                      onChange={(e) => updateRow(idx, "supplierId", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Direct / Cash Purchase</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Min Stock Threshold */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.minThreshold}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={row.minThreshold || ""}
                      onChange={(e) => updateRow(idx, "minThreshold", Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Individual Row Expected Value Pill */}
                <div className="bg-slate-50 p-2.5 rounded-lg flex flex-wrap items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <span>
                      Cost: <strong>{currency}{(row.quantity * row.purchasePrice).toFixed(2)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Expected Sales: <strong>{currency}{(row.quantity * row.sellingPrice).toFixed(2)}</strong>
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700">
                    Gross Profit: {currency}{((row.quantity * row.sellingPrice) - (row.quantity * row.purchasePrice)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={addRow}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Product to Session</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:bg-slate-400"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{loading ? "Saving Stock Entries..." : t.saveStock}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onDetected={handleBarcodeDetected}
      />
    </div>
  );
}
