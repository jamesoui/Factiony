export function computeGlobalRating(rawgRating: number, factionyRating?: number): number {
  if (!factionyRating) return rawgRating;

  return parseFloat((factionyRating * 0.6 + rawgRating * 0.4).toFixed(2));
}
