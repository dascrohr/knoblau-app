// Wiederholbarer Import der Altdaten: SQLite -> legacy (1:1) -> app (Upsert).
// Aufruf: npm run import            (alles)
//         npm run import -- --nur-legacy | --nur-app
// Gibt ausschließlich Zählungen aus, keine Personendaten.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verbinde } from "../db.mjs";
import { ladeLegacy } from "./legacy.mjs";

const hier = path.dirname(fileURLToPath(import.meta.url));
const arg = new Set(process.argv.slice(2));
const t0 = Date.now();
const sek = (t) => ((Date.now() - t) / 1000).toFixed(1) + " s";
const c = await verbinde();
c.on("notice", (n) => { if (n.severity !== "NOTICE" || arg.has("--laut")) console.log(n.severity + ": " + n.message); });
try {
  await c.query("set statement_timeout = 0; set lock_timeout = '30s'; set client_min_messages = warning");
  if (!arg.has("--nur-app")) { const t = Date.now(); await ladeLegacy(c); console.log("  legacy fertig in " + sek(t)); }
  if (!arg.has("--nur-legacy")) {
    const dir = path.join(hier, "sql");
    const nur = [...arg].find((a) => a.startsWith("--datei="))?.slice(8);
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql") && (!nur || f.startsWith(nur))).sort()) {
      const t = Date.now();
      await c.query("begin");
      try { await c.query(fs.readFileSync(path.join(dir, f), "utf8")); await c.query("commit"); }
      catch (e) { await c.query("rollback"); throw new Error(`${f}: ${e.message}${e.position ? " (pos " + e.position + ")" : ""}${e.where ? " | " + String(e.where).split("\n")[0] : ""}`); }
      console.log(`  ${f} in ${sek(t)}`);
    }
    // Aufräumen + Statistik (vacuum geht nicht in einer Transaktion); danach echte Zeilenzahlen.
    const tab = (await c.query("select tablename t from pg_tables where schemaname='app' order by 1")).rows.map((r) => r.t);
    const t = Date.now();
    for (const x of tab) await c.query(`vacuum (analyze) app."${x}"`);
    console.log("  vacuum/analyze in " + sek(t));
    const z = await c.query(tab.map((x) => `select '${x}' t, count(*)::int n from app."${x}"`).join(" union all ") + " order by 1");
    console.log("app-Zeilen: " + z.rows.map((r) => `${r.t}=${r.n}`).join(", "));
  }
  const g = await c.query("select pg_size_pretty(pg_database_size(current_database())) g");
  console.log(`DB-Größe: ${g.rows[0].g} | Laufzeit gesamt: ${sek(t0)}`);
} catch (e) { console.error("FEHLER: " + e.message); process.exitCode = 1; }
await c.end();
