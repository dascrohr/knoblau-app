# Design-System der Neuansicht

Gilt für alles unter `/neu`. Styles stehen in `src/app/neu/neu.css` und wirken nur innerhalb der Wurzelklasse `.neu` (setzt das Neu-Layout). Bausteine: `src/components/neu/ui.tsx`.

## Marke

Quelle: https://umzuege-transporte-koeln.de/ (Logo, Farben und Schrift der Website).

| Was | Wert |
| --- | --- |
| Logo | `public/marke/knoblau-sohn-logo.png` (370 × 220, transparent; nur auf hellem Grund verwenden) |
| Favicon | `public/marke/knoblau-sohn-favicon.png` |
| Schrift Überschriften | Poppins 500/600/700 (`next/font/google`, lokal ausgeliefert), Variable `--k-schrift-titel` |
| Schrift Fließtext, Felder | Systemschrift, Variable `--k-schrift` |

## Farben (CSS-Variablen)

| Variable | Wert | Einsatz |
| --- | --- | --- |
| `--k-marke` | `#e1001a` | Primärknopf, aktive Navigation (weißer Text darauf: 4,9:1) |
| `--k-marke-dunkel` | `#c00008` | Hover, Links |
| `--k-marke-hell` | `#fdecee` | Fläche der aktiven Navigation |
| `--k-schwarz` | `#282828` | Überschriften, aktiver Abschnitt |
| `--k-grund` | `#f4f4f4` | Seitenhintergrund |
| `--k-flaeche`, `--k-flaeche-2`, `--k-flaeche-3` | `#ffffff`, `#f8f8f8`, `#ebebeb` | Karten, Tabellenkopf, Trenner |
| `--k-text`, `--k-text-2`, `--k-text-3` | `#1f1f1f`, `#505050`, `#6b6b6b` | Text, Nebentext, leiser Text (alle ≥ 4,5:1 auf Weiß) |
| `--k-rahmen`, `--k-rahmen-stark` | `#dadada`, `#a7a7a7` | Kartenrahmen, Feldrahmen |
| `--k-erfolg` / `-hell` | `#17693a` / `#e6f4ea` | Gespeichert, erledigt |
| `--k-warnung` / `-hell` | `#8a5a00` / `#fff4d6` | Ungespeicherte Änderungen |
| `--k-fehler` / `-hell` | `#b00014` / `#fdecee` | Fehler, Löschen |
| `--k-info` / `-hell` | `#1d4f8c` / `#e8f0fb` | Hinweise, Fokus |

## Typo, Abstände, Form

| Gruppe | Variablen |
| --- | --- |
| Schriftgrößen | `--k-text-xs` 12 px, `-s` 13 px, `-m` 14 px (Standard), `-l` 16 px, `-xl` 20 px, `-xxl` 24 px |
| Abstände (4er-Raster) | `--k-a1` 4 px, `--k-a2` 8 px, `--k-a3` 12 px, `--k-a4` 16 px, `--k-a5` 24 px, `--k-a6` 32 px |
| Radius | `--k-radius` 6 px (Felder, Knöpfe), `--k-radius-gross` 10 px (Karten, Dialoge) |
| Schatten | `--k-schatten` (Karten), `--k-schatten-gross` (Dialoge, Menü) |
| Fokus | `--k-fokus`: 2 px weiß + 2 px blau, auf allen bedienbaren Elementen sichtbar |
| Maße | `--k-kopf-hoehe` 56 px, `--k-nav-breite` 224 px, `--k-feld-hoehe` 36 px |

Zahlen stehen rechtsbündig mit Tabellenziffern (`.k-zahl`, in Tabellen `.k-rechts`).

## Hilfsklassen

| Klasse | Zweck |
| --- | --- |
| `k-raster` + Kinder `k-s2` … `k-s10` | 12-Spalten-Raster für Formularfelder; ohne `k-s*` volle Breite, unter 640 px zwei Spalten bzw. volle Breite |
| `k-untertitel` | Zwischenüberschrift in einer Karte |
| `k-link` | Link im Fließtext/Tabelle |
| `k-leise` | Nebentext |
| `k-eingabe`, `k-eingabe-zahl` | Optik eines Eingabefelds für eigene `<input>`; jedes `input`/`select`/`textarea` in einem `.k-feld` bekommt sie automatisch |
| `k-dialog` | Optik für `<dialog>` |

## Bausteine (`@/components/neu/ui`)

Alle benannt exportiert. Standard-HTML-Attribute (`name`, `disabled`, `placeholder`, `required` …) werden an das jeweilige Element durchgereicht.

| Baustein | Props | Hinweise |
| --- | --- | --- |
| `Knopf` | `art?: "primaer" \| "sekundaer" \| "still" \| "gefahr"` (Standard `sekundaer`), `klein?`, `href?`, Button-Attribute | Mit `href` ein Link in Knopfoptik. `type` ist standardmäßig `button` |
| `Feld` | `label`, `wert?: string \| null`, `onWert?: (string \| null) => void`, `fehler?`, `hinweis?`, `vorschlaege?: string[]`, `labelVersteckt?`, Input-Attribute | Leere Eingabe = `null`. `vorschlaege` = frei überschreibbare Vorschlagsliste. Ohne `wert` ungesteuert (`name`, `defaultValue`) |
| `Zahlfeld` | `label`, `wert: number \| null`, `onWert: (number \| null) => void`, `nachkomma?: number`, `einheit?: string`, `fehler?`, `hinweis?`, `labelVersteckt?` | Deutsche Eingabe („1.225,50“). Rohtext beim Tippen, Wert laufend über `parseZahl`, Formatierung beim Verlassen. `nachkomma={2}` für Preise |
| `ZahlEingabe` | wie `Zahlfeld` ohne `label`/`einheit` | Nur das Eingabefeld, für Tabellenzellen; `aria-label` setzen |
| `Textbereich` | `label`, `wert?`, `onWert?`, `rows?` (4), `fehler?`, `hinweis?` | Mehrzeiliger Text |
| `Auswahl` | `label`, `optionen: (string \| {wert, text})[]`, `wert?`, `onWert?`, `leer?: string` (Text der leeren Option), `fehler?`, `hinweis?` | Feste Liste. Ein gespeicherter Wert außerhalb der Liste bleibt wählbar |
| `Schalter` | `label`, `an: boolean`, `onAn?: (boolean) => void` | Checkbox mit Text |
| `FeldRahmen` | `label`, `htmlFor`, `fehler?`, `hinweis?`, `children` | Label + Fehlertext um eine eigene Eingabe |
| `Karte` | `titel?`, `aktionen?`, `randlos?`, `id?`, `className?`, `children` | Abschnitt mit Titelzeile. `randlos` für Tabellen bis zum Rand |
| `Tabelle` | `spalten: (string \| {titel, rechts?, breite?, versteckt?})[]`, `children` (`<tr>`), `fuss?` (`<tr>`), `beschriftung?`, `eingabe?` | Zahlzellen mit `className="k-rechts"`. `eingabe` = dichte Zeilen für Eingabefelder |
| `Abzeichen` | `art?: "neutral" \| "erfolg" \| "warnung" \| "fehler" \| "info" \| "marke"`, `children` | Etikett, z. B. Statuskürzel (unverändert anzeigen) |
| `Seitenkopf` | `titel`, `unter?`, `aktionen?` | Seitenüberschrift (h1) mit Knöpfen rechts |
| `Leerzustand` | `titel`, `text?`, `aktion?` | Wenn eine Liste leer ist |
| `Blaettern` | `seite`, `seiten`, `gesamt`, `pfad`, `parameter?: Record<string, string \| number \| null>`, `einheit?` | Trefferzahl + Zurück/Weiter als Links (`?seite=`) |
| `Hinweis` | `art?: "info" \| "erfolg" \| "warnung" \| "fehler"`, `titel?`, `children` | Meldungskasten; Fehler/Warnung als `role="alert"` |

Weitere Bausteine: `Suchleiste` (`@/components/neu/suchleiste`: `q`, `platzhalter`, `filter?: {name, label, leer, optionen}[]`, `werte?`) schreibt Suche und Filter entprellt als GET-Parameter in die Adresse.

## Beispiel

```tsx
import { Karte, Feld, Zahlfeld, Knopf } from "@/components/neu/ui";

<Karte titel="Fahrzeug" aktionen={<Knopf art="primaer" type="submit">Speichern</Knopf>}>
  <div className="k-raster">
    <Feld className="k-s6" label="Kennzeichen" wert={kennzeichen} onWert={setKennzeichen} />
    <Zahlfeld className="k-s3" label="Kosten je km" einheit="€" nachkomma={2} wert={kosten} onWert={setKosten} />
  </div>
</Karte>
```

## Layout

- Navigation links (Logo, Angebote, Kunden, Rechnungen, Stammdaten, für Admins Nutzer); unter 1024 px als einklappbares Menü.
- Kopfzeile: Umschalter Altansicht/Neuansicht, Nutzername, Abmelden.
- Angebotsmaske: Abschnittsleiste oben (sticky), Summen und Speichern rechts (sticky), unter 1280 px als Fußleiste.
