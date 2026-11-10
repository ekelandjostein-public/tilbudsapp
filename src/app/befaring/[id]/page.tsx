import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { krevBruker } from "@/lib/innlogging";
import { sumEksMva } from "@/lib/fakturaleser";
import { kr } from "@/lib/tilbud";
import { Pil, Seksjon, Side, StatusMerke } from "@/components/ui";
import GenererKnapp from "@/app/tilbud/GenererKnapp";

export default async function VisBefaring({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await krevBruker();
  const { id } = await params;
  const befaring = await db.befaring.findUnique({
    where: { id: Number(id) },
    include: {
      kunde: true,
      opprettetAv: true,
      tilbud: { orderBy: { opprettet: "desc" }, include: { linjer: true } },
    },
  });
  if (!befaring) notFound();
  const { kunde } = befaring;

  return (
    <Side
      tilbake={{ href: "/", tekst: "Oversikt" }}
      tittel={kunde.navn}
      undertittel={
        <>
          Befaring {befaring.dato.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
          {befaring.opprettetAv && ` · ${befaring.opprettetAv.navn}`}
        </>
      }
    >
      <div className="space-y-4">
        <Seksjon tittel="Kunde">
          <dl className="grid grid-cols-[5.5rem_1fr] gap-y-2 text-[15px]">
            <dt className="text-zinc-500">Adresse</dt>
            <dd>{kunde.adresse}</dd>
            {kunde.telefon && (
              <>
                <dt className="text-zinc-500">Telefon</dt>
                <dd>
                  <a href={`tel:${kunde.telefon.replace(/\s/g, "")}`} className="lenke">
                    {kunde.telefon}
                  </a>
                </dd>
              </>
            )}
            <dt className="text-zinc-500">E-post</dt>
            <dd className="truncate">{kunde.epost}</dd>
          </dl>
        </Seksjon>

        <Seksjon tittel="Arbeidsbeskrivelse">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{befaring.arbeidsbeskrivelse}</p>
        </Seksjon>

        {befaring.tilbud.length > 0 && (
          <Seksjon tittel="Tilbud" innrykk={false}>
            <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
              {befaring.tilbud.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tilbud/${t.id}`}
                    className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-zinc-50"
                  >
                    <span className="font-medium">Tilbud {t.id}</span>
                    <StatusMerke status={t.status} />
                    <span className="tall ml-auto text-sm text-zinc-500">
                      {kr(sumEksMva(t.linjer) * 1.25)} kr
                    </span>
                    <span className="text-zinc-400 group-hover:text-zinc-900">
                      <Pil />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Seksjon>
        )}
      </div>

      <GenererKnapp
        befaringId={befaring.id}
        tekst={befaring.tilbud.length > 0 ? "Lag nytt tilbudsutkast" : "Generer tilbud"}
        sekundaer={befaring.tilbud.length > 0}
      />
    </Side>
  );
}
