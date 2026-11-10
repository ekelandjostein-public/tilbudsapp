"use client";
import { useActionState } from "react";
import { Varsel } from "@/components/ui";
import { byttPassord, type PassordTilstand } from "./actions";

export default function ByttPassord() {
  const [t, sendInn, sender] = useActionState<PassordTilstand, FormData>(byttPassord, {});
  return (
    <form action={sendInn} className="space-y-4">
      {[
        ["naa", "Nåværende passord", "current-password"],
        ["nytt", "Nytt passord", "new-password"],
        ["gjenta", "Gjenta nytt passord", "new-password"],
      ].map(([navn, etikett, auto]) => (
        <label key={navn} className="block">
          <span className="etikett">{etikett}</span>
          <input name={navn} type="password" autoComplete={auto} required className="felt" />
          {navn === "nytt" && <span className="hjelpetekst mt-1 block">Minst 10 tegn</span>}
        </label>
      ))}
      {t.feil && <p className="feiltekst">{t.feil}</p>}
      {t.ok && <Varsel type="suksess">Passordet er byttet. Du er logget ut på andre enheter.</Varsel>}
      <button type="submit" disabled={sender} className="knapp knapp-hoved w-full">
        {sender ? "Lagrer …" : "Bytt passord"}
      </button>
    </form>
  );
}
