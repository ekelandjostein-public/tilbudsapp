import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { krevBruker } from "@/lib/innlogging";
import { lesGrunnlag, sumEksMva, type Grunnlag } from "@/lib/prisagent";
import { TYPE_NAVN, kr, type Tilbudslinje } from "@/lib/tilbud";
import { lagEpostutkast } from "@/lib/epost";
import { testadresse } from "@/lib/sending";
import { Rad, Seksjon, Side, StatusMerke, Varsel } from "@/components/ui";
import { gjorOmTilUtkast } from "../actions";
import SendTestKnapp from "../SendTestKnapp";
import Redigering from "./Redigering";

export default async function VisTilbud({ params }: { params: Promise<{ id: string }> }) {
  await krevBruker();
  const { id } = await params;
  const tilbud = await db.tilbud.findUnique({
    where: { id: Number(id) },
    include: {
      linjer: { orderBy: { id: "asc" } },
      befaring: { include: { kunde: true } },
      godkjentAv: true,
    },
  });
  if (!tilbud) notFound();

  const { befaring } = tilbud;
  const firma = await db.firma.findFirst();
  const grunnlag = lesGrunnlag(tilbud);
  const erUtkast = tilbud.status === "UTKAST";

  // Slå opp de lignende fakturaene så vi kan vise totalen deres
  const lignende = await db.faktura.findMany({
    where: { fakturanr: { in: grunnlag.lignendeFakturaer.map((f) => f.fakturanr) } },
  });
  const totaler = Object.fromEntries(lignende.map((f) => [f.fakturanr, f.totalEksMva]));

  const linjer: Tilbudslinje[] = tilbud.linjer.map((l) => ({
    type: l.type as Tilbudslinje["type"],
    beskrivelse: l.beskrivelse,
    antall: l.antall,
    enhet: l.enhet,
    enhetspris: l.enhetspris,
  }));
  const sum = sumEksMva(linjer);
  const totalInklMva = Math.round(sum * 125) / 100;

  const dato = (d: Date) => d.toLocaleDateString("nb-NO", { day: "numeric", month: "long" });

  return (
    <Side
      tilbake={{ href: `/befaring/${befaring.id}`, tekst: befaring.kunde.navn }}
      tittel={erUtkast ? "Tilbudsutkast" : `Tilbud ${tilbud.id}`}
      undertittel={
        tilbud.godkjent
          ? `Godkjent ${dato(tilbud.godkjent)}${tilbud.godkjentAv ? ` av ${tilbud.godkjentAv.navn}` : ""}`
          : `Laget av prisagenten ${dato(tilbud.opprettet)}`
      }
      handling={<StatusMerke status={tilbud.status} />}
    >
      {erUtkast ? (
        <>
          <Varsel className="mb-6">
            Gå gjennom linjene og rett det som ikke stemmer. Når du er fornøyd, godkjenner du
            tilbudet. Ingenting sendes til kunden før det.
          </Varsel>
          {grunnlag.forutsetninger.length > 0 && <Forutsetninger punkter={grunnlag.forutsetninger} />}
          <Redigering tilbudId={tilbud.id} linjer={linjer} timepris={firma?.timepris ?? 950} />
          <div className="mt-3 text-center">
            <a href={`/tilbud/${tilbud.id}/pdf`} target="_blank" className="knapp knapp-stille text-sm">
              Forhåndsvis PDF
            </a>
          </div>
        </>
      ) : (
        <>
          {/* Totalen først – det kunden bryr seg mest om */}
          <div className="kort relative overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-messing-400/70 to-transparent" />
            <p className="seksjonstittel">Totalt inkl. mva</p>
            <p className="tall mt-2 text-4xl font-semibold tracking-[-0.03em]">
              {kr(totalInklMva)} <span className="text-xl font-medium text-zinc-400">kr</span>
            </p>
            <p className="tall mt-1 text-sm text-zinc-500">
              {kr(sum)} kr eks. mva · {linjer.length} linjer
            </p>
          </div>

          <Linjetabell linjer={linjer} />

          {tilbud.status === "GODKJENT" && (
            <>
              <Sending
                tilbudId={tilbud.id}
                testTil={process.env.RESEND_API_KEY ? testadresse() : null}
                epost={lagEpostutkast({
                  nummer: tilbud.id,
                  dato: tilbud.godkjent ?? tilbud.opprettet,
                  totalInklMva,
                  firma: { navn: firma?.navn ?? "", epost: firma?.epost ?? null, telefon: firma?.telefon ?? null },
                  kunde: befaring.kunde,
                })}
              />
              <form action={gjorOmTilUtkast.bind(null, tilbud.id)} className="mt-3 text-center">
                <button type="submit" className="knapp knapp-stille text-sm">
                  Gjør om til utkast for å endre
                </button>
              </form>
            </>
          )}
        </>
      )}

      <Vurdering
        begrunnelse={tilbud.begrunnelse}
        grunnlag={grunnlag}
        totaler={totaler}
        visForutsetninger={!erUtkast}
      />
    </Side>
  );
}

function Forutsetninger({ punkter }: { punkter: string[] }) {
  return (
    <Varsel type="advarsel" tittel="Sjekk før du godkjenner" className="mb-6">
      <ul className="mt-1 space-y-1.5">
        {punkter.map((f) => (
          <li key={f} className="flex gap-2.5">
            <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-messing-500" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </Varsel>
  );
}

/** Prisagentens begrunnelse og hvilke fakturaer den bygget på – sammenleggbar. */
function Vurdering({
  begrunnelse,
  grunnlag,
  totaler,
  visForutsetninger,
}: {
  begrunnelse: string | null;
  grunnlag: Grunnlag;
  totaler: Record<string, number>;
  visForutsetninger: boolean;
}) {
  if (!begrunnelse && grunnlag.lignendeFakturaer.length === 0) return null;
  return (
    <details className="group kort mt-10 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 select-none [&::-webkit-details-marker]:hidden">
        <span>
          <span className="seksjonstittel block">Prisagentens vurdering</span>
          <span className="mt-1 block text-sm text-zinc-500">Hvordan prisen ble satt, og hva den bygger på</span>
        </span>
        <span className="text-zinc-400 transition group-open:rotate-180">
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M3.5 6 8 10.5 12.5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="space-y-6 border-t border-zinc-100 px-5 py-5 text-[15px] leading-relaxed">
        {begrunnelse && <p className="text-zinc-700">{begrunnelse}</p>}

        {visForutsetninger && grunnlag.forutsetninger.length > 0 && (
          <div>
            <h3 className="seksjonstittel mb-2">Forutsetninger</h3>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {grunnlag.forutsetninger.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-zinc-400" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {grunnlag.lignendeFakturaer.length > 0 && (
          <div>
            <h3 className="seksjonstittel mb-2">Bygger på disse jobbene</h3>
            <ul className="space-y-3 text-sm">
              {grunnlag.lignendeFakturaer.map((f) => (
                <li key={f.fakturanr} className="rounded-xl bg-zinc-50 px-4 py-3">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">Faktura {f.fakturanr}</span>
                    {totaler[f.fakturanr] != null && (
                      <span className="tall text-zinc-500">{kr(totaler[f.fakturanr])} kr eks. mva</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-zinc-600">{f.hvorfor}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

/** PDF og e-post for et godkjent tilbud. Sending til kunden er ikke slått på ennå. */
function Sending({
  tilbudId,
  epost,
  testTil,
}: {
  tilbudId: number;
  epost: ReturnType<typeof lagEpostutkast>;
  testTil: string | null;
}) {
  return (
    <Seksjon tittel="Klar til sending" className="mt-4">
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1.5 bg-zinc-50/80 px-4 py-3 text-sm">
          <dt className="text-zinc-500">Til</dt>
          <dd className="truncate">{epost.til}</dd>
          <dt className="text-zinc-500">Emne</dt>
          <dd className="font-medium">{epost.emne}</dd>
        </dl>
        <p className="border-t border-zinc-200 px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap text-zinc-700">
          {epost.tekst}
        </p>
        <a
          href={`/tilbud/${tilbudId}/pdf`}
          target="_blank"
          className="flex items-center gap-3 border-t border-zinc-200 px-4 py-3 text-sm transition hover:bg-zinc-50"
        >
          <span className="inline-flex h-9 w-7 items-center justify-center rounded-md bg-red-50 text-[9px] font-bold tracking-wide text-red-700 ring-1 ring-red-200 ring-inset">
            PDF
          </span>
          <span className="font-medium">{epost.vedlegg}</span>
          <span className="ml-auto text-zinc-500">Åpne</span>
        </a>
      </div>

      {testTil ? (
        <SendTestKnapp tilbudId={tilbudId} til={testTil} />
      ) : (
        <p className="mt-4 text-center text-sm text-zinc-500">
          E-post er ikke satt opp (RESEND_API_KEY og TEST_EPOST i .env).
        </p>
      )}

      <button disabled className="knapp knapp-sekundaer mt-3 w-full">
        Send til kunden
      </button>
      <p className="mt-1.5 text-center text-xs text-zinc-400">Sending til kunden er ikke slått på ennå</p>
    </Seksjon>
  );
}

/** Linjene uten redigering (for godkjente/sendte tilbud). */
function Linjetabell({ linjer }: { linjer: Tilbudslinje[] }) {
  const sum = sumEksMva(linjer);
  const mva = Math.round(sum * 25) / 100;
  return (
    <Seksjon tittel="Spesifikasjon" className="mt-4" innrykk={false}>
      <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
        {linjer.map((l, i) => (
          <li key={i} className="flex items-start gap-4 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-snug">{l.beskrivelse}</p>
              <p className="tall mt-0.5 text-xs text-zinc-500">
                {TYPE_NAVN[l.type] ?? l.type} · {l.antall.toLocaleString("nb-NO")} {l.enhet} × {kr(l.enhetspris)}
              </p>
            </div>
            <span className="tall text-[15px] whitespace-nowrap">{kr(l.antall * l.enhetspris)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1.5 border-t border-zinc-200 bg-zinc-50/60 px-5 py-4">
        <Rad etikett="Sum eks. mva" verdi={kr(sum)} />
        <Rad etikett="Mva 25 %" verdi={kr(mva)} dempet />
        <div className="pt-1.5">
          <Rad etikett="Totalt inkl. mva" verdi={`${kr(sum + mva)} kr`} sterk />
        </div>
      </div>
    </Seksjon>
  );
}
