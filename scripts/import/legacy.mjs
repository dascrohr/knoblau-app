// Schritt 1: Alle Tabellen der SQLite-Altdatei 1:1 nach Schema "legacy".
// Je Tabelle eine Transaktion: drop + create + insert. Gibt nur Tabellennamen und Zeilenzahlen aus.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hier = path.dirname(fileURLToPath(import.meta.url));
export const QUELLE = process.env.ALTDATEN_SQLITE || path.resolve(hier, "../../../movistar_altdaten.sqlite");

export async function oeffneSqlite() {
  try {
    const B = createRequire(import.meta.url)("better-sqlite3");
    const db = new B(QUELLE, { readonly: true, fileMustExist: true });
    return { all: (sql) => db.prepare(sql).all(), iter: (sql) => db.prepare(sql).raw().iterate(), close: () => db.close() };
  } catch {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(QUELLE, { readOnly: true });
    return {
      all: (sql) => db.prepare(sql).all(),
      iter: function* (sql) { for (const r of db.prepare(sql).all()) yield Object.values(r); },
      close: () => db.close(),
    };
  }
}

/** Tabellen der Altdatei, die nach legacy geladen werden. */
export const LEGACY_TABELLEN = new Set([
  // vom Import nach app benutzt
  "f02_umzug", "f02_umzug1", "f02_um_frei", "f02_checklist", "f02_barcode2", "f02_rechnung", "f02_rechnun1",
  "f02_arbeit", "f02_arbeit1", "f02_arbeit2", "f02_kasse", "f02_platzda", "f02_um_stamm", "f02_umzugsart",
  "stamm_nebleist", "stamm_packmat", "stamm_barcstam", "stamm_zimmer", "stamm_cl_vorlage", "stamm_fahrzeug", "stamm_herkunft", "stamm_umzugsart",
  // für die nächsten Ausbaustufen (Gutschriften, Aufträge, Kasse, Nachkalkulation, Kundenzusätze, Auswahllisten)
  "f02_gutschri", "f02_gutschr1", "f02_auftrag", "f02__kasse", "f02_kass_sal", "f02_nach_kal", "f02_um_st_1", "f02_um_st_2",
  "stamm_mwst", "stamm_konto", "stamm_kostenst", "stamm_barcstam_sk", "stamm_telefon",
]);

const q = (n) => '"' + String(n).replace(/"/g, '""') + '"';
function lit(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (typeof v === "bigint") return v.toString();
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) v = Buffer.from(v).toString("utf8");
  return "'" + String(v).replace(/\u0000/g, "").replace(/'/g, "''") + "'";
}

export async function ladeLegacy(pgc, log = console.log) {
  const s = await oeffneSqlite();
  const alle = s.all("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name").map((r) => r.name);
  // In die Cloud kommen nur die Tabellen, die die App braucht oder absehbar brauchen wird (Datensparsamkeit).
  // Alles andere (Personal, Stunden, Systemeinstellungen, Tarifwerke, leere Module) bleibt in der SQLite-Datei auf dem Rechner.
  // ALTDATEN_ALLE=1 lädt ausnahmsweise alles.
  const tabellen = process.env.ALTDATEN_ALLE === "1" ? alle : alle.filter((t) => LEGACY_TABELLEN.has(t));
  await pgc.query("create schema if not exists legacy");
  if (process.env.ALTDATEN_ALLE !== "1") {
    const vorhanden = (await pgc.query("select tablename from pg_tables where schemaname = 'legacy'")).rows.map((r) => r.tablename);
    const weg = vorhanden.filter((t) => !LEGACY_TABELLEN.has(t));
    for (let i = 0; i < weg.length; i += 40) await pgc.query(weg.slice(i, i + 40).map((t) => `drop table if exists legacy.${q(t)}`).join("; "));
    if (weg.length) log(`legacy: ${weg.length} nicht benötigte Tabellen entfernt`);
  }
  let gesamt = 0, nichtLeer = 0;
  let paket = [], paketGroesse = 0, paketTabellen = [];
  const abschicken = async () => {
    if (!paket.length) return;
    const sql = paket.join(";\n"), namen = paketTabellen.join(", ");
    paket = []; paketGroesse = 0; paketTabellen = [];
    try { await pgc.query(sql); }
    catch (e) { try { await pgc.query("rollback"); } catch {} throw new Error(`legacy (${namen}): ${e.message}`); }
  };
  const sende = async (sql, tabelle) => {
    paket.push(sql); paketGroesse += sql.length; if (tabelle) paketTabellen.push(tabelle);
    if (paketGroesse > 1_500_000) await abschicken();
  };
  for (const t of tabellen) {
    const info = s.all(`pragma table_info(${q(t)})`);
    // Spaltennamen kleingeschrieben; bei Kollision (auch mit _rowid) Suffix anhängen.
    const benutzt = new Set(["_rowid"]);
    const spalten = info.map((c) => {
      let n = c.name.toLowerCase(), i = 2;
      while (benutzt.has(n)) n = c.name.toLowerCase() + "_" + i++;
      benutzt.add(n);
      const d = (c.type || "").toUpperCase();
      return { name: n, typ: /INT/.test(d) ? "integer" : /NUM|REAL|FLOA|DOUB|DEC/.test(d) ? "numeric" : "text" };
    });
    const zeilen = [...s.iter(`select rowid, * from ${q(t)} order by rowid`)];
    // SQLite ist dynamisch typisiert: Typ notfalls an die tatsächlichen Werte anpassen.
    spalten.forEach((sp, i) => {
      if (sp.typ === "text") return;
      for (const z of zeilen) {
        const v = z[i + 1];
        if (v === null) continue;
        if (typeof v !== "number" && typeof v !== "bigint") { sp.typ = "text"; break; }
        if (sp.typ === "integer" && (!Number.isInteger(Number(v)) || Math.abs(Number(v)) > 2147483647)) sp.typ = "numeric";
      }
    });
    const ziel = `legacy.${q(t)}`;
    // Je Tabelle eine Transaktion (begin … commit). Die Anweisungen werden zu großen Paketen gebündelt,
    // damit kleine/leere Tabellen nicht je fünf Netzwerk-Umläufe kosten.
    await sende("begin");
    await sende(`drop table if exists ${ziel} cascade`);
    await sende(`create table ${ziel} (_rowid integer primary key${spalten.map((sp) => `, ${q(sp.name)} ${sp.typ}`).join("")})`);
    await sende(`alter table ${ziel} enable row level security`);
    const kopf = `insert into ${ziel} values `;
    let teile = [], groesse = 0;
    const spuele = async () => { if (teile.length) { await sende(kopf + teile.join(",")); teile = []; groesse = 0; } };
    for (const z of zeilen) {
      const w = "(" + z.map((v, i) => (i > 0 && spalten[i - 1].typ === "text" && v !== null && typeof v !== "string" && !Buffer.isBuffer(v) ? lit(String(v)) : lit(v))).join(",") + ")";
      teile.push(w); groesse += w.length;
      if (groesse > 500_000 || teile.length >= 2000) await spuele();
    }
    await spuele();
    await sende("commit", t);
    gesamt += zeilen.length; if (zeilen.length) nichtLeer++;
  }
  await abschicken();
  s.close();
  await pgc.query("revoke all on schema legacy from anon, authenticated, public");
  await pgc.query("revoke all on all tables in schema legacy from anon, authenticated, public");
  log(`legacy: ${tabellen.length} Tabellen (${nichtLeer} mit Daten), ${gesamt} Zeilen`);
  return { tabellen: tabellen.length, zeilen: gesamt };
}
