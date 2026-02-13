import React from 'react';
import { trackEvent } from '../lib/analytics';
import { buildInstantGamingSearchUrl } from '../utils/instantGaming';

interface BuyLink {
  name: string;
  store?: string;
  url: string | null;
}

interface BuyLinksProps {
  buyLinks?: BuyLink[];
  stores?: BuyLink[];
  gameId: string | number;
  gameName?: string;
}

const BuyLinks: React.FC<BuyLinksProps> = ({ buyLinks, stores, gameId, gameName }) => {
  const useDirectLinks = Array.isArray(buyLinks) && buyLinks.length > 0;
  const linksToUse = useDirectLinks ? buyLinks : stores || [];

  // Lien Instant Gaming sécurisé (peut être null)
  const instantGamingUrl = buildInstantGamingSearchUrl(gameName);

  const instantGamingLink: BuyLink = {
    name: 'Instant Gaming',
    store: 'instant_gaming',
    url: instantGamingUrl
  };

  const existingLinks = Array.isArray(linksToUse) ? linksToUse : [];

  // Filtrer uniquement les URLs valides
  const filteredStores = existingLinks.filter((s: any) => s.url && s.url.length > 0);

  // Ajouter Instant Gaming uniquement si l'URL est valide
  const allLinks = [
    ...(instantGamingLink.url ? [instantGamingLink] : []),
    ...filteredStores
  ];

  const storeOrder = ['instant', 'steam', 'playstation', 'xbox', 'epic', 'nintendo', 'gog'];

  const sortedStores = [...allLinks].sort((a, b) => {
    const aStore = (a.store || a.name || '').toLowerCase();
    const bStore = (b.store || b.name || '').toLowerCase();

    const aIndex = storeOrder.findIndex(s => aStore.includes(s));
    const bIndex = storeOrder.findIndex(s => bStore.includes(s));

    const aOrder = aIndex === -1 ? 999 : aIndex;
    const bOrder = bIndex === -1 ? 999 : bIndex;

    return aOrder - bOrder;
  });

  const getStoreType = (link: BuyLink): string => {
    const name = (link.store || link.name || '').toLowerCase();
    if (name.includes('steam')) return 'steam';
    if (name.includes('playstation') || name.includes('ps store')) return 'playstation';
    if (name.includes('xbox')) return 'xbox';
    if (name.includes('epic')) return 'epic';
    if (name.includes('nintendo')) return 'nintendo';
    if (name.includes('gog')) return 'gog';
    if (name.includes('instant') || name.includes('gaming')) return 'instant_gaming';
    return 'other';
  };

  const isAffiliateLink = (url: string | null): boolean => {
    if (!url) return false;
    return url.includes('instant-gaming.com') && url.includes('igr=');
  };

  const handleClick = (link: BuyLink) => {
    if (!link.url) return;

    const storeType = getStoreType(link);
    const isAffiliate = isAffiliateLink(link.url);

    let urlHost: string | undefined;
    try {
      urlHost = new URL(link.url).host;
    } catch (e) {
      urlHost = undefined;
    }

    trackEvent('buy_click', {
      store: storeType,
      game_id: gameId?.toString() || null,
      game_name: gameName || null,
      affiliate: isAffiliate,
      url_host: urlHost
    });
  };

  return (
    <span className="text-white font-semibold">
      {sortedStores.map((link, index) => {
        if (!link.url) return null;

        return (
          <React.Fragment key={index}>
            {index > 0 && ' • '}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
              onClick={() => handleClick(link)}
            >
              {link.name}
            </a>
          </React.Fragment>
        );
      })}
    </span>
  );
};

export default BuyLinks;
