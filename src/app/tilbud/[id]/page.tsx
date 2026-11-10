import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { lesGrunnlag, sumEksMva } from "@/lib/prisagent";
import { STATUS_NAVN, TYPE_NAVN, kr, type Tilbudslinje } from "@/lib/tilbud";
import { gjorOmTilUtkast } from "../actions";
import Redigering from "./Redigering";
import { lagEpostutkast } from "@/lib/epost";
import { testadresse } from "@/lib/sending";
import SendTestKnapp from "../SendTestKnapp";

export default async function VisTilbud({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tilbud = await db.tilbud.findUnique({
    where: { id: Number(id) },
    include: { linjer: { orderBy: { id: "asc" } }, befaring: { include: { kunde: true } } },
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
  const totalFor = (nr: string) => lignende.find((f) => f.fakturanr === nr)?.totalEksMva;

  const linjer: Tilbudslinje[] = tilbud.linjer.map((l) => ({
    type: l.type as Tilbudslinje["type"],
    beskrivelse: l.beskrivelse,
    antall: l.antall,
    enhet: l.enhet,
    enhetspris: l.enhetspris,
  }));

  return (
    <main className="mx-auto max-w-md p-6">
      <Link href={`/befaring/${befaring.id}`} className="text-sm text-blue-600">
        ← Befaringen
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {erUtkast ? "Tilbudsutkast" : "Tilbud"} til {befaring.kunde.navn}
      </h1>
      <p className="text-gray-500">
        <Status status={tilbud.status} /> · laget {tilbud.opprettet.toLocaleDateString("nb-NO")}
      </p>

      {erUtkast ? (
        <>
          <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            Gå gjennom linjene og rett det som ikke stemmer. Når du er fornøyd, trykker du
            «Godkjenn tilbudet». Ingenting sendes til kunden ennå.
          </p>
          <Redigering
            tilbudId={tilbud.id}
            linjer={linjer}
            timepris={firma?.timepris ?? 950}
          />
          <a
            href={`/tilbud/${tilbud.id}/pdf`}
            target="_blank"
            className="mt-3 block text-center text-sm text-blue-600"
          >
            Forhåndsvis PDF (lagrede endringer, merket UTKAST)
          </a>
        </>
      ) : (
        <>
          <Linjetabell linjer={linjer} />
          {tilbud.status === "GODKJENT" && (
            <>
              <Sending
                tilbudId={tilbud.id}
                testTil={process.env.RESEND_API_KEY ? testadresse() : null}
                epost={lagEpostutkast({
                  nummer: tilbud.id,
                  dato: tilbud.godkjent ?? tilbud.opprettet,
                  totalInklMva: Math.round(sumEksMva(linjer) * 125) / 100,
                  firma: { navn: firma?.navn ?? "", epost: firma?.epost ?? null, telefon: firma?.telefon ?? null },
                  kunde: befaring.kunde,
                })}
              />
              <form action={gjorOmTilUtkast.bind(null, tilbud.id)} className="mt-3">
                <button type="submit" className="w-full rounded-lg border py-3 font-semibold">
                  Gjør om til utkast for å endre
                </button>
              </form>
            </>
          )}
        </>
      )}

      {/* Agentens begrunnelse – nyttig når du vurderer prisen */}
      {grunnlag.forutsetninger.length > 0 && (
        <section className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800">
            {erUtkast ? "Sjekk før du godkjenner" : "Agentens forutsetninger"}
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {grunnlag.forutsetninger.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      {tilbud.begrunnelse && (
        <section className="mt-4 rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Hvordan prisagenten satte prisen
          </h2>
          <p className="mt-2">{tilbud.begrunnelse}</p>
        </section>
      )}

      {grunnlag.lignendeFakturaer.length > 0 && (
        <section className="mt-4 rounded-lg border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Bygger på disse fakturaene
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {grunnlag.lignendeFakturaer.map((f) => (
              <li key={f.fakturanr}>
                <span className="font-medium">#{f.fakturanr}</span>
                {totalFor(f.fakturanr) != null && (
                  <span className="text-gray-500"> · {kr(totalFor(f.fakturanr)!)} kr eks. mva</span>
                )}
                <p className="text-gray-600">{f.hvorfor}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/** PDF og e-post klar for et godkjent tilbud. Selve sendingen er ikke koblet på ennå. */
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
    <section className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-green-800">Klar til sending</h2>
      <a
        href={`/tilbud/${tilbudId}/pdf`}
        target="_blank"
        className="mt-3 block rounded-lg bg-white py-3 text-center font-semibold text-blue-700 shadow-sm"
      >
        📄 Åpne PDF ({epost.vedlegg})
      </a>

      <div className="mt-4 rounded-lg bg-white p-3 text-sm shadow-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {epost.fra && (
            <>
              <dt className="text-gray-500">Fra</dt>
              <dd>{epost.fra}</dd>
            </>
          )}
          <dt className="text-gray-500">Til</dt>
          <dd>{epost.til}</dd>
          <dt className="text-gray-500">Emne</dt>
          <dd className="font-medium">{epost.emne}</dd>
          <dt className="text-gray-500">Vedlegg</dt>
          <dd>{epost.vedlegg}</dd>
        </dl>
        <p className="mt-3 whitespace-pre-wrap border-t pt-3">{epost.tekst}</p>
      </div>

      {testTil ? (
        <SendTestKnapp tilbudId={tilbudId} til={testTil} />
      ) : (
        <p className="mt-4 text-center text-sm text-gray-500">
          E-post er ikke satt opp (RESEND_API_KEY og TEST_EPOST i .env).
        </p>
      )}

      <button
        disabled
        className="mt-4 w-full rounded-lg border border-green-600 py-3 font-semibold text-green-700 opacity-40"
      >
        Send til kunden
      </button>
      <p className="mt-1 text-center text-xs text-gray-500">
        Sending til kunden er ikke slått på ennå.
      </p>
    </section>
  );
}

function Status({ status }: { status: string }) {
  const farge = status === "UTKAST" ? "text-amber-700" : "text-green-700";
  return <span className={`font-medium ${farge}`}>{STATUS_NAVN[status] ?? status}</span>;
}

/** Linjene uten redigering (for godkjente/sendte tilbud). */
function Linjetabell({ linjer }: { linjer: Tilbudslinje[] }) {
  const sum = sumEksMva(linjer);
  const mva = Math.round(sum * 25) / 100;
  return (
    <section className="mt-6 rounded-lg border">
      <table className="w-full text-sm">
        <tbody>
          {linjer.map((l, i) => (
            <tr key={i} className="border-b">
              <td className="p-3">
                {l.beskrivelse}
                <div className="text-xs text-gray-500">
                  {TYPE_NAVN[l.type] ?? l.type} · {l.antall} {l.enhet} × {kr(l.enhetspris)}
                </div>
              </td>
              <td className="p-3 text-right whitespace-nowrap">{kr(l.antall * l.enhetspris)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="px-3 pt-3">Sum eks. mva</td>
            <td className="px-3 pt-3 text-right whitespace-nowrap">{kr(sum)}</td>
          </tr>
          <tr className="text-gray-500">
            <td className="px-3">Mva 25 %</td>
            <td className="px-3 text-right whitespace-nowrap">{kr(mva)}</td>
          </tr>
          <tr className="font-bold">
            <td className="px-3 pb-3">Totalt inkl. mva</td>
            <td className="px-3 pb-3 text-right whitespace-nowrap">{kr(sum + mva)} kr</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
