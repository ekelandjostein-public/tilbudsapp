// Gjør feil fra Claude API om til forståelige meldinger på norsk.
import Anthropic from "@anthropic-ai/sdk";

export function claudeFeil(e: unknown): Error {
  if (e instanceof Anthropic.AuthenticationError)
    return new Error("API-nøkkelen ble avvist. Sjekk at ANTHROPIC_API_KEY er riktig.");
  if (e instanceof Anthropic.PermissionDeniedError)
    return new Error("API-nøkkelen har ikke tilgang til denne modellen.");
  if (e instanceof Anthropic.RateLimitError)
    return new Error("For mange forespørsler til Claude akkurat nå – vent litt og prøv igjen.");
  if (e instanceof Anthropic.APIConnectionError)
    return new Error("Fikk ikke kontakt med Claude. Sjekk internettforbindelsen.");
  if (e instanceof Anthropic.InternalServerError)
    return new Error("Claude har en midlertidig feil – prøv igjen om et par minutter.");
  if (e instanceof Anthropic.APIError)
    return new Error(`Feil fra Claude (${e.status}): ${e.message}`);
  // Ingen nøkkel i det hele tatt: SDK-et kaster da en vanlig Error uten egen type,
  // så vi må kjenne den igjen på teksten.
  if (e instanceof Error && e.message.startsWith("Could not resolve authentication method"))
    return new Error("Fant ingen API-nøkkel. Miljøvariabelen må hete nøyaktig ANTHROPIC_API_KEY.");
  return e instanceof Error ? e : new Error(String(e));
}
