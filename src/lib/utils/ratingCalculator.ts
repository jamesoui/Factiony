export function calculateDisplayRating(
  factionyRating?: number | null,
  metacriticScore?: number | null
): number | null {
  const hasFactionyRating = factionyRating != null && factionyRating > 0;
  const hasMetacriticScore = metacriticScore != null && metacriticScore > 0;

  if (!hasFactionyRating && !hasMetacriticScore) {
    return null;
  }

  const metacriticConverted = hasMetacriticScore
    ? parseFloat(((metacriticScore! / 100) * 5).toFixed(2))
    : 0;

  if (hasFactionyRating && hasMetacriticScore) {
    return parseFloat(((factionyRating! + metacriticConverted) / 2).toFixed(2));
  }

  return hasFactionyRating ? factionyRating! : metacriticConverted;
}
