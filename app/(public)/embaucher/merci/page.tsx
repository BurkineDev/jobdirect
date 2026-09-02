import type { Metadata } from "next";
import { retrieveCheckoutSession } from "@/lib/payments";
import { PaymentReceipt } from "@/components/PaymentReceipt";

export const metadata: Metadata = {
  title: "Paiement confirmé",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/** Retour Stripe après le paiement des frais de mise en relation. */
export default async function ConnectionThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const session = sessionId ? await retrieveCheckoutSession(sessionId) : null;

  return (
    <PaymentReceipt
      paid={Boolean(session?.paid)}
      amount={session?.amountTotal ?? null}
      email={session?.email ?? null}
      title="Paiement reçu — merci !"
      nextStep="Nous contactons le travailleur et revenons vers vous par téléphone dans les meilleurs délais. Si personne n'est disponible, vous êtes intégralement remboursé."
    />
  );
}
