# Tilbudsapp

Øvingsprosjekt: app som hjelper håndverkere (elektriker/rørlegger) å gå fra befaring til
tilbud på e-post på minutter. Eieren er ikke teknisk – Claude skriver koden og forklarer
prosessen på norsk, steg for steg.

## Teknologi
- Next.js 15 (App Router, server actions), TypeScript, Tailwind
- Prisma + SQLite (`prisma/schema.prisma`, databasefil `prisma/dev.db`, ikke i git)
- Claude API via `@anthropic-ai/sdk` (`src/lib/claude.ts`) – nøkkel i `ANTHROPIC_API_KEY`, eller `TILBUD_API_KEY` i skyøkter (miljøvariabel, aldri i git)

## Kommandoer
- `npm run dev` – start appen på localhost:3000
- `npx prisma migrate dev --name <navn>` – etter endring i schema
- `npx prisma db seed` – legger inn firmaet (Ekeland Elektriske AS, timepris 950)
- `npm run importer -- fakturaer/20_fakturaer.pdf` – les inn eksempelfakturaer med Claude
- `npm run prisagent -- <befaring-id>` (eller `-- "beskrivelse"` for en testbefaring) – lag tilbudsutkast fra terminalen

## Status
1. ✅ Prosjektoppsett og datamodell
2. ✅ Befaringsskjema (`src/app/befaring/`)
3. ✅ Innlesing av fakturaer (`src/lib/fakturaleser.ts`, `/fakturaer`) – de 20 eksempelfakturaene er lest inn
4. ✅ Prisagent (`src/lib/prisagent.ts`): «Generer tilbud» på befaringen → utkast på `/tilbud/[id]`
   med linjer, begrunnelse, hvilke fakturaer den bygget på og hva som bør sjekkes.
   Arbeid tvinges alltid til firmaets timepris.
5. ✅ Godkjenningsskjerm (`/tilbud/[id]`, `Redigering.tsx`): rett/legg til/fjern linjer med
   levende summer, lagre som utkast eller godkjenn (status GODKJENT, låst). Kan gjøres om
   til utkast igjen. Reglene for linjer ligger i `src/lib/tilbud.ts` og sjekkes på serveren.
6. 🟨 PDF + e-post til kunde
   - ✅ PDF (`src/lib/tilbudspdf.ts`, pdf-lib) på `/tilbud/[id]/pdf` – merket UTKAST før godkjenning
   - ✅ E-postutkast (`src/lib/epost.ts`) vises på godkjente tilbud
   - ⬜ Selve sendingen – bevisst IKKE koblet på ennå (eieren vil ikke sende e-post nå).
     «Send til kunden»-knappen er deaktivert. Status SENDT og `sendt`-dato settes ikke.
7. ⬜ Innlogging / flere brukere

## Kjent om eksempelfakturaene
`fakturaer/20_fakturaer.pdf` har 2 fakturaer per side, men bare én «Å betale»-sum
nederst – den hører til den FØRSTE fakturaen på siden. Total regnes derfor alltid fra linjene.
