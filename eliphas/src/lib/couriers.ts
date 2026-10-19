// Couriers and tracking links. Pure: no network, no secrets.

export const COURIERS = ["India Post", "Delhivery", "DTDC", "Blue Dart", "Ekart", "Xpressbees", "Shiprocket"] as const;

// Couriers whose public tracking page takes the number in the address. Others: the printer pastes the link.
const TRACK_TEMPLATES: Record<string, (n: string) => string> = {
  delhivery: (n) => `https://www.delhivery.com/track/package/${encodeURIComponent(n)}`,
  shiprocket: (n) => `https://shiprocket.co/tracking/${encodeURIComponent(n)}`,
};

/** A tracking link the printer pasted: https only, no login details, at most 500 characters. Returns null if unusable. */
export function cleanTrackingUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (value.length > 500) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Where a reader can track the parcel: the pasted link, else a known courier's page, else null (show the number). */
export function trackingLink(courier: string | null | undefined, number: string | null | undefined, pastedUrl?: string | null): string | null {
  const pasted = cleanTrackingUrl(pastedUrl);
  if (pasted) return pasted;
  if (!courier || !number) return null;
  const make = TRACK_TEMPLATES[courier.trim().toLowerCase()];
  return make ? make(number.trim()) : null;
}
