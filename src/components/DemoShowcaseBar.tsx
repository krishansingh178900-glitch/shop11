"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  CalendarClock,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  Receipt,
  Store,
} from "lucide-react";
import { DemoTourModal } from "./DemoTourModal";
import { invalidateCache } from "@/lib/cached-fetch";

export function DemoShowcaseBar() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const handleSimulateSale = async () => {
    setIsSimulating(true);
    setSimulationResult(null);

    try {
      const res = await fetch("/api/demo/simulate-sale", { method: "POST" });
      const data = await res.json();

      if (res.ok && data.success) {
        setSimulationResult(data.sale);
        invalidateCache("/api");

        // Synthesize nice checkout chime
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "triangle";
          osc.frequency.setValueAtTime(523.25, ctx.currentTime);
          osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch {
          // ignore
        }

        // Hide notification after 8 seconds
        setTimeout(() => {
          setSimulationResult(null);
        }, 8000);
      } else {
        alert(data.error || "Simulation failed. Please reset demo data first.");
      }
    } catch (err: any) {
      alert("Error simulating sale: " + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm("Reload fresh demo database with 24+ Indian FMCG items, multi-batches, and 45 sales?")) return;
    setIsResetting(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        invalidateCache();
        window.location.reload();
      } else {
        alert("Reset failed");
      }
    } catch {
      alert("Reset error");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 text-white border-b border-slate-800 text-xs shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Demo Store Identity */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LIVE DEMO STORE</span>
            </div>
            <span className="font-semibold text-slate-200 hidden md:inline">
              Shree Ganesh Supermarket (Pune)
            </span>
            <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">24 FMCG Items</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">32 Multi-Batches</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">FEFO Active</span>
            </div>
          </div>

          {/* Right: Interactive Showcase Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click Sale Simulation Button */}
            <button
              onClick={handleSimulateSale}
              disabled={isSimulating}
              title="Instantly simulates a customer purchase with real FEFO stock deduction, invoice generation & audio chime"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-500/20 transition active:scale-95"
            >
              <Zap className={`w-3.5 h-3.5 fill-current ${isSimulating ? "animate-spin" : ""}`} />
              <span>{isSimulating ? "Simulating..." : "⚡ Simulate Customer Sale"}</span>
            </button>

            {/* Expiry Risk Showcase Link */}
            <Link
              href="/dashboard/expiry"
              title="Showcase FEFO Expiry tracking with expired and near-expiry batches"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold transition"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Expiry Crisis</span>
            </Link>

            {/* Low Stock Showcase Link */}
            <Link
              href="/dashboard/low-stock"
              title="Showcase Maggi (6 pkts) and Parle-G (Stockout)"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Stockout Alert</span>
            </Link>

            {/* Feature Tour Modal Trigger */}
            <button
              onClick={() => setIsTourOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold border border-white/15 transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Tour</span>
            </button>

            {/* Quick Demo Reset */}
            <button
              onClick={handleResetDemo}
              disabled={isResetting}
              title="Reload fresh demo data"
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-blue-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Live Simulation Success Toast */}
        {simulationResult && (
          <div className="bg-emerald-950/90 border-t border-emerald-700/80 px-4 py-2 text-white animate-in slide-in-from-top duration-200">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong className="text-emerald-300">Live Sale Simulated:</strong> Bill{" "}
                  <span className="font-mono font-bold text-white">#{simulationResult.invoiceNumber}</span> for{" "}
                  <strong>{simulationResult.customerName}</strong> ({simulationResult.items?.join(", ")}) —{" "}
                  <strong className="text-emerald-300">₹{simulationResult.totalAmount.toFixed(2)}</strong> paid via{" "}
                  <span className="font-mono bg-emerald-900/80 px-1.5 py-0.5 rounded text-[11px] text-emerald-200">
                    {simulationResult.paymentMethod}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/sales"
                  className="text-emerald-300 hover:text-white font-bold underline text-[11px]"
                >
                  View in Sales Log →
                </Link>
                <button
                  onClick={() => setSimulationResult(null)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guided Feature Tour Modal */}
      <DemoTourModal isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
    </>
  );
}
