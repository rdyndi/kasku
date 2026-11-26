"use client";

import { terbilangRupiah } from "@/lib/terbilang";

interface PrintableItem {
  id: string;
  productName?: string;
  description: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

interface PrintablePayment {
  id: string;
  paymentNo: string;
  paymentDate: string;
  method: string;
  allocatedAmount: number;
}

export function PrintableDocument({
  docTitle,
  docNo,
  transDate,
  dueDate,
  company,
  contactLabel,
  contact,
  items,
  subtotal,
  grandTotal,
  payments,
  balanceDue,
}: {
  docTitle: string;
  docNo: string;
  transDate: string;
  dueDate: string;
  company: { name: string; address: string | null; phone: string | null; email: string | null };
  contactLabel: string;
  contact: { name: string; address: string | null; phone: string | null; email: string | null };
  items: PrintableItem[];
  subtotal: number;
  grandTotal: number;
  payments: PrintablePayment[];
  balanceDue: number;
}) {
  const fmtIDR = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);
  const fmtNum = (v: number) => Math.round(Number(v) || 0).toLocaleString("id-ID");

  return (
    <div className="hidden print:block bg-white text-slate-900 p-6 text-xs leading-relaxed">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="text-2xl font-bold text-[#4a6fa5]">{company.name}</div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#4a6fa5] mb-2">{docTitle}</div>
          <table className="ml-auto text-xs">
            <tbody>
              <tr>
                <td className="pr-6 text-slate-600 text-left">Nomor</td>
                <td className="font-medium text-right">{docNo}</td>
              </tr>
              <tr>
                <td className="pr-6 text-slate-600 text-left">Tanggal</td>
                <td className="text-right">{new Date(transDate).toLocaleDateString("id-ID")}</td>
              </tr>
              <tr>
                <td className="pr-6 text-slate-600 text-left">Tgl. Jatuh Tempo</td>
                <td className="text-right">{new Date(dueDate).toLocaleDateString("id-ID")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Perusahaan & Tagihan Kepada */}
      <div className="grid grid-cols-2 gap-10 mb-7">
        <div>
          <div className="font-bold text-slate-800 pb-1.5 mb-2.5 border-b-2 border-[#26354d]">
            Informasi Perusahaan
          </div>
          <div className="font-semibold text-[#4a6fa5] mb-1">{company.name}</div>
          {company.address && <div className="text-slate-600 whitespace-pre-line">{company.address}</div>}
          {company.phone && <div className="text-slate-600">Telp: {company.phone}</div>}
          {company.email && <div className="text-slate-600">Email: {company.email}</div>}
        </div>
        <div>
          <div className="font-bold text-slate-800 pb-1.5 mb-2.5 border-b-2 border-[#26354d]">
            {contactLabel}
          </div>
          <div className="font-semibold text-[#4a6fa5] mb-1">{contact.name}</div>
          {contact.address && <div className="text-slate-600 whitespace-pre-line">{contact.address}</div>}
          {contact.phone && <div className="text-slate-600">Telp: {contact.phone}</div>}
          {contact.email && <div className="text-slate-600">Email: {contact.email}</div>}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-[#26354d] text-white">
            <th className="py-2.5 px-3 text-left font-semibold">Produk</th>
            <th className="py-2.5 px-3 text-left font-semibold">Deskripsi</th>
            <th className="py-2.5 px-3 text-right font-semibold">Kuantitas</th>
            <th className="py-2.5 px-3 text-right font-semibold">Harga</th>
            <th className="py-2.5 px-3 text-right font-semibold">Diskon</th>
            <th className="py-2.5 px-3 text-right font-semibold">Pajak</th>
            <th className="py-2.5 px-3 text-right font-semibold">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id} className={idx % 2 === 0 ? "bg-[#f3f5f8]" : "bg-white"}>
              <td className="py-2.5 px-3 font-medium text-slate-800">{it.productName || it.description}</td>
              <td className="py-2.5 px-3 text-slate-600">{it.description}</td>
              <td className="py-2.5 px-3 text-right">{it.qty}</td>
              <td className="py-2.5 px-3 text-right">{fmtNum(it.unitPrice)}</td>
              <td className="py-2.5 px-3 text-right">0%</td>
              <td className="py-2.5 px-3 text-right">{it.taxRate > 0 ? `${it.taxRate}%` : ""}</td>
              <td className="py-2.5 px-3 text-right font-medium">{fmtNum(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Right */}
      <div className="flex justify-end mb-8">
        <div className="w-72 space-y-2">
          <div className="flex justify-between">
            <span className="font-bold">Subtotal</span>
            <span className="font-bold">{fmtIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold underline">
            <span>Total</span>
            <span>{fmtIDR(grandTotal)}</span>
          </div>
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between items-start pt-1">
              <div>
                <div className="font-bold">
                  {p.paymentNo} ({p.method})
                </div>
                <div className="text-[11px] text-slate-600">
                  {new Date(p.paymentDate).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
              <span className="font-bold">{fmtIDR(p.allocatedAmount)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold">
            <span>Sisa Tagihan</span>
            <span>{fmtIDR(balanceDue)}</span>
          </div>
        </div>
      </div>

      {/* Terbilang & Dengan Hormat */}
      <div className="flex justify-between items-end pt-4">
        <div>
          <div className="font-semibold text-slate-800">Terbilang</div>
          <div className="text-slate-700">{terbilangRupiah(grandTotal)}</div>
        </div>
        <div className="text-right pr-8">
          <div>Dengan Hormat,</div>
          <div className="mt-12 font-semibold text-slate-800">{company.name}</div>
        </div>
      </div>
    </div>
  );
}
