// Passord lagres ALDRI som klartekst. Vi lagrer en «hash»: et fingeravtrykk som er laget
// med scrypt (innebygd i Node) og et tilfeldig salt. Fra hashen kan man ikke regne seg
// tilbake til passordet, men man kan sjekke om et innskrevet passord gir samme hash.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const NOKKELLENGDE = 64;

function scryptAsync(passord: string, salt: Buffer): Promise<Buffer> {
  return new Promise((ok, feil) =>
    scrypt(passord.normalize("NFKC"), salt, NOKKELLENGDE, (e, nokkel) => (e ? feil(e) : ok(nokkel)))
  );
}

export async function hashPassord(passord: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(passord, salt);
  return ["scrypt", salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function sjekkPassord(passord: string, lagret: string): Promise<boolean> {
  const [metode, salt, hash] = lagret.split("$");
  if (metode !== "scrypt" || !salt || !hash) return false;
  const forventet = Buffer.from(hash, "base64");
  const faktisk = await scryptAsync(passord, Buffer.from(salt, "base64"));
  return faktisk.length === forventet.length && timingSafeEqual(faktisk, forventet);
}

/** Krav til nye passord. Returnerer en feilmelding, eller null hvis passordet er greit. */
export function passordFeil(passord: string): string | null {
  if (passord.length < 10) return "Passordet må ha minst 10 tegn";
  if (passord.length > 200) return "Passordet er for langt";
  return null;
}

/** Lager et tilfeldig, lesbart passord (f.eks. til en ny bruker). */
export function lagMidlertidigPassord(): string {
  const tegn = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(14), (b) => tegn[b % tegn.length]).join("");
}
