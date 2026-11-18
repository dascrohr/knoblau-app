import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

// Bearbeitungs-Sperre: holen, halten (Lebenszeichen), anfragen, erzwingen, abgeben, status.
// Eigene Route statt Server Action, damit Lebenszeichen das Speichern nicht aufhalten und das Abgeben beim Schließen des Fensters noch ankommt.
const MODI = new Set(["holen", "halten", "anfragen", "erzwingen", "abgeben", "status"]);

export async function POST(anfrage: Request) {
  let k: { angebotId?: unknown; sitzung?: unknown; modus?: unknown };
  try {
    k = await anfrage.json();
  } catch {
    return NextResponse.json({ fehler: "Ungültige Anfrage" }, { status: 400 });
  }
  const angebotId = Number(k.angebotId);
  const sitzung = String(k.sitzung ?? "");
  const modus = String(k.modus ?? "");
  if (!Number.isInteger(angebotId) || angebotId <= 0 || !/^[A-Za-z0-9-]{8,64}$/.test(sitzung) || !MODI.has(modus)) {
    return NextResponse.json({ fehler: "Ungültige Anfrage" }, { status: 400 });
  }
  const sb = await db();
  const { data: nutzer } = await sb.auth.getUser();
  if (!nutzer.user) return NextResponse.json({ fehler: "Nicht angemeldet" }, { status: 401 });
  const { data, error } = await sb.rpc("sperre", { p_angebot: angebotId, p_sitzung: sitzung, p_modus: modus });
  if (error) return NextResponse.json({ fehler: "Sperre nicht verfügbar" }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
