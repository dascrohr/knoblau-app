// Prüfsummen nach dem Import. Gibt nur Zahlen und Angebotsnummern aus (keine Personendaten).
// Exit-Code 1, wenn eine Soll-Prüfung abweicht. Der Formelvergleich am Ende ist rein informativ.
import { verbinde } from "../db.mjs";

const c = await verbinde();
let fehler = 0;
const eur = (x) => Number(x).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function pruefe(name, soll, ist, tol = 0) {
  const ok = ist !== null && ist !== undefined && Math.abs(Number(ist) - Number(soll)) <= tol;
  if (!ok) fehler++;
  console.log(`${ok ? "OK    " : "FEHLER"} ${name.padEnd(46)} erwartet ${String(soll).padStart(12)}   ist ${String(ist).padStart(12)}`);
}
const eins = async (sql, p = []) => (await c.query(sql, p)).rows[0];
const NR = "2202611023";
// Positionsformel laut Vorgabe (dokumentierte Formel)
const F_DOKU = `coalesce(anzahl,1) * coalesce(einheiten,1) * einzelpreis * (1 + coalesce(prozent,0)/100)`;
// Formel, die den Altbestand am besten trifft (siehe docs/preisformel-befund.md)
const F_ALT = `(case when coalesce(anzahl,0) = 0 then 1 else anzahl end) * coalesce(einheiten,0) * round(einzelpreis * (1 + coalesce(prozent,0)/100), 2)`;

try {
  console.log("== Zeilenzahlen");
  const z = await eins(`select (select count(*) from app.angebote where legacy_rowid is not null)::int a,
    (select count(*) from app.rechnungen where legacy_rowid is not null)::int r,
    (select count(*) from app.rechnungspositionen where legacy_rowid is not null)::int p,
    (select count(*) from app.angebote where legacy_rowid is not null and angebotnr is null)::int ohne_nr,
    (select count(*) from app.angebote where geaendert_von is not null)::int geaendert`);
  pruefe("app.angebote (importiert)", 8205, z.a);
  pruefe("app.rechnungen (importiert)", 5846, z.r);
  pruefe("app.rechnungspositionen (importiert)", 36753, z.p);
  pruefe("Angebote ohne Nummer", 60, z.ohne_nr);
  console.log(`       in der App geänderte Angebote (vom Import übersprungen): ${z.geaendert}`);

  console.log("== Summe gesamtsumme nach Jahr des Rechnungsdatums");
  const j = (await c.query(`select jahr, sum(gesamtsumme)::float s from app.rechnungen where legacy_rowid is not null and jahr in (2024,2025,2026) group by 1`)).rows;
  for (const [jahr, soll] of [[2024, 889867.36], [2025, 841140.64], [2026, 690647.36]])
    pruefe(`Rechnungen ${jahr}`, soll.toFixed(2), (j.find((x) => x.jahr === jahr)?.s ?? 0).toFixed(2), 0.005);

  console.log(`== Angebot ${NR}`);
  const a = await eins(`select a.id, a.netto_summe::float ns,
      (select sum(${F_DOKU})::float from app.angebot_positionen p where p.angebot_id = a.id and einzelpreis is not null) s,
      (select sum(${F_ALT})::float from app.angebot_positionen p where p.angebot_id = a.id and einzelpreis is not null) s_alt
    from app.angebote a where a.angebotnr = $1 order by a.legacy_rowid limit 1`, [NR]);
  pruefe("Formelsumme der Positionen", "17316.00", a?.s?.toFixed(2), 0.005);
  pruefe("Formelsumme (Altformel)", "17316.00", a?.s_alt?.toFixed(2), 0.005);
  pruefe("gespeicherte netto_summe", 17316, a?.ns);
  const b = (await c.query(`select bereich, sum(${F_DOKU})::float s, count(*) filter (where einzelpreis is not null and einzelpreis <> 0)::int n
    from app.angebot_positionen where angebot_id = $1 group by 1`, [a?.id ?? -1])).rows;
  const ber = (k) => b.find((x) => x.bereich === k)?.s ?? 0;
  pruefe("Beladen", 1225, ber("beladen"));
  pruefe("Befördern (11.950 + 1.500)", 13450, ber("befoerdern"));
  pruefe("Entladen", 1225, ber("entladen"));
  pruefe("Nebenleistung (150 + 1.200)", 1350, ber("nebenleistung"));
  pruefe("Packmaterial (3×20 + 2×3)", 66, ber("packmaterial"));
  const e = await eins(`select
      (select count(*) from app.angebot_positionen where angebot_id = $1 and bereich='befoerdern' and zeile=0 and einzelpreis = 11950)::int t,
      (select count(*) from app.angebot_positionen where angebot_id = $1 and bereich='befoerdern' and zeile=1 and einzelpreis = 1500)::int m,
      (select count(*) from app.angebot_positionen where angebot_id = $1 and bereich='packmaterial' and anzahl is null and einheiten = 3 and einzelpreis = 20)::int p1,
      (select count(*) from app.angebot_positionen where angebot_id = $1 and bereich='packmaterial' and anzahl is null and einheiten = 2 and einzelpreis = 3)::int p2,
      (select count(*) from app.angebot_positionen where angebot_id = $1 and text = $2)::int u`, [a?.id ?? -1, "Straßengebühren /Maut/Fähre"]);
  pruefe("Befördern Zeile 0 = 11.950", 1, e.t);
  pruefe("Befördern Zeile 1 = 1.500", 1, e.m);
  pruefe("Packmaterial 3 × 20 (Stück in einheiten)", 1, e.p1);
  pruefe("Packmaterial 2 × 3", 1, e.p2);
  pruefe("Umlaute: Text „Straßengebühren /Maut/Fähre“", 1, e.u);

  console.log("== Verknüpfungen");
  const v = await eins(`select
      (select count(*) from app.angebote where legacy_rowid is not null and kunde_id is null)::int a_ohne_kunde,
      (select count(*) from app.rechnungen where legacy_rowid is not null and angebot_id is null and angebotnr is not null)::int r_ohne_angebot,
      (select count(*) from app.rechnungen where legacy_rowid is not null and kunde_id is null)::int r_ohne_kunde,
      (select count(*) from app.rechnungspositionen where rechnung_id is null)::int p_verwaist,
      (select count(*) from app.kunden where art='firma')::int firmen, (select count(*) from app.kunden where art='privat')::int privat,
      (select coalesce(sum(anzahl_angebote),0) from app.kunden)::int summe_anz,
      (select count(*) from app.angebote where kunde_id is not null)::int a_mit_kunde`);
  pruefe("Rechnungspositionen ohne Rechnung (verwaist)", 88, v.p_verwaist);
  pruefe("Σ kunden.anzahl_angebote = Angebote mit Kunde", v.a_mit_kunde, v.summe_anz);
  console.log(`       Kunden: ${v.firmen} Firmen, ${v.privat} privat | Angebote ohne Kunde: ${v.a_ohne_kunde} | Rechnungen ohne Kunde: ${v.r_ohne_kunde} | Rechnungen mit Nummer, aber ohne Angebot: ${v.r_ohne_angebot}`);

  console.log("== Zusatz: Formelsumme gegen gespeicherte netto_summe über alle Angebote (informativ)");
  const varianten = [
    ["dokumentiert: leer=1, Prozent am Ende", `sum(${F_DOKU})`, "0"],
    ["Altformel (Anzahl leer/0=1, Einheiten leer=0, EP×Prozent gerundet)", `sum(${F_ALT})`, "0"],
    ["Altformel + Klavier + Flügel", `sum(${F_ALT})`, "coalesce(a.klavier_anzahl,0)*coalesce(a.klavier_preis,0) + coalesce(a.fluegel_anzahl,0)*coalesce(a.fluegel_preis,0)"],
    ["Altformel + Klavier + Flügel + Schwergut(kg/100×Preis)", `sum(${F_ALT})`, "coalesce(a.klavier_anzahl,0)*coalesce(a.klavier_preis,0) + coalesce(a.fluegel_anzahl,0)*coalesce(a.fluegel_preis,0) + coalesce(a.schwergut_kilo,0)*coalesce(a.schwergut_preis,0)/100"],
    ["… + Versicherungsbetrag", `sum(${F_ALT})`, "coalesce(a.klavier_anzahl,0)*coalesce(a.klavier_preis,0) + coalesce(a.fluegel_anzahl,0)*coalesce(a.fluegel_preis,0) + coalesce(a.versicherungsbetrag,0)"],
    ["… + Maut gesamt", `sum(${F_ALT})`, "coalesce(a.klavier_anzahl,0)*coalesce(a.klavier_preis,0) + coalesce(a.fluegel_anzahl,0)*coalesce(a.fluegel_preis,0) + coalesce(a.maut_gesamt,0)"],
    ["… × (1 + Generalrabatt/100)", `sum(${F_ALT})`, "GR"],
  ];
  const basis = (pos, zus) => `select a.id, a.angebotnr, coalesce(a.netto_summe,0) ns,
      ${zus === "GR"
        ? `round((coalesce(p.s,0) + coalesce(a.klavier_anzahl,0)*coalesce(a.klavier_preis,0) + coalesce(a.fluegel_anzahl,0)*coalesce(a.fluegel_preis,0)) * (1 + coalesce(a.generalrabatt,0)/100), 2)`
        : `coalesce(p.s,0) + ${zus}`} f
    from app.angebote a left join (select angebot_id, ${pos} s from app.angebot_positionen where einzelpreis is not null group by 1) p on p.angebot_id = a.id
    where a.legacy_rowid is not null`;
  for (const [name, pos, zus] of varianten) {
    const r = await eins(`select count(*)::int n, count(*) filter (where abs(f - ns) <= 0.01)::int ok from (${basis(pos, zus)}) x`);
    console.log(`  ${String(r.ok).padStart(5)} von ${r.n} exakt (${(100 * r.ok / r.n).toFixed(1)} %), ${String(r.n - r.ok).padStart(4)} abweichend  | ${name}`);
  }
  for (const [titel, i] of [["dokumentierte Formel", 0], ["beste Formel (Altformel + Klavier + Flügel)", 2]]) {
    const bsp = (await c.query(`select angebotnr, ns::float ns, round(f,2)::float f from (${basis(varianten[i][1], varianten[i][2])}) x
      where abs(f - ns) > 0.01 and angebotnr is not null order by id desc limit 10`)).rows;
    console.log(`  Beispiele Abweichung, ${titel} (Nummer: gespeichert / Formel):`);
    for (const x of bsp) console.log(`    ${x.angebotnr}: ${eur(x.ns)} / ${eur(x.f)}`);
  }
  const g = await eins("select pg_size_pretty(pg_database_size(current_database())) g, round(pg_database_size(current_database())/1048576.0)::int mb");
  console.log(`== DB-Größe: ${g.g} von 500 MB (Free-Plan)`);
} catch (e) { console.error("FEHLER: " + e.message); fehler++; }
await c.end();
console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen` : "\nAlle Soll-Prüfungen bestanden");
process.exitCode = fehler ? 1 : 0;
