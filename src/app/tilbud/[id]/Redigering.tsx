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
    <form action={sendInn} className="mt-6">
      <input type="hidden" name="linjer" value={JSON.stringify(tilLagring)} />

      <ul className="space-y-3">
        {rader.map((r, i) => (
          <li
            key={r.nokkel}
            className={`rounded-lg border p-3 ${linjefeil[i] ? "border-red-400 bg-red-50" : ""}`}
          >
            <div className="flex items-center gap-2">
              <select
                aria-label="Type"
                value={r.type}
                onChange={(e) => oppdater(r.nokkel, { type: e.target.value as Rad["type"] })}
                className="rounded border bg-white p-2 text-sm"
              >
                {LINJETYPER.map((type) => (
                  <option key={type} value={type}>{TYPE_NAVN[type]}</option>
                ))}
              </select>
              <span className="ml-auto font-medium whitespace-nowrap">
                {kr(linjesum(tilLagring[i]))}
              </span>
              <button
                type="button"
                onClick={() => fjern(r.nokkel)}
                aria-label="Fjern linjen"
                className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
              >
                ✕
              </button>
            </div>

            <textarea
              aria-label="Beskrivelse"
              value={r.beskrivelse}
              onChange={(e) => oppdater(r.nokkel, { beskrivelse: e.target.value })}
              rows={2}
              placeholder="Beskrivelse (vises for kunden)"
              className="mt-2 w-full rounded border p-2 text-base"
            />

            <div className="mt-2 grid grid-cols-3 gap-2">
              <Tallfelt etikett="Antall" verdi={r.antall} endre={(v) => oppdater(r.nokkel, { antall: v })} />
              <label className="text-xs text-gray-500">
                Enhet
                <input
                  value={r.enhet}
                  onChange={(e) => oppdater(r.nokkel, { enhet: e.target.value })}
                  className="mt-1 w-full rounded border p-2 text-base text-black"
                />
              </label>
              <Tallfelt etikett="Pris eks. mva" verdi={r.enhetspris} endre={(v) => oppdater(r.nokkel, { enhetspris: v })} />
            </div>

            {linjefeil[i] && <p className="mt-2 text-sm text-red-600">{linjefeil[i]}</p>}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="py-2 text-gray-500">Legg til:</span>
        {LINJETYPER.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => leggTil(type)}
            className="rounded-full border px-3 py-2 hover:bg-gray-50"
          >
            + {TYPE_NAVN[type]}
          </button>
        ))}
      </div>

      <table className="mt-6 w-full">
        <tbody>
          <tr>
            <td>Sum eks. mva</td>
            <td className="text-right whitespace-nowrap">{kr(sum)}</td>
          </tr>
          <tr className="text-gray-500">
            <td>Mva 25 %</td>
            <td className="text-right whitespace-nowrap">{kr(mva)}</td>
          </tr>
          <tr className="text-lg font-bold">
            <td>Totalt inkl. mva</td>
            <td className="text-right whitespace-nowrap">{kr(sum + mva)} kr</td>
          </tr>
        </tbody>
      </table>

      {t.feil && visFeil && <p className="mt-4 text-sm text-red-600">{t.feil}</p>}

      <div className="mt-6 space-y-3">
        <button
          type="submit"
          name="handling"
          value="godkjenn"
          disabled={lagrer}
          className="w-full rounded-lg bg-green-600 py-4 text-lg font-semibold text-white disabled:opacity-50"
        >
          {lagrer ? "Lagrer …" : "Godkjenn tilbudet"}
        </button>
        <button
          type="submit"
          name="handling"
          value="lagre"
          disabled={lagrer || !endret}
          className="w-full rounded-lg border py-3 font-semibold disabled:opacity-50"
        >
          {endret ? "Lagre som utkast" : t.lagret && !t.feil ? "Lagret ✓" : "Ingen endringer"}
        </button>
      </div>
    </form>
  );
}

function Tallfelt({ etikett, verdi, endre }: { etikett: string; verdi: string; endre: (v: string) => void }) {
  const ugyldig = verdi.trim() !== "" && !Number.isFinite(lesTall(verdi));
  return (
    <label className="text-xs text-gray-500">
      {etikett}
      <input
        inputMode="decimal"
        value={verdi}
        onChange={(e) => endre(e.target.value)}
        className={`mt-1 w-full rounded border p-2 text-right text-base text-black ${ugyldig ? "border-red-500" : ""}`}
      />
    </label>
  );
}
