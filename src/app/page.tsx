import Link from "next/link";
import { db } from "@/lib/db";
import { krevBruker } from "@/lib/innlogging";
import { Pil, Side, StatusMerke } from "@/components/ui";

const datoKort = (d: Date) =>
  d.toLocaleDateString("nb-NO", { day: "numeric", month: "short", timeZone: "Europe/Oslo" });

function hilsen() {
  const time = Number(
    new Intl.DateTimeFormat("nb-NO", { hour: "numeric", hour12: false, timeZone: "Europe/Oslo" }).format(new Date())
  );
  if (time < 10) return "God morgen";
  if (time < 17) return "Hei";
  return "God kveld";
}

// Forsiden: siste befaringer + knapp for ny befaring.
export default async function Home() {
  const bruker = await krevBruker();
  const [befaringer, antallFakturaer, venterPaaGodkjenning] = await Promise.all([
    db.befaring.findMany({
      orderBy: { dato: "desc" },
      take: 20,
      include: { kunde: true, tilbud: { orderBy: { opprettet: "desc" }, take: 1 } },
    }),
    db.faktura.count(),
    db.tilbud.count({ where: { status: "UTKAST" } }),
  ]);

  return (
    <Side
      tittel={`${hilsen()}, ${bruker.navn.split(" ")[0]}`}
      undertittel={
        venterPaaGodkjenning > 0
          ? `${venterPaaGodkjenning} ${venterPaaGodkjenning === 1 ? "tilbud venter" : "tilbud venter"} på godkjenning`
          : "Klar for neste befaring?"
      }
    >
      <Link
        href="/befaring/ny"
        className="group kort flex items-center gap-4 p-5 transition hover:-translate-y-px hover:shadow-[0_1px_2px_rgba(24,24,27,0.05),0_16px_32px_-16px_rgba(24,24,27,0.18)]"
      >
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xl font-light text-white">
          +
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold tracking-[-0.01em]">Ny befaring</span>
          <span className="block text-sm text-zinc-500">Registrer kunden og jobben – prisagenten gjør resten</span>
        </span>
        <span className="text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-900">
          <Pil />
        </span>
      </Link>

      <h2 className="seksjonstittel mt-10 mb-3 px-1">Siste befaringer</h2>
      {befaringer.length === 0 ? (
        <div className="kort px-5 py-10 text-center">
          <p className="font-medium">Ingen befaringer ennå</p>
          <p className="mt-1 text-sm text-zinc-500">Når du registrerer en befaring, dukker den opp her.</p>
        </div>
      ) : (
        <ul className="kort divide-y divide-zinc-100 overflow-hidden">
          {befaringer.map((b) => (
            <li key={b.id}>
              <Link
                href={`/befaring/${b.id}`}
                className="group flex items-center gap-4 px-5 py-4 transition hover:bg-zinc-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{b.kunde.navn}</span>
                    {b.tilbud[0] && <StatusMerke status={b.tilbud[0].status} />}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-500">{b.arbeidsbeskrivelse}</p>
                </div>
                <span className="tall shrink-0 text-sm text-zinc-400">{datoKort(b.dato)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/fakturaer"
        className="mt-8 flex items-center justify-between rounded-2xl px-5 py-4 text-sm text-zinc-600 ring-1 ring-zinc-200 transition ring-inset hover:bg-white hover:text-zinc-900"
      >
        <span>
          <span className="tall font-medium text-zinc-900">{antallFakturaer}</span> tidligere fakturaer
          prisagenten lærer av
        </span>
        <Pil />
      </Link>
    </Side>
  );
}
