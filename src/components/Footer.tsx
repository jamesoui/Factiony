import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const handleCookieSettings = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && (window as any).tarteaucitron) {
      (window as any).tarteaucitron.userInterface.openPanel();
    }
  };

  const links = [
    { label: 'Conditions d\'utilisation', path: '/cgu' },
    { label: 'Politique de confidentialité', path: '/politique-de-confidentialite' },
    { label: 'Politique relative aux cookies', path: '/politique-cookies' },
    { label: 'Accessibilité', path: '/accessibilite' },
    { label: 'Informations sur les publicités', path: '/publicites' },
  ];

  return (
    <footer className="bg-gray-950 border-t border-gray-800 py-4 pb-20 sm:pb-4 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-gray-400">
          {links.map((link, index) => (
            <React.Fragment key={link.path}>
              <Link
                to={link.path}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="hover:text-orange-400 transition-colors duration-200"
              >
                {link.label}
              </Link>
              {index < links.length - 1 && (
                <span className="text-gray-600 hidden sm:inline">|</span>
              )}
            </React.Fragment>
          ))}
          <span className="text-gray-600 hidden sm:inline">|</span>
          <a
            href="#tarteaucitron"
            onClick={handleCookieSettings}
            className="hover:text-orange-400 transition-colors duration-200"
          >
            Gérer mes cookies
          </a>
        </div>
        <div className="text-center text-xs text-gray-500 mt-3">
          © {new Date().getFullYear()} Factiony. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
