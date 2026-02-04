import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SearchView from '../components/views/SearchView';

const TAG_MAPPING: Record<string, { tag: string; name: string; nameFr: string }> = {
  'battle-royale': {
    tag: 'battle-royale',
    name: 'Battle Royale',
    nameFr: 'Battle Royale'
  },
  'rpg': {
    tag: 'rpg',
    name: 'RPG',
    nameFr: 'RPG'
  },
  'fps': {
    tag: 'first-person-shooter',
    name: 'FPS',
    nameFr: 'FPS'
  },
  'coop': {
    tag: 'co-op',
    name: 'Co-op',
    nameFr: 'Coopératif'
  },
  'survival': {
    tag: 'survival',
    name: 'Survival',
    nameFr: 'Survie'
  }
};

const TopCategoryPage: React.FC = () => {
  const { tagSlug } = useParams<{ tagSlug: string }>();

  if (!tagSlug || !TAG_MAPPING[tagSlug]) {
    return <Navigate to="/search" replace />;
  }

  const category = TAG_MAPPING[tagSlug];
  const title = `Meilleurs jeux ${category.nameFr} | Classement et avis joueurs`;
  const description = `Découvrez les meilleurs jeux ${category.nameFr} selon les notes et critiques des joueurs. Comparez les titres populaires et trouvez votre prochain jeu.`;
  const intro = `Les jeux ${category.nameFr} regroupent des expériences appréciées par la communauté. Voici le classement basé sur les notes et critiques des joueurs.`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      <div className="container mx-auto px-4 pt-4 pb-8">
        <div className="mb-6 bg-gray-800 rounded-lg p-6">
          <h1 className="text-3xl font-bold text-white mb-3">
            Meilleurs jeux {category.nameFr}
          </h1>
          <p className="text-gray-300 leading-relaxed">
            {intro}
          </p>
        </div>

        <SearchView
          initialFilters={{ tag: category.tag }}
        />
      </div>
    </>
  );
};

export default TopCategoryPage;
