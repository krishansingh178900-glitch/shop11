"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { ThermalReceiptModal } from "@/components/ThermalReceiptModal";
import {
  Search,
  Barcode,
  Camera,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  Calendar,
  AlertCircle,
  Receipt,
  Sparkles,
  Volume2,
  Zap,
  ArrowRight,
} from "lucide-react";

interface ProductWithBatches {
  id: string;
  name: string;
  barcode?: string;
  sku?: string;
  brand?: string;
  unit: string;
  sellingPrice: number;
  totalStock: number;
  minStockThreshold?: number;
  hasExpiry: boolean;
  imageUrl?: string | null;
  category?: { id: string; name: string } | null;
  batches: Array<{
    id: string;
    batchNumber: string;
    currentQuantity: number;
    sellingPrice: number;
    expiryDate: string | null;
    isExpired: boolean;
  }>;
}

interface CartItem {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedBatchId?: string;
  selectedBatchNumber?: string;
  batchExpiryDate?: string | null;
  availableBatches: ProductWithBatches["batches"];
  totalStock: number;
}

// Synthesize pleasant checkout audio chime using Web Audio API
function playSound(type: "beep" | "chime") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "beep") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else {
      // Pleasant double-chime on sale complete
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // ignore audio restriction
  }
}

import { getCachedData, fetchWithCache, invalidateCache } from "@/lib/cached-fetch";

export default function BillingPage() {
  const { t } = useLanguage();
  const { shop } = useAuth();

  const cached = getCachedData("/api/products");
  const [products, setProducts] = useState<ProductWithBatches[]>(cached?.products || []);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [upiReference, setUpiReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showScanner, setShowScanner] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

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
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Keyboard shortcut listener (F2 to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // USB Barcode reader wedge listener
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleBarcodeKeydown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) buffer = "";
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length >= 6) {
          e.preventDefault();
          handleBarcodeDetected(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleBarcodeKeydown);
    return () => window.removeEventListener("keydown", handleBarcodeKeydown);
  }, [products]);

  const handleBarcodeDetected = (scannedCode: string) => {
    const trimmed = scannedCode.trim();
    const found = products.find(
      (p) => p.barcode === trimmed || p.sku === trimmed || p.name.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (found) {
      addToCart(found);
      setSearchQuery("");
      playSound("beep");
    } else {
      setError(`No product registered with barcode/SKU: ${trimmed}`);
      setTimeout(() => setError(null), 4000);
    }
  };

  const addToCart = (product: ProductWithBatches) => {
    if (product.totalStock <= 0) {
      setError(`"${product.name}" is currently OUT OF STOCK.`);
      setTimeout(() => setError(null), 3500);
      return;
    }

    playSound("beep");

    // FEFO Sort: First Expiry First Out
    const now = new Date();
    const sortedBatches = [...product.batches]
      .filter((b) => b.currentQuantity > 0 && (!b.expiryDate || new Date(b.expiryDate) >= now))
      .sort((a, b) => {
        if (a.expiryDate && b.expiryDate) {
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        }
        if (a.expiryDate && !b.expiryDate) return -1;
        if (!a.expiryDate && b.expiryDate) return 1;
        return 0;
      });

    const defaultBatch = sortedBatches[0] || product.batches[0];

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === product.id);
      if (existingIdx > -1) {
        const item = prev[existingIdx];
        if (item.quantity + 1 > product.totalStock) {
          setError(`Only ${product.totalStock} units available for ${product.name}`);
          setTimeout(() => setError(null), 3000);
          return prev;
        }
        const updated = [...prev];
        const newQty = item.quantity + 1;
        updated[existingIdx] = {
          ...item,
          quantity: newQty,
          totalPrice: newQty * item.unitPrice,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            unit: product.unit,
            quantity: 1,
            unitPrice: product.sellingPrice,
            totalPrice: product.sellingPrice,
            selectedBatchId: defaultBatch?.id,
            selectedBatchNumber: defaultBatch?.batchNumber,
            batchExpiryDate: defaultBatch?.expiryDate,
            availableBatches: product.batches,
            totalStock: product.totalStock,
          },
        ];
      }
    });

    setSearchQuery("");
  };

  const loadDemoBasket = (basketType: "morning" | "snacks" | "ration") => {
    let targetKeywords: string[] = [];
    let custName = "";
    let custPhone = "";
    let payMethod: "CASH" | "UPI" | "CARD" = "CASH";
    let cashGiven = "";
    let upiRef = "";

    if (basketType === "morning") {
      targetKeywords = ["milk", "tea", "salt"];
      custName = "Pooja Kulkarni";
      custPhone = "+91 98220 12345";
      payMethod = "UPI";
      upiRef = "UPI-GPay-9821";
    } else if (basketType === "snacks") {
      targetKeywords = ["maggi", "lay", "coca", "biscuit", "silk"];
      custName = "Rahul Verma";
      custPhone = "+91 98900 55432";
      payMethod = "CASH";
      cashGiven = "200";
    } else {
      targetKeywords = ["atta", "oil", "rice", "dal"];
      custName = "Dr. Meenakshi Sundaram";
      custPhone = "+91 94440 88712";
      payMethod = "CARD";
    }

    const matchedProducts: ProductWithBatches[] = [];
    for (const kw of targetKeywords) {
      const match = products.find(
        (p) =>
          p.totalStock > 0 &&
          p.name.toLowerCase().includes(kw) &&
          !matchedProducts.some((mp) => mp.id === p.id)
      );
      if (match) matchedProducts.push(match);
    }

    if (matchedProducts.length === 0) {
      setError("Please reset demo data first to populate products.");
      return;
    }

    const newCartItems: CartItem[] = [];
    const now = new Date();

    for (const prod of matchedProducts) {
      const sortedBatches = [...prod.batches]
        .filter((b) => b.currentQuantity > 0 && (!b.expiryDate || new Date(b.expiryDate) >= now))
        .sort((a, b) => {
          if (a.expiryDate && b.expiryDate) {
            return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          }
          if (a.expiryDate && !b.expiryDate) return -1;
          if (!a.expiryDate && b.expiryDate) return 1;
          return 0;
        });

      const defaultBatch = sortedBatches[0] || prod.batches[0];

      newCartItems.push({
        productId: prod.id,
        name: prod.name,
        unit: prod.unit,
        quantity: 1,
        unitPrice: prod.sellingPrice,
        totalPrice: prod.sellingPrice,
        selectedBatchId: defaultBatch?.id,
        selectedBatchNumber: defaultBatch?.batchNumber,
        batchExpiryDate: defaultBatch?.expiryDate,
        availableBatches: prod.batches,
        totalStock: prod.totalStock,
      });
    }

    playSound("chime");
    setCart(newCartItems);
    setCustomerName(custName);
    setCustomerPhone(custPhone);
    setPaymentMethod(payMethod);
    setCashTendered(cashGiven);
    setUpiReference(upiRef);
  };

  const updateQuantity = (idx: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      if (newQty > item.totalStock) {
        setError(`Only ${item.totalStock} units available for ${item.name}`);
        setTimeout(() => setError(null), 3000);
        return prev;
      }
      updated[idx] = {
        ...item,
        quantity: newQty,
        totalPrice: newQty * item.unitPrice,
      };
      return updated;
    });
  };

  const changeBatch = (idx: number, batchId: string) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      const targetBatch = item.availableBatches.find((b) => b.id === batchId);
      if (targetBatch) {
        updated[idx] = {
          ...item,
          selectedBatchId: targetBatch.id,
          selectedBatchNumber: targetBatch.batchNumber,
          batchExpiryDate: targetBatch.expiryDate,
          unitPrice: targetBatch.sellingPrice || item.unitPrice,
          totalPrice: item.quantity * (targetBatch.sellingPrice || item.unitPrice),
        };
      }
      return updated;
    });
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => {
    if (cart.length > 0 && confirm("Are you sure you want to clear the billing cart?")) {
      setCart([]);
      setDiscountAmount(0);
      setUpiReference("");
      setCashTendered("");
    }
  };

  // Pricing calculations memoized for instant POS typing
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const validDiscount = useMemo(() => Math.min(subtotal, Math.max(0, Number(discountAmount) || 0)), [subtotal, discountAmount]);
  const taxable = subtotal - validDiscount;
  const taxRate = shop?.taxRatePercent || 0;
  const taxAmount = useMemo(() => Number(((taxable * taxRate) / 100).toFixed(2)), [taxable, taxRate]);
  const grandTotal = useMemo(() => Number((taxable + taxAmount).toFixed(2)), [taxable, taxAmount]);

  // Change to return for cash payments
  const numCashTendered = parseFloat(cashTendered) || 0;
  const returnChange = numCashTendered >= grandTotal ? numCashTendered - grandTotal : 0;

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            batchId: item.selectedBatchId,
          })),
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          discountAmount: validDiscount,
          taxPercent: taxRate,
          paymentMethod,
          upiReference: paymentMethod === "UPI" ? upiReference : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      playSound("chime");

      setReceiptData({
        invoiceNumber: data.sale.invoiceNumber,
        customerName: data.sale.customerName,
        customerPhone: data.sale.customerPhone,
        createdAt: data.sale.createdAt,
        paymentMethod: data.sale.paymentMethod,
        upiReference: data.sale.upiReference,
        items: data.items.map((i: any) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalAmount: i.totalAmount,
        })),
        subtotal: data.sale.subtotal,
        discountAmount: data.sale.discountAmount,
        taxAmount: data.sale.taxAmount,
        grandTotal: data.sale.grandTotal,
        shopName: shop?.name,
        shopAddress: shop?.address,
        currency: shop?.currency,
      });

      setShowReceipt(true);

      // Reset cart & refresh product catalog
      setCart([]);
      setDiscountAmount(0);
      setCustomerName("");
      setCustomerPhone("");
      setUpiReference("");
      setCashTendered("");
      invalidateCache("/api");
      fetchProducts(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter products for the visual catalog
  const categoriesList = [
    { id: "ALL", label: "All Items" },
    { id: "Dairy & Cold Storage", label: "🥛 Dairy" },
    { id: "Groceries & Daily Staples", label: "🌾 Staples" },
    { id: "Instant Foods & Snacks", label: "🍜 Snacks" },
    { id: "Beverages & Cold Drinks", label: "🥤 Drinks" },
    { id: "Personal Care & Pharmacy", label: "🧼 Healthcare" },
    { id: "Stationery & Office", label: "✏️ Stationery" },
  ];

  const catalogFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat = selectedCategory === "ALL" || p.category?.name === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    });
  }, [products, selectedCategory, searchQuery]);

  const currency = shop?.currency || "₹";

  return (
    <div>
      <Header
        title={t.newSale}
        subtitle="Ultra-Fast Retail POS • Dual Barcode & Visual Touch Tiles • FEFO Batches & Thermal Receipts"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        {/* Error Toast */}
        {error && (
          <div className="p-3.5 bg-rose-100 border border-rose-300 text-rose-900 rounded-2xl text-xs flex items-center justify-between font-bold animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Visual Product Catalog & Cart Table (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1-Click Interactive Demo Baskets */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/90 p-2.5 rounded-2xl flex items-center justify-between gap-2 flex-wrap shadow-xs">
              <div className="flex items-center gap-1.5 text-blue-950 font-extrabold text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Demo Quick Baskets:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => loadDemoBasket("morning")}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100/80 border border-blue-200 text-blue-900 rounded-xl text-[11px] font-bold shadow-xs transition active:scale-95 flex items-center gap-1"
                >
                  <span>🥛 Daily Groceries</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoBasket("snacks")}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100/80 border border-amber-200 text-amber-900 rounded-xl text-[11px] font-bold shadow-xs transition active:scale-95 flex items-center gap-1"
                >
                  <span>🍿 Snacks & Drinks</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoBasket("ration")}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100/80 border border-emerald-200 text-emerald-900 rounded-xl text-[11px] font-bold shadow-xs transition active:scale-95 flex items-center gap-1"
                >
                  <span>🌾 Monthly Ration</span>
                </button>
              </div>
            </div>

            {/* Search Input Bar + Camera Barcode Button */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-premium flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan barcode or type name (Press F2 to focus)..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex-shrink-0"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Camera Scan</span>
              </button>
            </div>

            {/* Visual Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categoriesList.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Quick-Touch Visual Product Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1 bg-slate-100/70 rounded-2xl border border-slate-200/70">
              {catalogFiltered.slice(0, 12).map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group active:scale-95"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]">
                        {prod.brand || "Retail"}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          prod.totalStock === 0
                            ? "bg-red-100 text-red-700"
                            : prod.totalStock <= (prod.minStockThreshold || 10)
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {prod.totalStock} left
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-800 line-clamp-2 mt-1 leading-snug group-hover:text-blue-600">
                      {prod.name}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                    <span className="font-black text-xs text-slate-900">
                      {currency}{prod.sellingPrice.toFixed(2)}
                    </span>
                    <span className="w-5 h-5 rounded-lg bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center font-bold text-xs transition">
                      +
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Cart Items Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-premium overflow-hidden">
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  Cart Items ({cart.reduce((s, i) => s + i.quantity, 0)})
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <Barcode className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-500">{t.emptyCart}</p>
                  <p className="text-[11px] text-slate-400">
                    Click any product card above, or scan a barcode to add to bill!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-2">Batch (FEFO)</th>
                        <th className="py-2.5 px-2 text-center">Qty</th>
                        <th className="py-2.5 px-2 text-right">Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {cart.map((item, idx) => (
                        <tr key={item.productId} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-800 leading-tight">{item.name}</p>
                            <span className="text-[10px] text-slate-400">
                              Stock: {item.totalStock} {item.unit}
                            </span>
                          </td>

                          {/* Batch Selector (FEFO First Expiry First Out) */}
                          <td className="py-2.5 px-2">
                            {item.availableBatches && item.availableBatches.length > 1 ? (
                              <select
                                value={item.selectedBatchId}
                                onChange={(e) => changeBatch(idx, e.target.value)}
                                className="text-[10px] bg-slate-50 border border-slate-300 rounded-md px-1.5 py-1 font-mono focus:ring-1 focus:ring-blue-500"
                              >
                                {item.availableBatches.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.batchNumber} (
                                    {b.expiryDate
                                      ? `Exp: ${new Date(b.expiryDate).toLocaleDateString([], { month: "short", day: "numeric" })}`
                                      : "No Exp"}
                                    , Qty: {b.currentQuantity})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                                {item.selectedBatchNumber || "Default"}
                              </span>
                            )}
                          </td>

                          {/* Quantity adjustments */}
                          <td className="py-2.5 px-2 text-center">
                            <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                              <button
                                type="button"
                                onClick={() => updateQuantity(idx, -1)}
                                className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="w-6 font-bold text-center text-slate-900 text-xs">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(idx, 1)}
                                className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>

                          <td className="py-2.5 px-2 text-right text-slate-700">
                            {currency}{item.unitPrice.toFixed(2)}
                          </td>

                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            {currency}{item.totalPrice.toFixed(2)}
                          </td>

                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeFromCart(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Customer, Payment, Calculations & Checkout (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-premium space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-800">
                  Bill Summary & Checkout
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  GST Invoice
                </span>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name (Optional)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-medium"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Mobile (Optional)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition ${
                      paymentMethod === "CASH"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("UPI")}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition ${
                      paymentMethod === "UPI"
                        ? "bg-purple-50 border-purple-500 text-purple-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition ${
                      paymentMethod === "CARD"
                        ? "bg-blue-50 border-blue-500 text-blue-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card / POS</span>
                  </button>
                </div>

                {/* Cash Change Calculator */}
                {paymentMethod === "CASH" && (
                  <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 space-y-2 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900">Customer Tendered (₹):</span>
                      <input
                        type="number"
                        min="0"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-24 px-2 py-1 text-right font-black border border-emerald-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {numCashTendered > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-xs">
                        <span className="font-extrabold text-emerald-900">Change to Return:</span>
                        <span className="font-black text-sm text-emerald-800">
                          {currency}{returnChange.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* UPI Reference Box */}
                {paymentMethod === "UPI" && (
                  <div className="bg-purple-50/80 p-3 rounded-2xl border border-purple-200 space-y-1.5 text-xs animate-in fade-in">
                    <span className="font-bold text-purple-900 block">PhonePe / GPay / Paytm Ref:</span>
                    <input
                      type="text"
                      value={upiReference}
                      onChange={(e) => setUpiReference(e.target.value)}
                      placeholder="e.g. 3928192081@okhdfcbank"
                      className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg font-mono focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Price Calculations Breakdown */}
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-bold">{currency}{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-slate-400" />
                    Discount (₹):
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-20 px-2 py-1 text-right font-bold border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {taxRate > 0 && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>GST ({taxRate}%):</span>
                    <span className="font-bold">+{currency}{taxAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-2xl font-black text-emerald-700 tracking-tight">
                    {currency}{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition active:scale-98"
              >
                <CheckCircle className="w-5 h-5" />
                <span>
                  {loading ? "Completing Sale..." : `Confirm Bill & Print (${currency}${grandTotal.toFixed(2)})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onDetected={handleBarcodeDetected}
      />

      {/* Thermal Receipt Modal */}
      <ThermalReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        data={receiptData}
      />
    </div>
  );
}
