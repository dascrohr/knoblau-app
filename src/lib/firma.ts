// Firmenangaben für Briefkopf und Fußzeile der Druckansichten sowie feste Texte.
// Vorgaben aus dem Impressum der Firmen-Website (Stand 18.11.2026); der Admin überschreibt sie unter Stammdaten → Firmenangaben
// (Tabelle app.einstellungen, Schlüssel = Feldname unten).
export const FIRMA_VORGABE = {
  name: "Knoblau & Sohn Umzüge",
  inhaber: "Mike Knoblau",
  strasse: "Weismantelweg 24",
  plz_ort: "51109 Köln",
  telefon: "0221 / 80 26 24 20",
  telefax: "0221 / 80 26 24 21",
  email: "info@knoblau-umzuege.de",
  web: "umzuege-transporte-koeln.de",
  ust_id: "DE365335265",
  steuernummer: "",
  fusszeile_zusatz: "", // freie Zeile, z. B. Bankverbindung für Überweisungen
  text_angebot_einleitung: "Vielen Dank für Ihre Anfrage. Für Ihren Umzug bieten wir Ihnen folgende Leistungen an:",
  text_angebot_schluss: "",
  text_auftrag_einleitung: "Vielen Dank für Ihren Auftrag. Wir bestätigen Ihnen die folgenden Leistungen:",
  text_auftrag_schluss: "",
  text_rechnung_einleitung: "",
  text_rechnung_schluss: "",
} as const;

export type FirmaSchluessel = keyof typeof FIRMA_VORGABE;
export type Firma = Record<FirmaSchluessel, string> & { logo: string };
export const FIRMA_LOGO = "/marke/knoblau-sohn-logo.png";

/** Beschriftungen für die Pflegeseite, in Anzeigereihenfolge. `lang` = mehrzeiliges Textfeld. */
export const FIRMA_FELDER: { schluessel: FirmaSchluessel; titel: string; hilfe?: string; lang?: boolean; gruppe: "Firma" | "Fußzeile" | "Texte" }[] = [
  { schluessel: "name", titel: "Firmenname", gruppe: "Firma" },
  { schluessel: "inhaber", titel: "Inhaber", gruppe: "Firma" },
  { schluessel: "strasse", titel: "Straße und Hausnummer", gruppe: "Firma" },
  { schluessel: "plz_ort", titel: "PLZ und Ort", gruppe: "Firma" },
  { schluessel: "telefon", titel: "Telefon", gruppe: "Firma" },
  { schluessel: "telefax", titel: "Telefax", gruppe: "Firma" },
  { schluessel: "email", titel: "E-Mail", gruppe: "Firma" },
  { schluessel: "web", titel: "Website", gruppe: "Firma" },
  { schluessel: "ust_id", titel: "USt-IdNr.", gruppe: "Fußzeile" },
  { schluessel: "steuernummer", titel: "Steuernummer", hilfe: "Erscheint in der Fußzeile von Angebot und Rechnung.", gruppe: "Fußzeile" },
  { schluessel: "fusszeile_zusatz", titel: "Zusatzzeile in der Fußzeile", hilfe: "Zum Beispiel die Bankverbindung für Überweisungen.", gruppe: "Fußzeile" },
  { schluessel: "text_angebot_einleitung", titel: "Angebot: Einleitung", lang: true, gruppe: "Texte" },
  { schluessel: "text_angebot_schluss", titel: "Angebot: Schlusstext", hilfe: "Steht nach den Vereinbarungen, vor der Unterschrift.", lang: true, gruppe: "Texte" },
  { schluessel: "text_auftrag_einleitung", titel: "Auftragsbestätigung: Einleitung", lang: true, gruppe: "Texte" },
  { schluessel: "text_auftrag_schluss", titel: "Auftragsbestätigung: Schlusstext", lang: true, gruppe: "Texte" },
  { schluessel: "text_rechnung_einleitung", titel: "Rechnung: Einleitung", lang: true, gruppe: "Texte" },
  { schluessel: "text_rechnung_schluss", titel: "Rechnung: Schlusstext", hilfe: "Zum Beispiel Dank und Hinweis zur Aufbewahrungspflicht.", lang: true, gruppe: "Texte" },
];
