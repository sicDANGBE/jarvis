// Génère les icônes de l'application à partir de resources/icon.svg (source unique) :
//   resources/icon.png  (1024 px, Linux, Windows, fenêtres)
//   resources/icon.icns (macOS : PNG 128, 256, 512 et 1024 px)
// Usage : node apps/desktop/scripts/build-icons.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const resources = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "resources");
const svg = await readFile(path.join(resources, "icon.svg"), "utf8");

// CHROMIUM_PATH : navigateur à utiliser quand celui de Playwright n'est pas installé.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
async function render(size) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace(
      "<svg ",
      `<svg width="${size}" height="${size}" `,
    )}</body></html>`,
  );
  const png = await page.screenshot({ omitBackground: true });
  await page.close();
  return png;
}

const sizes = { ic07: 128, ic08: 256, ic09: 512, ic10: 1024 };
const pngs = {};
for (const [type, size] of Object.entries(sizes)) pngs[type] = await render(size);
await browser.close();

await writeFile(path.join(resources, "icon.png"), pngs.ic10);

// Format ICNS : en-tête "icns" + longueur totale, puis des blocs (type sur 4 octets, longueur
// du bloc en-tête compris, données PNG).
const chunks = Object.entries(pngs).map(([type, data]) => {
  const header = Buffer.alloc(8);
  header.write(type, 0, "ascii");
  header.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([header, data]);
});
const body = Buffer.concat(chunks);
const header = Buffer.alloc(8);
header.write("icns", 0, "ascii");
header.writeUInt32BE(body.length + 8, 4);
await writeFile(path.join(resources, "icon.icns"), Buffer.concat([header, body]));

console.log("Icônes générées : icon.png (1024 px), icon.icns");
