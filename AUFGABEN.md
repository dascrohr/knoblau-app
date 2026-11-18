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

_Noch keine Einträge._

## Erledigt

### A-015 Geschäftsleitungs-Dashboard V1 (Fakturierung, 180-Tage-Fakturierungsquote, Saison, Regionen)
- Von: Auftraggeber (C. Rohr), Auftragstext vom 18.11.2026; fachliche Referenz sind A-009 bis A-012 aus dem Entwurf in Pull Request #1
- Datum: 18.11.2026
- Status: erledigt
- Art: Funktion
- Ziel: Die Geschäftsleitung beantwortet drei Fragen: Wie entwickelt sich das fakturierte Geschäft? Bei welchem Anteil der historischen Angebote ist innerhalb von 180 Tagen eine Rechnung nachweisbar? In welchen Monaten und PLZ-Gebieten konzentriert sich das Geschäft?
- Fertig, wenn: Übersicht unter `/neu/geschaeftsleitung` nur für Administratoren; Kennzahlen mit Vorjahresvergleich; Zeitraum 2/5/10 Jahre und frei; Monatsverlauf; zwei Heatmaps mit Detail und Tabelle; Gebietsrangliste; synthetische Tests; lokale Browser-Prüfung; eigener Pull Request.
- Hinweise: Freigegeben sind Implementierung und lokaler Test. Deployment und Änderungen an der produktiven Datenbank brauchen eine eigene Freigabe. A-013/A-014 (Forecast, Potenzial, Wiedervorlagen) sind nicht Teil dieser Stufe.
- Antwort des umsetzenden Agenten: Umgesetzt auf Branch `funktion/geschaeftsleitung-dashboard-v1` ohne Schemaänderung. Geprüft: 13 synthetische Tests, Abgleich mit unabhängigen SQL-Zählungen auf dem Bestand, Build, kein Zugriff ohne Anmeldung, Browser lokal mit erfundenen Demo-Daten (Zeitraumwechsel, Vorjahresvergleich, beide Heatmaps, Tablet 820 px). Nicht geprüft: Aufruf als regulärer Nutzer mit echtem Konto, echte Daten im Browser. Was im Browser geprüft ist und welche Definitionen der Inhaber noch bestätigen muss, steht im Pull Request und in `ENTWICKLUNGSSTAND.md` Abschnitt 6 Punkt 9. Zusammengeführt mit Pull Request #2 und am 18.11.2026 auf Freigabe des Auftraggebers deployt. Weiter offen sind die Bestätigungen des Inhabers zu den Definitionen (Pull Request #2, Abschnitt „Entscheidungen“).

