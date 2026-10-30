"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Camera, Barcode, Check } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onDetected }: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const timer = setTimeout(async () => {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!isMounted) return;
        const scanner = new Html5QrcodeScanner(
          "barcode-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 180 },
            rememberLastUsedCamera: true,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            onDetected(decodedText);
            onClose();
          },
          () => {
            // scan failure per frame - normal
          }
        );

        scannerRef.current = scanner;
      } catch (err) {
        console.warn("Camera scanner init failed:", err);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, onDetected, onClose]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onDetected(manualCode.trim());
      setManualCode("");
      onClose();
    }
  };

  const sampleBarcodes = [
    { name: "Amul Milk 500ml", code: "8901262010012" },
    { name: "Maggi Noodles 70g", code: "8901058852309" },
    { name: "Tata Salt 1kg", code: "8904043901005" },
    { name: "Aashirvaad Atta 5kg", code: "8901725131238" },
    { name: "Coca-Cola 750ml", code: "8901764012217" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold">Scan Barcode / QR Code</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera Viewport Container */}
          <div
            id="barcode-reader"
            className="w-full rounded-xl overflow-hidden bg-slate-100 min-h-[200px] border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500"
          >
            Initializing camera scanner...
          </div>

          {/* Quick Manual Entry */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Or type/paste barcode number..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
            >
              Add
            </button>
          </form>

          {/* Quick Test Barcodes */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 mb-2">
              Quick Test Barcodes (Click to simulate scan):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sampleBarcodes.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => {
                    onDetected(s.code);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-md font-mono transition text-slate-700 flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-slate-400" />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
