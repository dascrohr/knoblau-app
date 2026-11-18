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
- **Positionsformel.** `anzahl × einheiten × runde(einzelpreis × (1 + prozent/100), 2)`. Leere Anzahl (oder 0) zählt als 1, leere Einheiten zählen als 0. `netto_summe` = Positionen + Klavier/Flügel/Schwergut, ohne Versicherung, Maut und Generalmarge. Am Altbestand geprüft (`docs/preisformel-befund.md`, `scripts/preis-pruefen.mjs`). Umsetzung: `src/lib/preis.ts`.
- **Status.** Kürzel (`A,S,H,` usw.) werden unverändert gespeichert und angezeigt.
- **Datumswerte.** ISO-Datum; leere oder ungültige Altwerte werden `null`.
- **Keine Felder** für Bankdaten, Kennwörter, API-Schlüssel.
- **Suche.** `suchtext` (kleingeschrieben) mit Trigram-Index auf Angeboten, Kunden und Rechnungen.

## Import-Mapping

Wiederholen: `npm run import` (alles), `npm run import -- --nur-app` (nur `legacy` → `app`), `npm run import -- --nur-legacy`. Prüfen: `node scripts/import/pruefen.mjs`. Code: `scripts/import/` (`legacy.mjs` lädt SQLite 1:1, `sql/*.sql` füllt `app` in Dateireihenfolge).

**Ablauf und Regeln**

- `legacy.<tabelle>`: je SQLite-Tabelle drop + create + insert in einer Transaktion, Spalten kleingeschrieben, `_rowid` = SQLite-rowid, RLS an, keine Policy, keine Grants.
- `app`: Upsert auf `legacy_rowid` bzw. `legacy_key`; geschrieben wird nur, wenn sich eine Zeile tatsächlich geändert hat. Zeilen mit `legacy_rowid is null` (in der App angelegt) werden nie angefasst oder gelöscht.
- Angebote mit `geaendert_von is not null` überspringt der Import komplett (Kopf, Adressen, Positionen, Termine, Checkliste, Umzugsgut, `kunde_id`). Bei allen anderen werden Adressen, Positionen, Termine und Checkliste gelöscht und neu geschrieben.
- Kunden: Stammfelder werden nur überschrieben, solange `geaendert_am = erstellt_am` (in der App unbearbeitet). `anzahl_angebote`, `erstmals`, `letzter` werden immer neu berechnet. **Die App muss beim Speichern eines Kunden `geaendert_am` setzen.**
- Stammdaten (`stamm_*`): nur neue Zeilen werden angelegt (`on conflict do nothing`), in der App gepflegte Werte bleiben erhalten.
- Texte getrimmt, leer → `null`. Datumswerte ISO, ungültig/leer → `null`. Booleans aus 0/1 (leer = false). Zahlen unverändert (0 bleibt 0, leer bleibt `null`).
- Ergänzung `0002_import_ergaenzungen.sql`: `rechnungspositionen.rechnung_id` darf leer sein (88 Positionen zu nicht mehr vorhandenen Rechnungen), neue Spalte `rechnungspositionen.rechnungnr`.
- Preisformel des Altbestands: siehe `docs/preisformel-befund.md` (weicht von der Regel „Positionsformel“ oben ab: Einheiten leer = 0, Anzahl leer/0 = 1, Prozent auf den Einzelpreis mit Rundung, Generalrabatt nicht in `netto_summe`).

**`angebote`** ← `f02_umzug` (alle 8.205 Zeilen, `legacy_rowid` = rowid) + `f02_umzug1` über `ANGEBOTNR`. Bei mehreren `f02_umzug1`-Zeilen je Nummer (13 Nummern) wird die am stärksten befüllte genommen, bei Gleichstand die höchste rowid – die höchste rowid allein ist fast immer die leere Zeile.

| Altfeld | Neufeld | Hinweis |
| --- | --- | --- |
| ANGEBOTNR | angebotnr | |
| ANGDATUM | angebotsdatum, jahr | jahr ersatzweise aus Nummer (220 + JJ + MM + lfd.) |
| STATUS | status | Kürzel unverändert |
| KUNDENNR | kundennr | 0 → null |
| AUFTRAGNR, AUFTRAG_DA | auftragnr, auftragsdatum | |
| SACHBEARB, AKQUISI, HERKUNFT | sachbearbeiter, akquisiteur, herkunft | |
| BEREICH | bereich | |
| VERKEHRART | umzugsart | im Bestand nur 1 Angebot befüllt (Kennziffer, vgl. `zusatz` in `stamm_auswahl`, Liste `umzugsart`) |
| WOHNUNG | wohnung_buero | |
| TELEFON1, TELEFAX1, TELEFON2, TELEFON3 | telefon_auftraggeber, telefax, telefon_beladestelle, telefon_entladestelle | |
| EMAIL | email | |
| – | mobil | keine Quelle im Altbestand |
| BESUCHTAG, BESUCHZEIT, BESUCH_ART | besichtigung_datum, besichtigung_zeit, besichtigung_art | Zeit als Text wie erfasst |
| TERMIN | umzugstermin | Freitext |
| B_GE_TEXT, B_GESCHOSS, B_STUFEN, B_ABTRAGE | b_etage, b_geschosse, b_stufen, b_tragweg | E_* analog |
| B_AUFZUG | b_aussenaufzug | **unsicher** (Zuordnung laut Vorgabe) |
| B_FAHRSTUH | b_aufzug | **unsicher**; Zahl (0/1) |
| B_HVZ | b_hvz | |
| QUADRATMET, QUADRAT_ES (umzug1) | b_wohnflaeche, e_wohnflaeche | |
| KLAVIER, KLAV_ANZ, KLAV_EP | klavier, klavier_anzahl, klavier_preis | FLUEGEL/FLUE_*, SCHWERGUT/SCHW_* analog (SCHW_ANZ → schwergut_kilo) |
| EINZELFAHR | einzelfahrt | |
| ZAHLBEDING | zahlungsbedingung | |
| VOLUMEN, VOLEINHEIT, ERM_ANGABE, GESTELLT, GEWICHT | volumen, volumen_einheit, volumen_ermittlung, gestellt, gewicht | |
| VERSWERT, TRSPVERS | versicherungswert, versicherungsbetrag | |
| ZEITWERT | zeitwert | Kennziffer (0..3), Bedeutung **unsicher** |
| PROMILLE, T_PROMILLE | promille_neuwert, promille_zeitwert | **unsicher**, welche der beiden Neu- bzw. Zeitwert ist |
| UTV_NEU, UTV_WAHL (umzug1) | utv, utv_wahl | Bedeutung **unsicher** |
| V_STEUER | versicherungssteuer | Rohwert |
| WAEHRUNG, WAEHRUNG2 | waehrung, waehrung2 | leer → 'EUR' bei waehrung |
| MWST | ust_satz | leer → 19 |
| MARGE | generalrabatt | Prozent, meist negativ; nicht in netto_summe enthalten |
| KM, AUTOBAHNKM, AUTOBAHNCT | km, autobahn_km, autobahn_ct | |
| AUTOBAHNRE | autobahn_doppelt | **unsicher** (Kennzeichen, im Bestand nur 0/leer) |
| NETTOSUM | netto_summe | |
| MAUT_INANG, MAUT_DOPP, MAUT_IN_FL, MAUT_IN_TL, MAUT_ANH (umzug1) | maut_in_angebot, maut_doppelt, maut_in_freie_leistung, maut_in_transport, maut_anhaenger | |
| MAUT_ANZ, MAUT_ST, MAUT_EP, MAUT_TEXT, MAUTGESAMT, MAUTINHALT, MAUT_KFZ, MAUT_EIGK, MAUT_PROZ | maut_anzahl, maut_einheiten, maut_einzelpreis, maut_text, maut_gesamt, maut_inhalt, maut_fahrzeug, maut_eigenkosten, maut_aufschlag | MAUT_PROZ **unsicher** |
| ZUSATZVB, INFO, PACKARBEIT, SPEZMON, TERMINFREI | vereinbarungen, info, packarbeit, handwerker, termine_frei | |
| TEXTNETTO, TEXTBRUTTO | text_netto, text_brutto | |
| BEZ_DRUCK1..4 | ueberschrift1..4 | |
| USTID | ustid | |
| – | freie_leistung_text | keine Quelle (USCHR_TEXT ist überall leer) |
| – | suchtext | Nummer, Namen/Vornamen/Name1 aller Adressen, Orte, PLZ, Straße Auftraggeber (klein) |
| nicht übernommen | – | KUNU, UPDATE*, NETTO1..5/MWST1..5 (umzug1), ARBNR/RF (umzug1), MAUTWAEHR |

**`angebot_adressen`** ← Suffix n = 1 Auftraggeber, 2 Beladestelle, 3 Entladestelle, 4 `zusatz1`, 5 `zusatz2`; nur wenn ein Feld befüllt ist.

| Altfeld | Neufeld |
| --- | --- |
| ANREDEn, TITELn, VORNAMEn, NAMEn | anrede, titel, vorname, name |
| NAMEn1, NAMEn2 | name1, name2 |
| ZUHAENDENn, STRASSEn, LKZn, PLZn, ORTn, TELEFONn | zuhaenden, strasse, lkz, plz, ort, telefon |
| BEZ_ADR4, BEZ_ADR5 | bezeichnung |

Nicht in jeder Gruppe vorhanden: TITEL5, ZUHAENDEN5, NAME52, LKZ4, LKZ5 fehlen im Altbestand.

**`angebot_positionen`** – Zeile importiert, wenn Text oder Preis ≠ 0 oder Menge ≠ 0.

| Altfeld | bereich / zeile | Neufelder |
| --- | --- | --- |
| BELA_AN/TEXT/ST/EP/M 1..4 | beladen 1..4 | anzahl, text, einheiten, einzelpreis, prozent |
| BEF_AN/TEXT/ST/EP/M 0..4 | befoerdern 0..4 | wie oben |
| ENTLA_AN/TEX/ST/EP/M 1..4 | entladen 1..4 | wie oben |
| NLAN/NLTEXT/NLST/NLEP/NLMARGE 1..15 (umzug1) | nebenleistung 1..15 | wie oben |
| PACK/PACKART/PACKST/PACKEP/PACKM 1..15 (umzug1) | packmaterial 1..15 | text, art, **einheiten** (Stück; `anzahl` bleibt leer), einzelpreis, prozent |
| f02_um_frei: ANZAHL, TEXT, STUECK, EP, MARGE, LEISTUNG, MWST, KONTO, KOSTENSTEL, WAEHRUNG | frei, fortlaufend nach RF | anzahl, text, einheiten, einzelpreis, prozent, beschreibung, ust, konto, kostenstelle, waehrung (SUMME nicht übernommen) |

Bereich `maut` wird vom Import nicht befüllt (Mautangaben stehen im Angebotskopf).

**`angebot_termine`** ← TERMINn → text, TDATn → datum, TERMINn_V → von, TERMINn_B → bis, TERMINn_G → gebucht (n = 1..10, nur befüllte).

**Weitere Tabellen**

| Ziel | Quelle | Zuordnung / Hinweis |
| --- | --- | --- |
| checklistenpunkte | f02_checklist | zeile fortlaufend nach RF (RF je Angebot nicht eindeutig); AUFGABE, ERLEDIGT, IGNORIEREN, DATENTYP, TEXTWERT → wert, VORGABEN, EINTRAGEN. ET_WENN/ET_NACH/ET_TEXT/NURVORGABE nicht übernommen |
| umzugsgut | f02_barcode2 | BELADESTEL → beladestelle, ORGANISAT → organisation, MITARBEIT → mitarbeiter, RE → re, REINHEIT → raumeinheit, ENT_STELLE/ENT_STOCK/ENT_ZIMMER → entladestelle/entlade_etage/entlade_zimmer; Rest namensgleich |
| rechnungen | f02_rechnung | RECHNUNGNR (getrimmt), RECHDAT → rechnungsdatum + jahr, LEISTDATUM (ersatzweise LEISTMONAT) → leistungsdatum, FAELLIG, Adressfelder namensgleich, BETREFF1/2, BETR_TEXT → betreff_text, ENDETEXT, ZAHLBEDING, MARGE → generalrabatt, MWST → ust_satz, NETTO, GESSUMME → gesamtsumme, ACONTO, ACONTO_DAT, GEBUCHT, SACHBEARB, AKQUISI, HERKUNFT, WAEHRUNG, USTID, EMAIL. `angebot_id` über ANGEBOTNR (bei doppelter Nummer niedrigste rowid). Keine Bank-/Debitorfelder |
| rechnungspositionen | f02_rechnun1 | RF → zeile, L_DAT → leistungsdatum, ANZAHL, TEXT, ST → einheiten, EP, MARGE → prozent, MWST → ust, NETTOSUM → netto, KONTO, KOSTENSTEL, INHALT; `rechnung_id` = erste Rechnung mit dieser Nummer; 88 verwaiste mit `rechnung_id = null` |
| arbeitsscheine | f02_arbeit + f02_arbeit1 (ANGEBOTNR + ARBNR, erste Zeile) | ART, ARBDATUM → datum, ARBUHRZEIT → uhrzeit, ARBDATUM2 → datum_bis, ARBUHRZEI2 → uhrzeit_bis, STATUS, PERSONAL, FAHRZEUG, MAT_VERBR → material, SONST → sonstiges, ANLAGE, NAME1, NAME2, STRASSE, PLZ, ORT, TELEFON; aus arbeit1: VOLUMEN, KILOMETER, LKW_ANZ, FAHRER, TRAEGER, PACKER, SCHREINER, SONST_PER, LKW_KZ1..3. Die Ankreuz-/Mengenfelder (N1..15, L1..4, F0..4, E1..4, PS*, T*, NL*, PACK*) nicht übernommen |
| arbeitsschein_positionen | f02_arbeit2 | RF → zeile, ANZAHL, TEXT, STUECK → einheiten, EP, MARGE → prozent, MWST → ust, SUMME, LEISTUNG |
| kasse | f02_kasse | JJMM → periode, BELEG, DATUM, EINGANG, AUSGANG, TEXT, LONGTEXT → langtext, KONTO, KOSTENSTEL, MWST → ust, AUFTRAGNR, GEBUCHT. `f02__kasse` (5.556 Zeilen ab 2009, **unsicher**: vermutlich zweite/alte Kasse) nur in `legacy` |
| halteverbotszonen | f02_platzda | ADRESSART, STRASSE, PLZ, ORT, LAENGE, VON_DAT/BIS_DAT, VON_UHR/BIS_UHR, ANFRAGEDAT, GUELTIGBIS, ANFRAGEERG, BUCHDAT, BUCHERGEB, ORDER_ID |
| kunden (firma) | f02_um_stamm | legacy_key `F:<KUNDENNR>`; NAME1 → name, NAME2 → name1, NAME3 → name2, TELEFON, TELEFON2, TELEFON3 → mobil (**unsicher**), TELEFAX, E_MAIL, INTERNET, USTID, ZAHLBEDING, INFO, ERSTMALS, LETZTER, UMSATZ, UMSATZVJ, AUSBLENDEN → aktiv. Keine Bank-, Debitor-, Kredit- oder Mahnfelder |
| kunden (privat) | Auftraggeber-Adressen | legacy_key `P:` + md5(name \| vorname \| plz \| strasse, klein, Leerzeichen normalisiert; ohne NAME ersatzweise NAME1); Stammdaten aus dem neuesten Angebot, telefon/email aus dem neuesten Angebot mit Wert. Angebote mit KUNDENNR > 0 hängen am Firmenkunden. Angebote ohne Auftraggeber-Namen bleiben ohne Kunde |
| stamm_leistungen | stamm_nebleist | SUCH → suchbegriff, NLTEXT1 → text, TEXT → beschreibung, NLAN1, NLST1 → einheiten, NLEP1, NLMARGE1 → prozent, EIGEN_KOST, MWST, KONTO, KOSTENSTEL |
| stamm_packmaterial | stamm_packmat | SUCH, PACK1 → text, TEXT → beschreibung, PACKART1 → art, PACKST1 → einheiten, PACKEP1, PACKM1 → prozent, EINKAUF → einkaufspreis, MWST, KONTO, KOSTENSTEL |
| stamm_umzugsgut | stamm_barcstam | ARTNR, GEGENSTAND, ZIMMER, KENNUNG, KENNTEXT, RE, PACKMITTEL, MONTAGE..AUSLADEN |
| stamm_zimmer | stamm_zimmer | KURZ, ZIMMER, ART, BUTTON → knopf |
| stamm_checkliste | stamm_cl_vorlage | AUFGABE, DATENTYP, VORGABEN, EINTRAGEN, RF → sortierung |
| stamm_fahrzeuge | stamm_fahrzeug | Quelle leer; Zuordnung vorbereitet (KFZKENN, KFZTYPE, FABRIKAT, NUTZLAST, GESGEWICHT, KFZMWM → ladevolumen **unsicher**, ACHSEN, NLAENGE/NBREITE/NHOEHE, KOST_KM1/KOST_STD1/KOST_TAG) |
| stamm_textbausteine | – | nichts übernommen: `stamm_texte` leer; `f02_ausdruck`/`stamm_ausdruck` sind Verweise auf Druckformulare, `stamm_buchtext` Buchungstexte – keine Textbausteine |
| stamm_auswahl | diverse | `herkunft` ← stamm_herkunft; `umzugsart` ← f02_umzugsart/stamm_umzugsart (wert = Bezeichnung, zusatz = Kennziffer 1..9); `mwst` ← tatsächlich benutzte Sätze; `zahlungsbedingung`, `sachbearbeiter`, `besichtigung_art`, `volumen_ermittlung` ← Werte der Angebote mit ≥ 5 Vorkommen, sortiert nach Häufigkeit |

legacy_key der Stammdaten: `<quelltabelle>:<rowid>` (z. B. `nebleist:3`).
