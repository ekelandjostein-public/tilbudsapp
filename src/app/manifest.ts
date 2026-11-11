// Forteller telefonen hvordan appen skal se ut når den legges på hjemskjermen:
// navn under ikonet, ikon, farger, og at den åpnes uten nettleserens adressefelt.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tilbudsapp",
    short_name: "Tilbud",
    description: "Fra befaring til tilbud på minutter",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#f6f5f1",
    lang: "nb",
    icons: [
      { src: "/ikon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/ikon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
