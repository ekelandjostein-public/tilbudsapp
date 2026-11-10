import { krevBruker } from "@/lib/innlogging";
import { Seksjon, Side } from "@/components/ui";
import { loggUt } from "../logg-inn/actions";
import ByttPassord from "./ByttPassord";

export default async function Konto() {
  const bruker = await krevBruker();
  return (
    <Side tilbake={{ href: "/", tekst: "Oversikt" }} tittel="Min konto">
      <div className="kort flex items-center gap-4 p-5">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold text-messing-400">
          {bruker.navn.trim()[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{bruker.navn}</p>
          <p className="truncate text-sm text-zinc-500">{bruker.epost}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
          {bruker.rolle === "ADMIN" ? "Administrator" : "Ansatt"}
        </span>
      </div>

      <Seksjon tittel="Bytt passord" className="mt-4">
        <ByttPassord />
      </Seksjon>

      <form action={loggUt} className="mt-8">
        <button type="submit" className="knapp knapp-sekundaer w-full">
          Logg ut
        </button>
      </form>
    </Side>
  );
}
