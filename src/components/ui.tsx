// Felles byggeklosser for sidene, så alt ser likt ut.
// Stilene (kort, knapp, felt …) ligger i src/app/globals.css.
import Link from "next/link";
import { STATUS_NAVN } from "@/lib/tilbud";

/** Rammen rundt en side: tilbake-lenke, tittel, undertittel og innhold. */
export function Side({
  tilbake,
  tittel,
  undertittel,
  handling,
  children,
}: {
  tilbake?: { href: string; tekst: string };
  tittel: React.ReactNode;
  undertittel?: React.ReactNode;
  handling?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-xl px-5 pt-6 pb-20 sm:pt-10">
      {tilbake && (
        <Link
          href={tilbake.href}
          className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-900/5 hover:text-zinc-900"
        >
          <Pil retning="venstre" /> {tilbake.tekst}
        </Link>
      )}
      <header className={`flex items-start justify-between gap-4 ${tilbake ? "mt-3" : ""}`}>
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.025em] text-balance">
            {tittel}
          </h1>
          {undertittel && <div className="mt-1.5 text-[15px] text-zinc-500">{undertittel}</div>}
        </div>
        {handling}
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}

/** Et hvitt kort med valgfri seksjonstittel. */
export function Seksjon({
  tittel,
  handling,
  children,
  className = "",
  innrykk = true,
}: {
  tittel?: string;
  handling?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  innrykk?: boolean;
}) {
  return (
    <section className={`kort ${innrykk ? "p-5" : "overflow-hidden"} ${className}`}>
      {tittel && (
        <div className={`flex items-center justify-between ${innrykk ? "mb-3" : "px-5 pt-5 pb-3"}`}>
          <h2 className="seksjonstittel">{tittel}</h2>
          {handling}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_STIL: Record<string, string> = {
  UTKAST: "bg-amber-50 text-amber-800 ring-amber-600/20",
  GODKJENT: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  SENDT: "bg-sky-50 text-sky-800 ring-sky-600/20",
  AKSEPTERT: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  AVSLATT: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};

/** Liten merkelapp som viser status på et tilbud. */
export function StatusMerke({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STIL[status] ?? STATUS_STIL.AVSLATT}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {STATUS_NAVN[status] ?? status}
    </span>
  );
}

const VARSEL_STIL = {
  info: "border-zinc-200 bg-white text-zinc-700",
  suksess: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
  advarsel: "border-messing-100 bg-messing-50 text-messing-700",
  feil: "border-red-200 bg-red-50 text-red-800",
};

/** En melding i en farget boks. */
export function Varsel({
  type = "info",
  tittel,
  children,
  className = "",
}: {
  type?: keyof typeof VARSEL_STIL;
  tittel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3.5 text-sm leading-relaxed ${VARSEL_STIL[type]} ${className}`}>
      {tittel && <p className="mb-1 font-semibold">{tittel}</p>}
      {children}
    </div>
  );
}

/** Firmaets monogram (initialene), brukt som logo. */
export function Monogram({ navn, stor = false }: { navn: string; stor?: boolean }) {
  const initialer =
    navn
      .replace(/\b(AS|ASA|ANS|DA|ENK)\b/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((o) => o[0]?.toUpperCase())
      .join("") || "T";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-zinc-900 font-semibold tracking-tight text-messing-400 shadow-[0_1px_0_rgba(255,255,255,0.1)_inset] ${stor ? "size-12 text-lg" : "size-8 text-[13px]"}`}
      aria-hidden
    >
      {initialer}
    </span>
  );
}

/** En enkel pil (tegnet med SVG, så den blir skarp på alle skjermer). */
export function Pil({ retning = "hoyre" }: { retning?: "hoyre" | "venstre" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 ${retning === "venstre" ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

/** Rad med etikett til venstre og verdi til høyre (brukt i summer o.l.). */
export function Rad({
  etikett,
  verdi,
  sterk = false,
  dempet = false,
}: {
  etikett: React.ReactNode;
  verdi: React.ReactNode;
  sterk?: boolean;
  dempet?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${sterk ? "text-lg font-semibold tracking-tight" : "text-[15px]"} ${dempet ? "text-zinc-500" : ""}`}
    >
      <span>{etikett}</span>
      <span className="tall whitespace-nowrap">{verdi}</span>
    </div>
  );
}
