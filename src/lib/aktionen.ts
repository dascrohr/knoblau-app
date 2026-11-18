"use server";
// Schreibende Server Actions. Beide Ansichten benutzen genau diese Funktionen.
import { revalidatePath } from "next/cache";
import { db, erfordereNutzer } from "./supabase/server";
import { adminDb } from "./supabase/admin";
import { ADRESS_ARTEN, positionIstLeer, type AngebotSpeichern, type Ergebnis } from "./angebot-typen";
import { berechnePreis } from "./preis";
import { STAMM_TABELLEN, type StammTabelle } from "./daten";

const GESPERRT = new Set(["id", "legacy_rowid", "erstellt_am", "geaendert_am", "geaendert_von", "suchtext", "netto_summe"]);

function bereinige<T extends Record<string, unknown>>(o: T, gesperrt: Set<string> = GESPERRT): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (gesperrt.has(k) || v === undefined) continue;
    r[k] = typeof v === "string" ? (v.trim() === "" ? null : v) : v;
  }
  return r;
}

function fehler(text: string): { ok: false; fehler: string } {
  return { ok: false, fehler: text };
}

/** Speichert ein Angebot mit Adressen, Positionen, Terminen und Checkliste. Rechnet die Nettosumme und den Suchtext neu. */
export async function speichereAngebot(e: AngebotSpeichern): Promise<Ergebnis<{ netto: number }>> {
  const nutzer = await erfordereNutzer();
  const sb = await db();
  const id = Number(e.id);
  if (!Number.isInteger(id)) return fehler("Ungültiges Angebot");

  if (e.angebot) {
    const { error } = await sb.from("angebote").update(bereinige(e.angebot)).eq("id", id);
    if (error) return fehler("Angebot konnte nicht gespeichert werden (Kopfdaten).");
  }

  if (e.adressen) {
    for (const art of ADRESS_ARTEN) {
      const a = e.adressen[art];
      if (!a) continue;
      const zeile = { ...bereinige(a as Record<string, unknown>, new Set(["id", "angebot_id", "art"])), angebot_id: id, art };
      const { error } = await sb.from("angebot_adressen").upsert(zeile, { onConflict: "angebot_id,art" });
      if (error) return fehler("Adressen konnten nicht gespeichert werden.");
    }
  }

  if (e.positionen) {
    const zeilen = e.positionen.filter((p) => !positionIstLeer(p)).map((p) => ({ ...bereinige(p as Record<string, unknown>, new Set(["id", "angebot_id"])), angebot_id: id }));
    const { data: bestand } = await sb.from("angebot_positionen").select("id,bereich,zeile").eq("angebot_id", id);
    if (zeilen.length) {
      const { error } = await sb.from("angebot_positionen").upsert(zeilen, { onConflict: "angebot_id,bereich,zeile" });
      if (error) return fehler("Positionen konnten nicht gespeichert werden.");
    }
    const bleibt = new Set(zeilen.map((z) => `${(z as { bereich?: string }).bereich}:${(z as { zeile?: number }).zeile}`));
    const weg = (bestand ?? []).filter((b) => !bleibt.has(`${b.bereich}:${b.zeile}`)).map((b) => b.id);
    if (weg.length) await sb.from("angebot_positionen").delete().in("id", weg);
  }

  if (e.termine) {
    const zeilen = e.termine.filter((t) => t.text || t.datum || t.von || t.bis).map((t) => ({ ...bereinige(t as Record<string, unknown>, new Set(["id", "angebot_id"])), angebot_id: id }));
    if (zeilen.length) {
      const { error } = await sb.from("angebot_termine").upsert(zeilen, { onConflict: "angebot_id,zeile" });
      if (error) return fehler("Termine konnten nicht gespeichert werden.");
    }
    const nummern = zeilen.map((z) => (z as { zeile?: number }).zeile).filter((z): z is number => typeof z === "number");
    let loeschen = sb.from("angebot_termine").delete().eq("angebot_id", id);
    if (nummern.length) loeschen = loeschen.not("zeile", "in", `(${nummern.join(",")})`);
    await loeschen;
  }

  if (e.checkliste) {
    const zeilen = e.checkliste.map((c, i) => ({ ...bereinige(c as Record<string, unknown>, new Set(["id", "angebot_id"])), angebot_id: id, zeile: c.zeile ?? i + 1 }));
    if (zeilen.length) {
      const { error } = await sb.from("checklistenpunkte").upsert(zeilen, { onConflict: "angebot_id,zeile" });
      if (error) return fehler("Checkliste konnte nicht gespeichert werden.");
    }
    const nummern = zeilen.map((z) => z.zeile);
    let loeschen = sb.from("checklistenpunkte").delete().eq("angebot_id", id);
    if (nummern.length) loeschen = loeschen.not("zeile", "in", `(${nummern.join(",")})`);
    await loeschen;
  }

  // Abgeleitete Felder aus dem gespeicherten Stand neu rechnen.
  const [{ data: a }, { data: pos }, { data: adr }] = await Promise.all([
    sb.from("angebote").select("*").eq("id", id).maybeSingle(),
    sb.from("angebot_positionen").select("bereich,anzahl,einheiten,einzelpreis,prozent").eq("angebot_id", id),
    sb.from("angebot_adressen").select("art,name,vorname,name1,strasse,plz,ort").eq("angebot_id", id),
  ]);
  if (!a) return fehler("Angebot nicht gefunden.");
  const preis = berechnePreis(a, (pos ?? []) as Parameters<typeof berechnePreis>[1]);
  const suchtext = [a.angebotnr, ...(adr ?? []).flatMap((x) => [x.name, x.vorname, x.name1, x.plz, x.ort, x.art === "auftraggeber" ? x.strasse : null])]
    .filter(Boolean).join(" ").toLowerCase();
  const jahr = a.angebotsdatum ? Number(String(a.angebotsdatum).slice(0, 4)) : a.jahr;
  const { error } = await sb.from("angebote").update({ netto_summe: preis.nettoLeistungen, suchtext, jahr, geaendert_am: new Date().toISOString(), geaendert_von: nutzer.id }).eq("id", id);
  if (error) return fehler("Summen konnten nicht gespeichert werden.");
  revalidatePath("/alt", "layout");
  revalidatePath("/neu", "layout");
  return { ok: true, daten: { netto: preis.nettoLeistungen } };
}

/** Legt ein leeres Angebot mit der nächsten freien Nummer an (220 + JJMM + lfd. Nr.). */
export async function neuesAngebot(): Promise<Ergebnis<{ id: number; angebotnr: string }>> {
  const nutzer = await erfordereNutzer();
  const sb = await db();
  const heute = new Date();
  const jjmm = String(heute.getFullYear()).slice(2) + String(heute.getMonth() + 1).padStart(2, "0");
  const praefix = "220" + jjmm;
  for (let versuch = 0; versuch < 5; versuch++) {
    const { data: letzte } = await sb.from("angebote").select("angebotnr").like("angebotnr", praefix + "%").order("angebotnr", { ascending: false }).limit(1);
    const lfd = (Number(letzte?.[0]?.angebotnr?.slice(praefix.length)) || 0) + 1 + versuch;
    const angebotnr = praefix + String(lfd).padStart(3, "0");
    const { data: schon } = await sb.from("angebote").select("id").eq("angebotnr", angebotnr).limit(1);
    if (schon?.length) continue;
    const datum = heute.toISOString().slice(0, 10);
    const { data, error } = await sb.from("angebote")
      .insert({ angebotnr, angebotsdatum: datum, jahr: heute.getFullYear(), ust_satz: 19, waehrung: "EUR", suchtext: angebotnr, netto_summe: 0, geaendert_von: nutzer.id, sachbearbeiter: nutzer.name })
      .select("id").single();
    if (error || !data) return fehler("Angebot konnte nicht angelegt werden.");
    await sb.from("angebot_adressen").insert(ADRESS_ARTEN.slice(0, 3).map((art) => ({ angebot_id: data.id, art })));
    revalidatePath("/alt", "layout");
    revalidatePath("/neu", "layout");
    return { ok: true, daten: { id: data.id, angebotnr } };
  }
  return fehler("Keine freie Angebotsnummer gefunden.");
}

/** Löscht ein Angebot samt Adressen, Positionen, Terminen (nur Admin). */
export async function loescheAngebot(id: number): Promise<Ergebnis> {
  const nutzer = await erfordereNutzer();
  if (nutzer.rolle !== "admin") return fehler("Nur der Admin darf Angebote löschen.");
  const sb = await db();
  const { error } = await sb.from("angebote").delete().eq("id", Number(id));
  if (error) return fehler("Angebot konnte nicht gelöscht werden.");
  revalidatePath("/alt", "layout");
  revalidatePath("/neu", "layout");
  return { ok: true, daten: undefined };
}

// ------------------------------------------------------------------ Stammdaten
/** Legt eine Stammdaten-Zeile an (ohne id) oder ändert sie (mit id). Deaktivieren = `aktiv: false`. */
export async function speichereStamm(tabelle: StammTabelle, zeile: Record<string, unknown>): Promise<Ergebnis<{ id: number }>> {
  await erfordereNutzer();
  if (!STAMM_TABELLEN.includes(tabelle)) return fehler("Unbekannte Stammdaten-Tabelle");
  const sb = await db();
  const werte = bereinige(zeile, new Set(["id", "legacy_key", "geaendert_am"]));
  if (tabelle !== "stamm_auswahl") werte.geaendert_am = new Date().toISOString();
  const id = Number(zeile.id);
  const abfrage = Number.isInteger(id) && id > 0 ? sb.from(tabelle).update(werte).eq("id", id).select("id").single() : sb.from(tabelle).insert(werte).select("id").single();
  const { data, error } = await abfrage;
  if (error || !data) return fehler("Eintrag konnte nicht gespeichert werden.");
  revalidatePath("/neu", "layout");
  revalidatePath("/alt", "layout");
  return { ok: true, daten: { id: data.id } };
}

// ------------------------------------------------------------------ Nutzerverwaltung (nur Admin)
export async function nutzerAnlegen(_: Ergebnis<{ email: string }> | null, form: FormData): Promise<Ergebnis<{ email: string }>> {
  const ich = await erfordereNutzer();
  if (ich.rolle !== "admin") return fehler("Nur der Admin darf Nutzer anlegen.");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim() || null;
  const passwort = String(form.get("passwort") ?? "");
  const rolle = form.get("rolle") === "admin" ? "admin" : "nutzer";
  if (!/^\S+@\S+\.\S+$/.test(email)) return fehler("Bitte eine gültige E-Mail-Adresse eingeben.");
  if (passwort.length < 12) return fehler("Das Startpasswort braucht mindestens 12 Zeichen.");
  const admin = adminDb();
  const { data, error } = await admin.auth.admin.createUser({ email, password: passwort, email_confirm: true });
  if (error || !data.user) return fehler(error?.status === 422 ? "Diese E-Mail-Adresse gibt es schon." : "Nutzer konnte nicht angelegt werden.");
  const { error: e2 } = await admin.from("profile").upsert({ id: data.user.id, email, name, rolle, aktiv: true });
  if (e2) return fehler("Nutzer angelegt, aber das Profil fehlt. Bitte erneut versuchen.");
  revalidatePath("/nutzer");
  return { ok: true, daten: { email } };
}

export async function nutzerAendern(id: string, werte: { aktiv?: boolean; rolle?: "admin" | "nutzer" }): Promise<Ergebnis> {
  const ich = await erfordereNutzer();
  if (ich.rolle !== "admin") return fehler("Nur der Admin darf Nutzer ändern.");
  if (id === ich.id) return fehler("Das eigene Konto lässt sich hier nicht ändern.");
  const admin = adminDb();
  const aenderung: Record<string, unknown> = {};
  if (typeof werte.aktiv === "boolean") aenderung.aktiv = werte.aktiv;
  if (werte.rolle === "admin" || werte.rolle === "nutzer") aenderung.rolle = werte.rolle;
  const { error } = await admin.from("profile").update(aenderung).eq("id", id);
  if (error) return fehler("Änderung konnte nicht gespeichert werden.");
  revalidatePath("/nutzer");
  return { ok: true, daten: undefined };
}

/** Löscht einen Nutzer endgültig (Anmeldung und Profil). Nur Admin, nicht das eigene Konto. */
export async function nutzerLoeschen(id: string): Promise<Ergebnis> {
  const ich = await erfordereNutzer();
  if (ich.rolle !== "admin") return fehler("Nur der Admin darf Nutzer löschen.");
  if (id === ich.id) return fehler("Das eigene Konto lässt sich hier nicht löschen.");
  const admin = adminDb();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return fehler("Nutzer konnte nicht gelöscht werden.");
  await admin.from("profile").delete().eq("id", id);
  revalidatePath("/nutzer");
  return { ok: true, daten: undefined };
}
