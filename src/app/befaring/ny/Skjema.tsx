"use client";
// Selve skjemaet. Kjører i nettleseren/mobilen.

import { useActionState } from "react";
import { opprettBefaring, type SkjemaTilstand } from "../actions";

export default function Skjema({ iDag }: { iDag: string }) {
  const [tilstand, sendInn, sender] = useActionState<SkjemaTilstand, FormData>(
    opprettBefaring,
    {}
  );
  const v = tilstand.verdier ?? {};
  const f = tilstand.feil ?? {};

  return (
    <form action={sendInn} className="mt-6 space-y-5" noValidate>
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Kunde
        </legend>
        <Felt navn="navn" etikett="Navn" feil={f.navn} standard={v.navn} autoComplete="name" />
        <Felt navn="adresse" etikett="Adresse" feil={f.adresse} standard={v.adresse} autoComplete="street-address" />
        <Felt navn="telefon" etikett="Telefon" type="tel" feil={f.telefon} standard={v.telefon} autoComplete="tel" valgfritt />
        <Felt navn="epost" etikett="E-post" type="email" feil={f.epost} standard={v.epost} autoComplete="email" />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Jobben
        </legend>
        <Felt navn="dato" etikett="Dato for befaring" type="date" feil={f.dato} standard={v.dato ?? iDag} />
        <div>
          <label htmlFor="arbeidsbeskrivelse" className="block font-medium">
            Arbeidsbeskrivelse
          </label>
          <p className="text-sm text-gray-500">
            Hva skal gjøres? Ta med mål, antall punkter, spesielle forhold osv.
          </p>
          <textarea
            id="arbeidsbeskrivelse"
            name="arbeidsbeskrivelse"
            rows={6}
            defaultValue={v.arbeidsbeskrivelse}
            placeholder="F.eks.: Montere elbillader i garasje, ca. 12 m kabel fra sikringsskap. Trenger ny jordfeilautomat."
            className="mt-1 w-full rounded-lg border p-3 text-base"
          />
          {f.arbeidsbeskrivelse && <Feil tekst={f.arbeidsbeskrivelse} />}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={sender}
        className="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white disabled:opacity-50"
      >
        {sender ? "Lagrer …" : "Lagre befaring"}
      </button>
    </form>
  );
}

function Felt(props: {
  navn: string;
  etikett: string;
  type?: string;
  feil?: string;
  standard?: string;
  autoComplete?: string;
  valgfritt?: boolean;
}) {
  return (
    <div>
      <label htmlFor={props.navn} className="block font-medium">
        {props.etikett}
        {props.valgfritt && <span className="font-normal text-gray-400"> (valgfritt)</span>}
      </label>
      <input
        id={props.navn}
        name={props.navn}
        type={props.type ?? "text"}
        defaultValue={props.standard}
        autoComplete={props.autoComplete}
        className="mt-1 w-full rounded-lg border p-3 text-base"
      />
      {props.feil && <Feil tekst={props.feil} />}
    </div>
  );
}

function Feil({ tekst }: { tekst: string }) {
  return <p className="mt-1 text-sm text-red-600">{tekst}</p>;
}
