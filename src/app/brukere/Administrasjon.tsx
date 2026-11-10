"use client";
import { useActionState, useState, useTransition } from "react";
import { fjernBruker, leggTilBruker, nyttPassordFor, type BrukerTilstand } from "./actions";

type Bruker = { id: number; navn: string; epost: string; rolle: string };

export default function Administrasjon({ brukere, megId }: { brukere: Bruker[]; megId: number }) {
  const [ny, leggTil, legger] = useActionState<BrukerTilstand, FormData>(leggTilBruker, {});
  const [radsvar, setRadsvar] = useState<BrukerTilstand>({});
  const [jobber, startJobb] = useTransition();

  // Siste midlertidige passord, enten fra «legg til» eller «nytt passord»
  const visPassord = radsvar.nyttPassord ?? ny.nyttPassord;

  const kjor = (handling: () => Promise<BrukerTilstand>) =>
    startJobb(async () => setRadsvar(await handling()));

  return (
    <>
      {visPassord && (
        <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm">
          <p className="font-semibold text-green-900">Midlertidig passord for {visPassord.navn}</p>
          <p className="mt-2">E-post: {visPassord.epost}</p>
          <p>
            Passord: <code className="rounded bg-white px-2 py-1 text-base">{visPassord.passord}</code>
          </p>
          <p className="mt-2 text-green-900">
            Gi dette til {visPassord.navn} på en trygg måte (f.eks. muntlig eller SMS). Det vises
            bare nå. Be dem bytte passord under «Min konto» etter første innlogging.
          </p>
        </div>
      )}
      {radsvar.feil && <p className="mt-4 text-sm text-red-600">{radsvar.feil}</p>}

      <ul className="mt-6 divide-y rounded-lg border">
        {brukere.map((b) => (
          <li key={b.id} className="p-4">
            <div className="flex justify-between gap-2">
              <span className="font-medium">
                {b.navn} {b.id === megId && <span className="text-gray-400">(deg)</span>}
              </span>
              <span className="text-sm text-gray-500">{b.rolle === "ADMIN" ? "Administrator" : "Ansatt"}</span>
            </div>
            <p className="text-sm text-gray-500">{b.epost}</p>
            {b.id !== megId && (
              <div className="mt-2 flex gap-4 text-sm">
                <button
                  disabled={jobber}
                  onClick={() => kjor(() => nyttPassordFor(b.id))}
                  className="text-blue-600 disabled:opacity-50"
                >
                  Lag nytt passord
                </button>
                <button
                  disabled={jobber}
                  onClick={() => {
                    if (confirm(`Fjerne ${b.navn}? De kan ikke logge inn lenger.`)) kjor(() => fjernBruker(b.id));
                  }}
                  className="text-red-600 disabled:opacity-50"
                >
                  Fjern
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">Legg til bruker</h2>
      <form action={(fd) => { setRadsvar({}); leggTil(fd); }} className="mt-3 space-y-3 rounded-lg border p-4">
        <label className="block">
          <span className="text-sm font-medium">Navn</span>
          <input name="navn" required className="mt-1 w-full rounded-lg border p-3 text-base" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">E-post (brukes til innlogging)</span>
          <input name="epost" type="email" required className="mt-1 w-full rounded-lg border p-3 text-base" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="rolle" value="ADMIN" />
          Administrator (kan legge til og fjerne brukere)
        </label>
        {ny.feil && <p className="text-sm text-red-600">{ny.feil}</p>}
        <button
          type="submit"
          disabled={legger}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white disabled:opacity-50"
        >
          {legger ? "Legger til …" : "Legg til"}
        </button>
      </form>
    </>
  );
}
