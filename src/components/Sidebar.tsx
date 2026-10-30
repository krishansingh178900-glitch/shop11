"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
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
  LogOut,
  Menu,
  X,
  Store,
  Sparkles,
  Zap,
  Compass,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, shop, role, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const navItems = [
    { href: "/dashboard", label: t.dashboard, icon: LayoutDashboard },
    { href: "/dashboard/billing", label: t.billing, icon: ShoppingCart, highlight: true },
    { href: "/dashboard/add-stock", label: t.addStock, icon: PackagePlus },
    { href: "/dashboard/inventory", label: t.inventory, icon: Boxes },
    { href: "/dashboard/expiry", label: t.expiryManagement, icon: CalendarClock, badgeColor: "text-rose-400" },
    { href: "/dashboard/low-stock", label: t.lowStock, icon: AlertTriangle, badgeColor: "text-amber-400" },
    { href: "/dashboard/sales", label: t.salesHistory, icon: Receipt },
    { href: "/dashboard/reports/daily", label: t.dailyReports, icon: FileBarChart2 },
    { href: "/dashboard/reports/monthly", label: t.monthlyReports, icon: CalendarDays },
    { href: "/dashboard/analytics", label: t.salesAnalytics, icon: TrendingUp },
    { href: "/dashboard/reorder", label: t.reorderSuggestions, icon: RotateCcw },
    { href: "/dashboard/suppliers", label: t.suppliers, icon: Truck },
    { href: "/dashboard/settings", label: t.settings, icon: Settings },
    { href: "/links", label: "All Local Links", icon: Compass, badgeColor: "text-cyan-400" },
  ];

  // Proactively warm up router cache for all main navigation pages during browser idle
  React.useEffect(() => {
    const idleCallback =
      typeof window !== "undefined" && (window as any).requestIdleCallback
        ? (window as any).requestIdleCallback
        : (cb: any) => setTimeout(cb, 100);

    const timer = idleCallback(() => {
      navItems.forEach((item) => {
        try {
          router.prefetch(item.href);
        } catch {}
      });
    });

    return () => {
      if (typeof window !== "undefined" && (window as any).cancelIdleCallback) {
        (window as any).cancelIdleCallback(timer);
      }
    };
  }, [router]);

  // Reset pending status whenever pathname changes
  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between bg-navy-950 text-white px-4 py-3 sticky top-0 z-40 border-b border-slate-800/80 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-sm">
            <Store className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight truncate max-w-[170px]">
            {shop?.name || t.appName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-xl bg-slate-800/80 text-slate-200 hover:text-white"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-navy-950/70 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Main Luxury Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-gradient-to-b from-navy-950 via-navy-900 to-[#070c18] text-slate-200 border-r border-slate-800/60 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Store Brand Header */}
        <div className="p-4 border-b border-slate-800/60 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 flex-shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-sm text-white tracking-tight truncate leading-tight">
                {shop?.name || "Smart Retail"}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {shop?.category || "Supermarket"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Badge / Role Card */}
        <div className="px-4 py-2.5 bg-navy-850/60 border-b border-slate-800/50 flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-100 truncate">{user?.name || "Store Manager"}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block text-[9px] uppercase font-extrabold tracking-wider text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-700/50">
                {role || "OWNER"}
              </span>
              <span className="text-[10px] text-slate-500">• Online</span>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const isPending = pendingHref === item.href && !isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onPointerEnter={() => {
                  try {
                    router.prefetch(item.href);
                  } catch {}
                }}
                onTouchStart={() => {
                  try {
                    router.prefetch(item.href);
                  } catch {}
                }}
                onClick={() => {
                  setPendingHref(item.href);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 ring-1 ring-white/20"
                    : isPending
                    ? "bg-blue-600/30 text-white border border-blue-400/50 shadow-md animate-pulse"
                    : item.highlight
                    ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : isPending ? "text-blue-300 animate-spin" : item.badgeColor || "text-slate-400"
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {isPending && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                )}
                {item.highlight && !isActive && !isPending && (
                  <span className="ml-auto text-[9px] font-black bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5 fill-current" /> POS
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-navy-950/80">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
