"use client";
import { useActionState, useEffect, useState } from "react";
import { Varsel } from "@/components/ui";
import { genererTilbud, type GenererTilstand } from "./actions";

// Vises etter tur mens prisagenten jobber (tar ca. et halvt minutt)
const STEG = [
  "Leser befaringen …",
  "Finner lignende jobber …",
  "Regner ut timer og materiell …",
  "Skriver begrunnelse …",
  "Gjør klar utkastet …",
];

export default function GenererKnapp({
  befaringId,
  tekst,
  sekundaer = false,
}: {
  befaringId: number;
  tekst: string;
  sekundaer?: boolean;
}) {
  const [t, sendInn, jobber] = useActionState<GenererTilstand>(
    genererTilbud.bind(null, befaringId),
    {}
  );
  const [steg, setSteg] = useState(0);

  useEffect(() => {
    if (!jobber) return setSteg(0);
    const id = setInterval(() => setSteg((s) => Math.min(s + 1, STEG.length - 1)), 6000);
    return () => clearInterval(id);
  }, [jobber]);

  return (
    <form action={sendInn} className="mt-8">
      <button
        type="submit"
        disabled={jobber}
        className={`knapp knapp-stor w-full ${sekundaer ? "knapp-sekundaer" : "knapp-hoved"}`}
      >
        {jobber ? (
          <>
            <Spinner />
            <span>{STEG[steg]}</span>
          </>
        ) : (
          <>
            <Gnist />
            {tekst}
          </>
        )}
      </button>
      <p className="mt-2 text-center text-xs text-zinc-400">
        {jobber ? "Prisagenten jobber – dette tar rundt et halvt minutt" : "Prisagenten lager et utkast basert på tidligere jobber"}
      </p>
      {t.feil && (
        <Varsel type="feil" className="mt-4">
          {t.feil}
        </Varsel>
      )}
    </form>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 animate-spin" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Gnist() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 text-messing-400" fill="currentColor" aria-hidden>
      <path d="M10 1.5c.4 3.9 2.6 6.1 6.5 6.5-3.9.4-6.1 2.6-6.5 6.5-.4-3.9-2.6-6.1-6.5-6.5 3.9-.4 6.1-2.6 6.5-6.5Z" />
      <path d="M15.5 13c.2 1.6 1 2.4 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.1 2.3-.9 2.5-2.5Z" opacity=".6" />
    </svg>
  );
}
