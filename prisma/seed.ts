// Legger inn firmaopplysningene (hentet fra eksempelfakturaene).
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const finnes = await db.firma.findFirst();
  if (finnes) return console.log("Firma finnes allerede:", finnes.navn);

  const firma = await db.firma.create({
    data: {
      navn: "Ekeland Elektriske AS",
      orgnr: "987 654 321 MVA",
      epost: "post@ekeland-elektro.no",
      timepris: 950,
    },
  });
  console.log("La inn firma:", firma.navn);
}

main().finally(() => db.$disconnect());
