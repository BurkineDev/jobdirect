import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Désabonnement des alertes de tâches.
 *
 * Exigé par la LCAP : un message électronique commercial doit porter un
 * mécanisme de désabonnement « bien en vue », fonctionnel pendant 60 jours et
 * traité en 10 jours ouvrables. Ici c'est immédiat, et surtout SANS
 * connexion — obliger quelqu'un à retrouver son mot de passe pour ne plus
 * recevoir de courriels ne satisfait pas l'exigence.
 *
 * Le traitement se fait au chargement de la page, à dessein : un clic dans un
 * courriel doit suffire. Le risque habituel de cette approche (un
 * pré-chargeur de lien qui déclenche l'action à l'insu de la personne) est
 * ici sans gravité — le pire cas est de ne plus recevoir d'alertes, ce qui
 * est précisément ce que la personne demandait.
 *
 * Le jeton est un UUID aléatoire, jamais le courriel : un lien de
 * désabonnement traîne dans les journaux de serveurs et les proxys, il ne
 * doit révéler aucune adresse ni permettre d'en désabonner une autre.
 */

export const metadata: Metadata = {
  title: "Désabonnement",
  // Cette page ne doit pas être indexée : elle n'a de sens qu'atteinte
  // depuis un courriel, et son jeton n'a rien à faire dans un moteur.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let done = false;
  let failed = false;

  if (UUID_RE.test(token)) {
    try {
      const supabase = await createClient();
      // `unsubscribe_by_token` est la seule porte ouverte au visiteur
      // anonyme : elle coupe les envois et ne renvoie qu'un booléen, jamais
      // le courriel associé au jeton.
      const { data, error } = await supabase.rpc("unsubscribe_by_token", {
        p_token: token,
      });
      if (error) {
        console.error("désabonnement: RPC", error.message);
        failed = true;
      } else {
        done = data === true;
      }
    } catch (error) {
      unstable_rethrow(error);
      console.error("désabonnement", error);
      failed = true;
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        {done ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
              ✓
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
              C&apos;est fait
            </h1>
            <p className="mt-3 text-gray-600">
              Vous ne recevrez plus d&apos;alertes lorsqu&apos;une tâche est
              publiée près de chez vous. Votre profil reste actif : les
              employeurs peuvent toujours demander à être mis en contact avec
              vous.
            </p>
            <p className="mt-3 text-sm text-gray-500">
              Vous préférez retirer complètement votre profil du répertoire ?
              Décochez « profil public » depuis{" "}
              <Link
                href="/mon-compte"
                className="font-medium text-brand-600 hover:underline"
              >
                votre compte
              </Link>
              , ou écrivez-nous et nous le ferons pour vous.
            </p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
              !
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
              Ce lien n&apos;est plus valide
            </h1>
            <p className="mt-3 text-gray-600">
              {failed
                ? "Nous n'avons pas pu traiter votre demande à l'instant. Réessayez dans quelques minutes."
                : "Ce lien de désabonnement est inconnu — il a peut-être déjà été utilisé, ou votre profil a été supprimé depuis."}
            </p>
            <p className="mt-3 text-sm text-gray-500">
              Si vous recevez encore des courriels, répondez simplement à
              l&apos;un d&apos;eux : nous traiterons la demande à la main.
            </p>
          </>
        )}

        <ButtonLink href="/" variant="secondary" className="mt-7">
          Retour à l&apos;accueil
        </ButtonLink>
      </div>
    </div>
  );
}
