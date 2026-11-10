import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hentBruker } from "@/lib/innlogging";
import Skjema from "./Skjema";

export default async function LoggInn() {
  if (await hentBruker()) redirect("/"); // allerede logget inn
  const firma = await db.firma.findFirst();
  const harBrukere = (await db.bruker.count()) > 0;

  return (
    <main className="mx-auto max-w-sm p-6 pt-16">
      <h1 className="text-2xl font-bold">Logg inn</h1>
      <p className="text-gray-500">{firma?.navn ?? "Tilbudsapp"}</p>
      {harBrukere ? (
        <Skjema />
      ) : (
        <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          Ingen brukere er opprettet ennå. Lag den første (administrator) fra terminalen:
          <code className="mt-2 block rounded bg-white p-2 text-xs">
            npm run ny-bruker -- din@epost.no &quot;Ditt Navn&quot;
          </code>
        </p>
      )}
    </main>
  );
}
