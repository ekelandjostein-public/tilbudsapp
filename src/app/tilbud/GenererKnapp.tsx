"use client";
import { useActionState } from "react";
import { genererTilbud, type GenererTilstand } from "./actions";

export default function GenererKnapp({ befaringId, tekst }: { befaringId: number; tekst: string }) {
  const [t, sendInn, jobber] = useActionState<GenererTilstand>(
    genererTilbud.bind(null, befaringId),
    {}
  );
  return (
    <form action={sendInn} className="mt-6">
      <button
        type="submit"
        disabled={jobber}
        className="w-full rounded-lg bg-green-600 py-4 text-lg font-semibold text-white disabled:opacity-50"
      >
        {jobber ? "Prisagenten jobber … (ca. et halvt minutt)" : tekst}
      </button>
      {t.feil && <p className="mt-2 text-sm text-red-600">{t.feil}</p>}
    </form>
  );
}
