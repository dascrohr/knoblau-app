// Erzeugt src/lib/db-typen.ts aus dem Schema app. Aufruf: node scripts/typen.mjs
import fs from "node:fs";
import { verbinde } from "./db.mjs";
const c = await verbinde();
const r = await c.query("select table_name t,column_name c,data_type d,is_nullable n from information_schema.columns where table_schema=$1 order by table_name,ordinal_position", ["app"]);
await c.end();
const ts = (d) => (/int|numeric|double|real/.test(d) ? "number" : d === "boolean" ? "boolean" : "string");
const by = {};
for (const x of r.rows) (by[x.t] ??= []).push(x);
const pas = (s) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
let o = "// Automatisch erzeugt aus dem Schema app (scripts/typen.mjs). Nicht von Hand ändern.\n// Datum = ISO-Text (JJJJ-MM-TT), Zeitstempel = ISO-Text.\n\n";
for (const [t, cols] of Object.entries(by)) o += "export type " + pas(t) + "Zeile = {\n" + cols.map((x) => "  " + x.c + ": " + ts(x.d) + (x.n === "YES" ? " | null" : "") + ";").join("\n") + "\n};\n\n";
fs.writeFileSync(new URL("../src/lib/db-typen.ts", import.meta.url), o);
console.log(Object.keys(by).length, "Tabellen");
