"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  Sparkles,
  Zap,
  ShoppingCart,
  CalendarClock,
  PackagePlus,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Boxes,
  Printer,
  Barcode,
} from "lucide-react";

export function DemoTourModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: "High-Speed POS & Barcode Scanner",
      badge: "Flagship Feature",
      icon: ShoppingCart,
      color: "text-emerald-500 bg-emerald-950/80 border-emerald-700/60",
      description:
        "Designed for rapid checkout at grocery and supermarket counters with hotkeys (F2), camera barcode scanning, USB scanner support, and instant 80mm thermal receipt printing.",
      highlights: [
        "Camera & USB Barcode Scanning with audio beep chime",
        "Visual touch-friendly product catalog tiles",
        "Smart FEFO batch recommendation auto-attached to each line item",
        "Integrated Cash Change Calculator (e.g. ₹500 given for ₹340 bill = ₹160 return)",
        "UPI QR / PhonePe / Google Pay reference tracking",
      ],
      link: "/dashboard/billing",
      linkText: "Try POS Counter Now",
    },
    {
      title: "Intelligent Multi-Batch FEFO Expiry Tracking",
      badge: "Core Innovation",
      icon: CalendarClock,
      color: "text-rose-500 bg-rose-950/80 border-rose-700/60",
      description:
        "Standard retail POS systems only track product quantity. Smart Retail tracks multiple arrival batches per product with different manufacturing and expiry dates.",
      highlights: [
        "First Expiry, First Out (FEFO) recommendation algorithm",
        "Color-coded risk tiers: Expired, Tomorrow, 7 Days, 15 Days, 30 Days",
        "Prevent ₹10,000s in expired stock write-offs with proactive discount alerts",
        "1-Click Wastage Write-Off with atomic loss calculations",
        "Batch traceability from wholesale receipt to retail customer invoice",
      ],
      link: "/dashboard/expiry",
      linkText: "Open Expiry Tracker",
    },
    {
      title: "Batch Arrival & Inward Stock Management",
      badge: "Inventory Audit",
      icon: PackagePlus,
      color: "text-indigo-500 bg-indigo-950/80 border-indigo-700/60",
      description:
        "Effortlessly record wholesale distributor deliveries with supplier details, lot numbers, purchase costs, MRP, and expiry dates.",
      highlights: [
        "Multi-product stock arrival sessions in a single invoice",
        "Auto-generated batch numbers or custom supplier lot codes",
        "Live margin calculator (Purchase Cost vs Selling Price vs Expected Profit)",
        "Real-time update of store inventory valuation and movements",
        "Supplier lead time and payment terms logging",
      ],
      link: "/dashboard/add-stock",
      linkText: "Add Inward Batch Stock",
    },
    {
      title: "Real-Time Reports & P&L Financial Audit",
      badge: "Business Intelligence",
      icon: TrendingUp,
      color: "text-blue-500 bg-blue-950/80 border-blue-700/60",
      description:
        "Clear financial accounting showing true Cost of Goods Sold (COGS), daily gross profit, expired stock write-off losses, and inventory valuation.",
      highlights: [
        "Daily profit & loss statements with hourly sales distribution",
        "Printable daily closing PDF and Excel/CSV export for accountants",
        "Monthly business health audit and month-over-month growth %",
        "Stock valuation at cost and at retail selling price",
        "Sales velocity analytics (fast-moving vs dead stock)",
      ],
      link: "/dashboard/reports/daily",
      linkText: "View Daily Financial Report",
    },
    {
      title: "Smart Reorder Engine & Purchase Orders",
      badge: "AI Replenishment",
      icon: RotateCcw,
      color: "text-amber-500 bg-amber-950/80 border-amber-700/60",
      description:
        "Mathematical inventory replenishment engine that calculates when and how much to reorder before running out of stock.",
      highlights: [
        "Formula: (Average Daily Sales × Lead Time Days) + Safety Buffer - Current Stock",
        "Shelf-life bounding prevents over-ordering perishable items",
        "Automatic supplier grouping for one-click draft Purchase Orders",
        "Out-of-Stock and Critical threshold alerts",
        "Direct vendor dispatch and PO tracking",
      ],
      link: "/dashboard/reorder",
      linkText: "Open Reorder Engine",
    },
  ];

  const current = tourSteps[activeTab];
  const CurrentIcon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Smart Retail Assistant — Demo Showcase
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Live System
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Overview of key retail workflows configured with authentic demo data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 overflow-x-auto bg-slate-950/50 p-2 gap-1.5 scrollbar-none">
          {tourSteps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{step.title.split("&")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border flex-shrink-0 ${current.color}`}>
                <CurrentIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded-full">
                  {current.badge}
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">
                  {current.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  {current.description}
                </p>
              </div>
            </div>
          </div>

          {/* Key Capabilities Checklist */}
          <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Key System Capabilities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {current.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tourSteps.map((_, i) => (
              <span
                key={i}
                onClick={() => setActiveTab(i)}
                className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                  activeTab === i ? "bg-blue-500 w-6" : "bg-slate-700 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Close
            </button>
            <Link
              href={current.link}
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition"
            >
              <span>{current.linkText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
