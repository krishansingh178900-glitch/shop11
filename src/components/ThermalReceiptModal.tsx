"use client";

import React, { useRef } from "react";
import { Printer, Download, X, CheckCircle2 } from "lucide-react";


interface SaleReceiptData {
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  createdAt: string | Date;
  paymentMethod: string;
  upiReference?: string | null;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    batchNumber?: string;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  shopName?: string;
  shopAddress?: string;
  currency?: string;
}

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SaleReceiptData | null;
}

export function ThermalReceiptModal({ isOpen, onClose, data }: ThermalReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const currency = data.currency || "₹";
  const formattedDate = new Date(data.createdAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 200], // 80mm POS roll format
      });

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(data.shopName || "SMART RETAIL STORE", 40, 10, { align: "center" });

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      if (data.shopAddress) {
        doc.text(data.shopAddress, 40, 15, { align: "center", maxWidth: 70 });
      }

      doc.text("-------------------------------------------------", 40, 22, { align: "center" });
      doc.text(`Invoice: ${data.invoiceNumber}`, 5, 27);
      doc.text(`Date: ${formattedDate}`, 5, 31);
      if (data.customerName) {
        doc.text(`Customer: ${data.customerName}`, 5, 35);
      }
      doc.text(`Payment: ${data.paymentMethod}`, 5, data.customerName ? 39 : 35);

      const tableData = data.items.map((i) => [
        i.productName,
        `${i.quantity}`,
        `${currency}${i.unitPrice.toFixed(2)}`,
        `${currency}${i.totalAmount.toFixed(2)}`,
      ]);

      const startY = data.customerName ? 43 : 39;

      autoTable(doc, {
        startY,
        margin: { left: 4, right: 4 },
        head: [["Item", "Qty", "Price", "Total"]],
        body: tableData,
        theme: "plain",
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fontStyle: "bold", fontSize: 7 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 5;

      doc.setFontSize(8);
      doc.text(`Subtotal:`, 40, finalY);
      doc.text(`${currency}${data.subtotal.toFixed(2)}`, 74, finalY, { align: "right" });

      if (data.discountAmount > 0) {
        doc.text(`Discount:`, 40, finalY + 4);
        doc.text(`-${currency}${data.discountAmount.toFixed(2)}`, 74, finalY + 4, { align: "right" });
      }

      if (data.taxAmount > 0) {
        doc.text(`GST / Tax:`, 40, finalY + 8);
        doc.text(`${currency}${data.taxAmount.toFixed(2)}`, 74, finalY + 8, { align: "right" });
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`Grand Total:`, 40, finalY + 13);
      doc.text(`${currency}${data.grandTotal.toFixed(2)}`, 74, finalY + 13, { align: "right" });

      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text("Thank you for shopping with us!", 40, finalY + 22, { align: "center" });

      doc.save(`Invoice_${data.invoiceNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF, please use Print.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Action Header */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Sale Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
              title="Print Thermal Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
              title="Download PDF Invoice"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Receipt Paper Layout */}
        <div className="p-4 bg-slate-100 flex justify-center">
          <div
            id="printable-receipt"
            ref={receiptRef}
            className="w-full max-w-[320px] bg-white p-5 shadow-sm border border-slate-200 font-mono text-xs text-slate-800 rounded-sm"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-bold text-sm tracking-wide text-slate-900">
                {data.shopName || "SHREE GANESH RETAIL"}
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {data.shopAddress || "Main Market, MG Road, Pune"}
              </p>
              <p className="text-[10px] text-slate-500">Retail Tax Invoice</p>
            </div>

            {/* Bill Meta */}
            <div className="py-2.5 text-[11px] border-b border-dashed border-slate-300 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-bold">{data.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span>{formattedDate}</span>
              </div>
              {data.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span>{data.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Payment:</span>
                <span className="font-semibold text-emerald-700">{data.paymentMethod}</span>
              </div>
              {data.upiReference && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Ref:</span>
                  <span className="truncate max-w-[140px]">{data.upiReference}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 text-[10px] font-bold text-slate-500 pb-1 border-b border-slate-200">
                <span className="col-span-6">ITEM</span>
                <span className="col-span-2 text-center">QTY</span>
                <span className="col-span-2 text-right">RATE</span>
                <span className="col-span-2 text-right">AMT</span>
              </div>
              <div className="divide-y divide-slate-100 py-1">
                {data.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-1 text-[11px] items-center">
                    <span className="col-span-6 font-medium truncate">{item.productName}</span>
                    <span className="col-span-2 text-center">{item.quantity}</span>
                    <span className="col-span-2 text-right">{item.unitPrice.toFixed(0)}</span>
                    <span className="col-span-2 text-right font-semibold">
                      {item.totalAmount.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Calculation */}
            <div className="py-2.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span>
                  {currency}
                  {data.subtotal.toFixed(2)}
                </span>
              </div>
              {data.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>
                    -{currency}
                    {data.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}
              {data.taxAmount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>GST / Tax:</span>
                  <span>
                    +{currency}
                    {data.taxAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-300 text-slate-900">
                <span>Grand Total:</span>
                <span>
                  {currency}
                  {data.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
              <p>Thank you for shopping with us!</p>
              <p className="text-[9px] mt-0.5">Goods once sold cannot be returned without receipt</p>
            </div>
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Receipt
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            PDF Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
