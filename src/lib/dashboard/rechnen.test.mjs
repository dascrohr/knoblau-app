// Tests der Dashboard-Kennzahlen mit ausschließlich synthetischen Daten.
// Aufruf: npm run test  (node --experimental-strip-types --test src/lib/dashboard/rechnen.test.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { berechneDashboard, betragsStatistik, datenstichtag, gebietVon, plusJahre, plusTage, quotenSumme, tagNr, zeitraumJahre } from "./rechnen.ts";

let lfd = 1000;
const angebot = (id, datum, extra = {}) => ({ id, angebotnr: `N${id}`, angebotsdatum: datum, entwurf: false, bela_lkz: null, bela_plz: "51103", entla_lkz: null, entla_plz: "50667", ...extra });
const rechnung = (angebot_id, datum, betrag = 1000, extra = {}) => ({ id: lfd++, angebot_id, rechnungsdatum: datum, gesamtsumme: betrag, waehrung: "EUR", ...extra });
const opt = (extra = {}) => ({ von: "2024-01-01", bis: "2024-12-31", stichtag: "2026-06-30", perspektive: "beladestelle", ...extra });

test("Quotenfall: Tag 0, Tag 180, Tag 181, keine Rechnung → 2 von 4 = 50 %", () => {
  const a = [angebot(1, "2024-03-01"), angebot(2, "2024-03-01"), angebot(3, "2024-03-01"), angebot(4, "2024-03-01")];
  const r = [rechnung(1, "2024-03-01"), rechnung(2, plusTage("2024-03-01", 180)), rechnung(3, plusTage("2024-03-01", 181))];
  const d = berechneDashboard(a, r, opt());
  assert.equal(d.quote.aktuell.zaehler, 2);
  assert.equal(d.quote.aktuell.nenner, 4);
  assert.equal(d.quote.aktuell.wert, 0.5);
  assert.equal(d.quote.aktuell.spaeter, 1);
  assert.equal(d.quote.aktuell.ohneRechnung, 1);

  // Eine zweite Rechnung zum ersten Angebot ändert das Ergebnis nicht.
  const d2 = berechneDashboard(a, [...r, rechnung(1, "2024-04-15", 500)], opt());
  assert.equal(d2.quote.aktuell.zaehler, 2);
  assert.equal(d2.quote.aktuell.nenner, 4);
  assert.equal(d2.rechnungen.wert, 4, "die zweite Rechnung zählt als Rechnung");
});

test("Tag 180 fällt über den Jahreswechsel; Rechnung nach Ende des Angebotszeitraums zählt für die Kohorte", () => {
  const a = [angebot(1, "2024-12-20"), angebot(2, "2024-12-20")];
  const r = [rechnung(1, "2025-06-18"), rechnung(2, "2025-06-19")]; // Tag 180 und Tag 181
  assert.equal(tagNr("2025-06-18") - tagNr("2024-12-20"), 180);
  const d = berechneDashboard(a, r, opt());
  assert.equal(d.quote.aktuell.zaehler, 1);
  assert.equal(d.quote.aktuell.nenner, 2);
  assert.equal(d.rechnungen.wert, 0, "Rechnungen von 2025 gehören nicht zum Rechnungszeitraum 2024");
});

test("Zu junge Kohorte: nicht im Nenner, Fallzahl ausgewiesen, leerer Nenner = nicht berechenbar", () => {
  const stichtag = "2026-06-30";
  const reifGrenze = plusTage(stichtag, -180);
  const a = [angebot(1, reifGrenze), angebot(2, plusTage(reifGrenze, 1)), angebot(3, "2026-06-01")];
  const d = berechneDashboard(a, [rechnung(2, plusTage(reifGrenze, 2))], opt({ von: "2026-01-01", bis: "2026-12-31", stichtag }));
  assert.equal(d.zeitraum.effBis, stichtag, "Zeitraum endet am Datenstichtag");
  assert.equal(d.quote.aktuell.nenner, 1, "nur das Angebot mit abgelaufenem Fenster");
  assert.equal(d.quote.aktuell.zuJung, 2);
  assert.equal(d.quote.aktuell.zaehler, 0, "eine Rechnung zu einem zu jungen Angebot zählt noch nicht");

  const nurJung = berechneDashboard([angebot(3, "2026-06-01")], [], opt({ von: "2026-06-01", bis: "2026-06-30", stichtag }));
  assert.equal(nurJung.quote.aktuell.nenner, 0);
  assert.equal(nurJung.quote.aktuell.wert, null, "nicht berechenbar");
});

test("Rechnung nach dem Datenstichtag liegt noch nicht vor", () => {
  const a = [angebot(1, "2025-12-01")];
  const d = berechneDashboard(a, [rechnung(1, "2026-07-15")], opt({ von: "2025-01-01", bis: "2025-12-31", stichtag: "2026-06-30" }));
  assert.equal(d.quote.aktuell.nenner, 1);
  assert.equal(d.quote.aktuell.zaehler, 0);
});

test("Mehrdeutige und fehlende Nummern, Entwürfe: nicht im Nenner, mit Fallzahl; ihre Rechnungen zählen im Gesamtbetrag", () => {
  const a = [
    angebot(1, "2024-02-01"),
    angebot(2, "2024-02-01", { angebotnr: "DOPPELT" }),
    angebot(3, "2024-02-01", { angebotnr: "DOPPELT" }),
    angebot(4, "2024-02-01", { angebotnr: null }),
    angebot(5, "2024-02-01", { angebotnr: "  " }),
    angebot(6, "2024-02-01", { entwurf: true }),
  ];
  // Der Import hängt die Rechnung zur doppelten Nummer technisch an EINE der beiden Zeilen: fachlich kein eindeutiger Treffer.
  const r = [rechnung(1, "2024-02-10", 100), rechnung(2, "2024-02-10", 200), rechnung(null, "2024-02-11", 300)];
  const d = berechneDashboard(a, r, opt());
  assert.deepEqual([d.quote.aktuell.zaehler, d.quote.aktuell.nenner], [1, 1]);
  assert.equal(d.quote.aktuell.mehrdeutig, 2);
  assert.equal(d.quote.aktuell.ohneNummer, 2);
  assert.equal(d.quote.aktuell.entwuerfe, 1);
  assert.equal(d.angebote.wert, 6, "alle datierten Angebote zählen als Angebot");
  assert.equal(d.betrag.statistik.summe, 600, "jede Rechnung zählt einmal, auch ohne Angebotszuordnung");
  assert.equal(d.regionen.nichtZuordenbar.rechnungen, 2);
  assert.equal(d.regionen.nichtZuordenbar.mehrdeutig, 1);
  assert.equal(d.regionen.nichtZuordenbar.ohneAngebot, 1);
  assert.equal(d.regionen.nichtZuordenbar.betrag, 500);
});

test("Rechnung vor dem Angebotsdatum ist ein Datenwiderspruch: kein Treffer, bleibt im Nenner", () => {
  const d = berechneDashboard([angebot(1, "2024-05-10")], [rechnung(1, "2024-05-01"), rechnung(1, "2024-05-20")], opt());
  assert.equal(d.quote.aktuell.widerspruch, 1);
  assert.deepEqual([d.quote.aktuell.zaehler, d.quote.aktuell.nenner], [0, 1]);
});

test("Beträge: fehlend und echte Null getrennt, Mittel direkt über die Rechnungen, Währungen nicht addiert", () => {
  const s = betragsStatistik([100, 0, null, 300]);
  assert.deepEqual([s.rechnungen, s.gueltig, s.fehlend, s.nullbetraege], [4, 3, 1, 1]);
  assert.equal(s.summe, 400);
  assert.equal(s.mittel, 133.33);
  assert.equal(s.median, 100);
  assert.equal(betragsStatistik([10.1, 10.2]).median, 10.15);
  assert.equal(betragsStatistik([]).mittel, null);
  assert.equal(betragsStatistik([0.1, 0.2]).summe, 0.3, "keine Gleitkomma-Abweichung");

  const r = [rechnung(null, "2024-03-01", 100), rechnung(null, "2024-03-02", null), rechnung(null, "2024-03-03", 0), rechnung(null, "2024-03-04", 900, { waehrung: "CHF" }), rechnung(null, null, 77)];
  const d = berechneDashboard([], r, opt());
  assert.equal(d.waehrung, "EUR");
  assert.equal(d.rechnungen.wert, 4, "alle datierten Rechnungen im Zeitraum, alle Währungen");
  assert.equal(d.betrag.statistik.summe, 100, "CHF wird nicht addiert");
  assert.equal(d.betrag.statistik.fehlend, 1);
  assert.equal(d.betrag.statistik.nullbetraege, 1);
  assert.deepEqual(d.andereWaehrungen, [{ waehrung: "CHF", rechnungen: 1, summe: 900 }]);
  assert.equal(d.ohneDatum.rechnungen, 1);
  assert.equal(d.ohneDatum.rechnungenBetrag, 77);
});

test("Gebiete: führende Nullen bleiben, unbekanntes Land wird benannt, kein Erraten", () => {
  assert.equal(gebietVon(null, "01067").label, "Land unbekannt · PLZ 01");
  assert.equal(gebietVon("d", "51103").label, "Land D · PLZ 51");
  assert.equal(gebietVon("Köln", "51103").land, null, "Fehleingabe im Länderfeld ist kein Land");
  assert.equal(gebietVon("5096", "50968").land, null);
  assert.equal(gebietVon(null, null).label, "PLZ fehlt oder nicht lesbar");
  assert.equal(gebietVon("D", " A-1010").plz2, null);
  assert.notEqual(gebietVon("A", "1010").schluessel, gebietVon(null, "10115").schluessel, "gleiche Ziffern, anderes Land = anderes Gebiet");
});

test("Regionen: je Angebot und Perspektive genau ein Gebiet; Summen stimmen mit der Gesamtübersicht überein", () => {
  const a = [
    angebot(1, "2024-01-15", { bela_plz: "01067", entla_plz: "51103" }),
    angebot(2, "2024-01-20", { bela_plz: "01099", entla_plz: null }),
    angebot(3, "2024-07-01", { bela_plz: null }),
    angebot(4, "2024-07-02", { bela_lkz: "CH", bela_plz: "8001" }),
  ];
  const r = [rechnung(1, "2024-02-01", 1000), rechnung(2, "2024-03-01", 500), rechnung(3, "2024-08-01", 250), rechnung(null, "2024-08-02", 125), rechnung(4, "2024-09-01", null)];
  const d = berechneDashboard(a, r, opt());
  const zeile = (label) => d.regionen.zeilen.find((z) => z.label === label);
  assert.equal(zeile("Land unbekannt · PLZ 01").angebote, 2);
  assert.equal(zeile("Land unbekannt · PLZ 01").betrag, 1500);
  assert.equal(zeile("Land unbekannt · PLZ 01").monate[0].angebote, 2, "Januar, nach Angebotsmonat");
  assert.equal(zeile("Land unbekannt · PLZ 01").monate[1].betrag, 1000, "Februar, nach Rechnungsmonat");
  assert.equal(zeile("PLZ fehlt oder nicht lesbar").angebote, 1);
  assert.equal(zeile("Land CH · PLZ 80").angebote, 1);
  assert.equal(d.regionen.zeilen.reduce((s, z) => s + z.angebote, 0), d.angebote.wert, "Angebote: Regionen = Gesamt");
  assert.equal(d.regionen.summeBetrag, d.betrag.statistik.summe, "Betrag: Regionen + nicht zuordenbar = Gesamt");
  const q = quotenSumme(d.regionen.zeilen.map((z) => z.quote));
  assert.deepEqual([q.zaehler, q.nenner], [d.quote.aktuell.zaehler, d.quote.aktuell.nenner], "Quote aus summierten Zählern und Nennern");

  const e = berechneDashboard(a, r, opt({ perspektive: "entladestelle" }));
  assert.equal(e.regionen.zeilen.find((z) => z.label === "Land unbekannt · PLZ 51").angebote, 1);
  assert.equal(e.regionen.zeilen.reduce((s, z) => s + z.angebote, 0), 4);
  assert.equal(e.regionen.summeBetrag, e.betrag.statistik.summe);
});

test("Saison-Heatmap und Monatsverlauf stimmen mit den Gesamtwerten überein, auch bei Teilmonaten", () => {
  const a = [], r = [];
  let id = 1;
  for (let m = 1; m <= 12; m++) {
    for (const jahr of [2023, 2024]) {
      const mm = String(m).padStart(2, "0");
      a.push(angebot(id, `${jahr}-${mm}-05`), angebot(id + 1, `${jahr}-${mm}-25`));
      r.push(rechnung(id, `${jahr}-${mm}-10`, 100 * m + (jahr - 2023)), rechnung(id + 1, `${jahr}-${mm}-28`, 50));
      id += 2;
    }
  }
  const d = berechneDashboard(a, r, opt({ von: "2023-03-15", bis: "2024-10-20" }));
  const im = d.saison.filter((z) => z.lage !== "ausserhalb");
  const cent = (x) => Math.round(x * 100);
  assert.equal(im.reduce((s, z) => s + z.statistik.rechnungen, 0), d.rechnungen.wert);
  assert.equal(im.reduce((s, z) => s + cent(z.statistik.summe), 0), cent(d.betrag.statistik.summe));
  assert.equal(im.reduce((s, z) => s + z.angebote, 0), d.angebote.wert);
  const q = quotenSumme(im.map((z) => z.quote));
  assert.deepEqual([q.zaehler, q.nenner], [d.quote.aktuell.zaehler, d.quote.aktuell.nenner]);
  assert.equal(d.monate.reduce((s, z) => s + cent(z.statistik.summe), 0), cent(d.betrag.statistik.summe));
  assert.equal(d.kalendermonate.reduce((s, z) => s + z.statistik.rechnungen, 0), d.rechnungen.wert);
  assert.equal(d.saison.find((z) => z.jahr === 2023 && z.monat === 3).lage, "teilweise");
  assert.equal(d.saison.find((z) => z.jahr === 2023 && z.monat === 1).lage, "ausserhalb");
  assert.equal(d.monate[0].teil, true);
  assert.equal(d.monate[0].statistik.rechnungen, 1, "März 2023 ab dem 15.: nur die Rechnung vom 28.");
});

test("Vorjahresvergleich: laufende Periode bis zum selben Kalendertag, Quote mit gleichem Reifegrad", () => {
  const stichtag = "2026-08-15";
  const a = [], r = [];
  let id = 1;
  for (const jahr of [2025, 2026]) {
    for (const tag of ["01-10", "02-10", "03-10", "08-10", "08-20", "11-10"]) {
      a.push(angebot(id, `${jahr}-${tag}`));
      r.push(rechnung(id, plusTage(`${jahr}-${tag}`, 5), 1000));
      id++;
    }
  }
  const d = berechneDashboard(a, r, opt({ von: "2026-01-01", bis: "2026-12-31", stichtag }));
  assert.equal(d.zeitraum.vjBis, "2025-08-15");
  assert.equal(d.angebote.wert, 4, "2026 bis 15.08.");
  assert.equal(d.angebote.vorjahr, 4, "2025 bis 15.08., nicht das ganze Jahr");
  assert.equal(d.angebote.absolut, 0);
  // Reif sind 2026 nur Angebote bis 16.02.2026; im Vorjahr gilt dieselbe Grenze (16.02.2025).
  assert.equal(d.zeitraum.reifBis, plusTage(stichtag, -180));
  assert.equal(d.quote.aktuell.nenner, 2);
  assert.equal(d.quote.vorjahr.nenner, 2);
  assert.equal(d.quote.differenzPunkte, 0);
  assert.equal(d.rechnungen.vorjahr, 4);

  const leer = berechneDashboard([angebot(1, "2026-03-01")], [rechnung(1, "2026-03-02", 10)], opt({ von: "2026-01-01", bis: "2026-12-31", stichtag }));
  assert.equal(leer.betrag.summe.relativ, null, "Vorjahresbasis 0: keine relative Veränderung");
  assert.equal(leer.betrag.summe.absolut, 10);
});

test("Datumshilfen: Schaltjahr, Stichtag, Zeitraum-Vorgaben", () => {
  assert.equal(plusJahre("2024-02-29", -1), "2023-02-28");
  assert.equal(plusJahre("2024-02-29", 4), "2028-02-29");
  assert.equal(tagNr("2024-02-30"), null);
  assert.equal(tagNr(null), null);
  assert.equal(datenstichtag([angebot(1, "2026-11-17"), angebot(2, "2031-01-01")], [rechnung(1, "2026-11-10")], "2026-11-18"), "2026-11-17", "Zukunftsdaten sind kein Datenstand");
  assert.deepEqual(zeitraumJahre("2026-11-17", 2), { von: "2024-11-18", bis: "2026-11-17" });
});

import { darfDashboardSehen } from "./zugriff.ts";

test("Zugriff: nur Administratoren; nicht angemeldet und reguläre Nutzer erhalten nichts", () => {
  assert.equal(darfDashboardSehen(null), false, "nicht angemeldet oder gesperrt");
  assert.equal(darfDashboardSehen(undefined), false);
  assert.equal(darfDashboardSehen({ rolle: "nutzer" }), false, "regulärer Nutzer");
  assert.equal(darfDashboardSehen({ rolle: "Admin" }), false, "nur der exakte Rollenwert");
  assert.equal(darfDashboardSehen({ rolle: "admin" }), true);
});
