const SATUAN = [
  "",
  "Satu",
  "Dua",
  "Tiga",
  "Empat",
  "Lima",
  "Enam",
  "Tujuh",
  "Delapan",
  "Sembilan",
  "Sepuluh",
  "Sebelas",
];

function terbilangAngka(n: number): string {
  const num = Math.floor(Math.abs(n));
  if (num < 12) return SATUAN[num];
  if (num < 20) return `${terbilangAngka(num - 10)} Belas`;
  if (num < 100) return `${terbilangAngka(Math.floor(num / 10))} Puluh ${terbilangAngka(num % 10)}`.trim();
  if (num < 200) return `Seratus ${terbilangAngka(num - 100)}`.trim();
  if (num < 1000) return `${terbilangAngka(Math.floor(num / 100))} Ratus ${terbilangAngka(num % 100)}`.trim();
  if (num < 2000) return `Seribu ${terbilangAngka(num - 1000)}`.trim();
  if (num < 1_000_000) return `${terbilangAngka(Math.floor(num / 1000))} Ribu ${terbilangAngka(num % 1000)}`.trim();
  if (num < 1_000_000_000) return `${terbilangAngka(Math.floor(num / 1_000_000))} Juta ${terbilangAngka(num % 1_000_000)}`.trim();
  if (num < 1_000_000_000_000) return `${terbilangAngka(Math.floor(num / 1_000_000_000))} Miliar ${terbilangAngka(num % 1_000_000_000)}`.trim();
  return `${terbilangAngka(Math.floor(num / 1_000_000_000_000))} Triliun ${terbilangAngka(num % 1_000_000_000_000)}`.trim();
}

export function terbilangRupiah(n: number): string {
  const rounded = Math.round(Number(n) || 0);
  if (rounded === 0) return "Nol Rupiah";
  const prefix = rounded < 0 ? "Minus " : "";
  return `${prefix}${terbilangAngka(rounded).replace(/\s+/g, " ").trim()} Rupiah`;
}
