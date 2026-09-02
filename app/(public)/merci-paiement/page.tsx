import type { Metadata } from "next";
import { retrieveCheckoutSession } from "@/lib/payments";
import { PaymentReceipt } from "@/components/PaymentReceipt";

export const metadata: Metadata = {
  title: "Paiement confirmé",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

/** Retour Stripe après le paiement d'une commission de mise en relation. */
export default async function CommissionThankYouPage({
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
      title="Merci, paiement reçu !"
      nextStep="Votre facture est réglée. Bonne tâche — et à bientôt sur JobDirect pour vos prochains besoins."
    />
  );
}
