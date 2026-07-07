import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JobDirect — Publiez une tâche. Trouvez une personne disponible.",
    template: "%s · JobDirect",
  },
  description:
    "JobDirect met en relation employeurs et particuliers du Québec avec des travailleurs journaliers disponibles près de chez vous.",
  metadataBase: new URL("https://jobdirect.ca"),
  openGraph: {
    title: "JobDirect",
    description:
      "Publiez une tâche. Trouvez une personne disponible près de chez vous.",
    locale: "fr_CA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-ink">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
