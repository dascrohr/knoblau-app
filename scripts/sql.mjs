// Führt eine SQL-Datei (oder -e "<sql>") gegen die Supabase-Datenbank aus.
import fs from "node:fs";
import { verbinde } from "./db.mjs";
const arg = process.argv[2];
const sql = arg === "-e" ? process.argv[3] : fs.readFileSync(arg, "utf8");
const c = await verbinde();
try {
  const r = await c.query(sql);
  for (const x of Array.isArray(r) ? r : [r]) if (x.rows?.length) console.table(x.rows);
  console.log("ok");
} catch (e) { console.error("FEHLER:", e.message, e.position ? "pos " + e.position : ""); process.exitCode = 1; }
await c.end();
