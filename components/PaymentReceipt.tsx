import { ButtonLink } from "@/components/ui/Button";

/**
 * Panneau de retour après un paiement Stripe.
 * L'état affiché vient de Stripe (source de vérité), pas de la base : la page
 * reste juste même si le webhook n'est pas encore arrivé.
 */
export function PaymentReceipt({
  paid,
  amount,
  email,
  title,
  nextStep,
}: {
  paid: boolean;
  amount: number | null;
  email: string | null;
  title: string;
  nextStep: string;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <span
        className={`inline-flex h-16 w-16 items-center justify-center rounded-full ${
          paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        }`}
        aria-hidden="true"
      >
        <svg
          className="h-8 w-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {paid ? (
            <polyline points="20 6 9 17 4 12" />
          ) : (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </>
          )}
        </svg>
      </span>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">
        {paid ? title : "Paiement en attente"}
      </h1>

      <p className="mt-3 text-gray-600">
        {paid
          ? nextStep
          : "Nous n'avons pas encore reçu la confirmation de votre paiement. Si vous venez de payer, patientez un instant puis rechargez la page."}
      </p>

      {paid && amount !== null && (
        <p className="mt-4 text-sm text-gray-500">
          Montant payé : <strong>{(amount / 100).toFixed(2)} $ CAD</strong>
          {email ? ` · reçu envoyé à ${email}` : null}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Retour à l&apos;accueil</ButtonLink>
        <ButtonLink href="/embaucher" variant="secondary">
          Voir les travailleurs
        </ButtonLink>
      </div>
    </div>
  );
}
