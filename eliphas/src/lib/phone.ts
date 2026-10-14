/** Indian mobile numbers: 10 digits starting with 6, 7, 8 or 9. */
export function cleanIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** "9876543210" -> "+919876543210" (format Supabase expects for sending OTP) */
export const toE164 = (tenDigits: string) => `+91${tenDigits}`;

/** "919876543210" -> "+91 98765 43210" for display */
export function formatPhone(stored: string | null | undefined): string {
  if (!stored) return "";
  const d = stored.replace(/\D/g, "").slice(-10);
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}
