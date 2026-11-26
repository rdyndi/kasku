"use client";

import { useState } from "react";
import { MinusCircle, Plus } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";

export interface WithholdingRow {
  label: string;
  type: "pct" | "rp";
  value: string;
}

export interface SummaryExtrasState {
  extraDiscountType: "pct" | "rp";
  extraDiscountValue: string;
  shippingFee: string;
  transactionFee: string;
  withholdings: WithholdingRow[];
  downPayment: string;
}

const fmtNum = (n: number) => Math.round(n || 0).toLocaleString("id-ID");

export function computeExtrasTotals(subtotal: number, taxTotal: number, s: SummaryExtrasState) {
  const discRaw = Number(s.extraDiscountValue) || 0;
  const extraDiscount =
    s.extraDiscountType === "pct" ? (subtotal * discRaw) / 100 : discRaw;
  const shipping = Number(s.shippingFee) || 0;
  const txFee = Number(s.transactionFee) || 0;
  const total = Math.max(0, subtotal + taxTotal - extraDiscount + shipping + txFee);

  const withholdingAmounts = (s.withholdings || []).map((w) => {
    const raw = Number(w.value) || 0;
    return w.type === "pct" ? (total * raw) / 100 : raw;
  });
  const withholding = withholdingAmounts.reduce((a, b) => a + b, 0);
  const downPayment = Number(s.downPayment) || 0;

  const balanceDue = Math.max(0, total - withholding - downPayment);
  return {
    extraDiscount,
    shipping,
    txFee,
    withholdingAmounts,
    withholding,
    downPayment,
    total,
    balanceDue,
  };
}

export function InvoiceSummaryExtras({
  subtotal,
  taxTotal,
  state,
  onChange,
}: {
  subtotal: number;
  taxTotal: number;
  state: SummaryExtrasState;
  onChange: (next: SummaryExtrasState) => void;
}) {
  const [showDisc, setShowDisc] = useState(Number(state.extraDiscountValue) > 0);
  const [showShip, setShowShip] = useState(Number(state.shippingFee) > 0);
  const [showTxFee, setShowTxFee] = useState(Number(state.transactionFee) > 0);
  const [showDp, setShowDp] = useState(Number(state.downPayment) > 0);

  const { extraDiscount, withholdingAmounts, withholding, total, balanceDue } =
    computeExtrasTotals(subtotal, taxTotal, state);

  function addWithholding() {
    onChange({
      ...state,
      withholdings: [
        ...(state.withholdings || []),
        { label: "Potongan / Komisi", type: "pct", value: "0" },
      ],
    });
  }

  function updateWithholding(idx: number, patch: Partial<WithholdingRow>) {
    const next = [...state.withholdings];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...state, withholdings: next });
  }

  function removeWithholding(idx: number) {
    onChange({
      ...state,
      withholdings: state.withholdings.filter((_, i) => i !== idx),
    });
  }

  return (
    <div className="space-y-2.5 text-sm">
      <div className="flex justify-between py-2 border-b border-slate-100">
        <span className="font-semibold text-slate-800">Sub Total</span>
        <span className="font-semibold text-slate-900">{fmtNum(subtotal)}</span>
      </div>

      {taxTotal > 0 && (
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-600">Pajak</span>
          <span className="font-medium text-slate-900">{fmtNum(taxTotal)}</span>
        </div>
      )}

      {/* Tambahan Diskon */}
      {showDisc ? (
        <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowDisc(false);
                onChange({ ...state, extraDiscountValue: "0" });
              }}
              className="text-red-500 hover:text-red-700"
            >
              <MinusCircle className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-800">Tambahan Diskon</span>
            <div className="inline-flex rounded border border-slate-300 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => onChange({ ...state, extraDiscountType: "pct", extraDiscountValue: "0" })}
                className={`px-2 py-1 ${
                  state.extraDiscountType === "pct" ? "bg-blue-50 text-blue-600 font-semibold" : "bg-white text-slate-600"
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...state, extraDiscountType: "rp", extraDiscountValue: "0" })}
                className={`px-2 py-1 ${
                  state.extraDiscountType === "rp" ? "bg-blue-50 text-blue-600 font-semibold" : "bg-white text-slate-600"
                }`}
              >
                Rp
              </button>
            </div>
            {state.extraDiscountType === "pct" ? (
              <input
                type="number"
                min="0"
                max="100"
                value={state.extraDiscountValue}
                onChange={(e) => onChange({ ...state, extraDiscountValue: e.target.value })}
                className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-right"
              />
            ) : (
              <CurrencyInput
                value={state.extraDiscountValue}
                onValueChange={(v) => onChange({ ...state, extraDiscountValue: v })}
                className="w-28 px-2 py-1 border border-slate-300 rounded text-xs text-right"
              />
            )}
          </div>
          <span className="font-semibold text-slate-900">({fmtNum(extraDiscount)})</span>
        </div>
      ) : (
        <div className="flex justify-end py-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setShowDisc(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Tambahan Diskon
          </button>
        </div>
      )}

      {/* Biaya Pengiriman */}
      {showShip ? (
        <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowShip(false);
                onChange({ ...state, shippingFee: "0" });
              }}
              className="text-red-500 hover:text-red-700"
            >
              <MinusCircle className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-800">Biaya pengiriman</span>
            <CurrencyInput
              value={state.shippingFee}
              onValueChange={(v) => onChange({ ...state, shippingFee: v })}
              className="w-28 px-2 py-1 border border-slate-300 rounded text-xs text-right"
            />
          </div>
          <span className="font-semibold text-slate-900">{fmtNum(Number(state.shippingFee) || 0)}</span>
        </div>
      ) : (
        <div className="flex justify-end py-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setShowShip(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Biaya pengiriman
          </button>
        </div>
      )}

      {/* Biaya Transaksi */}
      {showTxFee ? (
        <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowTxFee(false);
                onChange({ ...state, transactionFee: "0" });
              }}
              className="text-red-500 hover:text-red-700"
            >
              <MinusCircle className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-800">Biaya Transaksi</span>
            <CurrencyInput
              value={state.transactionFee}
              onValueChange={(v) => onChange({ ...state, transactionFee: v })}
              className="w-28 px-2 py-1 border border-slate-300 rounded text-xs text-right"
            />
          </div>
          <span className="font-semibold text-slate-900">{fmtNum(Number(state.transactionFee) || 0)}</span>
        </div>
      ) : (
        <div className="flex justify-end py-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setShowTxFee(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Biaya Transaksi
          </button>
        </div>
      )}

      <div className="flex justify-between py-2 border-b border-slate-200 text-base font-bold text-slate-900">
        <span>Total</span>
        <span>{fmtNum(total)}</span>
      </div>

      {/* Multi Pemotongan */}
      {state.withholdings.map((w, idx) => (
        <div key={idx} className="flex items-center justify-between gap-2 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => removeWithholding(idx)}
              className="text-red-500 hover:text-red-700"
            >
              <MinusCircle className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-800">Pemotongan</span>
            <input
              value={w.label}
              onChange={(e) => updateWithholding(idx, { label: e.target.value })}
              placeholder="Keterangan"
              className="w-28 px-2 py-1 border border-slate-300 rounded text-xs"
            />
            <div className="inline-flex rounded border border-slate-300 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => updateWithholding(idx, { type: "pct", value: "0" })}
                className={`px-2 py-1 ${
                  w.type === "pct" ? "bg-blue-50 text-blue-600 font-semibold" : "bg-white text-slate-600"
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => updateWithholding(idx, { type: "rp", value: "0" })}
                className={`px-2 py-1 ${
                  w.type === "rp" ? "bg-blue-50 text-blue-600 font-semibold" : "bg-white text-slate-600"
                }`}
              >
                Rp
              </button>
            </div>
            {w.type === "pct" ? (
              <input
                type="number"
                min="0"
                max="100"
                value={w.value}
                onChange={(e) => updateWithholding(idx, { value: e.target.value })}
                className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
              />
            ) : (
              <CurrencyInput
                value={w.value}
                onValueChange={(v) => updateWithholding(idx, { value: v })}
                className="w-24 px-2 py-1 border border-slate-300 rounded text-xs text-right"
              />
            )}
          </div>
          <span className="font-semibold text-slate-900">({fmtNum(withholdingAmounts[idx] || 0)})</span>
        </div>
      ))}

      <div className="flex justify-end py-1 border-b border-slate-100">
        <button
          type="button"
          onClick={addWithholding}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Pemotongan
        </button>
      </div>

      {state.withholdings.length > 0 && (
        <div className="flex justify-between py-2 border-b border-slate-100 font-bold text-slate-900">
          <span>Total Pemotongan</span>
          <span>{fmtNum(withholding)}</span>
        </div>
      )}

      {/* Uang Muka */}
      {showDp ? (
        <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowDp(false);
                onChange({ ...state, downPayment: "0" });
              }}
              className="text-red-500 hover:text-red-700"
            >
              <MinusCircle className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-800">Uang muka</span>
            <CurrencyInput
              value={state.downPayment}
              onValueChange={(v) => onChange({ ...state, downPayment: v })}
              className="w-28 px-2 py-1 border border-slate-300 rounded text-xs text-right"
            />
          </div>
          <span className="font-semibold text-slate-900">({fmtNum(Number(state.downPayment) || 0)})</span>
        </div>
      ) : (
        <div className="flex justify-end py-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setShowDp(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Uang muka
          </button>
        </div>
      )}

      <div className="flex justify-between py-2 text-base font-bold text-slate-900">
        <span>Sisa Tagihan</span>
        <span>{fmtNum(balanceDue)}</span>
      </div>
    </div>
  );
}
