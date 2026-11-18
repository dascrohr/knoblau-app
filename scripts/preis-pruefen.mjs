// Prüft src/lib/preis.ts gegen die Datenbank: Testfall 1 exakt, dazu Abgleich aller Angebote mit der gespeicherten Nettosumme.
// Gibt nur Zahlen und Angebotsnummern aus. Aufruf: node --experimental-strip-types scripts/preis-pruefen.mjs
import { verbinde } from "./db.mjs";
import { berechnePreis } from "../src/lib/preis.ts";
const c = await verbinde();
const num = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" && v !== "" && !isNaN(Number(v)) && !/^(angebotnr|status)$/.test(k) ? Number(v) : v]));
const { rows: angebote } = await c.query(`select id, angebotnr, legacy_rowid, geaendert_von, netto_summe, ust_satz, generalrabatt, klavier, klavier_anzahl, klavier_preis, fluegel, fluegel_anzahl, fluegel_preis, schwergut, schwergut_kilo, schwergut_preis, versicherungsbetrag, versicherungssteuer, maut_in_angebot, maut_gesamt from app.angebote`);
const { rows: pos } = await c.query(`select angebot_id, bereich, anzahl, einheiten, einzelpreis, prozent from app.angebot_positionen`);
await c.end();
const nach = new Map();
for (const p of pos) { const n = num(p); (nach.get(p.angebot_id) ?? nach.set(p.angebot_id, []).get(p.angebot_id)).push(n); }
let gleich = 0, ab = 0, ohne = 0; const beispiele = []; let ok = true;
for (const roh of angebote) {
  const a = num(roh);
  const r = berechnePreis(a, nach.get(roh.id) ?? []);
  if (roh.angebotnr === "2202611023") {
    const passt = r.netto === 17316 && r.ust === 3290.04 && r.gesamt === 20606.04;
    console.log("Testfall 1:", passt ? "OK" : "ABWEICHUNG", JSON.stringify({ netto: r.netto, ust: r.ust, gesamt: r.gesamt, beladen: r.beladen, transport: r.transport, entladen: r.entladen, nebenleistungen: r.nebenleistungen, packmaterial: r.packmaterial }));
    ok &&= passt;
  }
  if (a.netto_summe == null) { ohne++; continue; }
  if (Math.abs(r.nettoLeistungen - a.netto_summe) <= 0.01) gleich++; else { ab++; if (beispiele.length < 12) beispiele.push(`${roh.angebotnr}: alt ${a.netto_summe} / neu ${r.nettoLeistungen}`); }
}
console.log(`Alle Angebote: ${gleich} gleich, ${ab} abweichend, ${ohne} ohne gespeicherte Summe (von ${angebote.length})`);
console.log(beispiele.join("\n"));
process.exitCode = ok ? 0 : 1;
