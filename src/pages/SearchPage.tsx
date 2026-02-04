import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import SearchView from '../components/views/SearchView';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <>
      <Helmet>
        <title>{query ? `Recherche: ${query} - Factiony` : 'Recherche - Factiony'}</title>
        <meta name="description" content="Recherche et découvre des milliers de jeux vidéo sur Factiony." />
      </Helmet>
      <SearchView initialQuery={query} />
    </>
  );
};

export default SearchPage;
