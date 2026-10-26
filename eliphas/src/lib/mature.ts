import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";

/** Set when a visitor confirms they are 18 or older (one year, this browser only). Holds no personal data. */
export const ADULT_COOKIE = "eip_18";

/** Whether this visitor confirmed they are 18 or older, so 18+ books may be shown to them. */
export const seesMature = cache(async () => (await cookies()).get(ADULT_COOKIE)?.value === "1");
