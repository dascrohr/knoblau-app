// Beschreibung der pflegbaren Stammdaten: je Tabelle Felder, Spalten und Beschriftungen.
// Die Pflegeseite (stamm-pflege.tsx) ist generisch und liest nur diese Konfiguration.
import type { StammTabelle } from "@/lib/daten";

export type FeldArt = "text" | "lang" | "zahl" | "betrag" | "prozent" | "ja_nein" | "auswahl";

export type FeldDef = {
  /** Spaltenname in der Datenbank. */
  name: string;
  label: string;
  art: FeldArt;
  pflicht?: boolean;
  /** Einheit im Zahlfeld und in der Tabelle, z. B. "kg". */
  einheit?: string;
  /** Feste Optionen (art "auswahl"). */
  optionen?: { wert: string; text: string }[];
  /** Bei Textfeldern: vorhandene Werte dieser Spalte als Vorschläge anbieten. */
  vorschlaegeAusDaten?: boolean;
  /** Feld nimmt im Formular die ganze Breite ein. */
  breit?: boolean;
  hinweis?: string;
  /** Vorbelegung beim Anlegen. */
  standard?: string | number | boolean;
};

export type StammKonfig = {
  slug: string;
  tabelle: StammTabelle;
  titel: string;
  /** Einzahl für Knöpfe und Dialogtitel, z. B. "Nebenleistung". */
  einzahl: string;
  beschreibung: string;
  felder: FeldDef[];
  /** Feldnamen, die als Tabellenspalten erscheinen (in dieser Reihenfolge). */
  spalten: string[];
  /** Feldname für den Filter über der Tabelle (Werte kommen aus den Daten bzw. den Optionen). */
  filter?: string;
  /** Feldnamen, deren Kombination eindeutig sein muss. */
  eindeutig?: string[];
  /** Überschriften im Formular: Feldname → Überschrift vor diesem Feld. */
  gruppen?: Record<string, string>;
};

export const AUSWAHL_LISTEN: { wert: string; text: string }[] = [
  { wert: "herkunft", text: "Herkunft" },
  { wert: "umzugsart", text: "Umzugsart" },
  { wert: "zahlungsbedingung", text: "Zahlungsbedingung" },
  { wert: "sachbearbeiter", text: "Sachbearbeiter" },
  { wert: "besichtigung_art", text: "Art der Besichtigung" },
  { wert: "volumen_ermittlung", text: "Volumen-Ermittlung" },
];

/** Bereiche der Textbausteine: bestimmen, bei welchem Textfeld der Angebotsmaske ein Baustein zuerst angeboten wird. */
export const TEXTBAUSTEIN_BEREICHE: { wert: string; text: string }[] = [
  { wert: "vereinbarungen", text: "Vereinbarungen" },
  { wert: "handwerker", text: "Arbeiten der Handwerker" },
  { wert: "packarbeit", text: "Packleistungen" },
  { wert: "frei", text: "Freie Leistungsbeschreibung" },
  { wert: "termine", text: "Freie Termine" },
  { wert: "intern", text: "Absprachen intern" },
  { wert: "zahlungsbedingung", text: "Zahlungsbedingung" },
  { wert: "allgemein", text: "Allgemein (überall)" },
];

/** Listen, die nicht gepflegt werden (interne Filterlisten). */
export function auswahlListeVersteckt(liste: unknown): boolean {
  return typeof liste !== "string" || liste.startsWith("filter_");
}

const SORTIERUNG: FeldDef = { name: "sortierung", label: "Sortierung", art: "zahl", hinweis: "Kleine Zahl = weiter oben in der Liste." };
const UST: FeldDef = { name: "ust", label: "USt %", art: "prozent", hinweis: "Leer = Standardsatz des Angebots." };

export const STAMM_KONFIG: StammKonfig[] = [
  {
    slug: "nebenleistungen",
    tabelle: "stamm_leistungen",
    titel: "Nebenleistungen",
    einzahl: "Nebenleistung",
    beschreibung: "Leistungen mit Preis, die in Angebote übernommen werden.",
    felder: [
      { name: "suchbegriff", label: "Suchbegriff", art: "text", hinweis: "Kurzwort, unter dem die Leistung in der Maske gefunden wird." },
      { name: "text", label: "Text", art: "text", pflicht: true, breit: true, hinweis: "Steht so im Angebot." },
      { name: "anzahl", label: "Anzahl", art: "zahl" },
      { name: "einheiten", label: "Std/Stck", art: "zahl" },
      { name: "einzelpreis", label: "Einzelpreis €", art: "betrag" },
      { name: "prozent", label: "+/- %", art: "prozent", hinweis: "Zuschlag (+) oder Nachlass (−) auf die Zeile." },
      { name: "eigenkosten", label: "Eigenkosten €", art: "betrag" },
      UST,
      { name: "beschreibung", label: "Beschreibung", art: "lang", breit: true },
      SORTIERUNG,
    ],
    spalten: ["suchbegriff", "text", "anzahl", "einheiten", "einzelpreis", "prozent", "eigenkosten", "ust"],
    gruppen: { anzahl: "Menge und Preis" },
  },
  {
    slug: "packmaterial",
    tabelle: "stamm_packmaterial",
    titel: "Packmaterial",
    einzahl: "Packmaterial",
    beschreibung: "Kartons und Material zum Verkauf oder zur Leihe.",
    felder: [
      { name: "suchbegriff", label: "Suchbegriff", art: "text" },
      { name: "text", label: "Bezeichnung", art: "text", pflicht: true, breit: true },
      { name: "art", label: "Verkauf/Leihe", art: "text", vorschlaegeAusDaten: true },
      { name: "einheiten", label: "Stück", art: "zahl" },
      { name: "einzelpreis", label: "Einzelpreis €", art: "betrag" },
      { name: "prozent", label: "+/- %", art: "prozent" },
      { name: "einkaufspreis", label: "Einkaufspreis €", art: "betrag" },
      UST,
      { name: "beschreibung", label: "Beschreibung", art: "lang", breit: true },
      SORTIERUNG,
    ],
    spalten: ["suchbegriff", "text", "art", "einheiten", "einzelpreis", "einkaufspreis", "ust"],
    filter: "art",
    gruppen: { einheiten: "Menge und Preis" },
  },
  {
    slug: "umzugsgut",
    tabelle: "stamm_umzugsgut",
    titel: "Umzugsgut-Katalog",
    einzahl: "Gegenstand",
    beschreibung: "Möbel und Gegenstände mit Raumeinheiten für die Umzugsgutliste.",
    felder: [
      { name: "gegenstand", label: "Gegenstand", art: "text", pflicht: true, breit: true },
      { name: "zimmer", label: "Zimmer", art: "text", vorschlaegeAusDaten: true },
      { name: "re", label: "Raumeinheiten (RE)", art: "zahl" },
      { name: "packmittel", label: "Packmittel", art: "ja_nein" },
      { name: "artnr", label: "Artikelnummer", art: "text" },
      { name: "montage", label: "Montage", art: "zahl" },
      { name: "demontage", label: "Demontage", art: "zahl" },
      { name: "einpacken", label: "Einpacken", art: "zahl" },
      { name: "auspacken", label: "Auspacken", art: "zahl" },
      { name: "einladen", label: "Einladen", art: "zahl" },
      { name: "ausladen", label: "Ausladen", art: "zahl" },
      SORTIERUNG,
    ],
    spalten: ["gegenstand", "zimmer", "re", "packmittel", "montage", "demontage", "einpacken", "auspacken", "einladen", "ausladen"],
    filter: "zimmer",
    gruppen: { montage: "Zeiten" },
  },
  {
    slug: "zimmer",
    tabelle: "stamm_zimmer",
    titel: "Zimmer",
    einzahl: "Zimmer",
    beschreibung: "Räume für die Umzugsgutliste.",
    felder: [
      { name: "zimmer", label: "Zimmer", art: "text", pflicht: true },
      { name: "kurz", label: "Kürzel", art: "text" },
      { name: "art", label: "Art", art: "text", vorschlaegeAusDaten: true },
      { name: "knopf", label: "Als Schnellwahl-Knopf zeigen", art: "ja_nein" },
      SORTIERUNG,
    ],
    spalten: ["zimmer", "kurz", "art", "knopf", "sortierung"],
  },
  {
    slug: "fahrzeuge",
    tabelle: "stamm_fahrzeuge",
    titel: "Fahrzeuge",
    einzahl: "Fahrzeug",
    beschreibung: "Fuhrpark mit Maßen und Kostensätzen.",
    felder: [
      { name: "kennzeichen", label: "Kennzeichen", art: "text", pflicht: true },
      { name: "typ", label: "Typ", art: "text", vorschlaegeAusDaten: true },
      { name: "fabrikat", label: "Fabrikat", art: "text", vorschlaegeAusDaten: true },
      { name: "nutzlast", label: "Nutzlast", art: "zahl", einheit: "kg" },
      { name: "gesamtgewicht", label: "Gesamtgewicht", art: "zahl", einheit: "kg" },
      { name: "ladevolumen", label: "Ladevolumen", art: "zahl", einheit: "m³" },
      { name: "achsen", label: "Achsen", art: "zahl" },
      { name: "laenge", label: "Länge", art: "zahl", einheit: "m" },
      { name: "breite", label: "Breite", art: "zahl", einheit: "m" },
      { name: "hoehe", label: "Höhe", art: "zahl", einheit: "m" },
      { name: "kosten_km", label: "Kosten je km €", art: "betrag" },
      { name: "kosten_stunde", label: "Kosten je Stunde €", art: "betrag" },
      { name: "kosten_tag", label: "Kosten je Tag €", art: "betrag" },
      { name: "info", label: "Bemerkung", art: "lang", breit: true },
      SORTIERUNG,
    ],
    spalten: ["kennzeichen", "typ", "fabrikat", "nutzlast", "gesamtgewicht", "ladevolumen", "kosten_km", "kosten_stunde", "kosten_tag"],
    eindeutig: ["kennzeichen"],
    gruppen: { nutzlast: "Gewichte und Maße", kosten_km: "Kosten" },
  },
  {
    slug: "checkliste",
    tabelle: "stamm_checkliste",
    titel: "Checklisten-Vorlage",
    einzahl: "Aufgabe",
    beschreibung: "Aufgaben, die jedes neue Angebot als Checkliste bekommt.",
    felder: [
      { name: "aufgabe", label: "Aufgabe", art: "text", pflicht: true, breit: true },
      { name: "datentyp", label: "Datentyp", art: "text", vorschlaegeAusDaten: true, hinweis: "Art der Antwort, z. B. Ja/Nein, Datum oder Text." },
      { name: "vorgaben", label: "Vorgaben", art: "lang", breit: true, hinweis: "Mögliche Antworten zur Auswahl." },
      { name: "eintragen", label: "Übertrag", art: "ja_nein", hinweis: "Antwort wird in das Angebot übertragen." },
      SORTIERUNG,
    ],
    spalten: ["aufgabe", "datentyp", "vorgaben", "eintragen", "sortierung"],
  },
  {
    slug: "textbausteine",
    tabelle: "stamm_textbausteine",
    titel: "Textbausteine",
    einzahl: "Textbaustein",
    beschreibung: "Fertige Texte für Vereinbarungen, Packarbeit, Handwerker, Termine und Zahlungsbedingungen. In der Angebotsmaske über „Textbaustein einfügen“ abrufbar.",
    felder: [
      { name: "bereich", label: "Bereich", art: "auswahl", optionen: TEXTBAUSTEIN_BEREICHE, standard: "allgemein", hinweis: "Bei diesem Textfeld der Angebotsmaske wird der Baustein zuerst angeboten." },
      { name: "titel", label: "Titel", art: "text", pflicht: true },
      { name: "text", label: "Text", art: "lang", breit: true },
      SORTIERUNG,
    ],
    spalten: ["bereich", "titel", "text"],
    filter: "bereich",
  },
  {
    slug: "auswahllisten",
    tabelle: "stamm_auswahl",
    titel: "Auswahllisten",
    einzahl: "Eintrag",
    beschreibung: "Werte für die Auswahlfelder der Angebotsmaske.",
    felder: [
      { name: "liste", label: "Liste", art: "auswahl", pflicht: true, optionen: AUSWAHL_LISTEN },
      { name: "wert", label: "Wert", art: "text", pflicht: true },
      { name: "zusatz", label: "Zusatz", art: "text" },
      SORTIERUNG,
    ],
    spalten: ["liste", "wert", "zusatz", "sortierung"],
    filter: "liste",
    eindeutig: ["liste", "wert"],
  },
];

export function konfigZuSlug(slug: string): StammKonfig | undefined {
  return STAMM_KONFIG.find((k) => k.slug === slug);
}
