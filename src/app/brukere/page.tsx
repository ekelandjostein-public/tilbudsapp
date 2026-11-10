import { db } from "@/lib/db";
import { krevAdmin } from "@/lib/innlogging";
import { Side } from "@/components/ui";
import Administrasjon from "./Administrasjon";

export default async function Brukere() {
  const admin = await krevAdmin();
  const brukere = await db.bruker.findMany({
    where: { firmaId: admin.firmaId },
    orderBy: { navn: "asc" },
    select: { id: true, navn: true, epost: true, rolle: true },
  });

  return (
    <Side
      tilbake={{ href: "/", tekst: "Oversikt" }}
      tittel="Brukere"
      undertittel="Alle her ser de samme kundene, befaringene og tilbudene."
    >
      <Administrasjon brukere={brukere} megId={admin.id} />
    </Side>
  );
}
