"use client";
import { useActionState } from "react";
import { genererTilbud, type GenererTilstand } from "./actions";

export default function GenererKnapp({ befaringId, harFakturaer }: { befaringId: number; harFakturaer: boolean }) {
  const [tilstand, handling, venter] = useActionState<GenererTilstand>(
    genererTilbud.bind(null, befaringId),
    {}
  );

  return (
    <form action={handling} className="mt-6">
      <button
        disabled={venter || !harFakturaer}
        className="w-full rounded-lg bg-green-600 py-4 text-lg font-semibold text-white disabled:opacity-50"
      >
        {venter ? "Prisagenten jobber …" : "Generer tilbud"}
      </button>
      <p className="mt-2 text-center text-sm text-gray-400">
        {!harFakturaer
          ? "Les inn tidligere fakturaer først – agenten priser ut fra dem"
          : venter
            ? "Sammenligner med tidligere jobber. Tar gjerne 20–60 sekunder."
            : "Agenten lager et utkast du kan se over før noe sendes"}
      </p>
      {tilstand.feil && (
        <p className="mt-2 rounded bg-red-50 p-3 text-sm text-red-700">{tilstand.feil}</p>
      )}
    </form>
  );
}
