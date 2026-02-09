import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface AdsPolicyViewProps {
  onViewChange?: (view: string) => void;
}

const LAST_UPDATED = '09/02/2026';

const AdsPolicyView: React.FC<AdsPolicyViewProps> = ({ onViewChange }) => {
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
          <h1 className="text-3xl font-bold text-white mb-6">Informations sur les Publicités</h1>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
            <p className="text-sm text-gray-400">Dernière mise à jour : {LAST_UPDATED}</p>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Introduction</h2>
              <p>
                Factiony est un service gratuit financé en partie par la publicité et, le cas échéant, par des liens affiliés.
                Cette page explique comment fonctionnent les publicités sur notre plateforme, comment nous les utilisons et comment
                vous pouvez contrôler votre expérience publicitaire.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Pourquoi des publicités ?</h2>
              <p>Les revenus publicitaires nous permettent notamment de :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Maintenir Factiony gratuit pour tous les utilisateurs</li>
                <li>Développer de nouvelles fonctionnalités</li>
                <li>Améliorer l&apos;infrastructure et les performances du site</li>
                <li>Soutenir l&apos;équipe de développement et de modération</li>
                <li>Couvrir les frais d&apos;hébergement et de maintenance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Types de publicités</h2>

              <div className="space-y-4 mt-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Publicités display</h3>
                  <p>
                    Bannières publicitaires affichées à divers emplacements du site (en-tête, barre latérale, entre le contenu).
                    Ces publicités sont fournies par nos partenaires publicitaires.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Publicités vidéo</h3>
                  <p>Courtes vidéos publicitaires pouvant être affichées avant ou pendant la consultation de certains contenus.</p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Contenu sponsorisé</h3>
                  <p>
                    Articles, critiques ou contenus sponsorisés par des partenaires, clairement identifiés comme tels.
                    Notre indépendance éditoriale n&apos;est jamais compromise par nos partenaires.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Liens affiliés</h3>
                  <p>
                    Certains liens vers des boutiques ou plateformes (ex. Steam, Epic Games, GOG, etc.) peuvent être des liens affiliés.
                    Lorsque vous effectuez un achat via un lien affilié, Factiony peut percevoir une commission, sans frais supplémentaires pour vous.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Publicités personnalisées et technologies de suivi</h2>
              <p>
                Nous pouvons travailler avec des partenaires publicitaires tiers qui utilisent des cookies, SDK ou technologies similaires
                afin de diffuser des publicités, mesurer leur performance et, le cas échéant, personnaliser les annonces.
              </p>
              <p className="mt-4">
                Ces partenaires peuvent collecter des informations telles que :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>des identifiants techniques (cookies, identifiants publicitaires, informations du navigateur)</li>
                <li>des données de navigation sur Factiony (pages vues, interactions)</li>
                <li>une localisation approximative (pays/région)</li>
                <li>des informations sur l&apos;appareil</li>
              </ul>
              <p className="mt-4">
                Les cookies et traceurs non essentiels (mesure d&apos;audience, publicité, affiliation) ne sont déposés qu&apos;avec votre consentement,
                que vous pouvez retirer à tout moment via le gestionnaire de cookies.
              </p>
              <p className="mt-2">
                Pour plus d&apos;informations, consultez notre{' '}
                <a href="/politique-cookies" className="text-orange-400 hover:text-orange-300">
                  Politique relative aux cookies
                </a>{' '}
                et notre{' '}
                <a href="/politique-confidentialite" className="text-orange-400 hover:text-orange-300">
                  Politique de confidentialité
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Nos partenaires publicitaires</h2>
              <p>Nous pouvons collaborer avec des réseaux publicitaires et partenaires, notamment :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Google AdSense</li>
                <li>Réseaux publicitaires spécialisés dans le gaming</li>
                <li>Partenaires affiliés (Steam, Epic Games, GOG, etc.)</li>
              </ul>
              <p className="mt-4 text-sm">
                Ces partenaires disposent de leurs propres politiques de confidentialité et de gestion des cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Contrôler les publicités</h2>

              <div className="space-y-4 mt-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Gérer vos préférences de cookies</h3>
                  <p>
                    Vous pouvez à tout moment modifier vos préférences concernant les cookies publicitaires et de mesure d&apos;audience
                    via notre gestionnaire de cookies.
                  </p>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).tarteaucitron) {
                        (window as any).tarteaucitron.userInterface.openPanel();
                      }
                    }}
                    className="mt-2 text-orange-400 hover:text-orange-300 underline"
                  >
                    Gérer mes cookies →
                  </button>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Abonnement Premium</h3>
                  <p>
                    Nos membres Premium bénéficient d&apos;une expérience sans publicité. L&apos;abonnement Premium vous donne accès à des fonctionnalités
                    exclusives tout en soutenant directement Factiony.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Extensions de navigateur</h3>
                  <p>
                    Vous pouvez utiliser des bloqueurs de publicités, bien que cela puisse affecter notre capacité à maintenir le service gratuit.
                    Nous vous encourageons à ajouter Factiony à votre liste blanche si vous appréciez notre service.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Désactiver la publicité personnalisée</h3>
                  <p>Vous pouvez refuser la publicité personnalisée via :</p>
                  <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                    <li>
                      <a
                        href="https://www.google.com/settings/ads"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300"
                      >
                        Paramètres de publicité Google
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.youronlinechoices.eu/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300"
                      >
                        Your Online Choices (Europe)
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://optout.aboutads.info/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300"
                      >
                        Digital Advertising Alliance (USA)
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Politique de contenu publicitaire</h2>
              <p>
                Nous nous engageons à maintenir des standards élevés pour les publicités affichées sur Factiony. Nous n&apos;acceptons pas :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Publicités contenant du contenu illégal, offensant ou trompeur</li>
                <li>Publicités pour des produits dangereux ou illégaux</li>
                <li>Publicités avec malware, virus ou logiciels malveillants</li>
                <li>Publicités trompeuses ou clickbait</li>
                <li>Publicités auto-play avec son (sauf si explicitement activé)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Signaler une publicité inappropriée</h2>
              <p>
                Si vous voyez une publicité qui viole nos standards ou qui vous semble inappropriée, veuillez nous la signaler :
              </p>
              <div className="bg-gray-900 p-4 rounded-lg mt-4">
                <p>
                  <strong>Email :</strong> ads@factiony.com
                </p>
                <p className="mt-2 text-sm">Veuillez inclure :</p>
                <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                  <li>Une capture d&apos;écran de la publicité</li>
                  <li>La page où elle apparaît</li>
                  <li>Une description du problème</li>
                  <li>La date et l&apos;heure</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Transparence</h2>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Tous les contenus sponsorisés sont clairement identifiés</li>
                <li>Nous ne vendons jamais vos données personnelles directement à des annonceurs</li>
                <li>Nous respectons votre choix de refuser la publicité personnalisée</li>
                <li>Notre indépendance éditoriale n&apos;est jamais compromise</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. Modifications</h2>
              <p>
                Nous pouvons mettre à jour cette politique de temps à autre. Les modifications importantes seront communiquées sur le site ou par e-mail.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">11. Contact</h2>
              <p>Pour toute question concernant nos publicités, contactez-nous à : <strong>ads@factiony.com</strong></p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdsPolicyView;
