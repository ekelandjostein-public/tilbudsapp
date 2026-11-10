import Link from "next/link";
import { db } from "@/lib/db";
import { krevAdmin } from "@/lib/innlogging";
import Administrasjon from "./Administrasjon";

export default async function Brukere() {
  const admin = await krevAdmin();
  const brukere = await db.bruker.findMany({
    where: { firmaId: admin.firmaId },
    orderBy: { navn: "asc" },
    select: { id: true, navn: true, epost: true, rolle: true },
  });

  return (
    <main className="mx-auto max-w-md p-6">
      <Link href="/" className="text-sm text-blue-600">← Tilbake</Link>
      <h1 className="mt-2 text-2xl font-bold">Brukere</h1>
      <p className="text-gray-500">Alle her ser de samme kundene, befaringene og tilbudene.</p>
      <Administrasjon brukere={brukere} megId={admin.id} />
    </main>
  );
}
