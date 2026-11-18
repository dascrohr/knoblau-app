import Link from "next/link";
import { NICHT_UMGESETZT } from "./hilfen";

type Eintrag = { text: string; href?: string; art?: "titel" | "trenner" | "unter" };
const aus = (liste: string, art?: Eintrag["art"]): Eintrag[] => liste.split("|").map((text) => ({ text, art }));

const MENUES: { titel: string; eintraege: Eintrag[] }[] = [
  {
    titel: "Datei",
    eintraege: [
      { text: "Öffnen", art: "titel" },
      { text: "Angebote", href: "/alt/angebote" },
      ...aus("Auftragsbestätigung|Arbeitsscheine|Rückmeldung"),
      { text: "Rechnung", href: "/alt/rechnungen" },
      ...aus("Gutschrift|Schadensbearbeitung|Mahn-/OP-Wesen"),
      { text: "Userverwaltung", href: "/nutzer" },
      { text: "Kundenverwaltung", href: "/alt/kunden" },
      ...aus("Lieferantenstammdaten|Lieferantenrechnungen|PIM-Kalender|Disposition|Sonderfunktionen"),
      { text: "", art: "trenner" },
      { text: "Berichte", art: "titel" },
      ...aus("Berichte ändern|Berichte kopieren|Berichte vervollständigen|Berichte konvertieren|Berichten Drucker zuordnen|Druckerprofile"),
      { text: "", art: "trenner" },
      { text: "Daten", art: "titel" },
      ...aus("Datenimport|Reorganisation|Datenbankcheck + Reparatur|Auslagerung alter Datenbestände|ZIP-Komprimierung|Datenbanken an Support senden"),
      { text: "", art: "trenner" },
      { text: "Kommunikation", art: "titel" },
      ...aus("E-Mail erstellen und versenden|Akquisitionstermine an Outlook|Aufträge an Umzugstracking senden|Digitale Karte|BDE/ZME-Abruf|Update-Prüfung"),
    ],
  },
  {
    titel: "Stammdaten",
    eintraege: [
      ...aus("Mandantenwechsel"),
      { text: "Tarife", art: "titel" },
      ...aus("Einzelfahrten|Frachttabelle|Individuelle Tarifstruktur|Übernahmetarif einlesen", "unter"),
      ...aus("Digitale Kartensysteme|Excel-Übertragung|Barcode-Leser|Übersetzung"),
      { text: "", art: "trenner" },
      { text: "Datenbestände pflegen", href: "/neu/stammdaten" },
      ...aus(
        "Akquisiteure|Nebenleistungen|Packmaterialien|Texte/Bausteine|Preisdaten Personal|Umsatzsteuersätze|Standardvorlagen|Vorlagen freie Angebote|Kosten der Vorkalkulation|Lohnarten|Währungen|Verpflegungsmehraufwand|Zimmer und Umzugsgutliste|Feiertage|Länder|Telefonische Checkliste",
        "unter",
      ),
    ],
  },
  {
    titel: "Verwaltung",
    eintraege: [
      ...aus("FiBu-Schnittstelle und -Vorlaufdaten|Buchen ungebuchter Rechnungen und Gutschriften|Packmittelverwaltung|Nachfassliste Angebote|Personalstunden-Erfassung|Versicherungsanmeldung|Personal- und Fahrzeugverwaltung"),
      { text: "", art: "trenner" },
      { text: "Auswertungen", art: "titel" },
      ...aus("Aufträge ohne Rechnung|Kostenrechnung|Stammkundenumsätze|Provisionsabrechnung Akquisiteure|Excel-Export|Archivierungsflag zurücksetzen", "unter"),
    ],
  },
  { titel: "Fenster", eintraege: aus("(Einträge nicht erfasst)") },
  { titel: "Bearbeiten", eintraege: aus("(Einträge nicht erfasst)") },
  { titel: "Leiste", eintraege: aus("(Einträge nicht erfasst)") },
];

/** Menüleiste wie in der Altsoftware. Nicht umgesetzte Einträge sind ausgegraut sichtbar. */
export function Menue() {
  return (
    <ul className="menue" role="menubar" aria-label="Hauptmenü">
      {MENUES.map((m) => (
        <li key={m.titel} role="none">
          <button type="button" role="menuitem" aria-haspopup="true">{m.titel}</button>
          <ul role="menu" aria-label={m.titel}>
            {m.eintraege.map((e, i) =>
              e.art === "trenner" ? (
                <li key={i} className="trenner" role="separator" />
              ) : e.art === "titel" ? (
                <li key={i} className="gruppe-titel" role="none"><span>{e.text}</span></li>
              ) : (
                <li key={i} className={e.art === "unter" ? "unter" : undefined} role="none">
                  {e.href ? (
                    <Link href={e.href} role="menuitem">{e.text}</Link>
                  ) : (
                    <span role="menuitem" aria-disabled="true" title={NICHT_UMGESETZT}>{e.text}</span>
                  )}
                </li>
              ),
            )}
          </ul>
        </li>
      ))}
    </ul>
  );
}
