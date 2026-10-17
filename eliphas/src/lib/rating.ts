// Review rating maths (no imports, so it is unit tested directly).

/** The 1–5 average to one decimal place, and how many reviews gave each star rating (index 0 = 1 star). */
export function ratingSummary(ratings: number[]) {
  const valid = ratings.filter((r) => Number.isInteger(r) && r >= 1 && r <= 5);
  const counts = [1, 2, 3, 4, 5].map((n) => valid.filter((r) => r === n).length);
  const average = valid.length ? Math.round((valid.reduce((s, r) => s + r, 0) / valid.length) * 10) / 10 : null;
  return { average, counts, total: valid.length };
}
