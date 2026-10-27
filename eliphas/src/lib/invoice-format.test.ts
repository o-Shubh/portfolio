import test from "node:test";
import assert from "node:assert/strict";
import { amountInWords, csvField, isGstin, monthRange, numberInWords, registerCsv, registerTotals, taxColumns, type RegisterInvoice } from "./invoice-format.ts";

test("numbers in words, Indian style", () => {
  assert.equal(numberInWords(0), "Zero");
  assert.equal(numberInWords(7), "Seven");
  assert.equal(numberInWords(45), "Forty-Five");
  assert.equal(numberInWords(100), "One Hundred");
  assert.equal(numberInWords(299), "Two Hundred Ninety-Nine");
  assert.equal(numberInWords(1000), "One Thousand");
  assert.equal(numberInWords(123456), "One Lakh Twenty-Three Thousand Four Hundred Fifty-Six");
  assert.equal(numberInWords(10_000_000), "One Crore");
  assert.equal(numberInWords(25_00_10_005), "Twenty-Five Crore Ten Thousand Five");
});

test("amount in words with paise", () => {
  assert.equal(amountInWords(29900), "Rupees Two Hundred Ninety-Nine Only");
  assert.equal(amountInWords(123450), "Rupees One Thousand Two Hundred Thirty-Four and Fifty Paise Only");
  assert.equal(amountInWords(5), "Rupees Zero and Five Paise Only");
});

const line = (rate: number) => ({ description: "x", code: null, quantity: 1, unit_paise: 100, discount_paise: 0, taxable_paise: 100, rate, cgst_paise: 0, sgst_paise: 0, igst_paise: 0, total_paise: 100 });

test("tax columns", () => {
  assert.equal(taxColumns({ inter_state: false, lines: [line(0)] }), "none");
  assert.equal(taxColumns({ inter_state: false, lines: [line(0), line(18)] }), "cgst_sgst");
  assert.equal(taxColumns({ inter_state: true, lines: [line(18)] }), "igst");
});

test("CSV fields are quoted and safe in spreadsheets", () => {
  assert.equal(csvField("plain"), "plain");
  assert.equal(csvField('a "b", c'), '"a ""b"", c"');
  assert.equal(csvField("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvField(null), "");
  assert.equal(csvField("-358.00"), "-358.00", "negative amounts stay numbers");
  assert.equal(csvField("-x"), "'-x");
});

const inv = (kind: string, total: number, extra: Partial<RegisterInvoice> = {}): RegisterInvoice => ({
  number: kind === "invoice" ? "EIP/26-27/00001" : "ECN/26-27/00001", kind, title: kind === "invoice" ? "Invoice" : "Credit note",
  issued_at: "2026-10-31T20:00:00Z", is_test: false, buyer: { name: "Asha, R", state_code: "27" }, place_of_supply: "Maharashtra",
  inter_state: false, lines: [{ ...line(0), code: "4901" }], taxable_paise: total, cgst_paise: 0, sgst_paise: 0, igst_paise: 0,
  total_paise: total, credit_paise: 0, paid_paise: total, payment_reference: "pay_1", ...extra,
});

test("register CSV: India dates, negative credit notes, totals", () => {
  const csv = registerCsv([inv("invoice", 35800), inv("credit_note", 35800, { original_number: "EIP/26-27/00001" })]);
  const rows = csv.trim().split("\r\n");
  assert.equal(rows.length, 3);
  assert.ok(rows[1].startsWith('EIP/26-27/00001,Invoice,2026-11-01,"Asha, R"'), "date is the India date");
  assert.ok(rows[2].includes(",-358.00,"), "credit notes are negative");
  assert.ok(rows[2].includes("EIP/26-27/00001"), "credit note names its invoice");
  const t = registerTotals([inv("invoice", 35800), inv("invoice", 10000), inv("credit_note", 35800)]);
  assert.deepEqual([t.total, t.invoices, t.creditNotes], [10000, 2, 1]);
});

test("month range in India time", () => {
  assert.deepEqual(monthRange("2026-12"), { from: "2026-12-01T00:00:00+05:30", to: "2027-01-01T00:00:00+05:30" });
  assert.equal(monthRange("2026-13"), null);
  assert.equal(monthRange("x"), null);
});

test("GSTIN format", () => {
  assert.ok(isGstin("27ABCDE1234F1Z5"));
  assert.ok(!isGstin("99ABCDE1234F1Z5"), "unknown state code");
  assert.ok(!isGstin("27ABCDE1234F1Z"), "too short");
  assert.ok(!isGstin("27abcde1234f1z5"), "lower case is normalised before checking");
});
