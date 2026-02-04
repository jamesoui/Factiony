export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function gameToSlug(gameId: number, gameName: string): string {
  return `${slugify(gameName)}-${gameId}`;
}

export function slugToGameId(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
