/**
 * Avertissement affiché quand l'administrateur est reconnu par l'application
 * mais PAS par la base de données.
 *
 * Sans lui, la panne est muette : l'admin entre dans le panneau, chaque
 * requête est filtrée par la RLS, et il ne voit que des listes vides — sans
 * distinction possible entre « il n'y a rien » et « on te cache tout ». Ce
 * bandeau donne la cause et la requête exacte qui la corrige.
 */
export function RlsWarning({ email }: { email: string }) {
  const sql = `insert into public.admins (email) values ('${email}') on conflict do nothing;`;

  return (
    <div className="mb-8 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-red-900">
        <span aria-hidden="true">⚠</span>
        Accès aux données bloqué — une seule requête à exécuter
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-red-900">
        Votre compte <strong>{email}</strong> est autorisé à ouvrir ces pages,
        mais il n&apos;est <strong>pas déclaré dans la base</strong>. La
        sécurité au niveau des lignes (RLS) filtre donc tout : les listes
        ci-dessous apparaîtront <strong>vides</strong>, même si vos tâches,
        travailleurs et candidatures existent bel et bien.
      </p>

      <p className="mt-3 text-sm font-semibold text-red-900">
        Dans Supabase → SQL Editor, exécutez :
      </p>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-red-900 p-3 text-xs leading-relaxed text-red-50">
        <code>{sql}</code>
      </pre>

      <p className="mt-3 text-xs text-red-800">
        Puis rechargez cette page. Il n&apos;y a rien à changer dans le code ni
        dans les variables d&apos;environnement — l&apos;autorisation des
        données vit uniquement dans la table{" "}
        <code className="rounded bg-red-100 px-1">public.admins</code>.
      </p>
    </div>
  );
}
