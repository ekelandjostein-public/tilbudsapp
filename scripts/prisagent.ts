// Kjør fra terminalen:  npm run prisagent -- <befaring-id>
//                  eller npm run prisagent -- "Beskrivelse av jobben"   (lager en testbefaring)
import { db } from "../src/lib/db";
import { lagTilbudsutkast, lesGrunnlag, sumEksMva } from "../src/lib/prisagent";

const arg = process.argv.slice(2).join(" ").trim();
if (!arg) {
  console.error('Bruk: npm run prisagent -- <befaring-id>   eller   npm run prisagent -- "beskrivelse"');
  process.exit(1);
}

async function befaringId(): Promise<number> {
  if (/^\d+$/.test(arg)) return Number(arg);
  const b = await db.befaring.create({
    data: {
      dato: new Date(),
      arbeidsbeskrivelse: arg,
      kunde: { create: { navn: "Testkunde", adresse: "Testveien 1", epost: "test@example.com" } },
    },
  });
  console.log(`Laget testbefaring #${b.id}`);
  return b.id;
}

async function main() {
  const id = await befaringId();
  console.log("Prisagenten jobber …");
  const tilbudId = await lagTilbudsutkast(id);
  const t = await db.tilbud.findUniqueOrThrow({ where: { id: tilbudId }, include: { linjer: true } });
  const g = lesGrunnlag(t);

  console.log(`\nTilbud #${t.id} (utkast)`);
  for (const l of t.linjer)
    console.log(`  ${l.type.padEnd(9)} ${l.beskrivelse} – ${l.antall} ${l.enhet} × ${l.enhetspris} kr`);
  const sum = sumEksMva(t.linjer);
  console.log(`  Sum eks. mva: ${sum} kr   (inkl. mva: ${Math.round(sum * 125) / 100} kr)`);
  console.log(`\nBygger på: ${g.lignendeFakturaer.map((f) => `#${f.fakturanr} (${f.hvorfor})`).join("; ")}`);
  console.log(`Begrunnelse: ${t.begrunnelse}`);
  for (const f of g.forutsetninger) console.log(`  • ${f}`);
}

main().catch((e) => {
  console.error("Feil:", e instanceof Error ? e.message : e);
  process.exit(1);
});
