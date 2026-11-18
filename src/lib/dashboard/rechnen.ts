// Kennzahlen des Geschäftsleitungs-Dashboards. Reine Funktionen ohne Abhängigkeiten:
// laufen auf dem Server (src/lib/dashboard/laden.ts) und in den Tests (rechnen.test.mjs) mit synthetischen Daten.
//
// Verbindliche Definition der 180-Tage-Fakturierungsquote:
//   „Anteil der auswertbaren Angebote, zu denen vom Angebotstag bis einschließlich Tag 180 eine erste eindeutig
//    zugeordnete Rechnung vorliegt.“
//   Nenner  = Angebote der Kohorte (Auswahl nach Angebotsdatum) mit gültigem Angebotsdatum, verlässlicher
//             Zuordnungsgrundlage (eindeutige, nicht leere Angebotsnummer), kein Entwurf, und deren 180-Tage-Fenster
//             am Datenstichtag vollständig abgelaufen ist. Ein auswertbares Angebot ohne Rechnung bleibt im Nenner.
//   Zähler  = Angebote des Nenners, deren ERSTE datierte, eindeutig zugeordnete Rechnung an Tag 0 bis 180 liegt.
//             Mehrere Rechnungen ergeben höchstens einen Treffer. Liegt die erste Rechnung vor dem Angebotsdatum,
//             ist das ein Datenwiderspruch: kein Treffer, das Angebot bleibt im Nenner und wird ausgewiesen.

export const FENSTER_TAGE = 180;
export const KLEINE_FALLZAHL = 5;

export type Perspektive = "beladestelle" | "entladestelle";

/** Ein Angebot, auf das Nötigste reduziert (keine Namen, keine Straßen). */
export type AngebotRoh = {
  id: number;
  angebotnr: string | null;
  angebotsdatum: string | null; // JJJJ-MM-TT
  entwurf: boolean;
  bela_lkz: string | null;
  bela_plz: string | null;
  entla_lkz: string | null;
  entla_plz: string | null;
};

export type RechnungRoh = {
  id: number;
  angebot_id: number | null;
  rechnungsdatum: string | null; // JJJJ-MM-TT
  gesamtsumme: number | null; // gespeicherter Rechnungsendbetrag (brutto)
  waehrung: string | null;
};

export type Optionen = {
  von: string;
  bis: string;
  stichtag: string; // Datenstichtag
  perspektive: Perspektive;
  fenster?: number;
  kleineFallzahl?: number;
};

// ---------------------------------------------------------------- Datum
const ISO = /^(\d{4})-(\d{2})-(\d{2})/;

/** Tagesnummer (Tage seit 1970, UTC) oder null bei ungültigem Datum. */
export function tagNr(iso: string | null | undefined): number | null {
  const m = iso ? ISO.exec(iso) : null;
  if (!m) return null;
  const j = Number(m[1]), mo = Number(m[2]), t = Number(m[3]);
  const d = Date.UTC(j, mo - 1, t);
  const pruef = new Date(d);
  if (pruef.getUTCFullYear() !== j || pruef.getUTCMonth() !== mo - 1 || pruef.getUTCDate() !== t) return null;
  return Math.round(d / 86_400_000);
}
export function vonTagNr(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}
export function plusTage(iso: string, tage: number): string {
  return vonTagNr((tagNr(iso) as number) + tage);
}
/** Gleicher Kalendertag n Jahre später/früher; der 29.2. wird in Nicht-Schaltjahren zum 28.2. */
export function plusJahre(iso: string, jahre: number): string {
  const m = ISO.exec(iso) as RegExpExecArray;
  const j = Number(m[1]) + jahre, mo = Number(m[2]);
  let t = Number(m[3]);
  const letzter = new Date(Date.UTC(j, mo, 0)).getUTCDate();
  if (t > letzter) t = letzter;
  return `${String(j).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(t).padStart(2, "0")}`;
}
export const monatVon = (iso: string) => iso.slice(0, 7);
function monatsListe(von: string, bis: string): string[] {
  const liste: string[] = [];
  let j = Number(von.slice(0, 4)), m = Number(von.slice(5, 7));
  const ende = monatVon(bis);
  for (;;) {
    const k = `${j}-${String(m).padStart(2, "0")}`;
    if (k > ende) break;
    liste.push(k);
    m++;
    if (m > 12) { m = 1; j++; }
  }
  return liste;
}
function monatsEnde(monat: string): string {
  const j = Number(monat.slice(0, 4)), m = Number(monat.slice(5, 7));
  return `${monat}-${String(new Date(Date.UTC(j, m, 0)).getUTCDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------- Beträge
export type BetragsStatistik = {
  rechnungen: number; // alle Rechnungen der Auswahl (jede zählt einmal), Hauptwährung
  gueltig: number; // mit gespeichertem Betrag (auch 0)
  fehlend: number; // ohne gespeicherten Betrag: zählen als Rechnung, nicht im Betrag
  nullbetraege: number; // gespeicherter Betrag exakt 0 (gültig, im Mittel enthalten)
  summe: number;
  mittel: number | null; // Summe / gültig, direkt über die Rechnungen
  median: number | null;
};

const cent = (x: number) => Math.round(x * 100);

export function betragsStatistik(betraege: (number | null)[]): BetragsStatistik {
  const gueltig = betraege.filter((b): b is number => typeof b === "number" && Number.isFinite(b));
  const centWerte = gueltig.map(cent).sort((a, b) => a - b);
  const summeCent = centWerte.reduce((s, c) => s + c, 0);
  const n = centWerte.length;
  const median = n === 0 ? null : n % 2 ? centWerte[(n - 1) / 2] / 100 : Math.round((centWerte[n / 2 - 1] + centWerte[n / 2]) / 2) / 100;
  return {
    rechnungen: betraege.length,
    gueltig: n,
    fehlend: betraege.length - n,
    nullbetraege: centWerte.filter((c) => c === 0).length,
    summe: summeCent / 100,
    mittel: n ? Math.round(summeCent / n) / 100 : null,
    median,
  };
}

// ---------------------------------------------------------------- Zuordnung und Quote
export type Zuordnungsbasis = "eindeutig" | "ohne_nummer" | "mehrdeutig";

export type Quote = {
  zaehler: number;
  nenner: number;
  wert: number | null; // zaehler / nenner, null = nicht berechenbar
  // Angebote der Kohorte, die NICHT im Nenner sind, mit Fallzahl:
  zuJung: number; // 180-Tage-Fenster am Stichtag noch nicht abgelaufen
  entwuerfe: number;
  ohneNummer: number; // keine Angebotsnummer: keine Zuordnungsgrundlage
  mehrdeutig: number; // Angebotsnummer mehrfach vergeben
  // Angebote IM Nenner ohne Treffer, aufgeschlüsselt:
  ohneRechnung: number;
  spaeter: number; // erste Rechnung nach Tag 180
  widerspruch: number; // erste Rechnung vor dem Angebotsdatum
};

const leereQuote = (): Quote => ({ zaehler: 0, nenner: 0, wert: null, zuJung: 0, entwuerfe: 0, ohneNummer: 0, mehrdeutig: 0, ohneRechnung: 0, spaeter: 0, widerspruch: 0 });
function quoteFertig(q: Quote): Quote {
  q.wert = q.nenner > 0 ? q.zaehler / q.nenner : null;
  return q;
}
/** Quoten zusammenfassen: immer aus summierten Zählern und Nennern, nie als Mittel von Quoten. */
export function quotenSumme(teile: Quote[]): Quote {
  const q = leereQuote();
  for (const t of teile) {
    q.zaehler += t.zaehler; q.nenner += t.nenner; q.zuJung += t.zuJung; q.entwuerfe += t.entwuerfe; q.ohneNummer += t.ohneNummer;
    q.mehrdeutig += t.mehrdeutig; q.ohneRechnung += t.ohneRechnung; q.spaeter += t.spaeter; q.widerspruch += t.widerspruch;
  }
  return quoteFertig(q);
}

type AngebotAufbereitet = AngebotRoh & {
  tag: number | null;
  basis: Zuordnungsbasis;
  /** Tagesabstand der ersten datierten, eindeutig zugeordneten Rechnung (bis zum Stichtag); null = keine. */
  ersteRechnungAbstand: number | null;
};

export type Gebiet = { schluessel: string; land: string | null; plz2: string | null; label: string };
const GEBIET_OHNE_PLZ = "–|–";

/** Land und zweistelliges PLZ-Präfix aus den erfassten Feldern. Führende Nullen bleiben erhalten. Kein Erraten des Landes. */
export function gebietVon(lkz: string | null, plz: string | null): Gebiet {
  const l = (lkz ?? "").trim().toUpperCase();
  const land = /^[A-ZÄÖÜ]{1,3}$/.test(l) ? l : null;
  const p = (plz ?? "").trim();
  const plz2 = /^\d{2}/.test(p) ? p.slice(0, 2) : null;
  if (!plz2) return { schluessel: GEBIET_OHNE_PLZ, land: null, plz2: null, label: "PLZ fehlt oder nicht lesbar" };
  return { schluessel: `${land ?? "?"}|${plz2}`, land, plz2, label: `${land ? `Land ${land}` : "Land unbekannt"} · PLZ ${plz2}` };
}

// ---------------------------------------------------------------- Ergebnis
export type Vergleich = { wert: number; vorjahr: number; absolut: number; relativ: number | null /* null = Vorjahresbasis 0 */ };
const vergleich = (wert: number, vorjahr: number): Vergleich => ({ wert, vorjahr, absolut: Math.round((wert - vorjahr) * 100) / 100, relativ: vorjahr !== 0 ? (wert - vorjahr) / Math.abs(vorjahr) : null });

export type MonatsWert = {
  monat: string; // JJJJ-MM
  teil: boolean; // Monat liegt nur teilweise im Zeitraum
  statistik: BetragsStatistik;
  vorjahr: { rechnungen: number; summe: number }; // gleicher Monat im Vorjahr, bei Teilmonat bis zum selben Kalendertag
};

export type KalenderMonat = { monat: number; statistik: BetragsStatistik };

export type SaisonZelle = {
  jahr: number;
  monat: number; // 1..12
  lage: "im_zeitraum" | "teilweise" | "ausserhalb";
  statistik: BetragsStatistik; // nach Rechnungsmonat
  angebote: number; // nach Angebotsmonat
  quote: Quote; // nach Angebotsmonat
};

export type RegionZelle = { angebote: number; quote: Quote; rechnungen: number; gueltig: number; betrag: number };
export type RegionZeile = Gebiet & {
  angebote: number;
  quote: Quote;
  rechnungen: number;
  betrag: number; // eindeutig zugeordneter Rechnungsbetrag (nach Rechnungsdatum im Zeitraum)
  vorjahr: { angebote: number; quote: Quote; betrag: number };
  monate: RegionZelle[]; // 12 Kalendermonate, über die Jahre des Zeitraums zusammengefasst
};

export type Dashboard = {
  zeitraum: { von: string; bis: string; effBis: string; vjVon: string; vjBis: string; stichtag: string; reifBis: string; vjReifBis: string; fenster: number; kleineFallzahl: number; perspektive: Perspektive; jahre: number[] };
  waehrung: string | null; // Hauptwährung der Beträge
  andereWaehrungen: { waehrung: string; rechnungen: number; summe: number }[]; // nicht in den Beträgen enthalten
  angebote: Vergleich; // nach Angebotsdatum
  rechnungen: Vergleich; // nach Rechnungsdatum, alle Währungen
  betrag: { statistik: BetragsStatistik; vorjahr: BetragsStatistik; summe: Vergleich; mittel: Vergleich | null; median: Vergleich | null };
  quote: { aktuell: Quote; vorjahr: Quote; differenzPunkte: number | null };
  ohneDatum: { angebote: number; rechnungen: number; rechnungenBetrag: number }; // gesamter Bestand, in keinem Zeitraum enthalten
  monate: MonatsWert[];
  kalendermonate: KalenderMonat[];
  saison: SaisonZelle[];
  regionen: {
    zeilen: RegionZeile[];
    nichtZuordenbar: { rechnungen: number; betrag: number; ohneAngebot: number; mehrdeutig: number; vorjahrBetrag: number };
    summeBetrag: number; // Zeilen + nicht zuordenbar = Betrag der Gesamtübersicht
  };
};

// ---------------------------------------------------------------- Hauptfunktion
export function berechneDashboard(angeboteRoh: AngebotRoh[], rechnungenRoh: RechnungRoh[], opt: Optionen): Dashboard {
  const fenster = opt.fenster ?? FENSTER_TAGE;
  const kleineFallzahl = opt.kleineFallzahl ?? KLEINE_FALLZAHL;
  const stichtagNr = tagNr(opt.stichtag) as number;
  const von = opt.von;
  const bis = opt.bis < von ? von : opt.bis;
  const effBis = bis > opt.stichtag ? opt.stichtag : bis; // nichts nach dem Datenstichtag
  const vjVon = plusJahre(von, -1);
  const vjBis = plusJahre(effBis, -1); // laufende Periode: gleicher Kalendertag im Vorjahr
  const reifBis = vonTagNr(stichtagNr - fenster); // jüngstes Angebotsdatum mit abgelaufenem Fenster
  const vjReifBis = plusJahre(reifBis, -1); // gleicher Reifegrad für die Vorjahreskohorte

  // --- Zuordnungsgrundlage je Angebot
  const nrAnzahl = new Map<string, number>();
  for (const a of angeboteRoh) {
    const nr = (a.angebotnr ?? "").trim();
    if (nr) nrAnzahl.set(nr, (nrAnzahl.get(nr) ?? 0) + 1);
  }
  const angebote = new Map<number, AngebotAufbereitet>();
  for (const a of angeboteRoh) {
    const nr = (a.angebotnr ?? "").trim();
    const basis: Zuordnungsbasis = !nr ? "ohne_nummer" : (nrAnzahl.get(nr) ?? 0) > 1 ? "mehrdeutig" : "eindeutig";
    angebote.set(a.id, { ...a, tag: tagNr(a.angebotsdatum), basis, ersteRechnungAbstand: null });
  }

  // --- Rechnungen aufbereiten; erste eindeutig zugeordnete, datierte Rechnung je Angebot (nur bis zum Stichtag)
  type R = RechnungRoh & { tag: number | null; waehrungKey: string; zuordnung: "eindeutig" | "ohne_angebot" | "mehrdeutig" };
  const rechnungen: R[] = rechnungenRoh.map((r) => {
    const a = r.angebot_id != null ? angebote.get(r.angebot_id) : undefined;
    const zuordnung = !a ? "ohne_angebot" : a.basis === "eindeutig" ? "eindeutig" : "mehrdeutig";
    return { ...r, tag: tagNr(r.rechnungsdatum), waehrungKey: (r.waehrung ?? "").trim().toUpperCase() || "ohne Angabe", zuordnung };
  });
  const ersteTag = new Map<number, number>();
  for (const r of rechnungen) {
    if (r.zuordnung !== "eindeutig" || r.tag == null || r.tag > stichtagNr) continue;
    const bisher = ersteTag.get(r.angebot_id as number);
    if (bisher == null || r.tag < bisher) ersteTag.set(r.angebot_id as number, r.tag);
  }
  for (const [id, t] of ersteTag) {
    const a = angebote.get(id) as AngebotAufbereitet;
    if (a.tag != null) a.ersteRechnungAbstand = t - a.tag;
  }

  // --- Hauptwährung: die häufigste unter den datierten Rechnungen
  const jeWaehrung = new Map<string, number>();
  for (const r of rechnungen) jeWaehrung.set(r.waehrungKey, (jeWaehrung.get(r.waehrungKey) ?? 0) + 1);
  const waehrung = [...jeWaehrung.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

  // --- Bausteine
  const quoteVon = (liste: AngebotAufbereitet[], reifGrenze: string): Quote => {
    const q = leereQuote();
    const grenzeNr = tagNr(reifGrenze) as number;
    for (const a of liste) {
      if (a.tag == null) continue; // ohne Datum in keiner Kohorte
      if (a.entwurf) { q.entwuerfe++; continue; }
      if (a.basis === "ohne_nummer") { q.ohneNummer++; continue; }
      if (a.basis === "mehrdeutig") { q.mehrdeutig++; continue; }
      if (a.tag > grenzeNr) { q.zuJung++; continue; }
      q.nenner++;
      const d = a.ersteRechnungAbstand;
      if (d == null) q.ohneRechnung++;
      else if (d < 0) q.widerspruch++;
      else if (d <= fenster) q.zaehler++;
      else q.spaeter++;
    }
    return quoteFertig(q);
  };
  const imBereich = (iso: string | null, a: string, b: string) => iso != null && iso.slice(0, 10) >= a && iso.slice(0, 10) <= b;
  const alleAngebote = [...angebote.values()];
  const angeboteIn = (a: string, b: string) => alleAngebote.filter((x) => x.tag != null && imBereich(x.angebotsdatum, a, b));
  const rechnungenIn = (a: string, b: string) => rechnungen.filter((x) => x.tag != null && imBereich(x.rechnungsdatum, a, b));
  const inHaupt = (r: R) => r.waehrungKey === waehrung;
  const statistikVon = (liste: R[]) => betragsStatistik(liste.filter(inHaupt).map((r) => r.gesamtsumme));

  const angAkt = angeboteIn(von, effBis);
  const angVj = angeboteIn(vjVon, vjBis);
  const reAkt = rechnungenIn(von, effBis);
  const reVj = rechnungenIn(vjVon, vjBis);
  const statAkt = statistikVon(reAkt);
  const statVj = statistikVon(reVj);
  const quoteAkt = quoteVon(angAkt, reifBis);
  const quoteVj = quoteVon(angVj, vjReifBis);

  const andere = new Map<string, R[]>();
  for (const r of reAkt) if (!inHaupt(r)) andere.set(r.waehrungKey, [...(andere.get(r.waehrungKey) ?? []), r]);

  // --- Monatsverlauf (nach Rechnungsmonat)
  const monate: MonatsWert[] = monatsListe(von, effBis).map((m) => {
    const a = m + "-01" < von ? von : m + "-01";
    const b = monatsEnde(m) > effBis ? effBis : monatsEnde(m);
    const teil = a !== m + "-01" || b !== monatsEnde(m);
    const vj = rechnungenIn(plusJahre(a, -1), teil ? plusJahre(b, -1) : monatsEnde(monatVon(plusJahre(a, -1))));
    const vjStat = statistikVon(vj);
    return { monat: m, teil, statistik: statistikVon(rechnungenIn(a, b)), vorjahr: { rechnungen: vj.length, summe: vjStat.summe } };
  });

  // --- Kalendermonate über den ganzen Zeitraum (Mittel direkt über die Rechnungen)
  const kalendermonate: KalenderMonat[] = Array.from({ length: 12 }, (_, i) => ({
    monat: i + 1,
    statistik: statistikVon(reAkt.filter((r) => Number((r.rechnungsdatum as string).slice(5, 7)) === i + 1)),
  }));

  // --- Saison: Jahr × Monat
  const jahre: number[] = [];
  for (let j = Number(von.slice(0, 4)); j <= Number(effBis.slice(0, 4)); j++) jahre.push(j);
  const saison: SaisonZelle[] = [];
  for (const jahr of jahre) {
    for (let m = 1; m <= 12; m++) {
      const mon = `${jahr}-${String(m).padStart(2, "0")}`;
      const erster = mon + "-01", letzter = monatsEnde(mon);
      const a = erster < von ? von : erster;
      const b = letzter > effBis ? effBis : letzter;
      const lage: SaisonZelle["lage"] = a > b ? "ausserhalb" : a === erster && b === letzter ? "im_zeitraum" : "teilweise";
      const ang = lage === "ausserhalb" ? [] : angeboteIn(a, b);
      saison.push({
        jahr, monat: m, lage,
        statistik: lage === "ausserhalb" ? betragsStatistik([]) : statistikVon(rechnungenIn(a, b)),
        angebote: ang.length,
        quote: quoteVon(ang, reifBis),
      });
    }
  }

  // --- Regionen: Gebiet × Kalendermonat
  const gebietDes = (a: AngebotAufbereitet): Gebiet => (opt.perspektive === "beladestelle" ? gebietVon(a.bela_lkz, a.bela_plz) : gebietVon(a.entla_lkz, a.entla_plz));
  type Sammler = { gebiet: Gebiet; ang: AngebotAufbereitet[]; angVj: AngebotAufbereitet[]; re: R[]; reVj: R[] };
  const sammler = new Map<string, Sammler>();
  const hole = (g: Gebiet) => {
    let s = sammler.get(g.schluessel);
    if (!s) { s = { gebiet: g, ang: [], angVj: [], re: [], reVj: [] }; sammler.set(g.schluessel, s); }
    return s;
  };
  for (const a of angAkt) hole(gebietDes(a)).ang.push(a);
  for (const a of angVj) hole(gebietDes(a)).angVj.push(a);
  const nz = { rechnungen: 0, betrag: 0, ohneAngebot: 0, mehrdeutig: 0, vorjahrBetrag: 0 };
  const nzBetraege: (number | null)[] = [], nzVj: (number | null)[] = [];
  for (const r of reAkt.filter(inHaupt)) {
    if (r.zuordnung === "eindeutig") hole(gebietDes(angebote.get(r.angebot_id as number) as AngebotAufbereitet)).re.push(r);
    else { nz.rechnungen++; if (r.zuordnung === "ohne_angebot") nz.ohneAngebot++; else nz.mehrdeutig++; nzBetraege.push(r.gesamtsumme); }
  }
  for (const r of reVj.filter(inHaupt)) {
    if (r.zuordnung === "eindeutig") hole(gebietDes(angebote.get(r.angebot_id as number) as AngebotAufbereitet)).reVj.push(r);
    else nzVj.push(r.gesamtsumme);
  }
  nz.betrag = betragsStatistik(nzBetraege).summe;
  nz.vorjahrBetrag = betragsStatistik(nzVj).summe;
  const monatDes = (iso: string | null) => Number((iso as string).slice(5, 7));
  const zeilen: RegionZeile[] = [...sammler.values()].map((s) => {
    const st = betragsStatistik(s.re.map((r) => r.gesamtsumme));
    return {
      ...s.gebiet,
      angebote: s.ang.length,
      quote: quoteVon(s.ang, reifBis),
      rechnungen: s.re.length,
      betrag: st.summe,
      vorjahr: { angebote: s.angVj.length, quote: quoteVon(s.angVj, vjReifBis), betrag: betragsStatistik(s.reVj.map((r) => r.gesamtsumme)).summe },
      monate: Array.from({ length: 12 }, (_, i) => {
        const ang = s.ang.filter((a) => monatDes(a.angebotsdatum) === i + 1);
        const re = s.re.filter((r) => monatDes(r.rechnungsdatum) === i + 1);
        const stM = betragsStatistik(re.map((r) => r.gesamtsumme));
        return { angebote: ang.length, quote: quoteVon(ang, reifBis), rechnungen: re.length, gueltig: stM.gueltig, betrag: stM.summe };
      }),
    };
  }).sort((a, b) => b.angebote - a.angebote || a.schluessel.localeCompare(b.schluessel));
  const summeBetrag = Math.round((zeilen.reduce((s, z) => s + cent(z.betrag), 0) + cent(nz.betrag))) / 100;

  // --- Bestand ohne Datum (in keinem Zeitraum enthalten)
  const reOhneDatum = rechnungen.filter((r) => r.tag == null);

  return {
    zeitraum: { von, bis, effBis, vjVon, vjBis, stichtag: opt.stichtag, reifBis, vjReifBis, fenster, kleineFallzahl, perspektive: opt.perspektive, jahre },
    waehrung,
    andereWaehrungen: [...andere.entries()].map(([w, liste]) => ({ waehrung: w, rechnungen: liste.length, summe: betragsStatistik(liste.map((r) => r.gesamtsumme)).summe })),
    angebote: vergleich(angAkt.length, angVj.length),
    rechnungen: vergleich(reAkt.length, reVj.length),
    betrag: {
      statistik: statAkt,
      vorjahr: statVj,
      summe: vergleich(statAkt.summe, statVj.summe),
      mittel: statAkt.mittel != null && statVj.mittel != null ? vergleich(statAkt.mittel, statVj.mittel) : null,
      median: statAkt.median != null && statVj.median != null ? vergleich(statAkt.median, statVj.median) : null,
    },
    quote: { aktuell: quoteAkt, vorjahr: quoteVj, differenzPunkte: quoteAkt.wert != null && quoteVj.wert != null ? (quoteAkt.wert - quoteVj.wert) * 100 : null },
    ohneDatum: { angebote: alleAngebote.filter((a) => a.tag == null).length, rechnungen: reOhneDatum.length, rechnungenBetrag: betragsStatistik(reOhneDatum.map((r) => r.gesamtsumme)).summe },
    monate,
    kalendermonate,
    saison,
    regionen: { zeilen, nichtZuordenbar: nz, summeBetrag },
  };
}

/** Datenstichtag: das jüngste Angebots- oder Rechnungsdatum im Bestand, höchstens heute. */
export function datenstichtag(angebote: AngebotRoh[], rechnungen: RechnungRoh[], heute: string): string {
  let max = "";
  for (const a of angebote) if (a.angebotsdatum && tagNr(a.angebotsdatum) != null && a.angebotsdatum.slice(0, 10) > max && a.angebotsdatum.slice(0, 10) <= heute) max = a.angebotsdatum.slice(0, 10);
  for (const r of rechnungen) if (r.rechnungsdatum && tagNr(r.rechnungsdatum) != null && r.rechnungsdatum.slice(0, 10) > max && r.rechnungsdatum.slice(0, 10) <= heute) max = r.rechnungsdatum.slice(0, 10);
  return max || heute;
}

/** Zeitraum-Vorgaben: die letzten n Jahre bis zum Datenstichtag (taggenau). */
export function zeitraumJahre(stichtag: string, jahre: number): { von: string; bis: string } {
  return { von: plusTage(plusJahre(stichtag, -jahre), 1), bis: stichtag };
}
