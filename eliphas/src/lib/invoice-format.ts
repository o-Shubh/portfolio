// Invoice helpers with no app imports, unit tested directly. The database issues invoices (migration 000026);
// these only format them: amounts in words, line and tax totals, and the CSV rows for the accountant.

export type InvoiceLine = {
  description: string;
  code: string | null; // HSN (goods) or SAC (services)
  quantity: number;
  unit_paise: number;
  discount_paise: number;
  taxable_paise: number;
  rate: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_paise: number;
};

export type InvoiceParty = {
  name?: string;
  legal_name?: string;
  address?: string;
  city?: string;
  state?: string | null;
  state_code?: string | null;
  pincode?: string;
  gstin?: string | null;
  email?: string | null;
  phone?: string;
  order_number?: string;
};

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
  "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`;
}

function belowThousand(n: number) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

/** Whole rupees in words, Indian style (crore, lakh, thousand): 123456 → "One Lakh Twenty-Three Thousand Four Hundred Fifty-Six". */
export function numberInWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${numberInWords(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(" ");
}

/** The amount line printed on Indian invoices: 123450 paise → "Rupees One Thousand Two Hundred Thirty-Four and Fifty Paise Only". */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  return `Rupees ${numberInWords(rupees)}${p ? ` and ${belowHundred(p)} Paise` : ""} Only`;
}

/** A GSTIN: a known 2-digit state code, then 13 letters and digits (the format check, not a registration check). */
export function isGstin(v: string): boolean {
  if (!/^[0-9]{2}[0-9A-Z]{13}$/.test(v)) return false;
  const code = Number(v.slice(0, 2));
  return code >= 1 && code <= 38 && code !== 28;
}

/** Which tax columns to show: none when no line carries GST; IGST for an inter-state supply, else CGST and SGST. */
export function taxColumns(inv: { inter_state: boolean; lines: InvoiceLine[] }): "none" | "igst" | "cgst_sgst" {
  if (!inv.lines.some((l) => l.rate > 0)) return "none";
  return inv.inter_state ? "igst" : "cgst_sgst";
}

/** One field of a CSV file: quoted when needed, and protected against spreadsheet formulas. */
export function csvField(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`; // numbers (e.g. -358.00) stay numbers
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export type RegisterInvoice = {
  number: string;
  kind: string;
  title: string;
  issued_at: string;
  is_test: boolean;
  buyer: InvoiceParty;
  place_of_supply: string | null;
  inter_state: boolean;
  lines: InvoiceLine[];
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_paise: number;
  credit_paise: number;
  paid_paise: number;
  payment_reference: string | null;
  original_number?: string | null;
};

const rs = (paise: number, sign = 1) => ((sign * paise) / 100).toFixed(2);

export const REGISTER_HEADER = [
  "Number", "Type", "Date", "Buyer", "Buyer GSTIN", "Place of supply", "State code", "Inter-state", "HSN/SAC",
  "Taxable value", "CGST", "SGST", "IGST", "Total", "Paid with credit", "Paid online", "Payment reference", "Against invoice", "Test",
];

/**
 * One CSV row per document. Credit notes are negative, so a month's column totals are the net figures.
 * Dates are in India time (YYYY-MM-DD).
 */
export function registerRow(inv: RegisterInvoice): (string | number)[] {
  const sign = inv.kind === "credit_note" ? -1 : 1;
  const date = new Date(inv.issued_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const codes = [...new Set(inv.lines.map((l) => l.code).filter(Boolean))].join(" ");
  return [
    inv.number, inv.title, date, inv.buyer.name ?? "", inv.buyer.gstin ?? "", inv.place_of_supply ?? "", inv.buyer.state_code ?? "",
    inv.inter_state ? "Yes" : "No", codes, rs(inv.taxable_paise, sign), rs(inv.cgst_paise, sign), rs(inv.sgst_paise, sign),
    rs(inv.igst_paise, sign), rs(inv.total_paise, sign), rs(inv.credit_paise, sign), rs(inv.paid_paise, sign),
    inv.payment_reference ?? "", inv.original_number ?? "", inv.is_test ? "Yes" : "No",
  ];
}

export function registerCsv(rows: RegisterInvoice[]): string {
  return [REGISTER_HEADER, ...rows.map(registerRow)].map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}

/** Net totals for a list of documents (credit notes subtract). */
export function registerTotals(rows: Pick<RegisterInvoice, "kind" | "taxable_paise" | "cgst_paise" | "sgst_paise" | "igst_paise" | "total_paise">[]) {
  const t = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0, invoices: 0, creditNotes: 0 };
  for (const r of rows) {
    const s = r.kind === "credit_note" ? -1 : 1;
    t.taxable += s * r.taxable_paise;
    t.cgst += s * r.cgst_paise;
    t.sgst += s * r.sgst_paise;
    t.igst += s * r.igst_paise;
    t.total += s * r.total_paise;
    if (s > 0) t.invoices++;
    else t.creditNotes++;
  }
  return t;
}

/** "2026-10" → the first instant of that month and of the next, in India time (for filtering by month). */
export function monthRange(month: string): { from: string; to: string } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const pad = (n: number) => String(n).padStart(2, "0");
  const next = mo === 12 ? `${y + 1}-01` : `${y}-${pad(mo + 1)}`;
  return { from: `${y}-${pad(mo)}-01T00:00:00+05:30`, to: `${next}-01T00:00:00+05:30` };
}
