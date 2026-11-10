-- CreateTable
CREATE TABLE "Bruker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firmaId" INTEGER NOT NULL,
    "navn" TEXT NOT NULL,
    "epost" TEXT NOT NULL,
    "passordHash" TEXT NOT NULL,
    "rolle" TEXT NOT NULL DEFAULT 'ANSATT',
    "opprettet" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bruker_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "Firma" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Okt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brukerId" INTEGER NOT NULL,
    "opprettet" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utloper" DATETIME NOT NULL,
    CONSTRAINT "Okt_brukerId_fkey" FOREIGN KEY ("brukerId") REFERENCES "Bruker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Befaring" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kundeId" INTEGER NOT NULL,
    "dato" DATETIME NOT NULL,
    "arbeidsbeskrivelse" TEXT NOT NULL,
    "opprettet" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opprettetAvId" INTEGER,
    CONSTRAINT "Befaring_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Befaring_opprettetAvId_fkey" FOREIGN KEY ("opprettetAvId") REFERENCES "Bruker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Befaring" ("arbeidsbeskrivelse", "dato", "id", "kundeId", "opprettet") SELECT "arbeidsbeskrivelse", "dato", "id", "kundeId", "opprettet" FROM "Befaring";
DROP TABLE "Befaring";
ALTER TABLE "new_Befaring" RENAME TO "Befaring";
CREATE TABLE "new_Tilbud" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "befaringId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UTKAST',
    "begrunnelse" TEXT,
    "grunnlag" TEXT,
    "opprettet" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "godkjent" DATETIME,
    "godkjentAvId" INTEGER,
    "sendt" DATETIME,
    CONSTRAINT "Tilbud_befaringId_fkey" FOREIGN KEY ("befaringId") REFERENCES "Befaring" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tilbud_godkjentAvId_fkey" FOREIGN KEY ("godkjentAvId") REFERENCES "Bruker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tilbud" ("befaringId", "begrunnelse", "godkjent", "grunnlag", "id", "opprettet", "sendt", "status") SELECT "befaringId", "begrunnelse", "godkjent", "grunnlag", "id", "opprettet", "sendt", "status" FROM "Tilbud";
DROP TABLE "Tilbud";
ALTER TABLE "new_Tilbud" RENAME TO "Tilbud";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Bruker_epost_key" ON "Bruker"("epost");
