import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobDirect — Tâches ponctuelles au Québec",
    short_name: "JobDirect",
    description:
      "Publiez une tâche ou trouvez du travail près de chez vous, partout au Québec.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#f97316",
    lang: "fr-CA",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Publier une tâche",
        short_name: "Publier",
        url: "/publier",
      },
      {
        name: "Parcourir les tâches",
        short_name: "Tâches",
        url: "/taches",
      },
      {
        name: "Je cherche du travail",
        short_name: "Travailler",
        url: "/travailleur",
      },
    ],
  };
}
