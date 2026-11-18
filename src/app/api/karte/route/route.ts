import { NextResponse } from "next/server";
import { aktuellerNutzer } from "@/lib/supabase/server";
import { berechneRoute, KartenFehler, type AdressEingabe } from "@/lib/karte";

export const maxDuration = 20;
const KOPF = { "Cache-Control": "private, no-store" };

function antwortFehler(text: string, status: number) {
  return NextResponse.json({ fehler: text }, { status, headers: KOPF });
}

// Nur die vier Adressfelder werden übernommen – alles andere im Body wird verworfen und geht nie an den Kartendienst.
function adresse(x: unknown): AdressEingabe | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : null);
  return { strasse: text(o.strasse), plz: text(o.plz), ort: text(o.ort), lkz: text(o.lkz) };
}

/** POST /api/karte/route { start, ziel, zwischen? } → { km, minuten, geometrie, start, ziel } */
export async function POST(request: Request) {
  if (!(await aktuellerNutzer())) return antwortFehler("Nicht angemeldet", 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return antwortFehler("Ungültige Anfrage", 400);
  }
  const o = (body ?? {}) as Record<string, unknown>;
  const start = adresse(o.start);
  const ziel = adresse(o.ziel);
  if (!start || !ziel) return antwortFehler("Start und Ziel fehlen.", 400);
  const zwischen = Array.isArray(o.zwischen) ? o.zwischen.slice(0, 5).map(adresse).filter((a): a is AdressEingabe => !!a && !!(a.ort || a.plz)) : [];
  try {
    return NextResponse.json(await berechneRoute({ start, ziel, zwischen }), { headers: KOPF });
  } catch (e) {
    const k = e instanceof KartenFehler ? e : new KartenFehler("Die Route konnte nicht berechnet werden.");
    return antwortFehler(k.message, k.status);
  }
}
