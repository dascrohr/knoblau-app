"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/server";

export async function anmelden(_: { fehler: string } | null, form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const passwort = String(form.get("passwort") ?? "");
  if (!email || !passwort) return { fehler: "Bitte E-Mail und Passwort eingeben." };
  const sb = await db();
  const { data: anmeldung, error } = await sb.auth.signInWithPassword({ email, password: passwort });
  if (error || !anmeldung.user) return { fehler: "Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen." };
  const { data: p } = await sb.from("profile").select("aktiv").eq("id", anmeldung.user.id).maybeSingle();
  if (!p?.aktiv) {
    await sb.auth.signOut();
    return { fehler: "Dieses Konto ist nicht freigeschaltet. Bitte an den Admin wenden." };
  }
  redirect("/neu");
}

export async function abmelden() {
  const sb = await db();
  // Nur dieses Gerät abmelden; andere Browser desselben Nutzers bleiben angemeldet.
  await sb.auth.signOut({ scope: "local" });
  redirect("/login");
}

/** Schickt eine E-Mail mit einem Link zum Zurücksetzen. Antwortet immer gleich, damit niemand Konten erraten kann. */
export async function passwortVergessen(_: { ok: boolean; text: string } | null, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const antwort = { ok: true, text: "Wenn es zu dieser Adresse ein Konto gibt, ist jetzt eine E-Mail mit einem Link unterwegs. Der Link gilt eine Stunde und muss in diesem Browser geöffnet werden." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, text: "Bitte eine gültige E-Mail-Adresse eingeben." };
  const kopf = await headers();
  const host = kopf.get("x-forwarded-host") ?? kopf.get("host") ?? "knoblau.app";
  const basis = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;
  const sb = await db();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${basis}/auth/bestaetigen` });
  return antwort;
}
