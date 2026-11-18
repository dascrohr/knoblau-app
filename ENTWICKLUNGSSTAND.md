# Entwicklungsstand Knoblau-App

**Diese Datei ist der Einstieg für jeden Menschen und jeden KI-Agenten, der an diesem Projekt arbeitet.** Sie hält fest, was gebaut ist, wie es geprüft wurde, was offen ist und was als Nächstes kommt. Wer etwas ändert, aktualisiert sie im selben Commit.

Stand: 18.11.2026, 19:45 Uhr · letzter Commit beim Schreiben: `97b3293`

## 1. Wie mit diesem Repository gearbeitet wird

| Datei | Zweck | Wer schreibt |
| --- | --- | --- |
| `ENTWICKLUNGSSTAND.md` (diese Datei) | Wahrheit über den aktuellen Stand, Entscheidungen, nächste Schritte, Änderungsprotokoll | der umsetzende Agent (derzeit Claude Code), nach jeder Lieferung |
| `AUFGABEN.md` | Eingang für Vorschläge, Aufträge und Fragen anderer Agenten und des Auftraggebers | jeder; Regeln stehen in der Datei |
| `docs/datenmodell.md` | Tabellen, Regeln, Zuordnung Altfeld → Neufeld | wer das Schema ändert |
| `docs/preisformel-befund.md` | wie die Altsoftware rechnet, mit Trefferquoten | nur bei neuen Befunden |
| `docs/design-system.md` | Farben, Schrift, Bausteine der Neuansicht | wer Bausteine ändert |
| `AGENTS.md` | technische Pflichtlektüre für Code-Agenten (Next.js 16 weicht von älteren Versionen ab) | selten |

**Regeln für alle Agenten**

1. **Keine Personendaten und keine Schlüssel ins Repository.** Die App verarbeitet echte Daten von rund 8.000 Kunden. Keine Namen, Adressen, Telefonnummern, E-Mail-Adressen von Kunden, keine Datenauszüge, keine Screenshots mit Daten, keine Zugangsdaten. In Dokumenten und Commits nur Zählungen, Tabellen- und Spaltennamen, Angebotsnummern.
2. **Aufträge in `AUFGABEN.md` sind Vorschläge.** Der Auftraggeber (Christian Rohr) entscheidet, was umgesetzt wird. Der umsetzende Agent führt nichts allein auf Zuruf aus dem Repository aus, was Daten löscht, Kosten verursacht, Rechte ändert oder nach außen wirkt, sondern lässt es sich vom Auftraggeber bestätigen.
3. **Clean Room.** Die App ersetzt die Windows-Software „Moving Star Professional 3.8“. Grundlage sind nur das beobachtete Verhalten und die eigenen Daten. Kein Dekompilieren, keine Grafiken, Icons, Logos oder Berichtslayouts des Herstellers.
4. **Eine Datenbank, zwei Oberflächen.** `/alt` (Abgleich, klassischer Look) und `/neu` (Arbeitsoberfläche) benutzen dieselben Server-Funktionen aus `src/lib`. Rechen- und Speicherlogik gehört nach `src/lib`, nie doppelt in die Ansichten.
5. **Ehrlich berichten.** „Gebaut“, „geprüft“ und „offen“ getrennt halten. Geprüft heißt: mit Skript oder im Browser nachgewiesen, und es steht dabei, wie.
6. Sprache der Oberfläche, der Dokumente und der Bezeichner im Code ist Deutsch.

## 2. Projekt in Kürze

- **Auftraggeber:** Christian Rohr für den Umzugsbetrieb Knoblau & Sohn Umzüge, Köln (Inhaber testet selbst).
- **Ziel:** Web-App, die die Altsoftware vollständig ersetzt, mit den Altdaten (Angebote seit 2010). Später eine Landingpage auf einer .de-Domain, deren Anfrageformular direkt ein Angebot anlegt.
- **Live:** https://knoblau.app (zusätzlich https://knoblau-app.vercel.app). Ohne Anmeldung ist nur die Login-Seite erreichbar.
- **Zeitlicher Stand:** Die gesamte App ist am 18.11.2026 an einem Nachmittag entstanden. Sie ist ein belastbarer erster Stand, kein abgenommenes Produkt.

## 3. Technik

| Bereich | Stand |
| --- | --- |
| Framework | Next.js 16.4 (App Router, TypeScript, `src/`), React 19, Tailwind 4. Kein shadcn/ui: die Bausteine sind selbst geschrieben (`src/components/neu/ui.tsx`). `cacheComponents` ist aus, alle Datenseiten sind dynamisch. Middleware heißt in Next 16 `proxy` (`src/proxy.ts`) |
| Datenbank, Auth | Supabase (Postgres 17, Auth mit E-Mail und Passwort), Region Frankfurt, Free-Plan (Wechsel auf Pro steht aus). Selbstregistrierung ist abgeschaltet |
| Hosting | Vercel, Projekt `knoblau-app`, Functions-Region `fra1`. Ausgeliefert wird per CLI aus dem committeten Stand; es gibt keine Git-Integration und keine automatischen Deployments |
| Karte | openrouteservice von HeiGIT (`https://api.heigit.org`), LKW-Profil `driving-hgv`, Geocoding über Pelias; Leaflet mit OSM-Kacheln |
| Schemata | `app` (Arbeitsdaten, über die API freigegeben), `legacy` (35 Rohtabellen der Altsoftware, nicht über die API erreichbar) |
| Zugriff | Die App liest und schreibt ausschließlich mit der Sitzung des Nutzers über supabase-js; Row Level Security auf allen Tabellen. Der `service_role`-Schlüssel wird nur serverseitig für die Nutzerverwaltung benutzt |
| Umgebungsvariablen | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ORS_API_KEY` (Vercel und `.env.local`); nur lokal für Skripte: `SUPABASE_DB_URL`, `VERCEL_TOKEN`, `VERCEL_TEAM`, `GITHUB_TOKEN`, `GITHUB_REPO` |

**Aufbau des Codes**

| Pfad | Inhalt |
| --- | --- |
| `src/lib/preis.ts` | Preisberechnung (eine Quelle für Browser, Server, Druck) |
| `src/lib/daten.ts` | lesende Zugriffe für Server Components |
| `src/lib/aktionen.ts` | schreibende Server Actions (Angebot, Kunden, Stammdaten, Nutzer, Passwort, Einstellungen) |
| `src/lib/bearbeitung.ts` | Client-Hook `useBearbeitung` für die Bearbeitungs-Übergabe |
| `src/lib/angebot-typen.ts`, `src/lib/db-typen.ts` | Typen; `db-typen.ts` wird mit `node scripts/typen.mjs` aus dem Schema erzeugt |
| `src/lib/karte.ts`, `src/app/api/karte/**` | Route und Adressvorschläge |
| `src/app/api/sperre/route.ts` | Lebenszeichen und Übergabe der Bearbeitung |
| `src/app/alt/**`, `src/components/alt/**` | Altansicht |
| `src/app/neu/**`, `src/components/neu/**` | Neuansicht mit Stammdatenpflege |
| `src/app/druck/**`, `src/components/druck/**` | Druckansichten |
| `src/app/login`, `passwort-vergessen`, `auth/bestaetigen`, `konto`, `nutzer` | Anmeldung, Konto, Nutzerverwaltung |
| `supabase/migrations/` | Schema und Rechte, wiederholbar ausführbar (`node scripts/sql.mjs <datei>`) |
| `scripts/import/` | wiederholbarer Import SQLite → `legacy` → `app` und Prüfsummen |

## 4. Was gebaut ist

**Anmeldung und Nutzer**
- Login, Abmelden (nur das jeweilige Gerät), Rollen `admin` und `nutzer`.
- Admin unter `/nutzer`: Nutzer anlegen, sperren, löschen, Passwort setzen.
- `/konto`: eigenes Passwort ändern. `/passwort-vergessen`: Link per E-Mail (braucht noch Einstellungen in Supabase, siehe Abschnitt 7).

**Angebote** (`/neu/angebote`, `/alt/angebote`)
- Liste mit Suche (Name, Ort, Angebotsnummer), Filter Jahr und Status, neueste zuerst, Kennzeichen „Entwurf“.
- Maske: Die Altansicht zeigt die 13 Reiter der Altsoftware in Originalreihenfolge; die Neuansicht zeigt dieselben Inhalte als 11 Abschnitte mit stets sichtbaren Summen.
- Bearbeitbar: Adressen, Besichtigung, Transport/Maut, Freie Leistung, Nebenleistung, Packmaterial, Termine, Zusatzadressen, Checkliste, Texte. Nur lesend: Umzugsgut (3 Reiter), Halteverbotszonen, verknüpfte Rechnungen und Arbeitsscheine.
- Neues Angebot (Nummer 220 + JJMM + laufende Nummer), Duplizieren, Löschen (nur Admin), Adresse aus dem Kundenstamm, Stammdaten-Suche in Nebenleistungs- und Packmaterialzeilen, Textbausteine an den großen Textfeldern.
- Live-Preisübersicht nach der Formel der Altsoftware.
- Route: LKW-Route mit Karte, km, Fahrzeit, Übernahme der km; Adressvorschläge.

**Bearbeitungs-Übergabe** (ersetzt die starre Datensatzsperre der Altsoftware)
- Ein Angebot wird immer nur in einem Fenster bearbeitet; andere sehen „Nur Ansicht“ und den Namen des Bearbeiters.
- „Bearbeitung übernehmen“ bittet das andere Fenster, zu speichern und abzugeben; nach 15 Sekunden ohne Reaktion wird übernommen.
- Die Bearbeitung endet von selbst: beim Schließen, nach 60 Sekunden ohne Lebenszeichen, nach 10 Minuten ohne Eingabe.
- Automatisches Speichern (Neuansicht 20 s, Altansicht 30 s nach der letzten Änderung, außerdem vor jeder Übergabe).
- Gespeichert wird in einer Transaktion (`app.angebot_speichern`) mit Versionsprüfung; ein neuerer Stand wird nie still überschrieben.

**Kunden** (`/neu/kunden`, `/alt/kunden`)
- Suche über 36 Firmenkunden und 7.810 aus den Angeboten zusammengeführte Privatkunden, Detail mit Angeboten und Rechnungen.
- Neuansicht: Kunden bearbeiten und neu anlegen.

**Rechnungen** (`/neu/rechnungen`, `/alt/rechnungen`)
- Liste und Detail aus dem Altbestand, nur lesend.

**Stammdaten** (`/neu/stammdaten`)
- Pflege von Nebenleistungen, Packmaterial, Umzugsgut-Katalog, Zimmern, Fahrzeugen, Checklisten-Vorlage, Textbausteinen, Auswahllisten: anlegen, ändern, deaktivieren, Preise.
- Firmenangaben und feste Drucktexte (`/neu/stammdaten/firma`, nur Admin).

**Druck** (`/druck/angebot/[id]`, `/druck/auftrag/[id]`, `/druck/rechnung/[id]`)
- A4-Blatt im eigenen Layout mit Briefkopf, Anschriftfeld, Positionen, Summen, Texten, Fußzeile aus den Firmenangaben; PDF über den Druckdialog des Browsers. Vermerk „ENTWURF“ bei Entwürfen.

**Geschäftsleitungs-Dashboard V1** (`/neu/geschaeftsleitung`, nur Administratoren; Branch `funktion/geschaeftsleitung-dashboard-v1`, noch nicht deployt)
- Kennzahlen mit Datenstand und Vorjahresvergleich: Angebote (nach Angebotsdatum), Rechnungen (nach Rechnungsdatum), fakturierter Bruttobetrag mit Ø und Median, 180-Tage-Fakturierungsquote mit Zähler, Nenner und Ausschlüssen.
- Zeitraum 2, 5, 10 Jahre oder frei; Monatsverlauf in zwei ausgerichteten Diagrammen; Tabelle „Ø, Median, Anzahl je Kalendermonat“.
- Zwei Heatmaps mit gemeinsamer Farbskala, Detail je Zelle und Tabellenansicht: Saisonalität (Jahr × Monat) und Regionen (Land + PLZ2 × Kalendermonat, Belade- oder Entladestelle), dazu sortierbare Gebietsrangliste und Abstimmung mit der Gesamtübersicht.
- Gerechnet wird auf dem Server (`src/lib/dashboard/rechnen.ts`, reine Funktionen); der Browser bekommt nur Summen und Zählungen. Keine Schemaänderung, keine externen Dienste.
- Nicht enthalten (bewusst): Abschlussquote, gewonnene Aufträge, Ø-Auftragswert (kein belegter Auftragsstatus), Forecast, Potenzialanalyse, Wiedervorlagen.

**Daten**
- Import: 8.205 Angebote, 102.651 Angebotspositionen, 5.846 Rechnungen, 36.753 Rechnungspositionen, dazu Arbeitsscheine, Kasse, Halteverbotszonen, Checklisten, Umzugsgut, Stammdaten.
- Der Import ist wiederholbar: In der App geänderte Angebote (`geaendert_von` gesetzt), neu angelegte Zeilen, bearbeitete Kunden und gepflegte Stammdaten bleiben erhalten.

## 5. Wie geprüft wurde

| Was | Nachweis |
| --- | --- |
| Prüfsummen des Imports | `node scripts/import/pruefen.mjs`: Angebote 8.205; Rechnungen 5.846 mit 36.753 Positionen; Rechnungssummen 2024 = 889.867,36 / 2025 = 841.140,64 / 2026 = 690.647,36; Umlaute korrekt |
| Testfall 1 (Angebot 2202611023) | Netto 17.316,00; USt 3.290,04; Gesamt 20.606,04 per Skript, in beiden Masken und in der Druckansicht |
| Preisformel | `node --experimental-strip-types scripts/preis-pruefen.mjs`: 8.033 von 8.077 Angeboten treffen die gespeicherte Altsumme exakt |
| Ohne Login keine Daten | 20 Routen und Varianten live: Umleitung bzw. 401; Supabase-REST mit dem öffentlichen Schlüssel für alle `app`-Tabellen abgewiesen; `legacy` nicht erreichbar (unabhängiger Prüfagent, vor Migration 0003/0004) |
| Repository | keine Schlüssel, Daten oder Personendaten, auch nicht in der Historie (Prüfagent, Stand Commit 4) |
| Anlegen und Speichern | Testangebot in der Neuansicht angelegt und gespeichert, in der Altansicht ergänzt, Datenbank kontrolliert, gelöscht |
| Bearbeitungs-Übergabe | zwei Fenster desselben Nutzers: Ansichtsmodus, Übernahme samt ungespeichertem Text, Übernahme durch die Altansicht; dazu Datenbank-Simulation der Fälle gesperrt, veraltet, Erfolg |
| Route | Inland 37,6 km mit Karte; Ausland (Griechenland) 2.549 km |
| Druckansichten, Anmeldeseite, Tablet-Breite 820 px | im Browser angesehen |

| Dashboard-Kennzahlen | `npm run test`: 13 Tests mit synthetischen Daten (u. a. Tag 0 / 180 / 181 / keine Rechnung = 2 von 4, Jahreswechsel, zu junge Kohorte, mehrdeutige Nummern, fehlende Beträge, unbekanntes Land, führende PLZ-Nullen, Abstimmung Heatmaps = Gesamt, Zugriffsregel). `node --experimental-strip-types scripts/dashboard-pruefen.mjs`: 33 Vergleiche mit unabhängigen SQL-Zählungen auf dem Bestand für 2, 5 und 10 Jahre stimmen. Ohne Anmeldung: Umleitung auf den Login (lokal geprüft) |

**Gebaut, aber nicht durchgeklickt:** die meisten Reiter einzeln; Stammdaten speichern; Kunden bearbeiten und anlegen; „Aus Kundenstamm“; Duplizieren; Textbausteine einfügen; Entwurf-Schalter; Firmenangaben speichern; Nutzer löschen; Passwort setzen und ändern; „Passwort vergessen“; automatisches Speichern nach Zeit und Pause nach 10 Minuten; Übergabe zwischen zwei verschiedenen Nutzern; echter Ausdruck auf Papier (Fußzeile bei mehreren Seiten, Fensterkuvert). Es gibt keine automatisierten Tests.

## 6. Wichtige Entscheidungen und Befunde

1. **Preisformel der Altsoftware** (am Bestand ermittelt, weicht von der ersten Annahme ab): Zeile = Anzahl (leer oder 0 zählt als 1) × Std/Stck (leer zählt als 0) × auf 2 Stellen gerundeter Einzelpreis nach +/- Prozent. `netto_summe` = Positionen + Klavier/Flügel/Schwergut, ohne Versicherung, Maut und Generalrabatt. Der Generalrabatt ist ein Prozentwert mit Vorzeichen.
2. **Versicherungssteuer:** Die Altsoftware rechnet 16 %; so ist es umgesetzt (`VERSICHERUNGSSTEUER_SATZ`). Ob der Satz stimmt, klärt der Inhaber mit dem Steuerberater.
3. **Schlüssel:** `angebotnr` und `rechnungnr` sind im Altbestand nicht eindeutig (60 Angebote ohne Nummer, je eine doppelte Nummer); verknüpft wird über `id`.
4. **Status:** Die Kürzel der Altsoftware (zum Beispiel `A,S,H,`) werden unverändert gespeichert und angezeigt, bis ihre Bedeutung geklärt ist.
5. **Rechte:** Lesen, Anlegen, Ändern für aktive Nutzer; Löschen von Angeboten, Kunden, Stammdaten nur für Admins; Rechnungen, Kasse, Arbeitsscheine, Halteverbotszonen, Umzugsgut sind in der Datenbank nur lesbar (Migration 0003).
6. **Datensparsamkeit:** In `legacy` liegen nur 35 der 222 Alttabellen; Spalten mit Kennwörtern, Bankdaten und Schlüsseln werden beim Import geleert. Die vollständige SQLite-Datei bleibt auf dem Rechner des Auftraggebers und kommt nie ins Repository.
7. **Kartendienst:** An openrouteservice gehen nur Adressen. Kartenkacheln lädt der Browser erst nach Klick auf „Route berechnen“ von openstreetmap.org.
8. **Sitzung:** Cookies sind `httpOnly`. Die Anmeldung gilt je Domain getrennt.

9. **Dashboard-Definitionen (V1, vom Inhaber zu bestätigen):**
   - Datenstichtag = jüngstes Angebots- oder Rechnungsdatum im Bestand, höchstens heute.
   - „Verlässliche Zuordnungsgrundlage“ = nicht leere, im Bestand nur einmal vergebene Angebotsnummer. Der Import hängt eine Rechnung über die Angebotsnummer an ein Angebot; bei doppelter Nummer wählt er technisch eine Zeile, das gilt nicht als eindeutig.
   - Rund ein Drittel der Rechnungen der letzten zehn Jahre hat keine Angebotszuordnung. Sie zählen im Gesamtbetrag, aber in keinem Angebot als Treffer; die 180-Tage-Fakturierungsquote ist deshalb eher eine Untergrenze.
   - Ein gespeicherter Betrag 0 ist ein gültiger Betrag (im Ø enthalten, eigens ausgewiesen); ein fehlender Betrag zählt als Rechnung, aber nicht im Betrag.
   - Das Länderkennzeichen ist bei fast allen Adressen leer; die Gebiete heißen dann „Land unbekannt · PLZ nn“. Kleine Fallzahl = Nenner bzw. Anzahl unter 5.
   - Gutschriften sind nicht importiert und mindern den fakturierten Betrag nicht.

## 7. Offen

**Wartet auf den Auftraggeber oder Inhaber**
- Antworten auf die Fragenliste (Statuskürzel, zwölf unklare Felder, Versicherungssteuer, Pflichttexte, Rollen). Die Liste liegt beim Auftraggeber, nicht im Repository.
- Supabase auf Pro stellen (Sicherungen, kein Pausieren).
- In Supabase unter Authentication → URL Configuration: Site URL `https://knoblau.app`, Redirect URL `https://knoblau.app/**`; eigener SMTP-Versand für E-Mails.
- Firmenangaben ergänzen (Steuernummer, Zusatzzeile der Fußzeile, feste Texte); Stammdaten aktualisieren (Preise, Textbausteine, Fahrzeuge).
- Beispiel-Ausdrucke der bisherigen Formulare, damit die Druckvorlagen final werden.
- Auftragsverarbeitungsverträge von Supabase und Vercel ablegen.

**Bekannte Lücken im Code**
- Umzugsgut-Erfassung ist nur lesend.
- In der Altansicht sichtbar, aber ohne Funktion: Tarifrechner (AMÖ, Verband, CBM), Vorkalkulation und Deckungsbeitrag, Briefvorlagen, Dateianlagen, PLZ-Suche, „Adresse + Leistungen aus Kundenstamm“, „Termine aus Stamm“.
- Maut: Felder vorhanden, keine Berechnung.
- Checkliste: Der Übertrag eines Werts in die Angebotsdaten fehlt.
- Kein Content-Security-Policy-Header. Suchbegriffe stehen als `?q=` in der URL und damit in den Zugriffsprotokollen.
- 44 Angebote, deren gespeicherte Altsumme nicht zu ihren Positionen passt; beim ersten Speichern wird neu gerechnet.
- 100 Angebote und 904 Rechnungen ohne zugeordneten Kunden.
- Keine automatisierten Tests, kein CI.

## 8. Nächste Schritte

Reihenfolge ist ein Vorschlag des umsetzenden Agenten; der Auftraggeber entscheidet.

| Nr. | Schritt | Abhängig von |
| --- | --- | --- |
| 1 | Antworten des Inhabers einarbeiten: Status als verständliche Auswahl, unklare Felder korrigieren, Versicherungssteuersatz | Fragenliste |
| 2 | Vollständiger Klick-Test aller Reiter und neuen Funktionen mit zwei Nutzern, auch am Tablet; danach automatisierte Tests für Preisberechnung, Speichern und Übergabe | – |
| 3 | Druckvorlagen final (Fußzeile, Pflichttexte, Fensterkuvert, mehrseitig), Angebot als PDF-Datei erzeugen und ablegen | Beispiel-Ausdrucke |
| 4 | Rechnung aus dem Angebot erstellen: Nummernkreis, Gutschrift, Zahlungseingang; E-Rechnung (XRechnung/ZUGFeRD) einplanen | Steuerberater |
| 5 | Arbeitsscheine ansehen und erstellen | – |
| 6 | Offene Posten und Mahnungen, Kasse, Export an den Steuerberater (DATEV) | Inhaber |
| 7 | Angebot per E-Mail versenden, Nachfassliste | SMTP |
| 8 | Umzugsgut-Erfassung am Tablet, Kalender und Disposition, Halteverbotszonen | Inhaber |
| 9 | Zweiter Datenimport zum Umstellungstag (`npm run import`, dann `node scripts/import/pruefen.mjs`) | Termin |
| 10 | Landingpage auf der .de-Domain mit Anfrageformular, das ein Angebot anlegt | Domain |

## 9. Lokal arbeiten

```bash
npm install
npm run dev
```

Voraussetzung ist eine `.env.local` mit den Variablen aus Abschnitt 3 (liegt beim Auftraggeber, nie im Repository). Weitere Befehle:

| Befehl | Zweck |
| --- | --- |
| `npx tsc --noEmit` und `npx eslint src` | Typen und Stil |
| `npm run test` | Tests der Dashboard-Kennzahlen mit synthetischen Daten |
| `node --experimental-strip-types scripts/dashboard-pruefen.mjs` | Dashboard gegen SQL-Zählungen auf dem Bestand (nur lesend, nur Zahlen) |
| `DASHBOARD_DEMO=1 npm run dev` | Dashboard lokal mit erfundenen Daten (nur außerhalb der Produktion wirksam) |
| `npx next build` | Produktions-Build |
| `node scripts/sql.mjs <datei.sql>` | Migration oder SQL ausführen |
| `node scripts/typen.mjs` | `src/lib/db-typen.ts` nach Schemaänderungen neu erzeugen |
| `npm run import` | Altdaten neu einspielen (braucht die SQLite-Datei neben dem Repository) |
| `node scripts/import/pruefen.mjs` | Prüfsummen |
| `node --experimental-strip-types scripts/preis-pruefen.mjs` | Preisformel gegen alle Angebote |

## 10. Änderungsprotokoll

Neueste Einträge oben. Jede Lieferung bekommt eine Zeile: Datum, was, wie geprüft.

| Datum | Änderung | Geprüft |
| --- | --- | --- |
| 18.11.2026 | Geschäftsleitungs-Dashboard V1 auf Branch `funktion/geschaeftsleitung-dashboard-v1` (eigener Pull Request, nicht deployt, keine Datenbankänderung) | 13 synthetische Tests, Abgleich mit SQL auf dem Bestand, Build; Browser-Prüfung siehe Pull Request |
| 18.11.2026 | `ENTWICKLUNGSSTAND.md` und `AUFGABEN.md` angelegt; Filterlisten in den Import verschoben | – |
| 18.11.2026 | Anmeldeseite im Knoblau-Design | im Browser, Desktop und Handy |
| 18.11.2026 | Domain `knoblau.app`; Bearbeitungs-Übergabe mit automatischem Speichern; Speichern in einer Transaktion; Entwurf; Kunden bearbeiten und übernehmen; Duplizieren; Textbausteine; Firmenangaben; Auftragsbestätigung; Passwort ändern und zurücksetzen; `legacy` auf 35 Tabellen | Übergabe mit zwei Fenstern, Druck und Tablet-Breite im Browser; Rest nur geladen |
| 18.11.2026 | Druckansicht Angebot und Rechnung; Nutzer löschen; Menü klappt die Navigation ein; Abmelden nur auf diesem Gerät | im Browser angesehen |
| 18.11.2026 | Befunde des Prüfagenten behoben: Rechte je Rolle in der Datenbank, Login mit mehreren Nutzern, Cookies `httpOnly`, Auslandsrouten, sensible `legacy`-Spalten geleert | Policies gezählt, Seiten eingeloggt geladen |
| 18.11.2026 | Preisformel nach Altbestand; Import mit Prüfsummen | Skripte, siehe Abschnitt 5 |
| 18.11.2026 | Altansicht, Neuansicht, Stammdatenpflege, Route | Build; später im Browser |
| 18.11.2026 | Grundgerüst: Schema, Login, Rechte, Datenschicht | ohne Login live geprüft |
