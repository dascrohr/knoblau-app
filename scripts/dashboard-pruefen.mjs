// Gleicht die Dashboard-Berechnung (src/lib/dashboard/rechnen.ts) mit direkten SQL-Zählungen auf dem Bestand ab.
// Gibt nur Zahlen aus. Liest nur. Aufruf: node --experimental-strip-types scripts/dashboard-pruefen.mjs
import { verbinde } from "./db.mjs";
import { berechneDashboard, datenstichtag, zeitraumJahre, quotenSumme } from "../src/lib/dashboard/rechnen.ts";
const c = await verbinde();
const q = async (sql, p) => (await c.query(sql, p)).rows;
const angebote = (await q(`select a.id, a.angebotnr, to_char(a.angebotsdatum,'YYYY-MM-DD') angebotsdatum, a.entwurf,
  b.lkz bela_lkz, b.plz bela_plz, e.lkz entla_lkz, e.plz entla_plz
  from app.angebote a left join app.angebot_adressen b on b.angebot_id=a.id and b.art='beladestelle' left join app.angebot_adressen e on e.angebot_id=a.id and e.art='entladestelle'`)).map((r) => ({ ...r, id: Number(r.id) }));
const rechnungen = (await q(`select id, angebot_id, to_char(rechnungsdatum,'YYYY-MM-DD') rechnungsdatum, gesamtsumme, waehrung from app.rechnungen`)).map((r) => ({ ...r, id: Number(r.id), angebot_id: r.angebot_id == null ? null : Number(r.angebot_id), gesamtsumme: r.gesamtsumme == null ? null : Number(r.gesamtsumme) }));
const heute = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
const stichtag = datenstichtag(angebote, rechnungen, heute);
let ok = true;
const gleich = (name, a, b) => { const passt = Math.abs(Number(a) - Number(b)) < 0.005; ok &&= passt; console.log(`${passt ? "ok " : "ABWEICHUNG"} ${name}: Dashboard ${a} / SQL ${b}`); };
for (const jahre of [2, 5, 10]) {
  const { von, bis } = zeitraumJahre(stichtag, jahre);
  const t0 = Date.now();
  const d = berechneDashboard(angebote, rechnungen, { von, bis, stichtag, perspektive: "beladestelle" });
  const ms = Date.now() - t0;
  const [s] = await q(`select (select count(*) from app.angebote where angebotsdatum between $1 and $2) angebote,
    (select count(*) from app.rechnungen where rechnungsdatum between $1 and $2) rechnungen,
    (select coalesce(sum(gesamtsumme),0) from app.rechnungen where rechnungsdatum between $1 and $2) summe,
    (select count(*) from app.rechnungen where rechnungsdatum between $1 and $2 and gesamtsumme is null) fehlend,
    (select count(*) from app.rechnungen where rechnungsdatum between $1 and $2 and gesamtsumme = 0) nullen`, [von, bis]);
  // Quote unabhängig in SQL: eindeutige Nummer, kein Entwurf, Fenster abgelaufen, erste datierte Rechnung an Tag 0..180
  const [k] = await q(`with nr as (select angebotnr from app.angebote where nullif(btrim(angebotnr),'') is not null group by 1 having count(*)=1),
    koh as (select a.id, a.angebotsdatum from app.angebote a join nr on nr.angebotnr=a.angebotnr where a.angebotsdatum between $1 and $2 and not a.entwurf and a.angebotsdatum <= $3::date - 180),
    erste as (select r.angebot_id, min(r.rechnungsdatum) d from app.rechnungen r where r.rechnungsdatum is not null and r.rechnungsdatum <= $3::date group by 1)
    select count(*) nenner, count(*) filter (where e.d - k.angebotsdatum between 0 and 180) zaehler from koh k left join erste e on e.angebot_id=k.id`, [von, bis, stichtag]);
  console.log(`--- ${jahre} Jahre: ${von} bis ${bis} (Rechenzeit ${ms} ms)`);
  gleich("Angebote", d.angebote.wert, s.angebote);
  gleich("Rechnungen", d.rechnungen.wert, s.rechnungen);
  gleich("Bruttobetrag", d.betrag.statistik.summe, s.summe);
  gleich("Rechnungen ohne Betrag", d.betrag.statistik.fehlend, s.fehlend);
  gleich("Nullbeträge", d.betrag.statistik.nullbetraege, s.nullen);
  gleich("Quote Nenner", d.quote.aktuell.nenner, k.nenner);
  gleich("Quote Zähler", d.quote.aktuell.zaehler, k.zaehler);
  const im = d.saison.filter((z) => z.lage !== "ausserhalb");
  gleich("Saison-Heatmap Summe = Gesamt", Math.round(im.reduce((x, z) => x + Math.round(z.statistik.summe * 100), 0)) / 100, d.betrag.statistik.summe);
  gleich("Regionen + nicht zuordenbar = Gesamt", d.regionen.summeBetrag, d.betrag.statistik.summe);
  gleich("Regionen Angebote = Gesamt", d.regionen.zeilen.reduce((x, z) => x + z.angebote, 0), d.angebote.wert);
  gleich("Regionen Quote Nenner = Gesamt", quotenSumme(d.regionen.zeilen.map((z) => z.quote)).nenner, d.quote.aktuell.nenner);
  const qq = d.quote.aktuell;
  console.log(`   Quote ${qq.nenner ? (qq.wert * 100).toFixed(1) + " %" : "nicht berechenbar"} · zu jung ${qq.zuJung} · mehrdeutig ${qq.mehrdeutig} · ohne Nummer ${qq.ohneNummer} · Entwürfe ${qq.entwuerfe} · Widerspruch ${qq.widerspruch} · später ${qq.spaeter} · ohne Rechnung ${qq.ohneRechnung}`);
  console.log(`   Gebiete ${d.regionen.zeilen.length} · nicht zuordenbar ${d.regionen.nichtZuordenbar.rechnungen} Rechnungen (${d.regionen.nichtZuordenbar.ohneAngebot} ohne Angebot, ${d.regionen.nichtZuordenbar.mehrdeutig} mehrdeutig) · Währung ${d.waehrung} · andere ${d.andereWaehrungen.length}`);
}
console.log(`Datenstichtag ${stichtag} · Bestand ${angebote.length} Angebote, ${rechnungen.length} Rechnungen`);
await c.end();
process.exitCode = ok ? 0 : 1;
