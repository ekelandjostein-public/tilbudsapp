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
    <form action={sendInn} className="space-y-6" noValidate>
      <fieldset className="kort space-y-5 p-5">
        <legend className="seksjonstittel float-left mb-3 w-full">Kunde</legend>
        <Felt navn="navn" etikett="Navn" feil={f.navn} standard={v.navn} autoComplete="name" />
        <Felt navn="adresse" etikett="Adresse" feil={f.adresse} standard={v.adresse} autoComplete="street-address" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Felt navn="telefon" etikett="Telefon" type="tel" feil={f.telefon} standard={v.telefon} autoComplete="tel" valgfritt />
          <Felt navn="epost" etikett="E-post" type="email" feil={f.epost} standard={v.epost} autoComplete="email" />
        </div>
      </fieldset>

      <fieldset className="kort space-y-5 p-5">
        <legend className="seksjonstittel float-left mb-3 w-full">Jobben</legend>
        <Felt navn="dato" etikett="Dato for befaring" type="date" feil={f.dato} standard={v.dato ?? iDag} />
        <div>
          <label htmlFor="arbeidsbeskrivelse" className="etikett">
            Arbeidsbeskrivelse
          </label>
          <p className="hjelpetekst mt-0.5">Hva skal gjøres? Ta med mål, antall punkter og spesielle forhold.</p>
          <textarea
            id="arbeidsbeskrivelse"
            name="arbeidsbeskrivelse"
            rows={6}
            defaultValue={v.arbeidsbeskrivelse}
            placeholder="F.eks.: Montere elbillader i garasje, ca. 12 m kabel fra sikringsskap. Trenger ny jordfeilautomat."
            className={`felt resize-y ${f.arbeidsbeskrivelse ? "felt-feil" : ""}`}
          />
          {f.arbeidsbeskrivelse && <p className="feiltekst">{f.arbeidsbeskrivelse}</p>}
        </div>
      </fieldset>

      <button type="submit" disabled={sender} className="knapp knapp-hoved knapp-stor w-full">
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
      <label htmlFor={props.navn} className="etikett">
        {props.etikett}
        {props.valgfritt && <span className="font-normal text-zinc-400"> · valgfritt</span>}
      </label>
      <input
        id={props.navn}
        name={props.navn}
        type={props.type ?? "text"}
        defaultValue={props.standard}
        autoComplete={props.autoComplete}
        className={`felt ${props.feil ? "felt-feil" : ""}`}
      />
      {props.feil && <p className="feiltekst">{props.feil}</p>}
    </div>
  );
}
