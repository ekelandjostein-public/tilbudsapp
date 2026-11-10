# Tilbudsapp

Øvingsprosjekt: app som hjelper håndverkere (elektriker/rørlegger) å gå fra befaring til
tilbud på e-post på minutter. Eieren er ikke teknisk – Claude skriver koden og forklarer
prosessen på norsk, steg for steg.

## Teknologi
- Next.js 15 (App Router, server actions), TypeScript, Tailwind
- Prisma + SQLite (`prisma/schema.prisma`, databasefil `prisma/dev.db`, ikke i git)
- Claude API via `@anthropic-ai/sdk` – nøkkel i `ANTHROPIC_API_KEY` (miljøvariabel, aldri i git)

## Kommandoer
- `npm run dev` – start appen på localhost:3000
- `npx prisma migrate dev --name <navn>` – etter endring i schema
- `npx prisma db seed` – legger inn firmaet (Ekeland Elektriske AS, timepris 950)
- `npm run importer -- fakturaer/20_fakturaer.pdf` – les inn eksempelfakturaer med Claude

## Status
1. ✅ Prosjektoppsett og datamodell
2. ✅ Befaringsskjema (`src/app/befaring/`)
3. ✅ Kode for innlesing av fakturaer (`src/lib/fakturaleser.ts`, `/fakturaer`) – ikke kjørt mot API ennå
4. ⬜ Prisagent: finn lignende fakturaer + lag tilbudsutkast
5. ⬜ Godkjenningsskjerm med redigering
6. ⬜ PDF + e-post til kunde
7. ⬜ Innlogging / flere brukere

## Kjent om eksempelfakturaene
`fakturaer/20_fakturaer.pdf` har 2 fakturaer per side, men bare én «Å betale»-sum
nederst – den hører til den FØRSTE fakturaen på siden. Total regnes derfor alltid fra linjene.
