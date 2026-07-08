import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Icône « standard » : brand orange plein + porte-documents blanc (comme le logo).
const iconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#f97316"/>
  <g transform="translate(116,116) scale(11.67)" fill="none" stroke="#ffffff"
     stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </g>
</svg>`;

// Version « maskable » : plus de marge (zone de sécurité des masques circulaires).
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#f97316"/>
  <g transform="translate(142,142) scale(9.5)" fill="none" stroke="#ffffff"
     stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </g>
</svg>`;

await mkdir("public/icons", { recursive: true });

const render = (svg, size, out) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);

await render(iconSvg, 192, "public/icons/icon-192.png");
await render(iconSvg, 512, "public/icons/icon-512.png");
await render(maskableSvg, 512, "public/icons/icon-maskable-512.png");
await render(iconSvg, 180, "app/apple-icon.png");
await render(iconSvg, 512, "app/icon.png");

console.log("Icônes PWA générées ✓");
