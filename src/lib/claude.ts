// Én felles kobling til Claude for hele appen.
import Anthropic from "@anthropic-ai/sdk";

// TILBUD_API_KEY brukes i skyøkter, der plattformen fjerner ANTHROPIC_API_KEY.
export const claude = new Anthropic({
  apiKey: process.env.TILBUD_API_KEY || process.env.ANTHROPIC_API_KEY,
});

export const MODELL = "claude-opus-5-5";
