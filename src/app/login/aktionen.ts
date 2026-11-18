"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/server";

export async function anmelden(_: { fehler: string } | null, form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const passwort = String(form.get("passwort") ?? "");
  if (!email || !passwort) return { fehler: "Bitte E-Mail und Passwort eingeben." };
  const sb = await db();
  const { error } = await sb.auth.signInWithPassword({ email, password: passwort });
  if (error) return { fehler: "Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen." };
  const { data: p } = await sb.from("profile").select("aktiv").maybeSingle();
  if (!p?.aktiv) {
    await sb.auth.signOut();
    return { fehler: "Dieses Konto ist nicht freigeschaltet. Bitte an den Admin wenden." };
  }
  redirect("/neu");
}

export async function abmelden() {
  const sb = await db();
  await sb.auth.signOut();
  redirect("/login");
}
