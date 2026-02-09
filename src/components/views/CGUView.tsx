import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface CGUViewProps {
  onViewChange?: (view: string) => void;
}

const LAST_UPDATED = '09/02/2026';

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
          <h1 className="text-3xl font-bold text-white mb-6">
            Conditions Générales d&apos;Utilisation
          </h1>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
            <p className="text-sm text-gray-400">Dernière mise à jour : {LAST_UPDATED}</p>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Acceptation des conditions</h2>
              <p>
                En accédant et en utilisant Factiony, vous acceptez d&apos;être lié par les présentes Conditions
                Générales d&apos;Utilisation (CGU). Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser
                notre service.
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
                <li>Publier du contenu illégal, offensant, diffamatoire, haineux ou inapproprié</li>
                <li>Harceler, menacer ou intimider d&apos;autres utilisateurs</li>
                <li>Usurper l&apos;identité d&apos;une autre personne</li>
                <li>Utiliser des bots ou des scripts automatisés</li>
                <li>Tenter d&apos;accéder de manière non autorisée au service</li>
                <li>Publier du spam ou du contenu publicitaire non sollicité</li>
                <li>Porter atteinte aux droits de propriété intellectuelle de tiers (droits d&apos;auteur, marques, etc.)</li>
              </ul>
            </section>

            {/* === BLOC JURIDIQUE CRITIQUE LCEN === */}
            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Statut de la plateforme (LCEN)</h2>
              <p>
                Factiony agit en qualité d&apos;hébergeur au sens de l&apos;article 6-I-2 de la loi n°2004-575 du 21 juin 2004
                pour la confiance dans l&apos;économie numérique (LCEN).
              </p>
              <p>
                Les contenus publiés sur la plateforme (avis, notes, commentaires, réponses, profils et autres contributions)
                sont fournis par les utilisateurs, qui en sont seuls responsables. Factiony n&apos;exerce pas de contrôle éditorial
                a priori sur ces contenus et intervient principalement à la suite de signalements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Contenus utilisateurs et licence</h2>
              <p>
                Vous conservez la propriété du contenu que vous publiez sur Factiony. En publiant du contenu, vous accordez à Factiony
                une licence mondiale, non exclusive, gratuite, pour héberger, stocker, reproduire, afficher, distribuer et adapter
                techniquement votre contenu, dans la stricte mesure nécessaire au fonctionnement et à la promotion du service
                (ex. affichage sur le site, mise en cache, formats d&apos;image, aperçus, partage).
              </p>
              <p>
                Vous garantissez disposer des droits nécessaires sur les contenus que vous publiez et vous engagez à ne pas publier
                de contenu portant atteinte aux droits de tiers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Signalement des contenus</h2>
              <p>
                Tout utilisateur peut signaler un contenu qu&apos;il estime illicite ou contraire aux présentes CGU via le bouton
                <strong> « Signaler »</strong> disponible sous les publications, commentaires et réponses.
              </p>
              <p>
                Un signalement peut également être adressé par e-mail à : <strong>legal@factiony.com</strong>.
              </p>
              <p>
                Pour permettre un traitement efficace, un signalement doit, lorsque possible, inclure :
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>l&apos;URL ou l&apos;identifiant du contenu concerné</li>
                <li>une description du contenu litigieux</li>
                <li>le motif du signalement (ex. diffamation, haine, harcèlement, atteinte au droit d&apos;auteur, etc.)</li>
                <li>les coordonnées du demandeur (si le demandeur souhaite être recontacté)</li>
              </ul>
              <p>
                Factiony examine les signalements et peut retirer ou rendre inaccessible tout contenu manifestement illicite
                ou contraire aux présentes CGU, notamment afin de se conformer à ses obligations légales.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Droits d&apos;auteur et propriété intellectuelle de tiers</h2>
              <p>
                Si vous estimez qu&apos;un contenu porte atteinte à vos droits de propriété intellectuelle (droit d&apos;auteur, marque, etc.),
                vous pouvez demander son retrait via la procédure de signalement ci-dessus, en fournissant les éléments permettant
                d&apos;identifier l&apos;œuvre ou le droit concerné et le contenu litigieux.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Avis et opinions</h2>
              <p>
                Les avis et notes publiés sur Factiony reflètent l&apos;opinion personnelle des utilisateurs. Factiony ne garantit ni leur
                exactitude ni leur véracité et n&apos;endosse pas les opinions exprimées.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. Modération</h2>
              <p>
                Nous nous réservons le droit de modérer, éditer ou supprimer tout contenu qui viole ces conditions ou qui est jugé
                inapproprié, notamment en cas de signalement, sans préavis. Nous pouvons également suspendre ou supprimer un compte
                en cas de violation des présentes CGU.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">11. Propriété intellectuelle du service</h2>
              <p>
                Le service, y compris son contenu original, ses fonctionnalités, son design, son interface et ses éléments graphiques,
                est la propriété de Factiony et est protégé par les lois relatives au droit d&apos;auteur, aux marques et à la propriété
                intellectuelle. Toute reproduction non autorisée est interdite.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">12. Publicité, contenus sponsorisés et affiliation</h2>
              <p>
                Factiony est un service gratuit pouvant être financé en partie par la publicité. La plateforme peut afficher des publicités,
                contenus sponsorisés et/ou liens affiliés. Lorsque vous effectuez un achat via un lien affilié, Factiony peut percevoir une
                commission, sans frais supplémentaires pour vous.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">13. Limitation de responsabilité</h2>
              <p>
                Factiony est fourni « tel quel » sans garantie d&apos;aucune sorte. Dans les limites autorisées par la loi, Factiony ne
                saurait être tenu responsable des dommages directs, indirects, accessoires ou consécutifs résultant de l&apos;utilisation
                ou de l&apos;impossibilité d&apos;utiliser le service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">14. Données personnelles</h2>
              <p>
                Le traitement des données personnelles est décrit dans notre Politique de Confidentialité et notre Politique relative aux Cookies.
                En utilisant le service, vous reconnaissez en avoir pris connaissance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">15. Modifications des conditions</h2>
              <p>
                Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet dès leur publication
                sur le site. Votre utilisation continue du service après ces modifications constitue votre acceptation des nouvelles conditions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">16. Résiliation</h2>
              <p>
                Nous pouvons suspendre ou résilier votre compte à tout moment, avec ou sans préavis, en cas de violation des présentes CGU
                ou pour toute autre raison à notre seule discrétion, dans le respect du droit applicable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">17. Droit applicable et juridiction compétente</h2>
              <p>
                Les présentes CGU sont régies par le droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux français
                seront compétents, sous réserve des règles d&apos;ordre public applicables.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">18. Contact</h2>
              <p>Pour toute question concernant ces conditions, veuillez nous contacter à : <strong>contact@factiony.com</strong></p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">19. Hébergement</h2>
              <p>
                Le site est hébergé via une infrastructure web (Netlify) et les données sont stockées via une infrastructure backend (Supabase).
                Les informations détaillées d&apos;hébergement figurent dans les Mentions légales.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CGUView;
