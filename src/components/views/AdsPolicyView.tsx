import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface AdsPolicyViewProps {
  onViewChange?: (view: string) => void;
}

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
            <p className="text-sm text-gray-400">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Introduction</h2>
              <p>
                Factiony est un service gratuit financé en partie par la publicité. Cette page explique comment
                fonctionnent les publicités sur notre plateforme, comment nous les utilisons et comment vous pouvez
                contrôler votre expérience publicitaire.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Pourquoi des publicités ?</h2>
              <p>
                Les revenus publicitaires nous permettent de :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Maintenir Factiony gratuit pour tous les utilisateurs</li>
                <li>Développer de nouvelles fonctionnalités</li>
                <li>Améliorer l'infrastructure et les performances du site</li>
                <li>Soutenir notre équipe de développement et de modération</li>
                <li>Couvrir les frais d'hébergement et de maintenance</li>
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
                  <p>
                    Courtes vidéos publicitaires qui peuvent être affichées avant ou pendant la consultation de certains contenus.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Contenu sponsorisé</h3>
                  <p>
                    Articles, critiques ou contenus sponsorisés par des partenaires, clairement identifiés comme tels.
                    Nous maintenons toujours notre indépendance éditoriale.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Liens affiliés</h3>
                  <p>
                    Liens vers des magasins de jeux (Steam, Epic Games, etc.) qui nous rapportent une petite commission
                    lorsque vous effectuez un achat, sans frais supplémentaires pour vous.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Publicités personnalisées</h2>
              <p>
                Nous travaillons avec des partenaires publicitaires tiers qui peuvent utiliser des cookies
                et des technologies similaires pour collecter des informations sur votre activité de navigation
                afin de vous proposer des publicités pertinentes.
              </p>
              <p className="mt-4">
                Ces publicités sont basées sur :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Vos centres d'intérêt liés aux jeux vidéo</li>
                <li>Votre historique de navigation sur Factiony</li>
                <li>Votre localisation approximative (pays/région)</li>
                <li>Le type d'appareil et de navigateur utilisé</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Nos partenaires publicitaires</h2>
              <p>
                Nous collaborons avec des réseaux publicitaires reconnus et respectueux de la vie privée, notamment :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Google AdSense</li>
                <li>Réseaux publicitaires spécialisés dans le gaming</li>
                <li>Partenaires affiliés (Steam, Epic Games, GOG, etc.)</li>
              </ul>
              <p className="mt-4 text-sm">
                Ces partenaires ont leurs propres politiques de confidentialité que nous vous encourageons à consulter.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Contrôler les publicités</h2>

              <div className="space-y-4 mt-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Gérer vos préférences de cookies</h3>
                  <p>
                    Vous pouvez à tout moment modifier vos préférences concernant les cookies publicitaires
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
                    Nos membres Premium bénéficient d'une expérience sans publicité. L'abonnement Premium
                    vous donne accès à des fonctionnalités exclusives tout en soutenant directement Factiony.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Extensions de navigateur</h3>
                  <p>
                    Vous pouvez utiliser des bloqueurs de publicités, bien que cela puisse affecter notre capacité
                    à maintenir le service gratuit. Nous vous encourageons à ajouter Factiony à votre liste blanche
                    si vous appréciez notre service.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Désactiver la publicité personnalisée</h3>
                  <p>Vous pouvez refuser la publicité personnalisée via :</p>
                  <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                    <li><a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">Paramètres de publicité Google</a></li>
                    <li><a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">Your Online Choices (Europe)</a></li>
                    <li><a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">Digital Advertising Alliance (USA)</a></li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Politique de contenu publicitaire</h2>
              <p>
                Nous nous engageons à maintenir des standards élevés pour les publicités affichées sur Factiony.
                Nous n'acceptons pas :
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
                Si vous voyez une publicité qui viole nos standards ou qui vous semble inappropriée,
                veuillez nous la signaler immédiatement :
              </p>
              <div className="bg-gray-900 p-4 rounded-lg mt-4">
                <p><strong>Email :</strong> ads@factiony.com</p>
                <p className="mt-2 text-sm">Veuillez inclure :</p>
                <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                  <li>Une capture d'écran de la publicité</li>
                  <li>La page où elle apparaît</li>
                  <li>Une description du problème</li>
                  <li>La date et l'heure</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Transparence</h2>
              <p>
                Nous nous engageons à la transparence concernant nos pratiques publicitaires :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Tous les contenus sponsorisés sont clairement identifiés</li>
                <li>Nous ne vendons jamais vos données personnelles directement à des annonceurs</li>
                <li>Nous respectons votre choix de refuser la publicité personnalisée</li>
                <li>Notre indépendance éditoriale n'est jamais compromise par nos partenaires publicitaires</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. Modifications</h2>
              <p>
                Nous pouvons mettre à jour cette politique de temps à autre pour refléter les changements
                dans nos pratiques publicitaires. Les modifications importantes seront communiquées
                sur le site ou par e-mail.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">11. Contact</h2>
              <p>
                Pour toute question concernant nos publicités, contactez-nous à : ads@factiony.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdsPolicyView;
