"use client";
import { useActionState } from "react";
import { Varsel } from "@/components/ui";
import { sendTestTilMeg, type TestsendingTilstand } from "./actions";

export default function SendTestKnapp({ tilbudId, til }: { tilbudId: number; til: string }) {
  const [t, send, sender] = useActionState<TestsendingTilstand>(
    () => sendTestTilMeg(tilbudId),
    {}
  );
  return (
    <form action={send} className="mt-5">
      <button type="submit" disabled={sender} className="knapp knapp-hoved w-full">
        {sender ? "Sender …" : "Send test til meg"}
      </button>
      <p className="mt-1.5 text-center text-xs text-zinc-400">Går til {til} – ikke til kunden</p>
      {t.sendtTil && (
        <Varsel type="suksess" className="mt-3 text-center">
          Sendt til {t.sendtTil}. Sjekk innboksen – og søppelposten.
        </Varsel>
      )}
      {t.feil && (
        <Varsel type="feil" className="mt-3">
          {t.feil}
        </Varsel>
      )}
    </form>
  );
}
