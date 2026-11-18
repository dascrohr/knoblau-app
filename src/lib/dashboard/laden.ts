// Lädt die Grundlage des Geschäftsleitungs-Dashboards und rechnet auf dem Server.
// Zugriff nur für aktive Administratoren; der Browser bekommt ausschließlich Summen und Zählungen.
import "server-only";
import { aktuellerNutzer, db, type Nutzer } from "../supabase/server";
import { berechneDashboard, datenstichtag, zeitraumJahre, tagNr, type AngebotRoh, type Dashboard, type Perspektive, type RechnungRoh } from "./rechnen";
import { darfDashboardSehen } from "./zugriff";
import { erzeugeDemoDaten } from "./demo";

const SEITE = 1000; // Zeilenlimit der API je Abruf

async function alleZeilen<T>(tabelle: string, spalten: string, filter?: { spalte: string; werte: string[] }): Promise<T[]> {
  const sb = await db();
  const kopf = sb.from(tabelle).select("id", { count: "exact", head: true });
  const { count, error } = await (filter ? kopf.in(filter.spalte, filter.werte) : kopf);
  if (error) throw new Error("Dashboard-Daten konnten nicht geladen werden");
  const seiten = Math.ceil((count ?? 0) / SEITE);
  const teile = await Promise.all(
    Array.from({ length: seiten }, async (_, i) => {
      let abfrage = sb.from(tabelle).select(spalten).order("id").range(i * SEITE, (i + 1) * SEITE - 1);
      if (filter) abfrage = abfrage.in(filter.spalte, filter.werte);
      const { data, error: e } = await abfrage;
      if (e) throw new Error("Dashboard-Daten konnten nicht geladen werden");
      return (data ?? []) as T[];
    }),
  );
  return teile.flat();
}

type Grundlage = { angebote: AngebotRoh[]; rechnungen: RechnungRoh[]; geladenUm: string };
let zwischenspeicher: { bis: number; daten: Promise<Grundlage> } | null = null;
const HALTBARKEIT_MS = 5 * 60_000;

/** Reduzierte Zeilen (Datum, Nummer, Betrag, PLZ, Land): keine Namen, keine Straßen. Fünf Minuten im Speicher des Servers. */
async function ladeGrundlage(): Promise<Grundlage> {
  if (zwischenspeicher && zwischenspeicher.bis > Date.now()) return zwischenspeicher.daten;
  // Nur in der lokalen Entwicklung: erfundene Daten für Tests und Screenshots (nie in Produktion).
  if (process.env.NODE_ENV !== "production" && process.env.DASHBOARD_DEMO === "1") {
    return { ...erzeugeDemoDaten(), geladenUm: new Date().toISOString() };
  }
  const daten = (async (): Promise<Grundlage> => {
    const [ang, adr, re] = await Promise.all([
      alleZeilen<{ id: number; angebotnr: string | null; angebotsdatum: string | null; entwurf: boolean | null }>("angebote", "id,angebotnr,angebotsdatum,entwurf"),
      alleZeilen<{ angebot_id: number; art: string; lkz: string | null; plz: string | null }>("angebot_adressen", "angebot_id,art,lkz,plz", { spalte: "art", werte: ["beladestelle", "entladestelle"] }),
      alleZeilen<{ id: number; angebot_id: number | null; rechnungsdatum: string | null; gesamtsumme: number | null; waehrung: string | null }>("rechnungen", "id,angebot_id,rechnungsdatum,gesamtsumme,waehrung"),
    ]);
    const adressen = new Map<string, { lkz: string | null; plz: string | null }>();
    for (const a of adr) adressen.set(`${a.angebot_id}:${a.art}`, { lkz: a.lkz, plz: a.plz });
    return {
      angebote: ang.map((a) => {
        const b = adressen.get(`${a.id}:beladestelle`), e = adressen.get(`${a.id}:entladestelle`);
        return { id: a.id, angebotnr: a.angebotnr, angebotsdatum: a.angebotsdatum, entwurf: Boolean(a.entwurf), bela_lkz: b?.lkz ?? null, bela_plz: b?.plz ?? null, entla_lkz: e?.lkz ?? null, entla_plz: e?.plz ?? null };
      }),
      rechnungen: re.map((r) => ({ ...r, gesamtsumme: r.gesamtsumme == null ? null : Number(r.gesamtsumme) })),
      geladenUm: new Date().toISOString(),
    };
  })();
  zwischenspeicher = { bis: Date.now() + HALTBARKEIT_MS, daten };
  daten.catch(() => { zwischenspeicher = null; });
  return daten;
}

export type DashboardAnfrage = { zeitraum?: string; von?: string; bis?: string; adresse?: string };
export type DashboardAntwort =
  | { zugriff: false }
  | { zugriff: true; nutzer: Nutzer; daten: Dashboard; auswahl: { zeitraum: "2" | "5" | "10" | "frei"; von: string; bis: string; perspektive: Perspektive }; geladenUm: string; fruehestes: string };

function heuteBerlin(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}

/** Einziger Einstieg für die Seite. Prüft die Rolle, bevor irgendetwas geladen wird. */
export async function ladeDashboard(anfrage: DashboardAnfrage): Promise<DashboardAntwort> {
  const nutzer = await aktuellerNutzer();
  if (!darfDashboardSehen(nutzer)) return { zugriff: false };
  const g = await ladeGrundlage();
  const stichtag = datenstichtag(g.angebote, g.rechnungen, heuteBerlin());
  let fruehestes = stichtag;
  for (const a of g.angebote) if (a.angebotsdatum && tagNr(a.angebotsdatum) != null && a.angebotsdatum.slice(0, 10) < fruehestes) fruehestes = a.angebotsdatum.slice(0, 10);
  for (const r of g.rechnungen) if (r.rechnungsdatum && tagNr(r.rechnungsdatum) != null && r.rechnungsdatum.slice(0, 10) < fruehestes) fruehestes = r.rechnungsdatum.slice(0, 10);

  const perspektive: Perspektive = anfrage.adresse === "entla" ? "entladestelle" : "beladestelle";
  let zeitraum: "2" | "5" | "10" | "frei" = anfrage.zeitraum === "5" || anfrage.zeitraum === "10" || anfrage.zeitraum === "frei" ? anfrage.zeitraum : "2";
  let von: string, bis: string;
  if (zeitraum === "frei" && tagNr(anfrage.von) != null && tagNr(anfrage.bis) != null && (anfrage.von as string) <= (anfrage.bis as string)) {
    von = (anfrage.von as string).slice(0, 10);
    bis = (anfrage.bis as string).slice(0, 10);
    if (von > stichtag) von = stichtag;
    // Höchstens 20 Jahre, damit die Seite bedienbar bleibt.
    if ((tagNr(bis) as number) - (tagNr(von) as number) > 366 * 20) von = zeitraumJahre(bis, 20).von;
  } else {
    if (zeitraum === "frei") zeitraum = "2";
    ({ von, bis } = zeitraumJahre(stichtag, Number(zeitraum)));
  }
  const daten = berechneDashboard(g.angebote, g.rechnungen, { von, bis, stichtag, perspektive });
  return { zugriff: true, nutzer: nutzer as Nutzer, daten, auswahl: { zeitraum, von, bis, perspektive }, geladenUm: g.geladenUm, fruehestes };
}
