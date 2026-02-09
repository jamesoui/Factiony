import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface CookiePolicyViewProps {
  onViewChange?: (view: string) => void;
}

const LAST_UPDATED = '09/02/2026';

const CookiePolicyView: React.FC<CookiePolicyViewProps> = ({ onViewChange }) => {
  const handleCookieSettings = () => {
    if (typeof window !== 'undefined' && (window as any).tarteaucitron) {
      (window as any).tarteaucitron.userInterface.openPanel();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {onViewChange && (
          <button
            onClick={() => onViewChange('home')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
        )}

        <div className="bg-gray-800 rounded-lg p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Politique relative aux Cookies</h1>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
            <p className="text-sm text-gray-400">Dernière mise à jour : {LAST_UPDATED}</p>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
              <p className="text-orange-400 font-medium">
                Vous pouvez gérer vos préférences de cookies à tout moment en cliquant sur le bouton ci-dessous :
              </p>
              <button
                onClick={handleCookieSettings}
                className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Gérer mes cookies
              </button>
              <p className="text-sm text-gray-400 mt-3">
                Les cookies non essentiels (mesure d&apos;audience, publicité, affiliation) ne sont déposés qu&apos;avec votre consentement,
                que vous pouvez retirer à tout moment.
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
              <p>
                Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, smartphone, tablette) lorsque vous visitez un site web.
                Les cookies permettent au site de mémoriser vos actions et préférences pendant une certaine période.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Base légale et consentement</h2>
              <p>
                Les cookies strictement nécessaires au fonctionnement du site (dits « essentiels ») peuvent être déposés sans consentement.
                Les cookies non essentiels (mesure d&apos;audience, publicité, personnalisation, affiliation) sont déposés uniquement si vous y consentez
                via le bandeau/gestionnaire de cookies. Vous pouvez retirer votre consentement à tout moment via le gestionnaire de cookies.
              </p>
              <p className="mt-2">
                Aucun cookie publicitaire ou de mesure d&apos;audience ne doit être déposé avant acceptation, sauf paramétrage contraire de votre navigateur
                ou cas où vous avez déjà exprimé un choix enregistré par le gestionnaire de cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Comment utilisons-nous les cookies ?</h2>
              <p>Factiony utilise des cookies pour :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Vous garder connecté à votre compte</li>
                <li>Mémoriser vos préférences (langue, thème, etc.)</li>
                <li>Comprendre comment vous utilisez notre service (si vous l&apos;acceptez)</li>
                <li>Améliorer les performances du site</li>
                <li>Personnaliser votre expérience (si vous l&apos;acceptez)</li>
                <li>Mesurer l&apos;efficacité de nos communications</li>
                <li>Mesurer l&apos;efficacité des publicités et/ou des liens affiliés (si vous l&apos;acceptez)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Types de cookies utilisés</h2>

              <div className="space-y-4 mt-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Cookies essentiels (obligatoires)</h3>
                  <p>
                    Ces cookies sont nécessaires au fonctionnement du site. Ils permettent notamment l&apos;authentification, la navigation et l&apos;accès
                    aux fonctionnalités de base. Sans ces cookies, le service ne peut pas fonctionner correctement.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Exemples : cookies de session, cookies d&apos;authentification, cookies de sécurité
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Cookies de performance (optionnels)</h3>
                  <p>
                    Ces cookies collectent des informations sur la façon dont vous utilisez le site (pages visitées, temps passé, erreurs rencontrées).
                    Ils nous aident à améliorer le fonctionnement du site.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">Exemples : mesures de performance, analytics</p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Cookies de fonctionnalité (optionnels)</h3>
                  <p>
                    Ces cookies permettent au site de mémoriser vos choix (langue, région, préférences d&apos;affichage) pour vous offrir une expérience personnalisée.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">Exemples : préférences de langue, paramètres d&apos;interface</p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Cookies publicitaires et d&apos;affiliation (optionnels)</h3>
                  <p>
                    Ces cookies peuvent être utilisés pour vous proposer des publicités pertinentes, mesurer l&apos;efficacité des campagnes, limiter la répétition des annonces
                    et/ou mesurer les commissions liées aux liens affiliés. Ils peuvent suivre votre navigation sur différents sites.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">Exemples : cookies de ciblage publicitaire, remarketing, suivi d&apos;affiliation</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Cookies tiers</h2>
              <p>Nous pouvons utiliser des cookies de tiers de confiance, notamment :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li><strong>Mesure d&apos;audience :</strong> outils d&apos;analytics (si activés par votre consentement)</li>
                <li><strong>Réseaux publicitaires :</strong> diffusion et mesure de performance publicitaire (si activés)</li>
                <li><strong>Affiliation :</strong> mesure des performances des liens affiliés (si activés)</li>
                <li><strong>Réseaux sociaux :</strong> partage de contenu (si activés)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Durée de conservation</h2>
              <p>La durée de conservation des cookies varie selon leur type :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li><strong>Cookies de session :</strong> supprimés à la fermeture du navigateur</li>
                <li><strong>Cookies persistants :</strong> conservés entre 30 jours et 13 mois maximum</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Gérer vos préférences de cookies</h2>
              <p>Vous pouvez contrôler et gérer les cookies de plusieurs façons :</p>

              <div className="mt-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-white">Via notre gestionnaire de cookies</h4>
                  <p>Utilisez notre outil de gestion des cookies pour accepter ou refuser les différentes catégories de cookies.</p>
                  <button onClick={handleCookieSettings} className="mt-2 text-orange-400 hover:text-orange-300 underline">
                    Gérer mes préférences →
                  </button>
                </div>

                <div>
                  <h4 className="font-semibold text-white">Via votre navigateur</h4>
                  <p>
                    Vous pouvez configurer votre navigateur pour bloquer ou supprimer les cookies. Consultez l&apos;aide de votre navigateur pour plus d&apos;informations :
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                    <li>
                      <a
                        href="https://support.google.com/chrome/answer/95647"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300"
                      >
                        Chrome
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://support.mozilla.org/fr/kb/activer-desactiver-cookies"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300"
                      >
                        Firefox
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300"
                      >
                        Safari
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300"
                      >
                        Edge
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <p className="mt-4 text-sm text-yellow-400">
                ⚠️ Attention : bloquer certains cookies peut affecter le fonctionnement du site et votre expérience utilisateur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Modifications de la politique</h2>
              <p>
                Nous pouvons mettre à jour cette politique de temps à autre pour refléter les changements dans nos pratiques ou pour d&apos;autres raisons
                opérationnelles, légales ou réglementaires.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Contact</h2>
              <p>Pour toute question concernant notre utilisation des cookies, contactez-nous à : <strong>privacy@factiony.com</strong></p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyView;
