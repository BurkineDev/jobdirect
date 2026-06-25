import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-500">404</p>
      <h1 className="mt-4 text-2xl font-bold text-ink">Page introuvable</h1>
      <p className="mt-2 text-gray-600">
        La tâche ou la page que vous cherchez n&apos;existe plus ou a été
        retirée.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/taches">Parcourir les tâches</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Retour à l&apos;accueil
        </ButtonLink>
      </div>
    </div>
  );
}
