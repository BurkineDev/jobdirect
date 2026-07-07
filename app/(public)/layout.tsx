import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getCurrentProfile } from "@/lib/auth";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <>
      <Header profile={profile} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
