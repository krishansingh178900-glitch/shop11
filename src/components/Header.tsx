"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, ShoppingCart, RefreshCw, CheckCircle2, AlertCircle, Clock, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// In-memory notification cache across page navigations
let cachedNotifications: { list: any[]; unread: number; timestamp: number } | null = null;

// Isolated Live Clock component so Header does not re-render every second
function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span>{time || "01:30 PM"}</span>;
}

export function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>(() => cachedNotifications?.list || []);
  const [unreadCount, setUnreadCount] = useState<number>(() => cachedNotifications?.unread || 0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchNotifications = async (force = false) => {
    const now = Date.now();
    if (!force && cachedNotifications && now - cachedNotifications.timestamp < 15000) {
      setNotifications(cachedNotifications.list);
      setUnreadCount(cachedNotifications.unread);
      return;
    }

    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const list = data.notifications || [];
        const unread = data.unreadCount || 0;
        cachedNotifications = { list, unread, timestamp: now };
        setNotifications(list);
        setUnreadCount(unread);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setUnreadCount(0);
      const updated = notifications.map((n) => ({ ...n, isRead: true }));
      setNotifications(updated);
      if (cachedNotifications) {
        cachedNotifications.list = updated;
        cachedNotifications.unread = 0;
      }
    } catch {
      // ignore
    }
  };

  const handleResetDemo = async () => {
    if (!confirm("Reset and reload the store with 24+ fresh retail products, multi-batch expiries, and 45 sales?")) return;
    setIsResetting(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        cachedNotifications = null;
        setToastMessage("Fresh Demo Data loaded!");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch {
      alert("Failed to reset demo data");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-0 z-30 shadow-xs">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {title || t.dashboard}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live POS Counter
          </span>
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Live Clock Pill (Isolated render) */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/70 text-slate-600 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <LiveClock />
        </div>

        {toastMessage && (
          <div className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse font-bold shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {toastMessage}
          </div>
        )}

        {/* Demo Reset Button */}
        <button
          onClick={handleResetDemo}
          disabled={isResetting}
          title="Reset & seed rich realistic retail data"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-blue-600" : ""}`} />
          <span>Reset Demo</span>
        </button>

        {/* Quick Launch Billing Shortcut Button */}
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition transform active:scale-95"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>New Sale (F2)</span>
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 relative transition"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-bold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-60" />
                    No notifications. All good!
                  </div>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link || "/dashboard"}
                      onClick={() => setShowNotifications(false)}
                      className={`block p-3.5 hover:bg-slate-50 transition text-xs ${
                        !n.isRead ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            n.priority === "HIGH" || n.priority === "CRITICAL"
                              ? "bg-rose-500"
                              : "bg-amber-500"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 leading-tight">{n.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
