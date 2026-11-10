import Link from "next/link";
import Skjema from "./Skjema";

export default function NyBefaring() {
  const iDag = new Date().toISOString().slice(0, 10);
  return (
    <main className="mx-auto max-w-md p-6">
      <Link href="/" className="text-sm text-blue-600">← Tilbake</Link>
      <h1 className="mt-2 text-2xl font-bold">Ny befaring</h1>
      <Skjema iDag={iDag} />
    </main>
  );
}
