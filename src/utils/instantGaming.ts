export function buildInstantGamingSearchUrl(gameName: string | null | undefined): string {
  const fallbackName = gameName && gameName.trim() ? gameName.trim() : 'Game';
  const encodedQuery = encodeURIComponent(fallbackName);
  return `https://www.instant-gaming.com/fr/rechercher/?q=${encodedQuery}&igr=gamer-7664396`;
}
