// Prøv prisagenten fra terminalen (lagrer ingenting):
//   npm run prisagent -- "Montere 6 downlights i stue med dimmer"
import { db } from "../src/lib/db";
import { foreslaTilbud } from "../src/lib/prisagent";
import { skrivForslag } from "./skrivForslag";

async function main() {
  const beskrivelse = process.argv.slice(2).join(" ").trim();
  if (!beskrivelse) {
    console.error('Bruk: npm run prisagent -- "beskrivelse av jobben"');
    process.exit(1);
  }
  const [firma, fakturaer] = await Promise.all([
    db.firma.findFirst(),
    db.faktura.findMany({ include: { linjer: true } }),
  ]);
  console.log(`Spør prisagenten (${fakturaer.length} fakturaer å sammenligne med) …\n`);
  const f = await foreslaTilbud({ arbeidsbeskrivelse: beskrivelse, timepris: firma?.timepris ?? 950, fakturaer });
  skrivForslag(f);
}

main()
  .catch((e) => { console.error("Feil:", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
