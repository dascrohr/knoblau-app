# Preisformel – Befund aus den Altdaten

Stand: Import-Analyse über alle 8.205 Angebote und 36.753 Rechnungspositionen. Keine Personendaten.

**Achtung: Die Altsoftware rechnet anders als in `docs/datenmodell.md` („anzahl × einheiten × einzelpreis, danach Prozent; fehlende Werte = 1“) beschrieben.**

## Formel, die den Altbestand trifft

```
anzahl_eff    = anzahl,    wenn anzahl leer ODER 0  → 1
einheiten_eff = einheiten, wenn leer → 0   (0 bleibt 0)
ep_eff        = runde(einzelpreis × (1 + prozent/100), 2)      ← Prozent wirkt auf den Einzelpreis, dann kaufmännisch auf Cent runden
position      = anzahl_eff × einheiten_eff × ep_eff

netto_summe   = Σ Positionen (Beladen, Befördern, Entladen, Nebenleistungen, Packmaterial, freie Leistungen)
              + klavier_anzahl × klavier_preis + fluegel_anzahl × fluegel_preis
```

- **Packmaterial:** `anzahl` ist leer (zählt als 1), Stück steht in `einheiten`. Stück 0/leer ⇒ Position zählt 0 (im Altbestand üblich: Preis vorbelegt, Stück 0).
- **Einheiten leer oder 0 ⇒ Position = 0**, auch wenn ein Einzelpreis da ist (14.195 Positionen mit Preis und Einheiten 0; 743 mit Preis und leeren Einheiten).
- **Anzahl 0 zählt wie 1** (354 Positionen mit Preis, Anzahl 0 und Einheiten > 0).
- **Generalrabatt (`generalrabatt`, Alt: MARGE) ist NICHT in `netto_summe` enthalten.** Bei den Rechnungen ist belegt (431 von 431 Rechnungen mit Rabatt):
  `gesamtsumme = runde( runde(netto × (1 + generalrabatt/100), 2) × (1 + ust_satz/100), 2)`.
  Für Angebote daher: Endbetrag netto = `runde(netto_summe × (1 + generalrabatt/100), 2)`, danach USt. (Für Angebote aus den Daten nicht direkt prüfbar, da nur `netto_summe` gespeichert ist – Analogie zur Rechnung.)
- **Nicht in `netto_summe`:** Versicherungsbetrag (`versicherungsbetrag`), Maut (`maut_gesamt` ist im Altbestand überall 0/leer), Autobahn-km.
- Schwergut: nur 4 Fälle, nicht belastbar (am ehesten `schwergut_kilo / 100 × schwergut_preis`).

## Trefferquoten (Abweichung ≤ 0,01 gegen gespeicherte `netto_summe`)

| Variante | Treffer von 8.205 |
| --- | --- |
| dokumentierte Formel (leer = 1, Prozent am Ende, keine Rundung) | 7.238 (88,2 %) |
| Anzahl leer → 1, Einheiten leer → 0 | 7.731 (94,2 %) |
| zusätzlich Anzahl 0 → 1 | 7.945 (96,8 %) |
| zusätzlich Prozent auf Einzelpreis, auf Cent gerundet | 8.091 (98,6 %) |
| zusätzlich + Klavier + Flügel | **8.115 (98,9 %)** |
| dieselbe Formel × (1 + Generalrabatt/100) | 6.991 – Rabatt ist also nicht eingerechnet |

Von den verbleibenden ~90 Abweichungen haben 38 eine gespeicherte Summe 0 bzw. leer; der Rest sind Einzelfälle (Summe offenbar nicht neu berechnet). Unter den Angeboten mit `netto_summe <> 0`: 99,3 %.

Gegenprobe Rechnungspositionen (`netto` je Position): beste Formel trifft 36.726 von 36.753 (99,93 %), die dokumentierte Formel nur 28.104.

## Folgen für die App

- `src/lib/preis.ts`: Einheiten leer ⇒ 0 (nicht 1); Anzahl leer/0 ⇒ 1; Prozent auf den Einzelpreis anwenden und auf Cent runden, erst dann mit den Mengen multiplizieren.
- Generalrabatt erst auf die Nettosumme anwenden, `netto_summe` ohne Generalrabatt speichern.
- Prüfen: `node scripts/import/pruefen.mjs`.
