// Lager en administrator fra terminalen (brukes for den aller første brukeren),
// eller gir en eksisterende bruker et nytt passord hvis du har låst deg ute.
//
//   npm run ny-bruker -- din@epost.no "Ditt Navn"
import { db } from "../src/lib/db";
import { hashPassord, lagMidlertidigPassord } from "../src/lib/passord";

const [epostInn, ...navnDeler] = process.argv.slice(2);
const epost = epostInn?.trim().toLowerCase();
const navn = navnDeler.join(" ").trim();

async function main() {
  if (!epost || !/^\S+@\S+\.\S+$/.test(epost)) {
    console.error('Bruk: npm run ny-bruker -- din@epost.no "Ditt Navn"');
    process.exit(1);
  }
  const firma = await db.firma.findFirst();
  if (!firma) throw new Error("Firmaet mangler – kjør «npx prisma db seed» først.");

  const passord = lagMidlertidigPassord();
  const passordHash = await hashPassord(passord);
  const finnes = await db.bruker.findUnique({ where: { epost } });

  if (finnes) {
    await db.bruker.update({ where: { id: finnes.id }, data: { passordHash } });
    await db.okt.deleteMany({ where: { brukerId: finnes.id } });
    console.log(`Nytt passord for ${finnes.navn} (${epost}).`);
  } else {
    await db.bruker.create({
      data: { epost, navn: navn || epost, rolle: "ADMIN", firmaId: firma.id, passordHash },
    });
    console.log(`Laget administrator ${navn || epost} (${epost}) i ${firma.navn}.`);
  }
  console.log(`\n  Midlertidig passord:  ${passord}\n`);
  console.log("Logg inn og bytt passord under «Min konto».");
}

main()
  .catch((e) => {
    console.error("Feil:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
