import type { KontrollertForslag } from "../src/lib/prisagent";

const kr = (n: number) => n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Skriver et prisforslag pent ut i terminalen. */
export function skrivForslag(f: KontrollertForslag) {
  for (const l of f.linjer)
    console.log(
      `  ${l.beskrivelse.padEnd(55).slice(0, 55)} ${String(l.antall).padStart(5)} ${l.enhet.padEnd(8)} × ${kr(l.enhetspris).padStart(9)} = ${kr(l.antall * l.enhetspris).padStart(10)}   [${l.kilde}]`
    );
  console.log(`  ${"Sum eks. mva".padEnd(93)}${kr(f.sumEksMva).padStart(10)}`);
  console.log(`  ${"Sum inkl. mva".padEnd(93)}${kr(f.sumEksMva * 1.25).padStart(10)}\n`);
  console.log(`Lignende: ${f.lignende.map((x) => `${x.fakturanr} (${x.hvorfor})`).join("; ") || "ingen"}`);
  console.log(`Sikkerhet: ${f.sikkerhet}`);
  console.log(`Begrunnelse: ${f.begrunnelse}`);
  for (const x of f.forutsetninger) console.log(`  • ${x}`);
  for (const m of f.merknader) console.log(`  ⚙ Kontroll: ${m}`);
}
