import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface AccessibilityViewProps {
  onViewChange?: (view: string) => void;
}

const AccessibilityView: React.FC<AccessibilityViewProps> = ({ onViewChange }) => {
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
          <h1 className="text-3xl font-bold text-white mb-6">Accessibilité</h1>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
            <p className="text-sm text-gray-400">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Notre engagement</h2>
              <p>
                Factiony s'engage à rendre son service accessible à tous les utilisateurs, y compris les personnes en situation de handicap.
                Nous nous efforçons de respecter les standards d'accessibilité web (WCAG 2.1 niveau AA) et de fournir une expérience utilisateur
                inclusive et équitable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Fonctionnalités d'accessibilité</h2>

              <div className="space-y-4 mt-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Navigation au clavier</h3>
                  <p>
                    Toutes les fonctionnalités principales sont accessibles via le clavier seul, sans nécessiter de souris.
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                    <li>Utilisez <kbd className="px-2 py-1 bg-gray-800 rounded">Tab</kbd> pour naviguer entre les éléments</li>
                    <li>Utilisez <kbd className="px-2 py-1 bg-gray-800 rounded">Entrée</kbd> ou <kbd className="px-2 py-1 bg-gray-800 rounded">Espace</kbd> pour activer les boutons et liens</li>
                    <li>Utilisez <kbd className="px-2 py-1 bg-gray-800 rounded">Échap</kbd> pour fermer les modals</li>
                  </ul>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Lecteurs d'écran</h3>
                  <p>
                    Notre site est compatible avec les principaux lecteurs d'écran (NVDA, JAWS, VoiceOver, TalkBack).
                    Nous utilisons des attributs ARIA appropriés et une structure sémantique pour faciliter la navigation.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Contraste des couleurs</h3>
                  <p>
                    Nous avons choisi des combinaisons de couleurs avec un contraste suffisant pour garantir
                    la lisibilité du texte pour les personnes ayant une déficience visuelle.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Texte redimensionnable</h3>
                  <p>
                    Le texte peut être agrandi jusqu'à 200% via les paramètres du navigateur sans perte de contenu ou de fonctionnalité.
                    Utilisez <kbd className="px-2 py-1 bg-gray-800 rounded">Ctrl +</kbd> ou <kbd className="px-2 py-1 bg-gray-800 rounded">Cmd +</kbd> pour zoomer.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Alternatives textuelles</h3>
                  <p>
                    Toutes les images importantes comportent des descriptions textuelles alternatives (attribut alt)
                    pour les utilisateurs de lecteurs d'écran.
                  </p>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-2">Vidéos et contenus multimédias</h3>
                  <p>
                    Nous nous efforçons de fournir des sous-titres et transcriptions pour les contenus vidéo et audio lorsque cela est possible.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Technologies assistives supportées</h2>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Lecteurs d'écran (NVDA, JAWS, VoiceOver, TalkBack, ChromeVox)</li>
                <li>Navigation au clavier</li>
                <li>Logiciels de reconnaissance vocale</li>
                <li>Outils de grossissement d'écran</li>
                <li>Mode contraste élevé</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Navigateurs et appareils compatibles</h2>
              <p>Factiony fonctionne de manière optimale avec :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Google Chrome (dernières versions)</li>
                <li>Mozilla Firefox (dernières versions)</li>
                <li>Safari (dernières versions)</li>
                <li>Microsoft Edge (dernières versions)</li>
                <li>Navigateurs mobiles iOS et Android</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Limitations connues</h2>
              <p>
                Malgré nos efforts, certaines parties du site peuvent présenter des limitations d'accessibilité :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Certains contenus générés par les utilisateurs peuvent ne pas respecter les standards d'accessibilité</li>
                <li>Les images de jeux externes provenant d'APIs tierces peuvent manquer de descriptions alternatives</li>
                <li>Certaines fonctionnalités avancées peuvent nécessiter JavaScript activé</li>
              </ul>
              <p className="mt-4">
                Nous travaillons continuellement à améliorer ces aspects.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Signaler un problème d'accessibilité</h2>
              <p>
                Si vous rencontrez des difficultés à accéder à une partie du site ou si vous avez des suggestions
                pour améliorer l'accessibilité, nous vous invitons à nous contacter :
              </p>
              <div className="bg-gray-900 p-4 rounded-lg mt-4">
                <p><strong>Email :</strong> accessibility@factiony.com</p>
                <p className="mt-2">
                  Veuillez inclure dans votre message :
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                  <li>La nature du problème rencontré</li>
                  <li>La page ou la fonctionnalité concernée</li>
                  <li>Le navigateur et la technologie d'assistance utilisés</li>
                  <li>Vos suggestions d'amélioration</li>
                </ul>
              </div>
              <p className="mt-4">
                Nous nous engageons à répondre dans un délai de 5 jours ouvrables et à résoudre les problèmes
                d'accessibilité dans les meilleurs délais.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Amélioration continue</h2>
              <p>
                L'accessibilité est un processus continu. Nous effectuons régulièrement des audits d'accessibilité
                et mettons à jour notre site pour améliorer l'expérience de tous nos utilisateurs.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Ressources externes</h2>
              <p>Pour en savoir plus sur l'accessibilité web :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li><a href="https://www.w3.org/WAI/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">Web Accessibility Initiative (WAI)</a></li>
                <li><a href="https://www.accede-web.com/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">AcceDe Web</a></li>
                <li><a href="https://accessibilite.numerique.gouv.fr/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">RGAA - Référentiel Général d'Amélioration de l'Accessibilité</a></li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityView;
