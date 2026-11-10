import Link from "next/link";
import { db } from "@/lib/db";

// Forsiden: siste befaringer + knapp for ny befaring.
export default async function Home() {
  const [firma, befaringer, antallFakturaer] = await Promise.all([
    db.firma.findFirst(),
    db.befaring.findMany({
      orderBy: { dato: "desc" },
      take: 20,
      include: { kunde: true },
    }),
    db.faktura.count(),
  ]);

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Tilbudsapp</h1>
      <p className="text-gray-500">{firma?.navn ?? "Fra befaring til tilbud"}</p>

      <Link
        href="/befaring/ny"
        className="mt-6 block rounded-lg bg-blue-600 py-4 text-center text-lg font-semibold text-white"
      >
        + Ny befaring
      </Link>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Siste befaringer
      </h2>
      {befaringer.length === 0 ? (
        <p className="mt-2 text-gray-400">Ingen befaringer ennå.</p>
      ) : (
        <ul className="mt-2 divide-y rounded-lg border">
          {befaringer.map((b) => (
            <li key={b.id}>
              <Link href={`/befaring/${b.id}`} className="block p-4 hover:bg-gray-50">
                <div className="flex justify-between">
                  <span className="font-medium">{b.kunde.navn}</span>
                  <span className="text-sm text-gray-500">
                    {b.dato.toLocaleDateString("nb-NO")}
                  </span>
                </div>
                <p className="truncate text-sm text-gray-500">{b.arbeidsbeskrivelse}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/fakturaer" className="mt-8 block text-sm text-blue-600">
        {antallFakturaer} tidligere fakturaer lest inn →
      </Link>
    </main>
  );
}
