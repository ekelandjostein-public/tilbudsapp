import Link from "next/link";
import { db } from "@/lib/db";
import { krevBruker } from "@/lib/innlogging";
import Opplasting from "./Opplasting";

const kr = (n: number) => n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function Fakturaer() {
  await krevBruker();
  const fakturaer = await db.faktura.findMany({
    orderBy: { fakturanr: "asc" },
    include: { linjer: true },
  });

  return (
    <main className="mx-auto max-w-md p-6">
      <Link href="/" className="text-sm text-blue-600">← Tilbake</Link>
      <h1 className="mt-2 text-2xl font-bold">Tidligere fakturaer</h1>
      <p className="text-gray-500">Prisagenten lærer priser fra disse.</p>

      <Opplasting />

      <ul className="mt-6 space-y-3">
        {fakturaer.map((f) => (
          <li key={f.id} className="rounded-lg border">
            <details>
              <summary className="cursor-pointer p-4">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">#{f.fakturanr ?? "?"}</span>
                  <span>{kr(f.totalEksMva)} kr <span className="text-xs text-gray-500">eks. mva</span></span>
                </div>
                <p className="text-sm text-gray-500">{f.arbeidsbeskrivelse}</p>
              </summary>
              <table className="w-full border-t text-sm">
                <tbody>
                  {f.linjer.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="p-2">
                        {l.beskrivelse}
                        <div className="text-xs text-gray-500">
                          {l.type} · {l.antall} {l.enhet} × {kr(l.enhetspris)}
                        </div>
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">{kr(l.antall * l.enhetspris)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </li>
        ))}
      </ul>
    </main>
  );
}
