"use client";
import { useActionState, useState } from "react";
import { Varsel } from "@/components/ui";
import { lastOppFakturaer, type OpplastingTilstand } from "./actions";

export default function Opplasting() {
  const [t, sendInn, sender] = useActionState<OpplastingTilstand, FormData>(lastOppFakturaer, {});
  const [filer, setFiler] = useState<string[]>([]);

  return (
    <form action={sendInn} className="kort p-5">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-7 text-center transition hover:border-zinc-400 hover:bg-zinc-50">
        <svg viewBox="0 0 24 24" className="size-6 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="mt-2 text-sm font-medium">
          {filer.length > 0 ? filer.join(", ") : "Velg PDF-fakturaer"}
        </span>
        <span className="mt-0.5 text-xs text-zinc-500">Claude leser alle fakturaene i filen</span>
        <input
          type="file"
          name="pdf"
          accept="application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => setFiler(Array.from(e.target.files ?? []).map((f) => f.name))}
        />
      </label>
      <button type="submit" disabled={sender || filer.length === 0} className="knapp knapp-hoved mt-4 w-full">
        {sender ? "Claude leser fakturaene … (kan ta et minutt)" : "Les inn fakturaer"}
      </button>

      {t.feil && (
        <Varsel type="feil" className="mt-4">
          {t.feil}
        </Varsel>
      )}
      {t.resultat && (
        <Varsel type="suksess" className="mt-4" tittel={`${t.resultat.lagret} fakturaer lagret`}>
          {t.resultat.hoppetOver.length > 0 && <p>Fantes fra før: {t.resultat.hoppetOver.join(", ")}</p>}
          {t.resultat.avvik.map((a) => (
            <p key={a} className="text-messing-700">{a}</p>
          ))}
        </Varsel>
      )}
    </form>
  );
}
