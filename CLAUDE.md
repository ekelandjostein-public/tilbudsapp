# Tilbudsapp

Øvingsprosjekt: app som hjelper håndverkere (elektriker/rørlegger) å gå fra befaring til
tilbud på e-post på minutter. Eieren er ikke teknisk – Claude skriver koden og forklarer
prosessen på norsk, steg for steg.

## Teknologi
- Next.js 15 (App Router, server actions), TypeScript, Tailwind
- Prisma + SQLite (`prisma/schema.prisma`, databasefil `prisma/dev.db`, ikke i git)
- Claude API via `@anthropic-ai/sdk` – nøkkel i `ANTHROPIC_API_KEY` (miljøvariabel, aldri i git).
  Navnet må skrives nøyaktig slik, med store bokstaver. I skymiljøet går det ikke an å bruke nettverkshemmelighet for api.anthropic.com.

## Kommandoer
- `npm run dev` – start appen på localhost:3000
- `npx prisma migrate dev --name <navn>` – etter endring i schema
- `npx prisma db seed` – legger inn firmaet (Ekeland Elektriske AS, timepris 950)
- `npm run importer -- fakturaer/20_fakturaer.pdf` – les inn eksempelfakturaer med Claude
- `npm run sjekk-fakturaer` – sammenlign innleste fakturaer med `fakturaer/fasit.json` (laget med pdftotext, uten AI)
- `npm run prisagent -- "beskrivelse"` – prøv prisagenten uten å lagre
- `npm run test-prisagent [-- --alle | -- 1007]` – kontrolltest: skjul én faktura, la agenten prise jobben, sammenlign

## Status
1. ✅ Prosjektoppsett og datamodell
2. ✅ Befaringsskjema (`src/app/befaring/`)
3. ✅ Kode for innlesing av fakturaer (`src/lib/fakturaleser.ts`, `/fakturaer`) + sjekk mot fasit – ikke kjørt mot API ennå
4. 🟡 Prisagent (`src/lib/prisagent.ts`, knapp på befaring, `/tilbud/[id]`) – kode ferdig, ikke kjørt mot API ennå
5. ⬜ Godkjenningsskjerm med redigering
6. ⬜ PDF + e-post til kunde
7. ⬜ Innlogging / flere brukere

## Kjent om eksempelfakturaene
`fakturaer/20_fakturaer.pdf` har 2 fakturaer per side, men bare én «Å betale»-sum
nederst – den hører til den FØRSTE fakturaen på siden. Total regnes derfor alltid fra linjene.

## Prisagenten
Claude får alle fakturaene som tekst (cachet) + arbeidsbeskrivelsen og svarer med linjer, der hver
linje har en `kilde` (fakturanr eller «skjønn»). `kontrollerForslag` (vanlig kode) setter timepris
til firmaets, fjerner ukjente kilder/ugyldige linjer og regner ut summen. Mål for kontrolltesten:
de fleste jobber innenfor ±20 % av faktisk fakturert beløp.
