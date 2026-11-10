"use client";
// Godkjenningsskjermen: fagmannen retter linjene og godkjenner tilbudet.
// Kjører i nettleseren, så summene oppdateres mens du skriver.

import { useActionState, useEffect, useState } from "react";
import { lagreTilbud, type RedigerTilstand } from "../actions";
import { LINJETYPER, TYPE_NAVN, kr, lesTall, type Tilbudslinje } from "@/lib/tilbud";

// Mens du redigerer holdes tallene som tekst, så «1,» ikke blir til «1» midt i skrivingen
type Rad = {
  nokkel: number;
  type: Tilbudslinje["type"];
  beskrivelse: string;
  antall: string;
  enhet: string;
  enhetspris: string;
};

const tilTekst = (n: number) => String(n).replace(".", ",");

const STANDARD_ENHET: Record<Tilbudslinje["type"], string> = {
  ARBEID: "time",
  MATERIELL: "stk",
  KJORING: "oppmøte",
  ANNET: "stk",
};

let nesteNokkel = 1;

export default function Redigering({
  tilbudId,
  linjer,
  timepris,
}: {
  tilbudId: number;
  linjer: Tilbudslinje[];
  timepris: number;
}) {
  const [rader, setRader] = useState<Rad[]>(() =>
    linjer.map((l) => ({
      nokkel: nesteNokkel++,
      type: l.type,
      beskrivelse: l.beskrivelse,
      antall: tilTekst(l.antall),
      enhet: l.enhet,
      enhetspris: tilTekst(l.enhetspris),
    }))
  );
  const [endret, setEndret] = useState(false); // ulagrede endringer?
  const [visFeil, setVisFeil] = useState(false); // vis feil fra siste lagreforsøk?
  const [t, sendInn, lagrer] = useActionState<RedigerTilstand, FormData>(
    lagreTilbud.bind(null, tilbudId),
    {}
  );

  // Når serveren har svart: vis eventuelle feil, og nullstill «endret» hvis alt ble lagret
  useEffect(() => {
    if (t.lagret) setEndret(false);
    setVisFeil(true);
  }, [t]);

  // Advarsel hvis du prøver å lukke siden med ulagrede endringer
  useEffect(() => {
    if (!endret) return;
    const advar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", advar);
    return () => window.removeEventListener("beforeunload", advar);
  }, [endret]);

  const markerEndret = () => {
    setEndret(true);
    setVisFeil(false);
  };
  const oppdater = (nokkel: number, felt: Partial<Rad>) => {
    setRader((r) => r.map((x) => (x.nokkel === nokkel ? { ...x, ...felt } : x)));
    markerEndret();
  };
  const fjern = (nokkel: number) => {
    setRader((r) => r.filter((x) => x.nokkel !== nokkel));
    markerEndret();
  };
  const leggTil = (type: Tilbudslinje["type"]) => {
    setRader((r) => [
      ...r,
      {
        nokkel: nesteNokkel++,
        type,
        beskrivelse: "",
        antall: "1",
        enhet: STANDARD_ENHET[type],
        enhetspris: type === "ARBEID" ? tilTekst(timepris) : "",
      },
    ]);
    markerEndret();
  };

  // Det som sendes til serveren: tallene gjort om fra tekst
  const tilLagring = rader.map((r) => ({
    type: r.type,
    beskrivelse: r.beskrivelse,
    antall: lesTall(r.antall),
    enhet: r.enhet,
    enhetspris: lesTall(r.enhetspris),
  }));
  const linjesum = (l: (typeof tilLagring)[number]) =>
    Number.isFinite(l.antall * l.enhetspris) ? l.antall * l.enhetspris : 0;
  const sum = Math.round(tilLagring.reduce((s, l) => s + linjesum(l), 0) * 100) / 100;
  const mva = Math.round(sum * 25) / 100;

  // Feil fra serveren gjelder linjene slik de var da du trykket – skjul dem når du endrer noe
  const linjefeil = visFeil ? (t.linjefeil ?? {}) : {};

  return (
    <form action={sendInn}>
      <input type="hidden" name="linjer" value={JSON.stringify(tilLagring)} />

      <section className="kort overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="seksjonstittel">Linjer</h2>
          <span className="text-xs text-zinc-400">{rader.length} stk</span>
        </div>
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
          {rader.map((r, i) => (
            <li key={r.nokkel} className={`px-5 py-4 transition ${linjefeil[i] ? "bg-red-50/60" : ""}`}>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Type"
                  value={r.type}
                  onChange={(e) => oppdater(r.nokkel, { type: e.target.value as Rad["type"] })}
                  className="cursor-pointer rounded-lg border-0 bg-zinc-100 py-1.5 pr-7 pl-2.5 text-xs font-medium text-zinc-700 ring-0 transition hover:bg-zinc-200 focus:ring-2 focus:ring-zinc-900/10 focus:outline-none"
                >
                  {LINJETYPER.map((type) => (
                    <option key={type} value={type}>{TYPE_NAVN[type]}</option>
                  ))}
                </select>
                <span className="tall ml-auto text-[15px] font-medium whitespace-nowrap">
                  {kr(linjesum(tilLagring[i]))}
                </span>
                <button
                  type="button"
                  onClick={() => fjern(r.nokkel)}
                  aria-label="Fjern linjen"
                  className="-mr-1.5 rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <textarea
                aria-label="Beskrivelse"
                value={r.beskrivelse}
                onChange={(e) => oppdater(r.nokkel, { beskrivelse: e.target.value })}
                rows={2}
                placeholder="Beskrivelse (vises for kunden)"
                className="felt mt-3 resize-y py-2.5 text-[15px] leading-snug"
              />

              <div className="mt-3 grid grid-cols-[1fr_1fr_1.3fr] gap-2.5">
                <Tallfelt etikett="Antall" verdi={r.antall} endre={(v) => oppdater(r.nokkel, { antall: v })} />
                <label className="block">
                  <span className="text-xs text-zinc-500">Enhet</span>
                  <input
                    value={r.enhet}
                    onChange={(e) => oppdater(r.nokkel, { enhet: e.target.value })}
                    className="felt mt-1 px-2.5 py-2 text-[15px]"
                  />
                </label>
                <Tallfelt etikett="Pris eks. mva" verdi={r.enhetspris} endre={(v) => oppdater(r.nokkel, { enhetspris: v })} />
              </div>

              {linjefeil[i] && <p className="feiltekst">{linjefeil[i]}</p>}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
          <span className="mr-1 text-xs text-zinc-500">Legg til</span>
          {LINJETYPER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => leggTil(type)}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 transition ring-inset hover:bg-zinc-900 hover:text-white hover:ring-zinc-900"
            >
              + {TYPE_NAVN[type]}
            </button>
          ))}
        </div>
      </section>

      {/* Fast nederst på skjermen: totalen og knappene */}
      <div className="sticky bottom-3 z-10 mt-4">
        <div className="kort px-4 pt-3.5 pb-4 shadow-[0_1px_2px_rgba(24,24,27,0.05),0_20px_40px_-16px_rgba(24,24,27,0.25)]">
          <div className="flex items-end justify-between gap-4 px-1">
            <div>
              <p className="text-xs text-zinc-500">Totalt inkl. mva</p>
              <p className="tall text-xl font-semibold tracking-tight">{kr(sum + mva)} kr</p>
            </div>
            <p className="tall pb-0.5 text-right text-xs leading-relaxed text-zinc-500">
              {kr(sum)} eks. mva
              <br />
              mva {kr(mva)}
            </p>
          </div>

          {t.feil && visFeil && <p className="feiltekst px-1">{t.feil}</p>}

          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2.5">
            <button
              type="submit"
              name="handling"
              value="lagre"
              disabled={lagrer || !endret}
              className="knapp knapp-sekundaer px-4"
            >
              {!endret && t.lagret && !t.feil ? "Lagret ✓" : "Lagre utkast"}
            </button>
            <button
              type="submit"
              name="handling"
              value="godkjenn"
              disabled={lagrer}
              className="knapp knapp-hoved px-4"
            >
              {lagrer ? "Lagrer …" : "Godkjenn tilbudet"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Tallfelt({ etikett, verdi, endre }: { etikett: string; verdi: string; endre: (v: string) => void }) {
  const ugyldig = verdi.trim() !== "" && !Number.isFinite(lesTall(verdi));
  return (
    <label className="block">
      <span className="text-xs text-zinc-500">{etikett}</span>
      <input
        inputMode="decimal"
        value={verdi}
        onChange={(e) => endre(e.target.value)}
        className={`felt tall mt-1 px-2.5 py-2 text-right text-[15px] ${ugyldig ? "felt-feil" : ""}`}
      />
    </label>
  );
}
