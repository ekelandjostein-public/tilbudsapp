"use client";
import { useActionState } from "react";
import { sendTestTilMeg, type TestsendingTilstand } from "./actions";

export default function SendTestKnapp({ tilbudId, til }: { tilbudId: number; til: string }) {
  const [t, send, sender] = useActionState<TestsendingTilstand>(
    () => sendTestTilMeg(tilbudId),
    {}
  );
  return (
    <form action={send} className="mt-4">
      <button
        type="submit"
        disabled={sender}
        className="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white disabled:opacity-50"
      >
        {sender ? "Sender …" : "Send test til meg"}
      </button>
      <p className="mt-1 text-center text-xs text-gray-500">Går til {til} – ikke til kunden</p>
      {t.sendtTil && (
        <p className="mt-2 rounded bg-white p-2 text-center text-sm text-green-700">
          ✓ Sendt til {t.sendtTil}. Sjekk innboksen (og søppelpost).
        </p>
      )}
      {t.feil && <p className="mt-2 text-center text-sm text-red-600">{t.feil}</p>}
    </form>
  );
}
