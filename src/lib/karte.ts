import "server-only";
// Anbindung an openrouteservice (HeiGIT). Nur serverseitig: der Schlüssel verlässt den Server nie.
// Datenschutz: An den Dienst gehen ausschließlich Adressen (Straße, PLZ, Ort, Land). Nichts davon wird geloggt.
// Pfade am 18.11.2026 mit echten Aufrufen geprüft (unter api.heigit.org gibt es /geocode/* nicht, Pelias liegt unter /pelias/v1).

export const ORS_BASIS = "https://api.heigit.org";
export const ORS_PFAD_ROUTE = "/openrouteservice/v2/directions/driving-hgv/geojson";
export const ORS_PFAD_SUCHE = "/pelias/v1/search";
export const ORS_PFAD_SUCHE_STRUKTURIERT = "/pelias/v1/search/structured";
export const ORS_PFAD_VORSCHLAG = "/pelias/v1/autocomplete";
/** Deutschland und Nachbarländer (ISO 3166-1 alpha-2). */
export const ORS_LAENDER = "DE,AT,CH,NL,BE,LU,FR,DK,PL,CZ";
const ZEITLIMIT_MS = 15_000;

export type AdressEingabe = { strasse?: string | null; plz?: string | null; ort?: string | null; lkz?: string | null };
export type Treffer = { label: string; strasse: string; plz: string; ort: string; lkz: string; lon: number; lat: number };
export type Punkt = { lon: number; lat: number; label: string; genau: boolean };
export type RoutenAntwort = {
  km: number;
  minuten: number;
  geometrie: { type: "LineString"; coordinates: [number, number][] };
  start: Punkt;
  ziel: Punkt;
  zwischen: Punkt[];
};

/** Fehler mit einem Text, der gefahrlos an den Browser gehen darf (ohne Adresse, ohne Schlüssel). */
export class KartenFehler extends Error {
  status: number;
  constructor(text: string, status = 502) {
    super(text);
    this.name = "KartenFehler";
    this.status = status;
  }
}

// Kfz-Länderkennzeichen (so stehen sie in den Adressen) <-> ISO-Codes des Kartendienstes.
const LKZ_ZU_ISO: Record<string, string> = { D: "DE", A: "AT", CH: "CH", NL: "NL", B: "BE", L: "LU", F: "FR", DK: "DK", PL: "PL", CZ: "CZ" };
const ISO3_ZU_LKZ: Record<string, string> = { DEU: "D", AUT: "A", CHE: "CH", NLD: "NL", BEL: "B", LUX: "L", FRA: "F", DNK: "DK", POL: "PL", CZE: "CZ" };
const ISO2 = new Set(Object.values(LKZ_ZU_ISO));

function isoLand(lkz: string | null | undefined): string | null {
  const t = (lkz ?? "").trim().toUpperCase();
  if (!t) return null;
  if (LKZ_ZU_ISO[t]) return LKZ_ZU_ISO[t];
  if (ISO2.has(t)) return t;
  if (ISO3_ZU_LKZ[t]) return LKZ_ZU_ISO[ISO3_ZU_LKZ[t]];
  return null;
}

function kuerze(s: string | null | undefined, max: number): string {
  return (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function ruf(pfad: string, init: RequestInit, signal: AbortSignal): Promise<unknown> {
  const schluessel = process.env.ORS_API_KEY;
  if (!schluessel) throw new KartenFehler("Der Kartendienst ist nicht eingerichtet.", 503);
  let antwort: Response;
  try {
    antwort = await fetch(ORS_BASIS + pfad, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), Authorization: schluessel, Accept: "application/json, application/geo+json" },
      signal,
      cache: "no-store",
    });
  } catch {
    // Bewusst ohne Originalfehler: der könnte Adresse oder Anfrage enthalten.
    throw new KartenFehler(signal.aborted ? "Der Kartendienst antwortet nicht (Zeitüberschreitung)." : "Der Kartendienst ist nicht erreichbar.", 504);
  }
  if (antwort.status === 429) throw new KartenFehler("Tageslimit des Kartendienstes erreicht", 429);
  if (antwort.status === 401 || antwort.status === 403) throw new KartenFehler("Der Kartendienst lehnt den Zugang ab.", 502);
  let json: unknown = null;
  try {
    json = await antwort.json();
  } catch {
    json = null;
  }
  if (!antwort.ok) {
    const code = (json as { error?: { code?: number } } | null)?.error?.code;
    throw new OrsStatus(antwort.status, typeof code === "number" ? code : null);
  }
  return json;
}

class OrsStatus extends Error {
  status: number;
  code: number | null;
  constructor(status: number, code: number | null) {
    super("ORS " + status);
    this.status = status;
    this.code = code;
  }
}

type Feature = {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
};

function zuTreffer(f: Feature): Treffer | null {
  const p = f.properties ?? {};
  const k = f.geometry?.coordinates;
  if (!Array.isArray(k) || typeof k[0] !== "number" || typeof k[1] !== "number") return null;
  const text = (x: unknown) => (typeof x === "string" ? x : "");
  const schicht = text(p.layer);
  const strasse = text(p.street) ? [text(p.street), text(p.housenumber)].filter(Boolean).join(" ") : schicht === "street" || schicht === "address" ? text(p.name) : "";
  const ort = text(p.locality) || text(p.localadmin) || text(p.county);
  const plz = text(p.postalcode);
  const lkz = ISO3_ZU_LKZ[text(p.country_a)] ?? "";
  const zeile2 = [plz, ort].filter(Boolean).join(" ");
  const kopf = strasse || (text(p.name) !== ort ? text(p.name) : "");
  const label = [kopf, zeile2].filter(Boolean).join(", ") + (lkz && lkz !== "D" ? ` (${lkz})` : "");
  return { label: label || text(p.label), strasse, plz, ort, lkz, lon: k[0], lat: k[1] };
}

function features(json: unknown): Feature[] {
  const f = (json as { features?: unknown } | null)?.features;
  return Array.isArray(f) ? (f as Feature[]) : [];
}

/** Adressvorschläge zur Eingabe (max. 6). Unter 3 Zeichen: leere Liste, kein Aufruf. */
export async function adressVorschlaege(eingabe: string): Promise<Treffer[]> {
  const q = kuerze(eingabe, 120);
  if (q.length < 3) return [];
  const param = new URLSearchParams({ text: q, "boundary.country": ORS_LAENDER, lang: "de", layers: "address,street", size: "10" });
  let json: unknown;
  try {
    json = await ruf(`${ORS_PFAD_VORSCHLAG}?${param}`, { method: "GET" }, AbortSignal.timeout(ZEITLIMIT_MS));
  } catch (e) {
    if (e instanceof KartenFehler) throw e;
    throw new KartenFehler("Der Kartendienst meldet einen Fehler.");
  }
  const liste: Treffer[] = [];
  const gesehen = new Set<string>();
  for (const f of features(json)) {
    const t = zuTreffer(f);
    if (!t || !t.strasse || !t.ort) continue;
    const schluessel = `${t.strasse}|${t.plz}|${t.ort}|${t.lkz}`.toLowerCase();
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);
    liste.push(t);
    if (liste.length >= 6) break;
  }
  return liste;
}

function normal(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

/** Schutz vor unscharfen Zufallstreffern: PLZ oder Ort des Treffers muss zur Eingabe passen. */
function passt(f: Feature, plz: string, ort: string): boolean {
  const p = f.properties ?? {};
  if (plz && typeof p.postalcode === "string" && p.postalcode.replace(/\s/g, "") === plz.replace(/\s/g, "")) return true;
  const o = normal(ort);
  if (o.length < 2) return false;
  return [p.locality, p.localadmin, p.county, p.borough, p.name].some((x) => {
    if (typeof x !== "string") return false;
    const n = normal(x);
    return n.length >= 2 && (n.includes(o) || o.includes(n));
  });
}

const GENAUE_SCHICHTEN = new Set(["address", "street", "venue"]);

/** Geokodiert eine Adresse. `name` (z. B. "Beladestelle") steht in der Fehlermeldung – die Adresse selbst nie. */
async function geokodiere(a: AdressEingabe, name: string, signal: AbortSignal): Promise<Punkt> {
  const strasse = kuerze(a.strasse, 120);
  const plz = kuerze(a.plz, 12);
  const ort = kuerze(a.ort, 80);
  if (!ort && !plz) throw new KartenFehler(`Adresse unvollständig: ${name}`, 400);
  const land = isoLand(a.lkz);
  const nichtGefunden = new KartenFehler(`Adresse nicht gefunden: ${name}`, 404);

  const versuche: string[] = [];
  const s = new URLSearchParams({ lang: "de", size: "3" });
  if (strasse) s.set("address", strasse);
  if (plz) s.set("postalcode", plz);
  if (ort) s.set("locality", ort);
  if (land) s.set("country", land);
  else s.set("boundary.country", ORS_LAENDER);
  versuche.push(`${ORS_PFAD_SUCHE_STRUKTURIERT}?${s}`);
  const frei = new URLSearchParams({ text: [strasse, [plz, ort].filter(Boolean).join(" ")].filter(Boolean).join(", "), lang: "de", size: "3", "boundary.country": land ?? ORS_LAENDER });
  versuche.push(`${ORS_PFAD_SUCHE}?${frei}`);

  let grob: Punkt | null = null;
  for (const pfad of versuche) {
    let json: unknown;
    try {
      json = await ruf(pfad, { method: "GET" }, signal);
    } catch (e) {
      if (e instanceof KartenFehler) throw e;
      if (e instanceof OrsStatus && e.status === 400) continue;
      throw new KartenFehler("Der Kartendienst meldet einen Fehler.");
    }
    for (const f of features(json)) {
      const t = zuTreffer(f);
      if (!t || !passt(f, plz, ort)) continue;
      const schicht = String(f.properties?.layer ?? "");
      const punkt: Punkt = { lon: t.lon, lat: t.lat, label: t.label, genau: GENAUE_SCHICHTEN.has(schicht) };
      if (punkt.genau || !strasse) return punkt;
      // Nur Ort/PLZ getroffen: merken, aber erst die freie Suche versuchen.
      if (!grob && ["postalcode", "locality", "localadmin", "borough", "neighbourhood"].includes(schicht)) grob = punkt;
    }
  }
  if (grob) return grob;
  // Letzter Versuch für Auslandsumzüge ohne Länderkennzeichen: europaweit suchen, Ergebnis gilt als ungenau.
  if (!land && ort) {
    const weit = new URLSearchParams({ text: (ort ?? "").replace(/[\/|]/g, " "), lang: "de", size: "1", layers: "locality,localadmin,county,region", "boundary.country": "DE,AT,CH,NL,BE,LU,FR,DK,PL,CZ,IT,ES,PT,GB,IE,SE,NO,FI,GR,HU,SK,SI,HR,RO,BG,EE,LV,LT,TR,RS,BA,ME,MK,AL,CY,MT,LI" });
    try {
      const t = features(await ruf(`${ORS_PFAD_SUCHE}?${weit}`, { method: "GET" }, signal)).map(zuTreffer).find(Boolean);
      if (t) return { lon: t.lon, lat: t.lat, label: t.label, genau: false };
    } catch (e) {
      if (e instanceof KartenFehler) throw e;
    }
  }
  throw nichtGefunden;
}

export type RoutenAnfrage = { start: AdressEingabe; ziel: AdressEingabe; zwischen?: AdressEingabe[] };

/** LKW-Route (Profil driving-hgv) zwischen den Adressen. */
export async function berechneRoute(anfrage: RoutenAnfrage): Promise<RoutenAntwort> {
  const signal = AbortSignal.timeout(ZEITLIMIT_MS);
  const zw = (anfrage.zwischen ?? []).slice(0, 5);
  const [start, ziel, ...zwischen] = await Promise.all([
    geokodiere(anfrage.start, "Beladestelle", signal),
    geokodiere(anfrage.ziel, "Entladestelle", signal),
    ...zw.map((a, i) => geokodiere(a, `Zwischenstopp ${i + 1}`, signal)),
  ]);
  const punkte = [start, ...zwischen, ziel];
  let json: unknown;
  try {
    json = await ruf(
      ORS_PFAD_ROUTE,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: punkte.map((p) => [p.lon, p.lat]), instructions: false, radiuses: punkte.map(() => 1000) }),
      },
      signal,
    );
  } catch (e) {
    if (e instanceof KartenFehler) throw e;
    if (e instanceof OrsStatus) {
      if (e.code === 2010) throw new KartenFehler("Keine LKW-Route gefunden: Eine der Adressen liegt nicht an einer befahrbaren Straße.", 422);
      if (e.code === 2004) throw new KartenFehler("Die Strecke ist für den Kartendienst zu lang.", 422);
      if (e.code === 2009 || e.status === 404) throw new KartenFehler("Zwischen diesen Adressen wurde keine LKW-Route gefunden.", 422);
    }
    throw new KartenFehler("Der Kartendienst meldet einen Fehler.");
  }
  const f = features(json)[0];
  const zusammen = f?.properties?.summary as { distance?: number; duration?: number } | undefined;
  const koordinaten = f?.geometry?.coordinates;
  if (!f || f.geometry?.type !== "LineString" || !Array.isArray(koordinaten) || typeof zusammen?.distance !== "number") {
    // Start = Ziel liefert eine Route ohne Strecke.
    if (f && zusammen && zusammen.distance === undefined) throw new KartenFehler("Start und Ziel liegen am selben Ort.", 422);
    throw new KartenFehler("Der Kartendienst hat keine Route geliefert.");
  }
  return {
    km: Math.round(zusammen.distance / 100) / 10,
    minuten: Math.round((zusammen.duration ?? 0) / 60),
    geometrie: { type: "LineString", coordinates: (koordinaten as number[][]).map((k) => [Math.round(k[0] * 1e5) / 1e5, Math.round(k[1] * 1e5) / 1e5]) },
    start,
    ziel,
    zwischen,
  };
}
