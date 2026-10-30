"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Store, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Zap, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshAuth } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      await refreshAuth();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "password123" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      await refreshAuth();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Radial Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher in top right */}
      <div className="absolute top-5 right-5 z-20">
        <LanguageSwitcher />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 shadow-2xl shadow-blue-500/30 mb-4 text-white ring-1 ring-white/20">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Smart Retail Assistant
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 font-medium">
          Intelligent Multi-Batch Expiry, Fast POS Billing & Stock Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="glass-card-dark py-8 px-6 sm:px-9 shadow-2xl rounded-3xl border border-slate-700/70">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Interactive Demo Showcase Direct Entry Hero */}
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-slate-900/80 border border-blue-500/40 shadow-lg text-left relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-blue-300 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Interactive Demo Store</span>
              </div>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                Ready to Show
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mb-3 leading-relaxed">
              Explore <strong className="text-white">Shree Ganesh Supermarket</strong> pre-loaded with 24 Indian FMCG items, 32 FEFO batches, and 45 historical sales.
            </p>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("demo@retail.com")}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-xs font-black shadow-md transition transform active:scale-98"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Enter Live Demo Instantly (1-Click)</span>
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-slate-900 px-2 text-slate-400">Or sign in manually</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shopkeeper@retail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition active:scale-98"
            >
              {loading ? "Authenticating..." : "Sign In to Store"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins with Rich Fake Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 text-center mb-3 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              1-Click Instant Demo Accounts:
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("demo@retail.com")}
                className="py-2.5 px-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-xl text-xs font-medium transition text-left flex flex-col group hover:border-blue-500"
              >
                <span className="font-extrabold text-blue-400 flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" /> Shop Owner
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Full Supermarket Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("cashier@retail.com")}
                className="py-2.5 px-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-xl text-xs font-medium transition text-left flex flex-col group hover:border-emerald-500"
              >
                <span className="font-extrabold text-emerald-400 flex items-center gap-1 text-[11px]">
                  <Zap className="w-3.5 h-3.5 fill-current" /> Cashier POS
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Fast Billing Counter</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400 font-medium">
            Register a new store?{" "}
            <Link href="/register" className="text-blue-400 font-bold hover:underline">
              Create Free Shop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
