import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Smart Retail Assistant — Stock, Billing & Expiry Management System",
  description:
    "Intelligent POS, multi-batch expiry management (FEFO), automated reports, and stock replenishment for retail shopkeepers.",
};

import { Suspense } from "react";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
