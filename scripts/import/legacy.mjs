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
  const tabellen = s.all("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name").map((r) => r.name);
  await pgc.query("create schema if not exists legacy");
  let gesamt = 0, nichtLeer = 0;
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
    await pgc.query("begin");
    try {
      await pgc.query(`drop table if exists ${ziel} cascade`);
      await pgc.query(`create table ${ziel} (_rowid integer primary key${spalten.map((sp) => `, ${q(sp.name)} ${sp.typ}`).join("")})`);
      await pgc.query(`alter table ${ziel} enable row level security`);
      const kopf = `insert into ${ziel} values `;
      let teile = [], groesse = 0;
      const spuele = async () => { if (teile.length) { await pgc.query(kopf + teile.join(",")); teile = []; groesse = 0; } };
      for (const z of zeilen) {
        const w = "(" + z.map((v, i) => (i > 0 && spalten[i - 1].typ === "text" && v !== null && typeof v !== "string" && !Buffer.isBuffer(v) ? lit(String(v)) : lit(v))).join(",") + ")";
        teile.push(w); groesse += w.length;
        if (groesse > 1_500_000 || teile.length >= 2000) await spuele();
      }
      await spuele();
      await pgc.query("commit");
    } catch (e) { await pgc.query("rollback"); throw new Error(`legacy.${t}: ${e.message}`); }
    gesamt += zeilen.length; if (zeilen.length) nichtLeer++;
  }
  s.close();
  await pgc.query("revoke all on schema legacy from anon, authenticated, public");
  await pgc.query("revoke all on all tables in schema legacy from anon, authenticated, public");
  log(`legacy: ${tabellen.length} Tabellen (${nichtLeer} mit Daten), ${gesamt} Zeilen`);
  return { tabellen: tabellen.length, zeilen: gesamt };
}
