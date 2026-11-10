import Link from "next/link";
import { krevBruker } from "@/lib/innlogging";
import { loggUt } from "../logg-inn/actions";
import ByttPassord from "./ByttPassord";

export default async function Konto() {
  const bruker = await krevBruker();
  return (
    <main className="mx-auto max-w-md p-6">
      <Link href="/" className="text-sm text-blue-600">← Tilbake</Link>
      <h1 className="mt-2 text-2xl font-bold">Min konto</h1>
      <p className="text-gray-500">
        {bruker.navn} · {bruker.epost} · {bruker.rolle === "ADMIN" ? "Administrator" : "Ansatt"}
      </p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">Bytt passord</h2>
      <ByttPassord />

      <form action={loggUt} className="mt-10">
        <button type="submit" className="w-full rounded-lg border py-3 font-semibold">
          Logg ut
        </button>
      </form>
    </main>
  );
}
