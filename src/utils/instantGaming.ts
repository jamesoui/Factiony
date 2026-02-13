import { sanitizeExternalUrl } from './security';

/**
 * Construit une URL de recherche Instant Gaming sécurisée
 * (bloque schémas dangereux et URLs invalides)
 */
export function buildInstantGamingSearchUrl(
  gameName: string | null | undefined
): string | null {
  const fallbackName =
    gameName && gameName.trim() ? gameName.trim() : 'Game';

  const encodedQuery = encodeURIComponent(fallbackName);

  const url = `https://www.instant-gaming.com/fr/rechercher/?q=${encodedQuery}&igr=gamer-7664396`;

  return sanitizeExternalUrl(url);
}
