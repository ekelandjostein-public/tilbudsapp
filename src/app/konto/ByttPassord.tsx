"use client";
import { useActionState } from "react";
import { byttPassord, type PassordTilstand } from "./actions";

export default function ByttPassord() {
  const [t, sendInn, sender] = useActionState<PassordTilstand, FormData>(byttPassord, {});
  return (
    <form action={sendInn} className="mt-3 space-y-3">
      {[
        ["naa", "Nåværende passord", "current-password"],
        ["nytt", "Nytt passord (minst 10 tegn)", "new-password"],
        ["gjenta", "Gjenta nytt passord", "new-password"],
      ].map(([navn, etikett, auto]) => (
        <label key={navn} className="block">
          <span className="text-sm font-medium">{etikett}</span>
          <input
            name={navn}
            type="password"
            autoComplete={auto}
            required
            className="mt-1 w-full rounded-lg border p-3 text-base"
          />
        </label>
      ))}
      {t.feil && <p className="text-sm text-red-600">{t.feil}</p>}
      {t.ok && <p className="text-sm text-green-700">✓ Passordet er byttet. Du er logget ut på andre enheter.</p>}
      <button
        type="submit"
        disabled={sender}
        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white disabled:opacity-50"
      >
        {sender ? "Lagrer …" : "Bytt passord"}
      </button>
    </form>
  );
}
