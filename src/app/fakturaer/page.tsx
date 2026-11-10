import { db } from "@/lib/db";
import { krevBruker } from "@/lib/innlogging";
import { TYPE_NAVN, kr } from "@/lib/tilbud";
import { Side } from "@/components/ui";
import Opplasting from "./Opplasting";

export default async function Fakturaer() {
  await krevBruker();
  const fakturaer = await db.faktura.findMany({
    orderBy: { fakturanr: "asc" },
    include: { linjer: true },
  });

  return (
    <Side
      tilbake={{ href: "/", tekst: "Oversikt" }}
      tittel="Tidligere fakturaer"
      undertittel="Prisagenten lærer priser, timer og materiell fra disse."
    >
      <Opplasting />

      <h2 className="seksjonstittel mt-10 mb-3 px-1">{fakturaer.length} fakturaer</h2>
      <ul className="kort divide-y divide-zinc-100 overflow-hidden">
        {fakturaer.map((f) => (
          <li key={f.id}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4 transition select-none hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
                <span className="tall mt-0.5 w-11 shrink-0 text-sm text-zinc-400">{f.fakturanr ?? "–"}</span>
                <span className="min-w-0 flex-1 text-[15px] leading-snug">{f.arbeidsbeskrivelse}</span>
                <span className="tall shrink-0 text-[15px] font-medium whitespace-nowrap">{kr(f.totalEksMva)}</span>
              </summary>
              <ul className="space-y-2 bg-zinc-50/70 px-5 py-4 pl-20 text-sm">
                {f.linjer.map((l) => (
                  <li key={l.id} className="flex gap-4">
                    <div className="min-w-0 flex-1">
                      <p>{l.beskrivelse}</p>
                      <p className="tall text-xs text-zinc-500">
                        {TYPE_NAVN[l.type] ?? l.type} · {l.antall.toLocaleString("nb-NO")} {l.enhet} × {kr(l.enhetspris)}
                      </p>
                    </div>
                    <span className="tall whitespace-nowrap text-zinc-600">{kr(l.antall * l.enhetspris)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
      <p className="mt-3 px-1 text-xs text-zinc-400">Alle beløp er eks. mva. Trykk på en faktura for å se linjene.</p>
    </Side>
  );
}
