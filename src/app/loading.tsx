import React from "react";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
        Loading...
      </p>
    </div>
  );
}
