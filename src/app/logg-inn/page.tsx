import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hentBruker } from "@/lib/innlogging";
import { Monogram, Varsel } from "@/components/ui";
import Skjema from "./Skjema";

export default async function LoggInn() {
  if (await hentBruker()) redirect("/"); // allerede logget inn
  const firma = await db.firma.findFirst();
  const firmanavn = firma?.navn ?? "Tilbudsapp";
  const harBrukere = (await db.bruker.count()) > 0;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Monogram navn={firmanavn} stor />
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.025em]">Velkommen tilbake</h1>
          <p className="mt-1 text-[15px] text-zinc-500">Logg inn hos {firmanavn}</p>
        </div>

        <div className="kort mt-8 p-6">
          {harBrukere ? (
            <Skjema />
          ) : (
            <Varsel type="advarsel" tittel="Ingen brukere ennå">
              Lag den første administratoren fra terminalen:
              <code className="mt-2 block rounded-lg bg-white/70 px-3 py-2 font-mono text-xs">
                npm run ny-bruker -- din@epost.no &quot;Ditt Navn&quot;
              </code>
            </Varsel>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">Fra befaring til tilbud på minutter</p>
      </div>
    </main>
  );
}
