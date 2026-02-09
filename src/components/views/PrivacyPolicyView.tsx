import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onViewChange?: (view: string) => void;
}

const LAST_UPDATED = '09/02/2026';

const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onViewChange }) => {
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
          <h1 className="text-3xl font-bold text-white mb-6">Politique de Confidentialité</h1>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
            <p className="text-sm text-gray-400">Dernière mise à jour : {LAST_UPDATED}</p>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Introduction</h2>
              <p>
                Chez Factiony, nous prenons la protection de vos données personnelles très au sérieux. Cette politique de confidentialité
                explique comment nous collectons, utilisons et protégeons vos informations personnelles lorsque vous utilisez notre service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Responsable du traitement</h2>
              <p>
                Le responsable du traitement des données est : <strong>Factiony</strong>.
              </p>
              <p>
                Pour toute question relative aux données personnelles, vous pouvez nous contacter à : <strong>privacy@factiony.com</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Données collectées</h2>
              <p>Nous collectons les types de données suivants :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li><strong>Données de compte :</strong> nom d&apos;utilisateur, adresse e-mail, mot de passe (stocké sous forme chiffrée / hachée)</li>
                <li><strong>Données de profil :</strong> photo de profil, biographie, préférences de jeu</li>
                <li><strong>Données d&apos;utilisation :</strong> notes, critiques, commentaires, réponses, activités sur la plateforme</li>
                <li><strong>Données techniques :</strong> adresse IP, identifiants techniques, type de navigateur, système d&apos;exploitation, journaux de sécurité</li>
                <li><strong>Cookies et technologies similaires</strong> (voir section Cookies)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Finalités et bases légales</h2>
              <p>Nous traitons vos données pour les finalités suivantes :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>
                  <strong>Création et gestion du compte, accès au service</strong> (base légale : exécution du contrat)
                </li>
                <li>
                  <strong>Publication et affichage des contenus</strong> (avis, commentaires, profils) (base légale : exécution du contrat)
                </li>
                <li>
                  <strong>Sécurité, prévention de la fraude, modération, maintien de l&apos;intégrité du service</strong> (base légale : intérêt légitime)
                </li>
                <li>
                  <strong>Support et communications liées au service</strong> (base légale : exécution du contrat / intérêt légitime)
                </li>
                <li>
                  <strong>Mesure d&apos;audience et amélioration du service</strong> (base légale : consentement lorsque des cookies non essentiels sont utilisés)
                </li>
                <li>
                  <strong>Publicité et affiliation</strong> (base légale : consentement lorsque des cookies publicitaires/traceurs sont utilisés)
                </li>
                <li>
                  <strong>Respect d&apos;obligations légales</strong> (base légale : obligation légale)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Partage des données</h2>
              <p>
                Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos données uniquement :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>avec votre consentement explicite</li>
                <li>avec des prestataires (sous-traitants) nécessaires au fonctionnement du service</li>
                <li>pour nous conformer à des obligations légales</li>
                <li>pour protéger nos droits, notre sécurité et celle des utilisateurs</li>
              </ul>
              <p className="mt-4">
                Exemple de prestataires pouvant intervenir : hébergement et infrastructure web (<strong>Netlify</strong>), backend et base de données (<strong>Supabase</strong>),
                outils de mesure d&apos;audience et/ou partenaires publicitaires (si activés par vos choix de cookies).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Sécurité des données</h2>
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès,
                modification, divulgation ou destruction non autorisés. Cela inclut notamment l&apos;utilisation de connexions sécurisées (HTTPS),
                des mécanismes d&apos;authentification, et des mesures de protection des accès.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Conservation des données</h2>
              <p>
                Nous conservons vos données pendant la durée nécessaire aux finalités décrites ci-dessus, et notamment :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li><strong>Données de compte :</strong> pendant la durée du compte</li>
                <li>
                  <strong>Compte inactif :</strong> suppression ou anonymisation au plus tard <strong>3 ans</strong> après la dernière activité, sauf obligation légale contraire
                </li>
                <li><strong>Journaux techniques / sécurité :</strong> durée limitée, proportionnée aux besoins de sécurité et de prévention de la fraude</li>
              </ul>
              <p className="mt-4">
                Vous pouvez demander la suppression de votre compte à tout moment (voir section “Vos droits”).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Transferts hors Union européenne</h2>
              <p>
                Certains prestataires techniques peuvent être situés ou opérer en dehors de l&apos;Union européenne. Dans ce cas, des transferts de données
                peuvent avoir lieu. Nous mettons en place des garanties appropriées afin d&apos;encadrer ces transferts (par exemple, clauses contractuelles types
                adoptées par la Commission européenne), lorsque cela est requis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Vos droits (RGPD)</h2>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données personnelles</li>
                <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
                <li><strong>Droit à l&apos;effacement :</strong> demander la suppression de vos données (dans les limites légales)</li>
                <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement (notamment en cas d&apos;intérêt légitime)</li>
                <li><strong>Droit à la limitation :</strong> limiter le traitement</li>
                <li><strong>Retrait du consentement :</strong> pour les traitements fondés sur le consentement (ex. cookies), à tout moment</li>
              </ul>
              <p className="mt-4">
                Pour exercer ces droits, contactez-nous à : <strong>privacy@factiony.com</strong>.
              </p>
              <p className="mt-2">
                Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. Cookies</h2>
              <p>
                Nous utilisons des cookies et technologies similaires. Les cookies non essentiels (mesure d&apos;audience, publicité, affiliation) ne sont déposés
                qu&apos;avec votre consentement, que vous pouvez retirer à tout moment via notre gestionnaire de cookies.
              </p>
              <p>
                Pour plus d&apos;informations, consultez notre{' '}
                <a href="/politique-cookies" className="text-orange-400 hover:text-orange-300">
                  Politique relative aux cookies
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">11. Modifications de la politique</h2>
              <p>
                Nous pouvons modifier cette politique de confidentialité de temps à autre. En cas de changement important, nous vous informerons par e-mail
                ou via une notification sur la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">12. Contact</h2>
              <p>
                Pour toute question concernant cette politique de confidentialité ou le traitement de vos données personnelles, contactez-nous à :{' '}
                <strong>privacy@factiony.com</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyView;
