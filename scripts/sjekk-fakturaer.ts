// Sjekker at fakturaene i databasen stemmer med fasiten.
// Kjør etter innlesingen:  npm run sjekk-fakturaer
//
// Fasiten (fakturaer/fasit.json) er laget ved å lese teksten i PDF-en med et vanlig
// verktøy (pdftotext), UTEN AI. Så hvis Claude har lest noe feil, vil det synes her.
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";

type FasitLinje = { beskrivelse: string; antall: number; enhet: string; enhetspris: number };
type FasitFaktura = { fakturanr: string; dato: string; sumEksMva: number; linjer: FasitLinje[] };

const fasit: FasitFaktura[] = JSON.parse(readFileSync("fakturaer/fasit.json", "utf8"));
const kr = (n: number) => n.toLocaleString("nb-NO", { minimumFractionDigits: 2 });
const likt = (a: number, b: number) => Math.abs(a - b) < 0.01;

async function main() {
  const lagret = await db.faktura.findMany({ include: { linjer: true } });
  const feil: string[] = [];
  let ok = 0;

  for (const f of fasit) {
    const d = lagret.find((x) => x.fakturanr === f.fakturanr);
    if (!d) { feil.push(`${f.fakturanr}: mangler i databasen`); continue; }

    const problemer: string[] = [];
    if (!likt(d.totalEksMva, f.sumEksMva))
      problemer.push(`total ${kr(d.totalEksMva)}, skal være ${kr(f.sumEksMva)}`);
    if (d.linjer.length !== f.linjer.length)
      problemer.push(`${d.linjer.length} linjer, skal være ${f.linjer.length}`);
    if (d.dato?.toISOString().slice(0, 10) !== f.dato)
      problemer.push(`dato ${d.dato?.toISOString().slice(0, 10)}, skal være ${f.dato}`);

    // Hver fasitlinje skal finnes med samme antall og pris
    for (const fl of f.linjer) {
      const treff = d.linjer.some((l) => likt(l.antall, fl.antall) && likt(l.enhetspris, fl.enhetspris));
      if (!treff) problemer.push(`finner ikke «${fl.beskrivelse}» (${fl.antall} × ${kr(fl.enhetspris)})`);
    }

    if (problemer.length) feil.push(`${f.fakturanr}: ${problemer.join("; ")}`);
    else ok++;
  }

  const ekstra = lagret.filter((d) => !fasit.some((f) => f.fakturanr === d.fakturanr));
  for (const d of ekstra) feil.push(`${d.fakturanr ?? "(uten nr)"}: finnes i databasen, men ikke i fasiten`);

  console.log(`${ok} av ${fasit.length} fakturaer stemmer nøyaktig med fasiten.`);
  for (const f of feil) console.log(`  ✗ ${f}`);
  if (feil.length === 0) console.log("Alt stemmer ✓");
  process.exitCode = feil.length ? 1 : 0;
}

main().finally(() => db.$disconnect());
