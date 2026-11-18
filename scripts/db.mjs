// Gemeinsame DB-Verbindung für Skripte. Liest .env.local.
// Die direkte Adresse db.<ref>.supabase.co ist nur per IPv6 erreichbar; dann wird der Session-Pooler (Frankfurt) benutzt.
import fs from "node:fs";
import pg from "pg";
export function ladeEnv() {
  for (const l of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
export async function verbinde() {
  ladeEnv();
  const url = new URL(process.env.SUPABASE_DB_URL);
  // Passwort versehentlich mit den eckigen Klammern der Vorlage eingefügt? Dann Klammern entfernen.
  const pw = decodeURIComponent(url.password);
  if (pw.startsWith("[") && pw.endsWith("]")) url.password = encodeURIComponent(pw.slice(1, -1));
  const kandidaten = [];
  const m = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  if (m) for (const h of ["aws-0-eu-central-1", "aws-1-eu-central-1"]) {
    const u = new URL(url); u.hostname = `${h}.pooler.supabase.com`; u.port = "5432"; u.username = `postgres.${m[1]}`;
    kandidaten.push(u.toString());
  }
  else kandidaten.push(url.toString());
  let fehler;
  for (const cs of kandidaten) {
    const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
    try { await c.connect(); return c; } catch (e) { fehler = e; try { await c.end(); } catch {} }
  }
  throw new Error("Keine DB-Verbindung: " + (fehler?.code || fehler?.message));
}
