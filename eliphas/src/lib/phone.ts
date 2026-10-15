/** Countries offered at login. `dial` is the calling code without "+". */
export const COUNTRIES = [
  { iso: "IN", name: "India", dial: "91" },
  { iso: "US", name: "United States", dial: "1" },
  { iso: "GB", name: "United Kingdom", dial: "44" },
  { iso: "CA", name: "Canada", dial: "1" },
  { iso: "AU", name: "Australia", dial: "61" },
  { iso: "NZ", name: "New Zealand", dial: "64" },
  { iso: "IE", name: "Ireland", dial: "353" },
  { iso: "AE", name: "United Arab Emirates", dial: "971" },
  { iso: "SA", name: "Saudi Arabia", dial: "966" },
  { iso: "QA", name: "Qatar", dial: "974" },
  { iso: "KW", name: "Kuwait", dial: "965" },
  { iso: "OM", name: "Oman", dial: "968" },
  { iso: "BH", name: "Bahrain", dial: "973" },
  { iso: "SG", name: "Singapore", dial: "65" },
  { iso: "MY", name: "Malaysia", dial: "60" },
  { iso: "HK", name: "Hong Kong", dial: "852" },
  { iso: "JP", name: "Japan", dial: "81" },
  { iso: "NP", name: "Nepal", dial: "977" },
  { iso: "LK", name: "Sri Lanka", dial: "94" },
  { iso: "BD", name: "Bangladesh", dial: "880" },
  { iso: "MU", name: "Mauritius", dial: "230" },
  { iso: "ZA", name: "South Africa", dial: "27" },
  { iso: "KE", name: "Kenya", dial: "254" },
  { iso: "NG", name: "Nigeria", dial: "234" },
  { iso: "DE", name: "Germany", dial: "49" },
  { iso: "FR", name: "France", dial: "33" },
  { iso: "NL", name: "Netherlands", dial: "31" },
  { iso: "ES", name: "Spain", dial: "34" },
  { iso: "IT", name: "Italy", dial: "39" },
  { iso: "SE", name: "Sweden", dial: "46" },
  { iso: "CH", name: "Switzerland", dial: "41" },
  { iso: "FJ", name: "Fiji", dial: "679" },
] as const;

export type CountryIso = (typeof COUNTRIES)[number]["iso"];
export const DEFAULT_COUNTRY: CountryIso = "IN";

export const countryByIso = (iso: string) => COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0];

/** Indian mobile numbers: 10 digits starting with 6, 7, 8 or 9. */
export function cleanIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/**
 * A mobile number typed for the chosen country -> "+<code><number>" (E.164, what Supabase expects),
 * or null if it can't be a valid number. India is checked strictly; other countries by length.
 */
export function toInternational(iso: string, input: string): string | null {
  const { dial } = countryByIso(iso);
  if (dial === "91") {
    const m = cleanIndianMobile(input);
    return m ? `+91${m}` : null;
  }
  let digits = input.replace(/\D/g, "");
  if (input.trim().startsWith("+") || input.trim().startsWith("00")) {
    digits = digits.replace(/^00/, "");
    if (!digits.startsWith(dial)) return null;
    digits = digits.slice(dial.length);
  }
  digits = digits.replace(/^0+/, ""); // trunk prefix, e.g. UK 07… -> 7…
  const total = dial.length + digits.length;
  return digits.length >= 6 && total >= 8 && total <= 15 ? `+${dial}${digits}` : null;
}

/** "9876543210" -> "+919876543210" (Indian numbers only; used for delivery phones) */
export const toE164 = (tenDigits: string) => `+91${tenDigits}`;

/** Stored "919876543210" -> "+91 98765 43210"; other countries -> "+44 7911 123456" */
export function formatPhone(stored: string | null | undefined): string {
  if (!stored) return "";
  const d = stored.replace(/\D/g, "");
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  // Longest matching calling code
  const dial = [...new Set(COUNTRIES.map((c) => c.dial))]
    .sort((a, b) => b.length - a.length)
    .find((code) => d.startsWith(code));
  if (!dial) return `+${d}`;
  const rest = d.slice(dial.length);
  const groups = rest.length > 7 ? [rest.slice(0, rest.length - 6), rest.slice(-6)] : [rest];
  return `+${dial} ${groups.join(" ")}`;
}
