// Lesende Datenzugriffe für Server Components. Alles läuft mit der Sitzung des Nutzers unter RLS.
import "server-only";
import { db } from "./supabase/server";
import { ADRESS_ARTEN, leereAdresse, type AdressArt, type Adresse, type AngebotKomplett, type Checkpunkt, type Position, type Termin } from "./angebot-typen";
import type { KundenZeile, RechnungenZeile, RechnungspositionenZeile } from "./db-typen";

export const SEITENGROESSE = 50;

/** Suchbegriff für ilike aufbereiten: Sonderzeichen von PostgREST/LIKE entschärfen. */
function muster(q: string): string {
  return "%" + q.toLowerCase().trim().replace(/[%_,()\\]/g, " ").replace(/\s+/g, "%") + "%";
}

export type AngebotListenZeile = {
  id: number; angebotnr: string | null; angebotsdatum: string | null; jahr: number | null; status: string | null;
  netto_summe: number | null; umzugstermin: string | null; sachbearbeiter: string | null; entwurf: boolean;
  name: string; // Auftraggeber
  von_ort: string; nach_ort: string;
};

export async function listeAngebote(p: { q?: string; jahr?: number | null; status?: string | null; seite?: number }): Promise<{ zeilen: AngebotListenZeile[]; gesamt: number; seite: number; seiten: number }> {
  const sb = await db();
  const seite = Math.max(1, p.seite ?? 1);
  let abfrage = sb
    .from("angebote")
    .select("id,angebotnr,angebotsdatum,jahr,status,netto_summe,umzugstermin,sachbearbeiter,entwurf,angebot_adressen(art,name,vorname,name1,plz,ort)", { count: "exact" })
    .order("angebotsdatum", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range((seite - 1) * SEITENGROESSE, seite * SEITENGROESSE - 1);
  if (p.q?.trim()) abfrage = abfrage.ilike("suchtext", muster(p.q));
  if (p.jahr) abfrage = abfrage.eq("jahr", p.jahr);
  if (p.status === "(leer)") abfrage = abfrage.is("status", null);
  else if (p.status) abfrage = abfrage.eq("status", p.status);
  const { data, count, error } = await abfrage;
  if (error) throw new Error("Angebote konnten nicht geladen werden");
  type A = { art: string; name: string | null; vorname: string | null; name1: string | null; plz: string | null; ort: string | null };
  const zeilen = (data ?? []).map((a) => {
    const adr = (a.angebot_adressen ?? []) as A[];
    const f = (art: AdressArt) => adr.find((x) => x.art === art);
    const ag = f("auftraggeber");
    const ort = (x?: A) => [x?.plz, x?.ort].filter(Boolean).join(" ");
    return {
      id: a.id, angebotnr: a.angebotnr, angebotsdatum: a.angebotsdatum, jahr: a.jahr, status: a.status, netto_summe: a.netto_summe,
      umzugstermin: a.umzugstermin, sachbearbeiter: a.sachbearbeiter, entwurf: Boolean(a.entwurf),
      name: [[ag?.name, ag?.vorname].filter(Boolean).join(", "), ag?.name1].filter(Boolean).join(" · "),
      von_ort: ort(f("beladestelle") ?? ag), nach_ort: ort(f("entladestelle")),
    };
  });
  const gesamt = count ?? 0;
  return { zeilen, gesamt, seite, seiten: Math.max(1, Math.ceil(gesamt / SEITENGROESSE)) };
}

/** Werte für die Filter der Angebotsliste. */
export async function angebotFilter(): Promise<{ jahre: number[]; status: string[] }> {
  const sb = await db();
  const { data } = await sb.from("stamm_auswahl").select("liste,wert").in("liste", ["filter_jahr", "filter_status"]).order("wert", { ascending: false });
  const jahre = (data ?? []).filter((x) => x.liste === "filter_jahr").map((x) => Number(x.wert));
  const status = (data ?? []).filter((x) => x.liste === "filter_status").map((x) => x.wert).sort();
  if (jahre.length) return { jahre, status };
  const heute = new Date().getFullYear();
  return { jahre: Array.from({ length: heute - 2009 }, (_, i) => heute - i), status: ["A,S,H,", "A,", "A,H,", "A,S,"] };
}

export async function ladeAngebot(id: number): Promise<AngebotKomplett | null> {
  const sb = await db();
  const { data: angebot } = await sb.from("angebote").select("*").eq("id", id).maybeSingle();
  if (!angebot) return null;
  const [adr, pos, ter, chk, gut, rech, hvz, arb] = await Promise.all([
    sb.from("angebot_adressen").select("*").eq("angebot_id", id),
    sb.from("angebot_positionen").select("*").eq("angebot_id", id).order("bereich").order("zeile"),
    sb.from("angebot_termine").select("*").eq("angebot_id", id).order("zeile"),
    sb.from("checklistenpunkte").select("*").eq("angebot_id", id).order("zeile"),
    sb.from("umzugsgut").select("*").eq("angebot_id", id).order("zimmer").order("gegenstand"),
    sb.from("rechnungen").select("id,rechnungnr,rechnungsdatum,gesamtsumme").eq("angebot_id", id).order("rechnungsdatum"),
    sb.from("halteverbotszonen").select("id,adressart,strasse,plz,ort,von_datum,bis_datum,anfrage_ergebnis,buchung_ergebnis").eq("angebot_id", id),
    sb.from("arbeitsscheine").select("id,arbnr,art,datum,status").eq("angebot_id", id).order("datum"),
  ]);
  const adressen = Object.fromEntries(ADRESS_ARTEN.map((a) => [a, leereAdresse(a)])) as Record<AdressArt, Adresse>;
  for (const a of adr.data ?? []) {
    const { id: _i, angebot_id: _a, ...rest } = a;
    adressen[a.art as AdressArt] = rest as Adresse;
  }
  const ohne = <T extends { id: number; angebot_id: number }>(x: T) => {
    const { id: _i, angebot_id: _a, ...rest } = x;
    return rest;
  };
  return {
    angebot,
    adressen,
    positionen: (pos.data ?? []).map(ohne) as Position[],
    termine: (ter.data ?? []).map(ohne) as Termin[],
    checkliste: (chk.data ?? []).map(ohne) as Checkpunkt[],
    umzugsgut: gut.data ?? [],
    rechnungen: rech.data ?? [],
    halteverbotszonen: hvz.data ?? [],
    arbeitsscheine: arb.data ?? [],
  };
}

/** Nachbar-Angebote für die Datensatz-Navigation (erster, zurück, vor, letzter). Sortierung nach id. */
export async function angebotNachbarn(id: number): Promise<{ erster: number | null; zurueck: number | null; vor: number | null; letzter: number | null; position: number; gesamt: number }> {
  const sb = await db();
  const eins = async (q: PromiseLike<{ data: { id: number }[] | null }>) => (await q).data?.[0]?.id ?? null;
  const [erster, letzter, zurueck, vor, pos, ges] = await Promise.all([
    eins(sb.from("angebote").select("id").order("id").limit(1)),
    eins(sb.from("angebote").select("id").order("id", { ascending: false }).limit(1)),
    eins(sb.from("angebote").select("id").lt("id", id).order("id", { ascending: false }).limit(1)),
    eins(sb.from("angebote").select("id").gt("id", id).order("id").limit(1)),
    sb.from("angebote").select("id", { count: "exact", head: true }).lte("id", id),
    sb.from("angebote").select("id", { count: "exact", head: true }),
  ]);
  return { erster, letzter, zurueck, vor, position: pos.count ?? 0, gesamt: ges.count ?? 0 };
}

export async function listeKunden(p: { q?: string; art?: "firma" | "privat" | null; seite?: number }): Promise<{ zeilen: KundenZeile[]; gesamt: number; seite: number; seiten: number }> {
  const sb = await db();
  const seite = Math.max(1, p.seite ?? 1);
  let abfrage = sb.from("kunden").select("*", { count: "exact" })
    .order("letzter", { ascending: false, nullsFirst: false }).order("id", { ascending: false })
    .range((seite - 1) * SEITENGROESSE, seite * SEITENGROESSE - 1);
  if (p.q?.trim()) abfrage = abfrage.ilike("suchtext", muster(p.q));
  if (p.art) abfrage = abfrage.eq("art", p.art);
  const { data, count, error } = await abfrage;
  if (error) throw new Error("Kunden konnten nicht geladen werden");
  const gesamt = count ?? 0;
  return { zeilen: data ?? [], gesamt, seite, seiten: Math.max(1, Math.ceil(gesamt / SEITENGROESSE)) };
}

export async function ladeKunde(id: number): Promise<{ kunde: KundenZeile; angebote: { id: number; angebotnr: string | null; angebotsdatum: string | null; status: string | null; netto_summe: number | null }[]; rechnungen: { id: number; rechnungnr: string | null; rechnungsdatum: string | null; gesamtsumme: number | null }[] } | null> {
  const sb = await db();
  const { data: kunde } = await sb.from("kunden").select("*").eq("id", id).maybeSingle();
  if (!kunde) return null;
  const [a, r] = await Promise.all([
    sb.from("angebote").select("id,angebotnr,angebotsdatum,status,netto_summe").eq("kunde_id", id).order("angebotsdatum", { ascending: false }).limit(200),
    sb.from("rechnungen").select("id,rechnungnr,rechnungsdatum,gesamtsumme").eq("kunde_id", id).order("rechnungsdatum", { ascending: false }).limit(200),
  ]);
  return { kunde, angebote: a.data ?? [], rechnungen: r.data ?? [] };
}

export type RechnungListenZeile = Pick<RechnungenZeile, "id" | "rechnungnr" | "rechnungsdatum" | "jahr" | "angebotnr" | "angebot_id" | "name" | "vorname" | "name1" | "plz" | "ort" | "netto" | "gesamtsumme" | "gebucht" | "betreff1">;

export async function listeRechnungen(p: { q?: string; jahr?: number | null; seite?: number }): Promise<{ zeilen: RechnungListenZeile[]; gesamt: number; seite: number; seiten: number }> {
  const sb = await db();
  const seite = Math.max(1, p.seite ?? 1);
  let abfrage = sb.from("rechnungen")
    .select("id,rechnungnr,rechnungsdatum,jahr,angebotnr,angebot_id,name,vorname,name1,plz,ort,netto,gesamtsumme,gebucht,betreff1", { count: "exact" })
    .order("rechnungsdatum", { ascending: false, nullsFirst: false }).order("id", { ascending: false })
    .range((seite - 1) * SEITENGROESSE, seite * SEITENGROESSE - 1);
  if (p.q?.trim()) abfrage = abfrage.ilike("suchtext", muster(p.q));
  if (p.jahr) abfrage = abfrage.eq("jahr", p.jahr);
  const { data, count, error } = await abfrage;
  if (error) throw new Error("Rechnungen konnten nicht geladen werden");
  const gesamt = count ?? 0;
  return { zeilen: data ?? [], gesamt, seite, seiten: Math.max(1, Math.ceil(gesamt / SEITENGROESSE)) };
}

export async function ladeRechnung(id: number): Promise<{ rechnung: RechnungenZeile; positionen: RechnungspositionenZeile[] } | null> {
  const sb = await db();
  const { data: rechnung } = await sb.from("rechnungen").select("*").eq("id", id).maybeSingle();
  if (!rechnung) return null;
  const { data: positionen } = await sb.from("rechnungspositionen").select("*").eq("rechnung_id", id).order("zeile").order("id");
  return { rechnung, positionen: positionen ?? [] };
}

// ------------------------------------------------------------------ Stammdaten
export const STAMM_TABELLEN = ["stamm_leistungen", "stamm_packmaterial", "stamm_umzugsgut", "stamm_zimmer", "stamm_fahrzeuge", "stamm_checkliste", "stamm_textbausteine", "stamm_auswahl"] as const;
export type StammTabelle = (typeof STAMM_TABELLEN)[number];

/** Alle Zeilen einer Stammdaten-Tabelle (auch inaktive, wenn `alle`). */
export async function ladeStamm<T = Record<string, unknown>>(tabelle: StammTabelle, opt: { alle?: boolean } = {}): Promise<T[]> {
  if (!STAMM_TABELLEN.includes(tabelle)) throw new Error("Unbekannte Stammdaten-Tabelle");
  const sb = await db();
  let abfrage = sb.from(tabelle).select("*").order("sortierung").order("id").limit(2000);
  if (!opt.alle) abfrage = abfrage.eq("aktiv", true);
  const { data, error } = await abfrage;
  if (error) throw new Error("Stammdaten konnten nicht geladen werden");
  return (data ?? []) as T[];
}

/** Auswahlliste (herkunft, umzugsart, zahlungsbedingung, sachbearbeiter, besichtigung_art, volumen_ermittlung, mwst). */
export async function ladeAuswahl(liste: string): Promise<string[]> {
  const sb = await db();
  const { data } = await sb.from("stamm_auswahl").select("wert").eq("liste", liste).eq("aktiv", true).order("sortierung").order("wert");
  return (data ?? []).map((x) => x.wert);
}

// ------------------------------------------------------------------ Einstellungen / Firmenangaben
import { FIRMA_LOGO, FIRMA_VORGABE, type Firma, type FirmaSchluessel } from "./firma";

/** Firmenangaben und feste Texte: Vorgaben, überschrieben durch die gespeicherten Einstellungen. */
export async function ladeFirma(): Promise<Firma> {
  const sb = await db();
  const { data } = await sb.from("einstellungen").select("schluessel,wert");
  const f: Record<string, string> = { ...FIRMA_VORGABE };
  for (const z of data ?? []) if (z.schluessel in FIRMA_VORGABE && z.wert != null) f[z.schluessel as FirmaSchluessel] = z.wert;
  return { ...(f as Record<FirmaSchluessel, string>), logo: FIRMA_LOGO };
}

/** Textbausteine für die Angebotsmaske, nach Bereich gruppiert verwendbar. */
export async function ladeTextbausteine(): Promise<{ id: number; bereich: string | null; titel: string; text: string | null }[]> {
  const sb = await db();
  const { data } = await sb.from("stamm_textbausteine").select("id,bereich,titel,text").eq("aktiv", true).order("sortierung").order("titel");
  return data ?? [];
}
