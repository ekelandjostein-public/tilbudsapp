"use client";
import { useActionState } from "react";
import { loggInn, type InnloggingTilstand } from "./actions";

export default function Skjema() {
  const [t, sendInn, sender] = useActionState<InnloggingTilstand, FormData>(loggInn, {});
  return (
    <form action={sendInn} className="mt-6 space-y-4">
      <label className="block">
        <span className="font-medium">E-post</span>
        <input
          name="epost"
          type="email"
          autoComplete="username"
          defaultValue={t.epost}
          required
          className="mt-1 w-full rounded-lg border p-3 text-base"
        />
      </label>
      <label className="block">
        <span className="font-medium">Passord</span>
        <input
          name="passord"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border p-3 text-base"
        />
      </label>
      {t.feil && <p className="text-sm text-red-600">{t.feil}</p>}
      <button
        type="submit"
        disabled={sender}
        className="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white disabled:opacity-50"
      >
        {sender ? "Logger inn …" : "Logg inn"}
      </button>
    </form>
  );
}
