"use client";
import { useActionState } from "react";
import { loggInn, type InnloggingTilstand } from "./actions";

export default function Skjema() {
  const [t, sendInn, sender] = useActionState<InnloggingTilstand, FormData>(loggInn, {});
  return (
    <form action={sendInn} className="space-y-5">
      <label className="block">
        <span className="etikett">E-post</span>
        <input
          name="epost"
          type="email"
          autoComplete="username"
          defaultValue={t.epost}
          required
          className="felt"
        />
      </label>
      <label className="block">
        <span className="etikett">Passord</span>
        <input
          name="passord"
          type="password"
          autoComplete="current-password"
          required
          className={`felt ${t.feil ? "felt-feil" : ""}`}
        />
      </label>
      {t.feil && <p className="feiltekst">{t.feil}</p>}
      <button type="submit" disabled={sender} className="knapp knapp-hoved w-full">
        {sender ? "Logger inn …" : "Logg inn"}
      </button>
    </form>
  );
}
