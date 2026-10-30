"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  PackagePlus,
  Boxes,
  CalendarClock,
  AlertTriangle,
  Receipt,
  FileBarChart2,
  CalendarDays,
  TrendingUp,
  RotateCcw,
  Truck,
  Settings,
  LogIn,
  UserPlus,
  Store,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react";

export default function LinksPage() {
  const localRoutes = [
    {
      category: "Core POS & Inventory",
      items: [
        {
          title: "Main Dashboard",
          url: "http://localhost:3000/dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
          color: "text-blue-600 bg-blue-50 border-blue-200",
          desc: "8 real-time cards, 7-day sales trend chart, top 5 selling items, and recent transactions.",
          badge: "Live Overview",
        },
        {
          title: "Quick Billing / POS",
          url: "http://localhost:3000/dashboard/billing",
          path: "/dashboard/billing",
          icon: ShoppingCart,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
          desc: "Dual barcode scanning (camera & USB), FEFO batch recommendation, cash change calculator, and thermal receipts.",
          badge: "F2 Shortcut",
        },
        {
          title: "Add New Stock",
          url: "http://localhost:3000/dashboard/add-stock",
          path: "/dashboard/add-stock",
          icon: PackagePlus,
          color: "text-indigo-700 bg-indigo-50 border-indigo-200",
          desc: "Multi-product batch arrival form, camera scanner, cost vs expected gross profit calculations.",
          badge: "Phase 1",
        },
        {
          title: "Product Inventory Master",
          url: "http://localhost:3000/dashboard/inventory",
          path: "/dashboard/inventory",
          icon: Boxes,
          color: "text-purple-700 bg-purple-50 border-purple-200",
          desc: "Complete catalog with expandable multi-batch FEFO breakdowns and 1-click Excel export.",
          badge: "Excel Export",
        },
      ],
    },
    {
      category: "Intelligent Expiry & Stock Alerts",
      items: [
        {
          title: "Expiry Tracker",
          url: "http://localhost:3000/dashboard/expiry",
          path: "/dashboard/expiry",
          icon: CalendarClock,
          color: "text-rose-700 bg-rose-50 border-rose-200",
          desc: "Tiers for Expired, Tomorrow, 7d, 15d, 30d, and 1-click wastage write-off with financial loss calculation.",
          badge: "FEFO Control",
        },
        {
          title: "Low Stock Alerts",
          url: "http://localhost:3000/dashboard/low-stock",
          path: "/dashboard/low-stock",
          icon: AlertTriangle,
          color: "text-amber-700 bg-amber-50 border-amber-200",
          desc: "Real-time safety threshold warnings, Out-of-Stock highlights, and 1-click reorder shortcuts.",
          badge: "Safety Stock",
        },
        {
          title: "Smart Reorder Engine",
          url: "http://localhost:3000/dashboard/reorder",
          path: "/dashboard/reorder",
          icon: RotateCcw,
          color: "text-cyan-700 bg-cyan-50 border-cyan-200",
          desc: "Rule-based replenishment engine (sales velocity, lead time, safety buffer) and draft PO generation.",
          badge: "AI Replenish",
        },
      ],
    },
    {
      category: "Reports, Transactions & Analytics",
      items: [
        {
          title: "Sales History & Returns",
          url: "http://localhost:3000/dashboard/sales",
          path: "/dashboard/sales",
          icon: Receipt,
          color: "text-slate-800 bg-slate-100 border-slate-300",
          desc: "Complete transaction audit log, thermal receipt re-printing, Excel export, and return/refund restocking.",
          badge: "Audit Trail",
        },
        {
          title: "Daily Reports",
          url: "http://localhost:3000/dashboard/reports/daily",
          path: "/dashboard/reports/daily",
          icon: FileBarChart2,
          color: "text-blue-700 bg-blue-50 border-blue-200",
          desc: "Revenue, COGS, gross profit, hourly sales distribution chart, and 1-click PDF/CSV export.",
          badge: "Daily PDF",
        },
        {
          title: "Monthly Reports",
          url: "http://localhost:3000/dashboard/reports/monthly",
          path: "/dashboard/reports/monthly",
          icon: CalendarDays,
          color: "text-indigo-700 bg-indigo-50 border-indigo-200",
          desc: "Monthly business audit, inventory valuation, expired stock losses, and month-over-month growth.",
          badge: "Monthly Audit",
        },
        {
          title: "Sales & Product Analytics",
          url: "http://localhost:3000/dashboard/analytics",
          path: "/dashboard/analytics",
          icon: TrendingUp,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
          desc: "Best sellers, least sellers, highest revenue, fast-moving items, and dead stock with AI explanations.",
          badge: "Velocity Engine",
        },
      ],
    },
    {
      category: "Management & Authentication",
      items: [
        {
          title: "Supplier Management",
          url: "http://localhost:3000/dashboard/suppliers",
          path: "/dashboard/suppliers",
          icon: Truck,
          color: "text-amber-700 bg-amber-50 border-amber-200",
          desc: "Wholesale vendor directory, contact info, typical lead times, and purchase orders.",
          badge: "Vendors",
        },
        {
          title: "Shop Settings",
          url: "http://localhost:3000/dashboard/settings",
          path: "/dashboard/settings",
          icon: Settings,
          color: "text-slate-700 bg-slate-50 border-slate-200",
          desc: "Store profile, GST rate configuration, invoice prefix, alert thresholds, and language toggle.",
          badge: "Store Config",
        },
        {
          title: "Login Portal",
          url: "http://localhost:3000/login",
          path: "/login",
          icon: LogIn,
          color: "text-blue-700 bg-blue-50 border-blue-200",
          desc: "1-click instant login for Shop Owner and Cashier, JWT authentication.",
          badge: "Auth",
        },
        {
          title: "Store Registration",
          url: "http://localhost:3000/register",
          path: "/register",
          icon: UserPlus,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
          desc: "Register a brand new retail store with complete multi-tenant database isolation.",
          badge: "Onboarding",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-current" /> Local Application Directory
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            All Local Application Links
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto font-medium">
            Direct clickable links to all 15 operational pages running on{" "}
            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              http://localhost:3000
            </span>
          </p>
        </div>

        {/* Demo Quick Logins Callout */}
        <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Pre-Configured Instant Demo Logins</span>
            </div>
            <p className="text-sm font-semibold text-slate-200">
              Shop Owner: <span className="font-mono text-blue-300">demo@retail.com</span> • Password: <span className="font-mono text-blue-300">password123</span>
            </p>
            <p className="text-xs text-slate-400">
              Cashier: <span className="font-mono text-emerald-300">cashier@retail.com</span> • Password: <span className="font-mono text-emerald-300">password123</span>
            </p>
          </div>

            <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              Go to Login Page →
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition"
            >
              Open Dashboard →
            </Link>
          </div>
        </div>

        {/* Interactive Demo Showcase Features Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold border border-emerald-200">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900">1-Click Live Sale Simulator</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Click <code className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded">⚡ Simulate Customer Sale</code> on top of any dashboard page to trigger live customer checkout with real-time stock deduction.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200/90 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 font-bold border border-blue-200">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900">🪄 Demo Quick Baskets in POS</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                One-click fill cart with <span className="font-semibold text-blue-700">Daily Groceries</span>, <span className="font-semibold text-amber-700">Snacks & Drinks</span>, or <span className="font-semibold text-emerald-700">Monthly Ration</span> presets.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-purple-200/90 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0 font-bold border border-purple-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900">Guided Presentation Tour</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Click <span className="font-semibold text-purple-700">Tour</span> on the top demo ribbon for full walkthrough modal of POS, FEFO expiry, inwards, and reports.
              </p>
            </div>
          </div>
        </div>

        {/* Category Sections */}
        <div className="space-y-8">
          {localRoutes.map((group, gIdx) => (
            <div key={gIdx} className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                {group.category}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.items.map((item, idx) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={idx}
                      href={item.path}
                      prefetch={true}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-premium hover:border-blue-400 hover:shadow-lg transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${item.color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                                {item.title}
                              </h3>
                              <p className="font-mono text-[11px] text-blue-600 font-medium">
                                {item.url}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {item.badge}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                        <span>Click to open page</span>
                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
