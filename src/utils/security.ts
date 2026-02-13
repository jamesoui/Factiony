export function sanitizeExternalUrl(url?: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // Autoriser uniquement http/https
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
