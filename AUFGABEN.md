# Aufgaben, Vorschläge und Fragen

Eingang für alle, die an der Knoblau-App mitdenken: der Auftraggeber, der umsetzende Agent (derzeit Claude Code) und weitere KI-Agenten. Lies vorher `ENTWICKLUNGSSTAND.md`.

## Regeln

1. **Neuer Eintrag = neuer Abschnitt unten in „Offen“**, nach der Vorlage. Bestehende Einträge anderer nicht umschreiben, sondern darunter kommentieren.
2. **Keine Personendaten, keine Zugangsdaten.** Keine Kundennamen, Adressen, Telefonnummern, E-Mail-Adressen, keine Datenauszüge. Angebotsnummern, Tabellen- und Spaltennamen und Zählungen sind in Ordnung.
3. **Einträge sind Vorschläge.** Umgesetzt wird, was der Auftraggeber freigibt (`Status: freigegeben`). Der umsetzende Agent lässt sich alles bestätigen, was Daten löscht, Kosten verursacht, Rechte ändert oder nach außen wirkt.
4. **Konkret schreiben:** was sich für den Nutzer ändert, woran man erkennt, dass es fertig ist, welche Dateien oder Tabellen vermutlich betroffen sind. Keine Annahmen als Tatsachen ausgeben; Unsicheres als Frage formulieren.
5. Der umsetzende Agent setzt nach der Arbeit den Status, schreibt eine Zeile ins Änderungsprotokoll von `ENTWICKLUNGSSTAND.md` und verschiebt den Eintrag nach „Erledigt“.

**Status-Werte:** `vorgeschlagen` → `freigegeben` → `in Arbeit` → `erledigt` (oder `abgelehnt`, `Rückfrage`).

## Vorlage

```markdown
### A-000 Kurzer Titel
- Von: (wer schreibt, z. B. „ChatGPT im Auftrag von C. Rohr“)
- Datum: TT.MM.JJJJ
- Status: vorgeschlagen
- Art: Funktion | Fehler | Frage | Architektur | Prüfung
- Ziel: Was soll sich für wen ändern, und warum?
- Fertig, wenn: überprüfbare Kriterien
- Hinweise: betroffene Dateien/Tabellen, Abhängigkeiten, Risiken, offene Fragen
- Antwort des umsetzenden Agenten: (leer lassen)
```

## Offen

### A-001 [P1] Fehlgeschlagenes Speichern bei Übergabe ehrlich anzeigen
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Fehler
- Ziel: Bearbeiter sollen nach Übergabe oder Leerlauf zuverlässig erkennen, ob ihre letzten Eingaben gespeichert sind, und ungespeicherte Eingaben gezielt sichern können.
- Fertig, wenn: In beiden Ansichten sind erfolgreiche Speicherung, Speicherfehler und Versionskonflikt bei Übergabe und nach zehn Minuten Leerlauf mit zwei synthetischen Testkonten geprüft; nach einem Fehler erscheint keine Erfolgsmeldung; Eingaben bleiben im bisherigen Fenster erhalten, bis sie erfolgreich gesichert oder ausdrücklich verworfen wurden; für eine inzwischen erzwungene Übernahme wird ein verständlicher Wiederherstellungsweg angeboten, ohne den neueren Stand zu überschreiben.
- Hinweise: Priorität P1 wegen drohendem Verlust ungespeicherter Arbeit. Bestätigter Codebefund bei `01c017f`: `src/lib/bearbeitung.ts` nimmt in `onAbgabe` kein Speicherergebnis entgegen, gibt auch nach einem Fehler ab und meldet bei Pause/Übergabe trotzdem einen gespeicherten Stand; die Callbacks in `src/components/neu/angebot/maske.tsx` und `src/components/alt/angebot-maske.tsx` verwerfen den booleschen Rückgabewert. Kein Laufzeitnachweis in diesem Review. Offen: Soll eine freiwillige Abgabe bei Fehler blockieren oder mit ausdrücklichem Hinweis fortgesetzt werden? Die dokumentierte erzwungene Übernahme nach 15 Sekunden muss als eigener Fall behandelt werden. Abgrenzung zu A-002: Zustand und Rückmeldung im Browser.
- Antwort des umsetzenden Agenten:

### A-002 [P1] Abgeleitete Angebotsdaten konsistent und fehlersicher speichern
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Architektur
- Ziel: Nach einer Speicherbestätigung sollen Detail, Liste, Suche und Jahresfilter denselben Angebotsstand zeigen, auch bei Fehlern oder schnellen Folgeänderungen.
- Fertig, wenn: Angebotsinhalt, `netto_summe`, `suchtext` und `jahr` bilden nach bestätigtem Speichern einen konsistenten Versionsstand; simulierte Lese- und Schreibfehler sowie zwei überlappende Speichervorgänge erzeugen weder eine falsche Erfolgsmeldung noch ein Überschreiben neuerer abgeleiteter Werte; für bereits gespeicherte Inhalte mit fehlgeschlagener Nachbearbeitung ist das Ergebnis eindeutig und ein Wiederholungsweg definiert; automatisierte Prüfungen decken diese Fälle mit synthetischen Daten ab.
- Hinweise: Priorität P1 wegen falscher Summen und unzuverlässiger Suche. Bestätigter Codebefund bei `01c017f`: `src/lib/aktionen.ts::speichereAngebot` liest und aktualisiert die abgeleiteten Werte erst nach `app.angebot_speichern`; Lesefehler bei Positionen/Adressen werden durch leere Listen ersetzt, der Fehler des abschließenden Updates wird nicht geprüft und das Update nicht an die zurückgemeldete Version gebunden. Die SQL-Transaktion in `supabase/migrations/0004_bearbeitung_einstellungen.sql` umfasst diesen Nachlauf nicht. Ein tatsächlicher inkonsistenter Datensatz wurde nicht geprüft. Offen: atomare Berechnung oder abgesicherter Nachlauf; `src/lib/preis.ts` bleibt die gemeinsame fachliche Rechenquelle. Abgrenzung zu A-001: serverseitige Persistenz.
- Antwort des umsetzenden Agenten:

### A-003 [P1] Abweichende Altangebote vor stiller Neubewertung schützen
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Funktion
- Ziel: Anwender sollen vor einer Änderung historischer Angebotssummen erkennen, dass gespeicherte Altsumme und heutige Berechnung voneinander abweichen, und eine Neubewertung bewusst entscheiden können.
- Fertig, wenn: Eine synthetische Abweichung wird beim Öffnen verständlich mit Altsumme, berechneter Vergleichssumme und Differenz angezeigt; ein reiner Text- oder Adresswechsel einschließlich Autospeichern ersetzt die Altsumme nicht unbemerkt; ein ausdrücklich bestätigter Neubewertungsschritt und ein Abbruch sind geprüft; Druckansicht und beide Masken kennzeichnen den gewählten Stand konsistent; Bestandswerte werden weder pauschal korrigiert noch gelöscht.
- Hinweise: Priorität P1 wegen unbeabsichtigter Preisänderungen. Dokumentierter Befund: `ENTWICKLUNGSSTAND.md`, Abschnitt 7, nennt 44 abweichende Angebote und Neuberechnung beim ersten Speichern; `src/lib/aktionen.ts` berechnet nach jedem erfolgreichen Speichern neu, `src/components/druck/angebot-blatt.tsx` berechnet bereits beim Anzeigen. Keine erneute Bestandszählung in diesem Review. Betroffen vermutlich Angebotsmasken, `src/lib/preis.ts`, Speicherpfad, Druck und ggf. Datenmodell. Offen: fachlich verbindliche Vergleichsbasis und Rundungstoleranz; `netto_summe` ist laut Dokumentation eine Leistungssumme und darf nicht mit dem Endbetrag verwechselt werden. Die abweichenden Auswertungsstände in `docs/preisformel-befund.md` sind vor einer Übernahme von Zahlen abzugleichen. Baut auf A-002 auf.
- Antwort des umsetzenden Agenten:

### A-004 [P1] Rechte und Bearbeitungsschutz nach aktuellem Schema nachweisen
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Prüfung
- Ziel: Der Auftraggeber soll belastbar erkennen können, ob Anmeldung, Rollen und Bearbeitungsschutz auch außerhalb der sichtbaren Bedienoberfläche greifen.
- Fertig, wenn: Für den aktuellen Migrationsstand ist eine reproduzierbare Matrix für nicht angemeldet, aktiver Nutzer, Admin und gesperrter Nutzer mit bereits bestehender Sitzung dokumentiert; Seiten, Druckrouten, Server Actions, Karten-/Sperr-API, direkte Tabellenzugriffe und die Funktionen `sperre`/`angebot_speichern` sind einbezogen; Adminfunktionen bleiben anderen Rollen verwehrt, nur lesbare Tabellen bleiben unveränderbar und `legacy` bleibt über die API unerreichbar; der Schutz vor konkurrierenden Änderungen ist für alle vorgesehenen Schreibwege nachgewiesen; Abweichungen werden separat belegt, nicht still als bestanden gewertet.
- Hinweise: Priorität P1 wegen Datenzugriff und möglicher Umgehung der Versions-/Sperrprüfung. Dokumentierter Befund: Der umfassende Test ohne Login erfolgte laut Abschnitt 5 vor Migration 0003/0004. Die zuständigen Rollen- und Speicherregeln sind in den Migrationen 0003 und 0004 dokumentiert. Eine Abweichung im laufenden Betrieb wurde in diesem Review nicht festgestellt oder geprüft. Weitere Fundstellen: `src/proxy.ts`, `src/lib/supabase/`, `src/lib/aktionen.ts`, `src/app/api/`. Nur isolierte Testumgebung und synthetische Datensätze; keine produktiven Konten verändern. Rechteänderungen benötigen eine gesonderte Freigabe.
- Antwort des umsetzenden Agenten:

### A-005 [P1] Wiederherstellung und letzten Datenimport vor Umstellung erproben
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Prüfung
- Ziel: Vor der vollständigen Ablösung der Altsoftware soll feststehen, wie Daten nach einem Fehler wiederhergestellt werden und wie der letzte Import vorhandene App-Änderungen schützt.
- Fertig, wenn: Der tatsächlich verfügbare Sicherungsumfang und ein Wiederherstellungsablauf sind dokumentiert und in einer isolierten Umgebung erprobt; akzeptabler Datenverlust und Wiederanlaufzeit sind vom Auftraggeber festgelegt; ein zweimaliger Import mit synthetischen Alt- und App-Daten erhält geänderte Angebote, neue Zeilen, bearbeitete Kunden und gepflegte Stammdaten; Prüfsummen, Summen und Verknüpfungen werden vor/nach Import und Wiederherstellung verglichen; Umstellungsablauf, Schreibpause, Abbruchkriterien und Rückkehr zum vorherigen Stand sind konkret festgelegt.
- Hinweise: Priorität P1 wegen des geplanten Ersatzes der Altsoftware und der Produktivdaten. Dokumentierter Befund: Pro-Wechsel steht aus; wiederholbarer Import und Prüfsummen sind beschrieben, ein Wiederherstellungstest nicht. Das belegt weder das Fehlen aller Sicherungen noch einen aktuellen Datenverlust. Betroffen: `scripts/import/`, `supabase/migrations/`, später die Betriebsdokumentation. Konkretisiert Abschnitt 7 und Abschnitt 8, Schritt 9, ohne einen zweiten Importauftrag anzulegen. Keine Sicherung oder Datenkopie ins Repository; Prüfbericht nur mit synthetischen Daten und aggregierten Ergebnissen. Produktivimport, kostenpflichtiger Tarifwechsel und Wiederherstellung im Produktivsystem bleiben separat freizugebende Maßnahmen.
- Antwort des umsetzenden Agenten:

### A-006 [P2] Druckansicht mit ungespeicherten Eingaben eindeutig führen
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Funktion
- Ziel: Nutzer sollen beim Drucken eines Angebots oder einer Auftragsbestätigung sicher erkennen, ob ihre zuletzt sichtbaren Änderungen enthalten sind.
- Fertig, wenn: Beide Ansichten bieten bei ungespeicherten Eingaben eine eindeutige Wahl zwischen erfolgreich speichern und anschließend Druckansicht öffnen, bewusst den zuletzt gespeicherten Stand öffnen oder abbrechen; bei Speicherfehler oder Versionskonflikt wird kein Druck des vermeintlich aktuellen Stands ausgelöst; während des Speicherns neu eingegebene Änderungen werden berücksichtigt oder als noch ungespeichert ausgewiesen; Text, Position und Entwurf-Kennzeichnung stimmen im geprüften Druck mit dem gewählten Stand überein.
- Hinweise: Priorität P2 wegen des Risikos, einen veralteten Stand weiterzugeben. Bestätigter Codebefund bei `01c017f`: Der Link in `src/components/neu/angebot/maske.tsx` öffnet unmittelbar die Druckroute und erklärt den gespeicherten Stand nur per Titeltext; Links mit `target="_blank"` sind vom Verlassen-Dialog ausgenommen. `src/components/alt/leisten.tsx` öffnet die Druckroute ebenfalls ohne vorgelagertes Speichern. Kein Papier-/Browser-Abnahmetest in diesem Review. Weitere Fundstellen: `src/app/druck/**`, `src/components/druck/**`. Abhängigkeit A-001/A-002; A-003 regelt die fachliche Behandlung historischer Summen. Mehrseitiges Layout und Pflichttexte bleiben der bestehenden Druck-Roadmap zugeordnet.
- Antwort des umsetzenden Agenten:

### A-007 [P2] Freie Suchbegriffe aus navigierbaren URLs entfernen
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Architektur
- Ziel: Die Suche nach Angeboten, Kunden und Rechnungen soll nutzbar bleiben, ohne frei eingegebene Begriffe in Seitenadressen weiterzugeben.
- Fertig, wenn: In Alt- und Neuansicht funktionieren Suche, Filter, Seitenwechsel und Zurücksetzen weiterhin; freie Suchbegriffe erscheinen nicht in URL-Pfad oder Query von Navigation und Suchanfragen, Referrer-Weitergabe oder anwendungsseitiger Protokollierung; Netzwerk- und Logging-Prüfungen mit eindeutig synthetischen Suchwerten sind dokumentiert; das Verhalten beim Neuladen, Zurücknavigieren und Teilen eines Listenlinks ist festgelegt und geprüft.
- Hinweise: Priorität P2 zur Verringerung unnötiger Datenverteilung. Dokumentierter Befund: `ENTWICKLUNGSSTAND.md`, Abschnitt 7, nennt `?q=` in URLs und Zugriffsprotokollen; Codebestätigung für die URL-Bildung in `src/components/neu/suchleiste.tsx`. Tatsächliche Hosting-Protokolle wurden nicht eingesehen. Betroffen vermutlich Suchleisten, `src/app/alt/**/page.tsx`, `src/app/neu/**/page.tsx` und `src/lib/daten.ts`. Offen: gewünschte Dauer des Suchzustands und tatsächliche Logging-Konfiguration; kein Persistieren freier Suchbegriffe im Browser als unbeabsichtigter Ersatz. Bereits entstandene Protokolle sind gesondert zu beurteilen, nicht im Rahmen dieser Aufgabe pauschal zu löschen.
- Antwort des umsetzenden Agenten:

### A-008 [P2] Fachliche Kernabläufe mit synthetischen Regressionstests absichern
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Prüfung
- Ziel: Änderungen sollen die bereits gebauten Preis- und Arbeitsabläufe nicht unbemerkt beschädigen; die dokumentierte Klickprüfung soll reproduzierbare Ergebnisse liefern.
- Fertig, wenn: Die in Abschnitt 5 als ungeprüft genannten Abläufe sind mit erwartetem Ergebnis, tatsächlichem Ergebnis und Fehlern nachvollziehbar abgearbeitet, insbesondere Kunden anlegen/ändern/übernehmen, Stammdaten speichern/deaktivieren, Duplizieren, Textbausteine und Entwurf; die relevanten Masken sind bei 820 px und mit Tastatur geprüft; eigenständige Preisfälle decken leere/Null-Mengen, Prozent-Rundung, Generalrabatt mit beiden Vorzeichen, Maut, Versicherungsanteile und Schwergut mit fachlich bestätigten Erwartungen ab; die automatisierten Prüfungen sowie Typprüfung, Lint und Build laufen ohne Produktionszugang in CI; Wiederholungsbefehle und verbleibende Grenzen sind dokumentiert.
- Hinweise: Priorität P2 für verlässliche Folgeentwicklung; konkretisiert Abschnitt 8, Schritt 2, ohne die Prüfungen aus A-001/A-002/A-004 erneut zu beauftragen. Bestätigter Repositorybefund bei `01c017f`: kein Testskript in `package.json`, keine CI-Konfiguration im Dateibaum; bestehende Import-/Preisprüfskripte benötigen Bestandsdaten und ersetzen keine unabhängigen synthetischen Fälle. Betroffen vermutlich `src/lib/preis.ts`, Kunden-/Stammdaten-/Angebotskomponenten, neue Testdateien und später CI. Offene fachliche Regeln, insbesondere Versicherungssteuersatz und Schwergut, vom Inhaber bzw. zuständigen Fachberater bestätigen lassen; heutiges Verhalten nicht ungeprüft als Soll festschreiben. Keine echten Kontaktdaten, Versandaktionen, kostenpflichtigen Dienste oder Zugangsdaten in Tests und Ausgaben.
- Antwort des umsetzenden Agenten:

### A-009 [P1] KPI-Grundlage und Abdeckung je Jahr prüfen
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Prüfung
- Ziel: Die Geschäftsleitung soll erkennen, welche Aussagen seit 2010 belastbar sind.
- Fertig, wenn: Eine Jahresmatrix zeigt Angebote, gültige Daten, Auftragsbelege, eindeutige Rechnungszuordnungen, Währungen, fehlende Werte und widersprüchliche Fälle. Ein fachlich bestätigtes Wörterbuch definiert versandtes Angebot, gewonnener, verlorener, stornierter und offener Vorgang samt Stichtag. Unbekannte bleiben sichtbar. Synthetische Tests umfassen Varianten desselben Vorgangs, Mehrfachrechnungen, Entwürfe, Gutschriften, fehlende Verknüpfungen und Nullbeträge.
- Hinweise: Grundlage für A-010 bis A-014. In `docs/datenmodell.md` und `scripts/import/sql/20_rechnungen.sql` ist die Zuordnung bei doppelten Nummern beschrieben. Berichtslogik auf internen IDs aufbauen, mehrdeutige historische Treffer kennzeichnen und vor Summenbildung je Vorgang verdichten. Welche Kürzel und Belege bestätigen Annahme, Versand und Storno? Gibt es einen unveränderlichen Annahmewert und eine Statushistorie? Rollenmodell für aggregierte Geschäftsleitungszahlen klären. Bis dahin Zugriff nur für berechtigte Administratoren vorsehen, auch serverseitig.
- Antwort des umsetzenden Agenten:

### A-010 [P1] Geschäftsleitungsübersicht für Abschluss und Fakturierung
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Funktion
- Ziel: Auf einen Blick erkennen, ob sich Angebotsmenge, Abschlussquote oder Wert pro Vorgang verändert hat.
- Fertig, wenn: Die Übersicht zeigt Angebotsmenge, bestätigte Aufträge, Abschlussquote, Ø-Auftragswert und fakturierte Summe jeweils mit Datenstand, Vergleich und Definition. Die Abschlussquote zählt je Angebotsmonat bestätigte Vorgänge innerhalb eines einheitlichen Beobachtungsfensters geteilt durch auswertbare abgegebene Angebote derselben Kohorte. Junge Kohorten erscheinen als vorläufig, unbekannte Ergebnisse mit Fallzahl und möglichen Grenzen. Ohne belastbares Auftragssignal erscheint separat die Quote mit erster eindeutig zugeordneter Rechnung innerhalb von 180 Tagen. Eine Tabelle führt Zähler, Nenner, Varianten, Ausschlüsse und ungeklärte Fälle auf.
- Hinweise: Nach A-009. Zeitachsen für Angebotseingang, Auftragseingang und Fakturierung jeweils nach ihrem Ereignisdatum führen. Rechnungen ohne Zuordnung zählen im Gesamtbetrag, jedoch nicht im Angebotstrichter. Rechnungsbetrag, kalkulierter Angebotswert nach Rabatt und historisch bestätigter Auftragswert brauchen eigene Beschriftungen. Quellen: `angebote`, `rechnungen`, `src/lib/preis.ts`. Keine historische Annahmesumme aus einem später geänderten Angebot behaupten.
- Antwort des umsetzenden Agenten:

### A-011 [P1] Saison, Vorjahresvergleich und Entwicklung des Auftragswerts
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Funktion
- Ziel: Auftragsvolumen und Preisentwicklung über Monate, zwei, fünf oder zehn Jahre beurteilen.
- Fertig, wenn: Ein Monatsdiagramm vergleicht Anzahl und Wert mit dem Vorjahr, eine Jahr-mal-Monat-Heatmap zeigt Saisonalität. Der Monatsvergleich für Ø und Median nennt Fallzahl und Rang, getrennt für bestätigte Auftragswerte und ersatzweise Rechnungsbeträge. Zeitraumwahl 2/5/10 Jahre und frei, Veränderung absolut und relativ, bei Quoten in Prozentpunkten. Unvollständige Perioden werden mit gleichem Vorjahresstichtag verglichen. Fehlende Monate, echter Nullwert und Vorjahresbasis null sind unterscheidbar.
- Hinweise: Nach A-009/A-010. Ø = Summe gültiger Werte / Anzahl Vorgänge mit gültigem Wert. Zeitreihe in nominalen Euro. Keine ungewichteten Mittel aus Monatsmitteln. Auftragsanzahl nach Annahme, Fakturierung nach Rechnungsdatum und Einsatzplanung nach Leistungszeitpunkt beschriften. Für verschobene Durchschnittswerte Segmentmix und Median zum Vergleich anbieten.
- Antwort des umsetzenden Agenten:

### A-012 [P2] Regionale Nachfrage und Gewinnquote nach Beladegebiet zeigen
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Funktion
- Ziel: Die Geschäftsleitung soll Gebiete mit hohem Auftragsvolumen von Gebieten mit hoher Nachfrage und niedriger Abschlussquote unterscheiden können.
- Fertig, wenn: Eine sortierbare PLZ2-Rangliste zeigt Angebote, bestätigte Aufträge, Quote, fakturierten Wert zugeordneter Vorgänge und Vergleich zum Vorjahr. Voreinstellung ist die Beladestelle. Entladestelle ist separat wählbar. Land und führende Nullen bleiben erhalten. Unbekanntes Land und fehlende PLZ erhalten eigene Gruppen. Eine Flächenkarte erscheint nur für verlässlich zugeordnete Gebiete. Kleine Gruppen werden nach vereinbarter Schwelle zusammengefasst.
- Hinweise: Nach A-009/A-010. Quellen: `angebot_adressen.art`, `lkz`, `plz`, `angebote`, `rechnungen`. Pro Vorgang je Perspektive höchstens eine Region. Keine automatische Länderzuordnung allein aus fünf Stellen. Karte, Rangliste und Gesamtsumme müssen einschließlich unbekannter Region abstimmbar sein. Keine Einzeladressen exportieren.
- Antwort des umsetzenden Agenten:

### A-013 [P2] Forecast für Auftragseingang und geplante Umzüge
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Funktion
- Ziel: Für die kommenden 4, 8 und 12 Wochen sehen, welche Aufträge bereits feststehen und welche zusätzlich wahrscheinlich sind.
- Fertig, wenn: Die Ansicht trennt bestätigte Einsätze, erwartete neue Abschlüsse aus bereits offenen Angeboten und gegebenenfalls künftiges Neugeschäft. Für offene Angebote wird je Alter und Prognosehorizont die Chance einer Annahme unter der Bedingung geschätzt, dass der Vorgang am Stichtag noch offen ist. Erwartete Anzahl = Summe der Wahrscheinlichkeiten, erwarteter Wert = Summe aus Wahrscheinlichkeit × verfügbarem Nettowert. Für die Einsatzwoche ist ein belastbarer Leistungszeitpunkt erforderlich. Ein Prognoseband und rückwirkende Stichtagstests zeigen Fehler je Horizont gegenüber einer einfachen saisonalen Vergleichsprognose.
- Hinweise: Nach A-009. `umzugstermin` ist Freitext. Bedeutung und Abdeckung von `angebot_termine.datum/gebucht` sowie Arbeitsscheinen prüfen. Rücktests ausschließlich mit zum damaligen Stichtag bekannten Daten; spätere Rechnungen dienen allenfalls als beobachtetes Ergebnis. Unklare Historie: zunächst saisonale Fakturierungsprognose gesondert benennen und prospektive Status-/Wertschnappschüsse vorsehen. Bei zu kleinen Stichproben Segmente zusammenlegen oder Prognose ausblenden. Kapazitätsaussagen erfordern zusätzlich verfügbare Personal-/Fahrzeugstunden.
- Antwort des umsetzenden Agenten:

### A-014 [P2] Nachfasschancen und selten angebotene Zusatzleistungen prüfen
- Von: ChatGPT (Produktmanagement und Review)
- Datum: 18.11.2026
- Status: vorgeschlagen
- Art: Funktion
- Ziel: Gezielt entscheiden, welche offenen Angebote eine Durchsicht lohnen und welche Leistungen im Sortiment an Bedeutung verlieren.
- Fertig, wenn: Zwei Ansichten liefern begründete Prüfhypothesen. Die Nachfassliste zeigt nur tatsächlich offene Angebote und trennt fehlende Kontakthistorie von überfälliger Wiedervorlage. Der Leistungsvergleich zeigt je Segment den Anteil geeigneter Angebote mit bepreister Leistung, Fallzahl, Vorperiodenwert und Differenz in Prozentpunkten. Mehrere Zeilen derselben Leistung zählen einmal. Eine Abweichung lässt sich mit Vergleichsgruppe, Ausschlüssen und typischem Netto-Zusatzwert erklären. Eine Szenariorechnung benennt Annahmen zu Eignung und Annahmequote ausdrücklich.
- Hinweise: Nach A-009/A-010. Quellen: `angebot_positionen`, `stamm_leistungen`, `stamm_packmaterial`. Packmaterial mit positivem Stückwert und Preis von vorbelegten Nullmengen trennen. Historische Bezeichnungen fachlich gruppieren. Herkunft, Größenklasse oder Entfernung nur bei ausreichender Feldabdeckung nutzen. Fehlende Rechnungszuordnung allein löst keine Wiedervorlage aus. Gibt es verlässliche Kontakt-, Ablehnungs- und Wiedervorlagedaten? Falls nötig, künftige Erfassung separat vorschlagen. Hinweise werden intern geprüft; kein automatischer Kundenkontakt.
- Antwort des umsetzenden Agenten:

## Erledigt

_Noch keine Einträge._
