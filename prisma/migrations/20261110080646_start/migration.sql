-- CreateTable
CREATE TABLE "Firma" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "navn" TEXT NOT NULL,
    "orgnr" TEXT,
    "adresse" TEXT,
    "telefon" TEXT,
    "epost" TEXT,
    "timepris" REAL NOT NULL DEFAULT 950
);

-- CreateTable
CREATE TABLE "Kunde" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "navn" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "telefon" TEXT,
    "epost" TEXT NOT NULL,
    "opprettet" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Befaring" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kundeId" INTEGER NOT NULL,
    "dato" DATETIME NOT NULL,
    "arbeidsbeskrivelse" TEXT NOT NULL,
    "opprettet" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Befaring_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tilbud" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "befaringId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UTKAST',
    "begrunnelse" TEXT,
    "opprettet" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sendt" DATETIME,
    CONSTRAINT "Tilbud_befaringId_fkey" FOREIGN KEY ("befaringId") REFERENCES "Befaring" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tilbudslinje" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tilbudId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "beskrivelse" TEXT NOT NULL,
    "antall" REAL NOT NULL,
    "enhet" TEXT NOT NULL,
    "enhetspris" REAL NOT NULL,
    CONSTRAINT "Tilbudslinje_tilbudId_fkey" FOREIGN KEY ("tilbudId") REFERENCES "Tilbud" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Faktura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fakturanr" TEXT,
    "dato" DATETIME,
    "kundenavn" TEXT,
    "arbeidsbeskrivelse" TEXT NOT NULL,
    "totalEksMva" REAL NOT NULL,
    "filnavn" TEXT NOT NULL,
    "raatekst" TEXT NOT NULL,
    "importert" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Fakturalinje" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fakturaId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "beskrivelse" TEXT NOT NULL,
    "antall" REAL NOT NULL,
    "enhet" TEXT NOT NULL,
    "enhetspris" REAL NOT NULL,
    CONSTRAINT "Fakturalinje_fakturaId_fkey" FOREIGN KEY ("fakturaId") REFERENCES "Faktura" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
