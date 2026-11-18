// Firmenangaben für Briefkopf und Fußzeile der Druckansichten.
// Quelle: Impressum der Firmen-Website (Stand 18.11.2026). Vom Inhaber zu bestätigen und zu ergänzen.
export const FIRMA = {
  name: "Knoblau & Sohn Umzüge",
  inhaber: "Mike Knoblau",
  strasse: "Weismantelweg 24",
  plzOrt: "51109 Köln",
  telefon: "0221 / 80 26 24 20",
  telefax: "0221 / 80 26 24 21",
  email: "info@knoblau-umzuege.de",
  web: "umzuege-transporte-koeln.de",
  ustId: "DE365335265",
  // Noch offen (bewusst leer, bis der Inhaber sie nennt): Steuernummer und Bankverbindung für die Fußzeile.
  steuernummer: "",
  bankzeile: "",
  logo: "/marke/knoblau-sohn-logo.png",
} as const;
