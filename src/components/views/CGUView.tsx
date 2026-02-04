import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface CGUViewProps {
  onViewChange?: (view: string) => void;
}

const CGUView: React.FC<CGUViewProps> = ({ onViewChange }) => {
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
          <h1 className="text-3xl font-bold text-white mb-6">Conditions Générales d'Utilisation</h1>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
            <p className="text-sm text-gray-400">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Acceptation des conditions</h2>
              <p>
                En accédant et en utilisant Factiony, vous acceptez d'être lié par les présentes conditions générales d'utilisation.
                Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Description du service</h2>
              <p>
                Factiony est une plateforme sociale dédiée aux jeux vidéo permettant aux utilisateurs de découvrir,
                noter, commenter et partager leurs expériences de jeu avec une communauté de passionnés.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Compte utilisateur</h2>
              <p>
                Pour accéder à certaines fonctionnalités, vous devez créer un compte. Vous êtes responsable de maintenir
                la confidentialité de vos identifiants et de toutes les activités effectuées sous votre compte.
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Vous devez fournir des informations exactes et à jour</li>
                <li>Vous devez avoir au moins 13 ans pour utiliser ce service</li>
                <li>Un compte par personne est autorisé</li>
                <li>Vous ne devez pas partager vos identifiants avec des tiers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Utilisation acceptable</h2>
              <p>Vous vous engagez à ne pas :</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Publier du contenu illégal, offensant, diffamatoire ou inapproprié</li>
                <li>Harceler, menacer ou intimider d'autres utilisateurs</li>
                <li>Usurper l'identité d'une autre personne</li>
                <li>Utiliser des bots ou des scripts automatisés</li>
                <li>Tenter d'accéder de manière non autorisée au service</li>
                <li>Publier du spam ou du contenu publicitaire non sollicité</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Contenu utilisateur</h2>
              <p>
                Vous conservez la propriété du contenu que vous publiez sur Factiony. En publiant du contenu,
                vous nous accordez une licence mondiale, non exclusive, libre de redevances pour utiliser,
                reproduire et distribuer votre contenu dans le cadre du service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Modération</h2>
              <p>
                Nous nous réservons le droit de modérer, éditer ou supprimer tout contenu qui viole ces conditions
                ou qui est jugé inapproprié, sans préavis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Propriété intellectuelle</h2>
              <p>
                Le service, y compris son contenu original, ses fonctionnalités et sa présentation,
                est la propriété de Factiony et est protégé par les lois sur le droit d'auteur,
                les marques et autres lois sur la propriété intellectuelle.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Limitation de responsabilité</h2>
              <p>
                Factiony est fourni "tel quel" sans garantie d'aucune sorte. Nous ne serons pas responsables
                des dommages directs, indirects, accessoires ou consécutifs résultant de l'utilisation
                ou de l'impossibilité d'utiliser le service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Modifications des conditions</h2>
              <p>
                Nous nous réservons le droit de modifier ces conditions à tout moment.
                Les modifications prendront effet dès leur publication sur le site.
                Votre utilisation continue du service après ces modifications constitue votre acceptation des nouvelles conditions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. Résiliation</h2>
              <p>
                Nous pouvons suspendre ou résilier votre compte à tout moment, avec ou sans préavis,
                pour violation de ces conditions ou pour toute autre raison à notre seule discrétion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">11. Contact</h2>
              <p>
                Pour toute question concernant ces conditions, veuillez nous contacter à : contact@factiony.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CGUView;
