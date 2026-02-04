import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onViewChange?: (view: string) => void;
}

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
            <p className="text-sm text-gray-400">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Introduction</h2>
              <p>
                Chez Factiony, nous prenons la protection de vos données personnelles très au sérieux.
                Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons
                vos informations personnelles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Données collectées</h2>
              <p>Nous collectons les types de données suivants :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li><strong>Données de compte :</strong> nom d'utilisateur, adresse e-mail, mot de passe crypté</li>
                <li><strong>Données de profil :</strong> photo de profil, biographie, préférences de jeu</li>
                <li><strong>Données d'utilisation :</strong> notes, critiques, commentaires, activités sur la plateforme</li>
                <li><strong>Données techniques :</strong> adresse IP, type de navigateur, système d'exploitation</li>
                <li><strong>Cookies et technologies similaires</strong></li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Utilisation des données</h2>
              <p>Nous utilisons vos données pour :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Fournir et améliorer nos services</li>
                <li>Personnaliser votre expérience</li>
                <li>Communiquer avec vous</li>
                <li>Assurer la sécurité de la plateforme</li>
                <li>Respecter nos obligations légales</li>
                <li>Analyser l'utilisation du service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Partage des données</h2>
              <p>
                Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos données uniquement dans les cas suivants :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Avec votre consentement explicite</li>
                <li>Avec des prestataires de services tiers qui nous aident à opérer la plateforme</li>
                <li>Pour se conformer à des obligations légales</li>
                <li>Pour protéger nos droits et notre sécurité</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Sécurité des données</h2>
              <p>
                Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées
                pour protéger vos données contre tout accès, modification, divulgation ou destruction non autorisés.
                Cela inclut le chiffrement des mots de passe, l'utilisation de connexions sécurisées (HTTPS)
                et des audits de sécurité réguliers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Conservation des données</h2>
              <p>
                Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir nos services
                et respecter nos obligations légales. Vous pouvez demander la suppression de votre compte à tout moment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Vos droits (RGPD)</h2>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles</li>
                <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
                <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
                <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                <li><strong>Droit à la limitation :</strong> limiter le traitement de vos données</li>
              </ul>
              <p className="mt-4">
                Pour exercer ces droits, contactez-nous à : privacy@factiony.com
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Cookies</h2>
              <p>
                Nous utilisons des cookies pour améliorer votre expérience sur notre site.
                Vous pouvez gérer vos préférences de cookies à tout moment via notre gestionnaire de cookies.
                Pour plus d'informations, consultez notre <a href="/politique-cookies" className="text-orange-400 hover:text-orange-300">Politique relative aux cookies</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Modifications de la politique</h2>
              <p>
                Nous pouvons modifier cette politique de confidentialité de temps à autre.
                Nous vous informerons de tout changement important par e-mail ou via une notification sur la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. Contact</h2>
              <p>
                Pour toute question concernant cette politique de confidentialité ou le traitement de vos données personnelles,
                contactez-nous à : privacy@factiony.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyView;
