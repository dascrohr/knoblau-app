import { NextResponse, type NextRequest } from "next/server";
import { aktuellerNutzer } from "@/lib/supabase/server";
import { adressVorschlaege, KartenFehler } from "@/lib/karte";

const KOPF = { "Cache-Control": "private, no-store" };

/** GET /api/karte/vorschlag?q=… → { treffer: [{ label, strasse, plz, ort, lkz, lon, lat }] } */
export async function GET(request: NextRequest) {
  if (!(await aktuellerNutzer())) return NextResponse.json({ fehler: "Nicht angemeldet" }, { status: 401, headers: KOPF });
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 120).trim();
  if (q.length < 3) return NextResponse.json({ treffer: [] }, { headers: KOPF });
  try {
    return NextResponse.json({ treffer: await adressVorschlaege(q) }, { headers: KOPF });
  } catch (e) {
    const k = e instanceof KartenFehler ? e : new KartenFehler("Der Kartendienst meldet einen Fehler.");
    return NextResponse.json({ fehler: k.message, treffer: [] }, { status: k.status, headers: KOPF });
  }
}
