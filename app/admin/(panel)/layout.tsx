import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

// L'espace admin est toujours dynamique (données live, session requise).
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Garde serveur (en plus du middleware) : aucune donnée sans admin valide.
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav email={user.email} />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
