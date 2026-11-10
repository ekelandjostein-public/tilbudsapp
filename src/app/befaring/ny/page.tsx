import Skjema from "./Skjema";
import { krevBruker } from "@/lib/innlogging";
import { Side } from "@/components/ui";

export default async function NyBefaring() {
  await krevBruker();
  const iDag = new Date().toISOString().slice(0, 10);
  return (
    <Side
      tilbake={{ href: "/", tekst: "Oversikt" }}
      tittel="Ny befaring"
      undertittel="Fyll inn kunden og beskriv jobben. Jo mer detaljer, jo bedre prisforslag."
    >
      <Skjema iDag={iDag} />
    </Side>
  );
}
