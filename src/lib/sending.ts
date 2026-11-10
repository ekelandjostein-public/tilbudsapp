// Sender e-post via Resend (resend.com).
//
// Innstillinger (miljøvariabler / .env):
//   RESEND_API_KEY  – nøkkelen fra resend.com (i skyøkter legges den inn av nettverket,
//                     så der holder det med RESEND_API_KEY=proxy-injected)
//   EPOST_FRA       – avsenderadresse. Uten eget domene i Resend må den være
//                     onboarding@resend.dev, og da kan du bare sende til din egen adresse.
//   TEST_EPOST      – adressen «Send test til meg» sender til

export type Vedlegg = { filnavn: string; innhold: Uint8Array };

export type Epost = {
  avsendernavn: string;
  til: string;
  emne: string;
  tekst: string;
  svarTil?: string | null; // svar fra kunden går hit (firmaets adresse)
  vedlegg?: Vedlegg[];
};

export const testadresse = () => process.env.TEST_EPOST?.trim() || null;

/** Sender e-posten og returnerer id-en Resend gir den. Kaster feil med forklaring på norsk. */
export async function sendEpost(e: Epost): Promise<string> {
  const nokkel = process.env.RESEND_API_KEY;
  if (!nokkel) throw new Error("RESEND_API_KEY mangler – se .env.example.");
  const fra = process.env.EPOST_FRA?.trim() || "onboarding@resend.dev";

  let svar: Response;
  try {
    svar = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${nokkel}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${e.avsendernavn.replace(/[<>"]/g, "")} <${fra}>`,
        to: [e.til],
        subject: e.emne,
        text: e.tekst,
        ...(e.svarTil ? { reply_to: e.svarTil } : {}),
        attachments: e.vedlegg?.map((v) => ({
          filename: v.filnavn,
          content: Buffer.from(v.innhold).toString("base64"),
        })),
      }),
    });
  } catch (feil) {
    console.error("Kontakt med Resend feilet:", feil);
    throw new Error("Fikk ikke kontakt med e-posttjenesten (Resend). Sjekk nettforbindelsen.");
  }

  const data = (await svar.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!svar.ok || !data.id) {
    console.error("Resend svarte", svar.status, data);
    if (svar.status === 401 || svar.status === 403)
      throw new Error(`Resend avviste sendingen: ${data.message ?? "ugyldig nøkkel"}`);
    throw new Error(`Resend kunne ikke sende e-posten (${svar.status}): ${data.message ?? "ukjent feil"}`);
  }
  return data.id;
}
