import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment JobDirect recueille, utilise et protège vos renseignements personnels, conformément à la Loi 25 du Québec.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-gray-700">{children}</div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        Politique de confidentialité
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Dernière mise à jour : {LEGAL.lastUpdated}
      </p>

      <p className="mt-6 text-gray-700">
        {LEGAL.serviceName} (« nous ») est une plateforme québécoise qui met en
        relation des personnes ayant des tâches ponctuelles à faire réaliser avec
        des travailleurs disponibles près de chez elles. Nous accordons une grande
        importance à la protection de vos renseignements personnels. La présente
        politique explique quels renseignements nous recueillons, pourquoi, comment
        nous les utilisons et les protégeons, ainsi que les droits que vous confère
        la <strong>Loi sur la protection des renseignements personnels dans le
        secteur privé (Loi 25)</strong> du Québec.
      </p>

      <Section title="1. Responsable de la protection des renseignements personnels">
        <p>
          Conformément à la Loi 25, une personne est responsable de la protection
          des renseignements personnels au sein de {LEGAL.serviceName}. Vous pouvez
          la joindre pour toute question ou pour exercer vos droits :
        </p>
        <p>
          <a
            href={`mailto:${LEGAL.privacyEmail}`}
            className="font-medium text-brand-600 hover:underline"
          >
            {LEGAL.privacyEmail}
          </a>
        </p>
      </Section>

      <Section title="2. Renseignements que nous recueillons">
        <p>Selon votre utilisation du service, nous pouvons recueillir :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Demandeurs / employeurs :</strong> nom, téléphone, courriel,
            ville, et les détails de la tâche publiée (description, catégorie, date,
            budget).
          </li>
          <li>
            <strong>Travailleurs :</strong> nom, téléphone, courriel, ville,
            compétences, disponibilités et expérience.
          </li>
          <li>
            <strong>Titulaires de compte :</strong> courriel et mot de passe (chiffré),
            et les informations de profil que vous fournissez.
          </li>
          <li>
            <strong>Demandes de mise en relation :</strong> nom, téléphone, courriel
            et description du besoin.
          </li>
          <li>
            <strong>Données techniques :</strong> statistiques d&apos;utilisation
            agrégées et anonymes (voir la section sur la mesure d&apos;audience).
          </li>
        </ul>
      </Section>

      <Section title="3. Fins de l'utilisation">
        <p>Nous utilisons ces renseignements uniquement pour :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>fournir le service de mise en relation ;</li>
          <li>
            présenter des opportunités aux travailleurs et des travailleurs
            disponibles aux demandeurs ;
          </li>
          <li>vous contacter au sujet d&apos;une tâche, d&apos;une candidature ou d&apos;une demande ;</li>
          <li>assurer la sécurité, prévenir la fraude et améliorer le service.</li>
        </ul>
      </Section>

      <Section title="4. Affichage public des profils de travailleurs">
        <p>
          Lorsque vous vous inscrivez comme travailleur, votre profil peut être
          présenté publiquement aux demandeurs afin de générer des opportunités
          pour vous. Cet affichage est <strong>volontairement limité</strong> :
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            nous affichons votre <strong>prénom et l&apos;initiale de votre nom</strong>
            {" "}(ex. « Cedric F. »), votre ville, vos compétences et vos disponibilités ;
          </li>
          <li>
            nous <strong>n&apos;affichons jamais</strong> vos coordonnées (téléphone,
            courriel, adresse) ni votre nom complet ;
          </li>
          <li>
            personne ne peut vous contacter directement : un demandeur intéressé
            envoie une demande à notre équipe, qui organise ensuite la mise en
            relation avec votre accord.
          </li>
        </ul>
        <p>
          Vous pouvez à tout moment demander à ne plus être affiché (voir la section
          « Vos droits »).
        </p>
      </Section>

      <Section title="5. Communication à des tiers">
        <p>
          Nous ne vendons pas vos renseignements personnels. Nous les communiquons
          uniquement :
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>dans le cadre d&apos;une mise en relation</strong> que vous avez
            demandée ou acceptée (par exemple, transmettre vos coordonnées à la
            personne avec qui vous acceptez de travailler) ;
          </li>
          <li>
            <strong>à nos fournisseurs de services</strong> qui hébergent la
            plateforme et sa base de données, strictement pour faire fonctionner le
            service (voir la section suivante) ;
          </li>
          <li>
            <strong>si la loi l&apos;exige</strong> (demande d&apos;une autorité
            compétente).
          </li>
        </ul>
      </Section>

      <Section title="6. Hébergement et localisation des données">
        <p>
          La base de données de {LEGAL.serviceName} est hébergée par Supabase dans un
          centre de données situé au <strong>Canada</strong> (région Canada Central).
          L&apos;application et sa diffusion sont assurées par Vercel. Ces fournisseurs
          agissent comme sous-traitants et sont tenus de protéger vos renseignements.
        </p>
      </Section>

      <Section title="7. Témoins (cookies) et mesure d'audience">
        <p>
          Nous utilisons un outil de mesure d&apos;audience (Vercel Analytics)
          <strong> sans témoins (cookies) </strong> qui ne recueille que des
          statistiques agrégées et anonymes (pages vues, provenance). Il ne permet
          pas de vous identifier personnellement. Un témoin technique peut être
          utilisé pour maintenir votre session lorsque vous êtes connecté à un compte.
        </p>
      </Section>

      <Section title="8. Consentement et retrait">
        <p>
          En fournissant vos renseignements et en utilisant le service, vous consentez
          aux utilisations décrites dans la présente politique. Vous pouvez retirer
          votre consentement en tout temps ; cela peut toutefois limiter votre
          utilisation du service.
        </p>
      </Section>

      <Section title="9. Conservation des renseignements">
        <p>
          Nous conservons vos renseignements aussi longtemps que nécessaire aux fins
          décrites ci-dessus, puis nous les détruisons ou les anonymisons. Vous pouvez
          demander la suppression de votre profil et de vos données à tout moment.
        </p>
      </Section>

      <Section title="10. Vos droits">
        <p>La Loi 25 vous confère notamment le droit de :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>accéder</strong> aux renseignements que nous détenons sur vous ;</li>
          <li><strong>faire rectifier</strong> des renseignements inexacts ou incomplets ;</li>
          <li><strong>retirer votre consentement</strong> et demander la <strong>suppression</strong> de vos données ;</li>
          <li>demander de <strong>ne plus être affiché</strong> publiquement.</li>
        </ul>
        <p>
          Pour exercer l&apos;un de ces droits, écrivez à{" "}
          <a
            href={`mailto:${LEGAL.privacyEmail}`}
            className="font-medium text-brand-600 hover:underline"
          >
            {LEGAL.privacyEmail}
          </a>
          . Nous répondrons dans les délais prévus par la loi.
        </p>
      </Section>

      <Section title="11. Sécurité">
        <p>
          Nous prenons des mesures raisonnables pour protéger vos renseignements :
          accès restreint aux données, mots de passe chiffrés, contrôle d&apos;accès au
          niveau de la base de données, et transmission chiffrée (HTTPS). Les
          coordonnées des demandeurs et des travailleurs ne sont jamais rendues
          publiques.
        </p>
      </Section>

      <Section title="12. Renseignements concernant les mineurs">
        <p>
          Le service s&apos;adresse aux personnes de 14 ans et plus autorisées à
          travailler. Nous ne recueillons pas sciemment de renseignements auprès
          d&apos;enfants de moins de 14 ans sans le consentement requis.
        </p>
      </Section>

      <Section title="13. Modifications de la politique">
        <p>
          Nous pouvons mettre à jour la présente politique. La date de dernière mise à
          jour figure en haut de la page. Les changements importants seront signalés
          sur le site.
        </p>
      </Section>

      <Section title="14. Plainte auprès de la Commission d'accès à l'information">
        <p>
          Si vous estimez que vos droits n&apos;ont pas été respectés, vous pouvez
          porter plainte auprès de la{" "}
          <a
            href="https://www.cai.gouv.qc.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 hover:underline"
          >
            Commission d&apos;accès à l&apos;information du Québec (CAI)
          </a>
          .
        </p>
      </Section>

      <p className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-500">
        Des questions ? Écrivez-nous à{" "}
        <a
          href={`mailto:${LEGAL.privacyEmail}`}
          className="font-medium text-brand-600 hover:underline"
        >
          {LEGAL.privacyEmail}
        </a>
        . Retour à l&apos;{" "}
        <Link href="/" className="font-medium text-brand-600 hover:underline">
          accueil
        </Link>
        .
      </p>
    </div>
  );
}
