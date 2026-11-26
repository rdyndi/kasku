"use client";

import React from "react";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string | number;
  onValueChange: (rawDigits: string) => void;
}

function formatThousandID(val: string | number): string {
  const digits = String(val ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const num = Number(digits);
  if (!Number.isFinite(num)) return "";
  return num.toLocaleString("id-ID");
}

export function CurrencyInput({
  value,
  onValueChange,
  className = "",
  placeholder = "0",
  ...rest
}: CurrencyInputProps) {
  const display = formatThousandID(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    // Strip leading zeros unless the value is just "0"
    const normalized = raw.replace(/^0+(?=\d)/, "");
    onValueChange(normalized);
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
