// Kjør fra terminalen:  npm run importer -- fakturaer/20_fakturaer.pdf
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { importerFakturaPdf } from "../src/lib/fakturaleser";

const filer = process.argv.slice(2);
if (filer.length === 0) {
  console.error("Bruk: npm run importer -- <fil.pdf> [flere.pdf ...]");
  process.exit(1);
}

async function main() {
  for (const fil of filer) {
    console.log(`Leser ${fil} …`);
    const r = await importerFakturaPdf(readFileSync(fil), basename(fil));
    console.log(`  ${r.lagret} fakturaer lagret`);
    if (r.hoppetOver.length)
      console.log(`  Fantes fra før: ${r.hoppetOver.join(", ")}`);
    for (const a of r.avvik) console.log(`  ⚠ ${a}`);
  }
}

main().catch((e) => {
  console.error("Feil:", e instanceof Error ? e.message : e);
  process.exit(1);
});
