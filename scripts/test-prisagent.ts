// Kontrolltest av prisagenten ("la én faktura være ute"):
// For hver faktura later vi som om den ikke finnes, gir agenten bare arbeidsbeskrivelsen,
// og sammenligner agentens pris med det jobben faktisk ble fakturert for.
//
//   npm run test-prisagent            → tester 5 fakturaer (koster noen få kroner)
//   npm run test-prisagent -- --alle  → tester alle
//   npm run test-prisagent -- 1007    → tester én bestemt faktura og viser detaljene
import { db } from "../src/lib/db";
import { foreslaTilbud } from "../src/lib/prisagent";
import { skrivForslag } from "./skrivForslag";

const kr = (n: number) => n.toLocaleString("nb-NO", { maximumFractionDigits: 0 });

async function main() {
  const args = process.argv.slice(2);
  const [firma, alle] = await Promise.all([
    db.firma.findFirst(),
    db.faktura.findMany({ include: { linjer: true }, orderBy: { fakturanr: "asc" } }),
  ]);
  if (alle.length < 2) throw new Error("Les inn fakturaene først (npm run importer -- fakturaer/20_fakturaer.pdf).");

  const valgteNr = args.filter((a) => /^\d+$/.test(a));
  const utvalg = valgteNr.length
    ? alle.filter((f) => valgteNr.includes(f.fakturanr ?? ""))
    : args.includes("--alle")
      ? alle
      : alle.filter((_, i) => i % Math.ceil(alle.length / 5) === 0); // jevnt fordelt, 5 stk
  const detaljer = utvalg.length === 1;

  const avvik: number[] = [];
  for (const fasit of utvalg) {
    const andre = alle.filter((f) => f.id !== fasit.id);
    const f = await foreslaTilbud({
      arbeidsbeskrivelse: fasit.arbeidsbeskrivelse,
      timepris: firma?.timepris ?? 950,
      fakturaer: andre,
    });
    const pst = ((f.sumEksMva - fasit.totalEksMva) / fasit.totalEksMva) * 100;
    avvik.push(Math.abs(pst));
    console.log(
      `${fasit.fakturanr}  faktisk ${kr(fasit.totalEksMva).padStart(7)}  agent ${kr(f.sumEksMva).padStart(7)}  ` +
        `${pst >= 0 ? "+" : ""}${pst.toFixed(0)} %  ${Math.abs(pst) <= 20 ? "✓" : "✗"}  ${fasit.arbeidsbeskrivelse}`
    );
    if (detaljer) { console.log(); skrivForslag(f); }
  }
  const snitt = avvik.reduce((a, b) => a + b, 0) / avvik.length;
  const innenfor = avvik.filter((a) => a <= 20).length;
  console.log(`\nGjennomsnittlig avvik: ${snitt.toFixed(0)} %. Innenfor ±20 %: ${innenfor} av ${avvik.length}.`);
}

main()
  .catch((e) => { console.error("Feil:", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
