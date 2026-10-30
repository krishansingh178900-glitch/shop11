"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "hi" : "en")}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-navy-850 hover:bg-slate-800 text-slate-200 text-xs font-medium transition shadow-sm"
      title="Switch Language / भाषा बदलें"
    >
      <Languages className="w-3.5 h-3.5 text-blue-400" />
      <span>{language === "en" ? "हिन्दी" : "English"}</span>
    </button>
  );
}
