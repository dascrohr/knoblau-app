import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";

// Rücksprung aus der E-Mail „Passwort zurücksetzen“: tauscht den Code gegen eine Sitzung und führt zur Passwort-Seite.
export async function GET(anfrage: NextRequest) {
  const url = anfrage.nextUrl;
  const sb = await db();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  let ok = false;
  if (code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash) ok = !(await sb.auth.verifyOtp({ type: "recovery", token_hash: tokenHash })).error;
  const ziel = url.clone();
  ziel.search = "";
  if (ok) {
    ziel.pathname = "/konto";
    ziel.searchParams.set("neu", "1");
  } else {
    ziel.pathname = "/login";
  }
  return NextResponse.redirect(ziel);
}
