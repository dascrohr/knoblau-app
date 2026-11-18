# Datenmodell

Verbindliche Quelle für Tabellen und Spalten ist `supabase/migrations/0001_grundschema.sql`. Dieses Dokument erklärt Aufbau und Regeln.

## Schemata

| Schema | Zweck | Zugriff |
| --- | --- | --- |
| `legacy` | Rohdaten 1:1 aus der Altsoftware (eine Tabelle je SQLite-Tabelle, alle Spalten als Text/Zahl wie geliefert, plus `_rowid`) | nur Import-Skript (DB-Verbindung); nicht in der API, RLS an, keine Policy |
| `app` | Sauberes Arbeitsschema, das beide Oberflächen lesen und schreiben | nur eingeloggte, aktive Nutzer (RLS-Policy `eingeloggt_alles`); `anon` hat kein Recht auf das Schema |

## Tabellen in `app`

| Tabelle | Inhalt | Quelle |
| --- | --- | --- |
| `profile` | Nutzer mit Rolle `admin` / `nutzer` | Supabase Auth |
| `angebote` | Ein Umzug: Kopf, Besichtigung, Versicherung, Maut, Texte | `f02_umzug` + `f02_umzug1` |
| `angebot_adressen` | Bis zu 5 Adressen je Angebot: `auftraggeber`, `beladestelle`, `entladestelle`, `zusatz1`, `zusatz2` | Feldsuffix 1..5 in `f02_umzug` |
| `angebot_positionen` | Positionen mit `bereich`: `beladen`, `befoerdern`, `entladen`, `nebenleistung`, `packmaterial`, `frei`, `maut` | Spaltengruppen `BELA_*1..4`, `BEF_*0..4`, `ENTLA_*1..4`, `NL*1..15`, `PACK*1..15`, `f02_um_frei` |
| `angebot_termine` | Termin 1..10 | `TERMIN1..10`, `TDAT*`, `TERMIN*_V/_B/_G` |
| `checklistenpunkte` | Checkliste je Angebot | `f02_checklist` |
| `umzugsgut` | Inventar je Angebot | `f02_barcode2` |
| `rechnungen`, `rechnungspositionen` | Rechnungen (nur lesen) | `f02_rechnung`, `f02_rechnun1` |
| `arbeitsscheine`, `arbeitsschein_positionen` | Arbeitsscheine | `f02_arbeit`, `f02_arbeit1`, `f02_arbeit2` |
| `kasse` | Kassenbuch | `f02_kasse` |
| `halteverbotszonen` | HVZ-Anfragen | `f02_platzda` |
| `kunden` | Firmenkunden (`art = 'firma'`) und Privatkunden (`art = 'privat'`, aus den Auftraggeber-Adressen der Angebote zusammengeführt) | `f02_um_stamm`, `f02_umzug` |
| `stamm_leistungen`, `stamm_packmaterial`, `stamm_umzugsgut`, `stamm_zimmer`, `stamm_fahrzeuge`, `stamm_checkliste`, `stamm_textbausteine`, `stamm_auswahl` | Pflegbare Stammdaten, jeweils mit `aktiv` und `sortierung` | `stamm_nebleist`, `stamm_packmat`, `stamm_barcstam`, `stamm_zimmer`, `stamm_fahrzeug`, `stamm_cl_vorlage`, `stamm_texte`, `stamm_herkunft`, `stamm_umzugsart`, `stamm_mwst` |

## Regeln

- **Schlüssel.** Jede Tabelle hat `id` (bigint). Verknüpft wird über `angebot_id` bzw. `rechnung_id`. `angebotnr` und `rechnungnr` bleiben als Text erhalten, sind im Altbestand aber nicht eindeutig (60 Angebote ohne Nummer, 1 doppelte Nummer), deshalb kein Unique-Index.
- **Wiederholbarer Import.** Importierte Zeilen tragen `legacy_rowid` (rowid der SQLite-Zeile) bzw. `legacy_key`. Der Import schreibt per Upsert auf diesen Schlüssel. In der App neu angelegte Zeilen haben `legacy_rowid = null` und werden vom Import nie angefasst.
- **Positionen.** Leere Spaltengruppen werden nicht importiert. Eine Zeile ohne Preis, aber mit Text, bleibt als Hinweistext erhalten. `zeile` ist die Position in der Altmaske (Befördern 0..4, sonst ab 1).
- **Positionsformel.** `anzahl × einheiten × einzelpreis`, danach `+/- prozent`. Fehlende Anzahl oder Einheiten zählen als 1, wenn ein Einzelpreis vorhanden ist. Umsetzung: `src/lib/preis.ts`.
- **Status.** Kürzel (`A,S,H,` usw.) werden unverändert gespeichert und angezeigt.
- **Datumswerte.** ISO-Datum; leere oder ungültige Altwerte werden `null`.
- **Keine Felder** für Bankdaten, Kennwörter, API-Schlüssel.
- **Suche.** `suchtext` (kleingeschrieben) mit Trigram-Index auf Angeboten, Kunden und Rechnungen.
