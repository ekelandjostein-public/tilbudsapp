import { db } from "@/lib/db";

// Forsiden: viser foreløpig bare at databasen virker.
export default async function Home() {
  const [kunder, befaringer, tilbud, fakturaer] = await Promise.all([
    db.kunde.count(),
    db.befaring.count(),
    db.tilbud.count(),
    db.faktura.count(),
  ]);

  const tall = [
    { navn: "Kunder", antall: kunder },
    { navn: "Befaringer", antall: befaringer },
    { navn: "Tilbud", antall: tilbud },
    { navn: "Fakturaer", antall: fakturaer },
  ];

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Tilbudsapp</h1>
      <p className="mt-1 text-gray-500">Fra befaring til tilbud på minutter.</p>
      <ul className="mt-6 grid grid-cols-2 gap-3">
        {tall.map((t) => (
          <li key={t.navn} className="rounded-lg border p-4">
            <div className="text-3xl font-semibold">{t.antall}</div>
            <div className="text-sm text-gray-500">{t.navn}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
