"use client";
import { useActionState } from "react";
import { lastOppFakturaer, type OpplastingTilstand } from "./actions";

export default function Opplasting() {
  const [t, sendInn, sender] = useActionState<OpplastingTilstand, FormData>(lastOppFakturaer, {});
  return (
    <form action={sendInn} className="mt-4 space-y-3 rounded-lg border p-4">
      <input type="file" name="pdf" accept="application/pdf" multiple className="block w-full text-sm" />
      <button
        type="submit"
        disabled={sender}
        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white disabled:opacity-50"
      >
        {sender ? "Claude leser fakturaene … (kan ta et minutt)" : "Les inn fakturaer"}
      </button>
      {t.feil && <p className="text-sm text-red-600">{t.feil}</p>}
      {t.resultat && (
        <div className="text-sm">
          <p className="text-green-700">{t.resultat.lagret} fakturaer lagret.</p>
          {t.resultat.hoppetOver.length > 0 && (
            <p className="text-gray-500">Fantes fra før: {t.resultat.hoppetOver.join(", ")}</p>
          )}
          {t.resultat.avvik.map((a) => (
            <p key={a} className="text-amber-700">⚠ {a}</p>
          ))}
        </div>
      )}
    </form>
  );
}
