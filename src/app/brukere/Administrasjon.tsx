"use client";
import { useActionState, useState, useTransition } from "react";
import { Varsel } from "@/components/ui";
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
        <Varsel type="suksess" tittel={`Midlertidig passord for ${visPassord.navn}`} className="mb-6">
          <p className="text-emerald-800">{visPassord.epost}</p>
          <code className="tall mt-2 inline-block rounded-lg bg-white px-3 py-1.5 font-mono text-base tracking-wide text-zinc-900 ring-1 ring-emerald-200">
            {visPassord.passord}
          </code>
          <p className="mt-3">
            Gi det til {visPassord.navn} på en trygg måte, for eksempel muntlig eller på SMS. Det
            vises bare nå. Be dem bytte passord under «Min konto» etter første innlogging.
          </p>
        </Varsel>
      )}
      {radsvar.feil && (
        <Varsel type="feil" className="mb-6">
          {radsvar.feil}
        </Varsel>
      )}

      <ul className="kort divide-y divide-zinc-100 overflow-hidden">
        {brukere.map((b) => (
          <li key={b.id} className="flex items-center gap-3.5 px-5 py-4">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
              {b.navn.trim()[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {b.navn} {b.id === megId && <span className="font-normal text-zinc-400">· deg</span>}
              </p>
              <p className="truncate text-sm text-zinc-500">
                {b.epost} · {b.rolle === "ADMIN" ? "Administrator" : "Ansatt"}
              </p>
              {b.id !== megId && (
                <div className="mt-1.5 -ml-3 flex">
                  <button
                    disabled={jobber}
                    onClick={() => kjor(() => nyttPassordFor(b.id))}
                    className="knapp knapp-stille py-1 text-xs"
                  >
                    Lag nytt passord
                  </button>
                  <button
                    disabled={jobber}
                    onClick={() => {
                      if (confirm(`Fjerne ${b.navn}? De kan ikke logge inn lenger.`)) kjor(() => fjernBruker(b.id));
                    }}
                    className="knapp knapp-fare py-1 text-xs"
                  >
                    Fjern
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <section className="kort mt-8 p-5">
        <h2 className="seksjonstittel mb-4">Legg til bruker</h2>
        <form
          action={(fd) => {
            setRadsvar({});
            leggTil(fd);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="etikett">Navn</span>
            <input name="navn" required className="felt" />
          </label>
          <label className="block">
            <span className="etikett">E-post</span>
            <input name="epost" type="email" required className="felt" />
            <span className="hjelpetekst mt-1 block">Brukes til innlogging</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-zinc-200 px-3.5 py-3 text-sm transition hover:bg-zinc-50">
            <input type="checkbox" name="rolle" value="ADMIN" className="mt-0.5 size-4 accent-zinc-900" />
            <span>
              <span className="font-medium">Administrator</span>
              <span className="block text-zinc-500">Kan legge til og fjerne brukere</span>
            </span>
          </label>
          {ny.feil && <p className="feiltekst">{ny.feil}</p>}
          <button type="submit" disabled={legger} className="knapp knapp-hoved w-full">
            {legger ? "Legger til …" : "Legg til"}
          </button>
        </form>
      </section>
    </>
  );
}
