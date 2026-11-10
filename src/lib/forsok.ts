// Enkel bremse mot gjetting av passord: maks 5 feil per e-post per 15 minutter.
// Huskes bare så lenge appen kjører – godt nok for en liten bedrift.
const MAKS_FEIL = 5;
const VINDU_MS = 15 * 60_000;
const feilforsok = new Map<string, number[]>();

export function forMangeForsok(epost: string) {
  const naa = Date.now();
  const nylige = (feilforsok.get(epost) ?? []).filter((t) => naa - t < VINDU_MS);
  feilforsok.set(epost, nylige);
  return nylige.length >= MAKS_FEIL;
}

export function registrerFeil(epost: string) {
  feilforsok.set(epost, [...(feilforsok.get(epost) ?? []), Date.now()]);
}

/** Opphever sperren (etter vellykket innlogging eller nytt passord fra admin). */
export function nullstillForsok(epost: string) {
  feilforsok.delete(epost);
}
