"use server";
// Schreibende Server Actions. Beide Ansichten benutzen genau diese Funktionen.
import { revalidatePath } from "next/cache";
import { db, erfordereNutzer } from "./supabase/server";
import { adminDb } from "./supabase/admin";
import { ADRESS_ARTEN, positionIstLeer, type AngebotSpeichern, type Ergebnis } from "./angebot-typen";
import { berechnePreis } from "./preis";
import { STAMM_TABELLEN, type StammTabelle } from "./daten";

const GESPERRT = new Set(["id", "legacy_rowid", "erstellt_am", "geaendert_am", "geaendert_von", "suchtext", "netto_summe", "version"]);

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

/**
 * Speichert ein Angebot mit Adressen, Positionen, Terminen und Checkliste in einer Transaktion (DB-Funktion app.angebot_speichern).
 * Lehnt ab, wenn jemand anderes gerade bearbeitet (grund 'gesperrt') oder ein neuerer Stand gespeichert wurde (grund 'veraltet').
 * Rechnet danach Nettosumme und Suchtext neu. Antwort enthält die neue `version` für das nächste Speichern.
 */
export async function speichereAngebot(e: AngebotSpeichern): Promise<Ergebnis<{ netto: number; version: number }>> {
  await erfordereNutzer();
  const sb = await db();
  const id = Number(e.id);
  if (!Number.isInteger(id)) return fehler("Ungültiges Angebot");

  const p: Record<string, unknown> = {};
  if (e.angebot) p.angebot = bereinige(e.angebot);
  if (e.adressen) {
    const adr: Record<string, unknown> = {};
    for (const art of ADRESS_ARTEN) {
      const a = e.adressen[art];
      if (a) adr[art] = bereinige(a as Record<string, unknown>, new Set(["id", "angebot_id", "art"]));
    }
    p.adressen = adr;
  }
  if (e.positionen) p.positionen = e.positionen.filter((x) => !positionIstLeer(x)).map((x) => bereinige(x as Record<string, unknown>, new Set(["id", "angebot_id"])));
  if (e.termine) p.termine = e.termine.filter((t) => t.text || t.datum || t.von || t.bis).map((t) => bereinige(t as Record<string, unknown>, new Set(["id", "angebot_id"])));
  if (e.checkliste) p.checkliste = e.checkliste.map((c, i) => ({ ...bereinige(c as Record<string, unknown>, new Set(["id", "angebot_id"])), zeile: c.zeile ?? i + 1 }));

  const { data: antwort, error: rpcFehler } = await sb.rpc("angebot_speichern", { p_id: id, p_sitzung: e.sitzung ?? null, p_version: e.version ?? null, p });
  if (rpcFehler || !antwort) return fehler("Angebot konnte nicht gespeichert werden. Es wurde nichts geändert.");
  const r = antwort as { ok: boolean; grund?: string; nutzer_name?: string | null; version?: number };
  if (!r.ok) {
    if (r.grund === "gesperrt") return { ok: false, grund: "gesperrt", fehler: `Nicht gespeichert: ${r.nutzer_name || "Jemand anderes"} bearbeitet dieses Angebot gerade.` };
    if (r.grund === "veraltet") return { ok: false, grund: "veraltet", fehler: "Nicht gespeichert: Dieses Angebot wurde inzwischen an anderer Stelle geändert. Bitte neu laden." };
    return fehler("Angebot nicht gefunden.");
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
  await sb.from("angebote").update({ netto_summe: preis.nettoLeistungen, suchtext, jahr }).eq("id", id);
  revalidatePath("/alt", "layout");
  revalidatePath("/neu", "layout");
  return { ok: true, daten: { netto: preis.nettoLeistungen, version: r.version ?? a.version } };
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

// ------------------------------------------------------------------ Angebot duplizieren, Kunden
/** Legt eine Kopie des Angebots mit neuer Nummer und heutigem Datum an (Adressen, Positionen, Checkliste; ohne Termine, Status, Auftrag). */
export async function dupliziereAngebot(quelleId: number): Promise<Ergebnis<{ id: number; angebotnr: string }>> {
  const neu = await neuesAngebot();
  if (!neu.ok) return neu;
  const sb = await db();
  const id = Number(quelleId);
  const [{ data: a }, { data: adr }, { data: pos }, { data: chk }] = await Promise.all([
    sb.from("angebote").select("*").eq("id", id).maybeSingle(),
    sb.from("angebot_adressen").select("*").eq("angebot_id", id),
    sb.from("angebot_positionen").select("*").eq("angebot_id", id),
    sb.from("checklistenpunkte").select("*").eq("angebot_id", id),
  ]);
  if (!a) return fehler("Das Ausgangsangebot wurde nicht gefunden.");
  const nichtKopieren = new Set([...GESPERRT, "angebotnr", "angebotsdatum", "jahr", "status", "auftragnr", "auftragsdatum", "umzugstermin", "besichtigung_datum", "besichtigung_zeit", "route_berechnet_am", "entwurf"]);
  const kopf = Object.fromEntries(Object.entries(a).filter(([k]) => !nichtKopieren.has(k)));
  const ohne = <T extends Record<string, unknown>>(x: T) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== "id" && k !== "angebot_id"));
  const r = await speichereAngebot({
    id: neu.daten.id,
    angebot: { ...kopf, entwurf: true },
    adressen: Object.fromEntries((adr ?? []).map((x) => [x.art, ohne(x)])),
    positionen: (pos ?? []).map(ohne) as never,
    checkliste: (chk ?? []).map((c) => ({ ...ohne(c), erledigt: false, wert: null })) as never,
  });
  if (!r.ok) return fehler("Die Kopie wurde angelegt, aber nicht vollständig gefüllt. Bitte prüfen.");
  return neu;
}

const KUNDEN_FELDER = ["anrede", "titel", "vorname", "name", "name1", "name2", "zuhaenden", "strasse", "lkz", "plz", "ort", "telefon", "telefon2", "mobil", "telefax", "email", "internet", "ustid", "zahlungsbedingung", "info", "aktiv", "art", "kundennr"] as const;

/** Legt einen Kunden an (ohne id) oder ändert ihn. Setzt `geaendert_am`, damit der nächste Import die Änderung nicht überschreibt. */
export async function speichereKunde(zeile: Record<string, unknown>): Promise<Ergebnis<{ id: number }>> {
  await erfordereNutzer();
  const sb = await db();
  const werte: Record<string, unknown> = {};
  for (const k of KUNDEN_FELDER) if (zeile[k] !== undefined) werte[k] = typeof zeile[k] === "string" && (zeile[k] as string).trim() === "" ? null : zeile[k];
  const id = Number(zeile.id);
  const neu = !(Number.isInteger(id) && id > 0);
  if (neu && werte.art !== "firma") werte.art = "privat";
  if (!neu) delete werte.art;
  if (neu && !werte.name && !werte.name1) return fehler("Bitte einen Namen oder eine Firma eintragen.");
  const alt = neu ? null : (await sb.from("kunden").select("*").eq("id", id).maybeSingle()).data;
  const stand = { ...(alt ?? {}), ...werte } as Record<string, unknown>;
  werte.suchtext = [stand.name, stand.vorname, stand.name1, stand.strasse, stand.plz, stand.ort].filter(Boolean).join(" ").toLowerCase();
  werte.geaendert_am = new Date(Date.now() + 1000).toISOString();
  const abfrage = neu ? sb.from("kunden").insert(werte).select("id").single() : sb.from("kunden").update(werte).eq("id", id).select("id").single();
  const { data, error } = await abfrage;
  if (error || !data) return fehler("Kunde konnte nicht gespeichert werden.");
  revalidatePath("/neu", "layout");
  revalidatePath("/alt", "layout");
  return { ok: true, daten: { id: data.id } };
}

export type KundenTreffer = { id: number; art: string; kundennr: number | null; anrede: string | null; titel: string | null; vorname: string | null; name: string | null; name1: string | null; name2: string | null; zuhaenden: string | null; strasse: string | null; lkz: string | null; plz: string | null; ort: string | null; telefon: string | null; mobil: string | null; telefax: string | null; email: string | null; zahlungsbedingung: string | null };

/** Kundensuche für „Adresse aus Kundenstamm“ in der Angebotsmaske (höchstens 20 Treffer, Firmen zuerst). */
export async function sucheKunden(q: string): Promise<KundenTreffer[]> {
  await erfordereNutzer();
  const text = String(q ?? "").toLowerCase().trim().replace(/[%_,()\\]/g, " ").replace(/\s+/g, "%");
  if (text.length < 2) return [];
  const sb = await db();
  const { data } = await sb.from("kunden")
    .select("id,art,kundennr,anrede,titel,vorname,name,name1,name2,zuhaenden,strasse,lkz,plz,ort,telefon,mobil,telefax,email,zahlungsbedingung")
    .eq("aktiv", true).ilike("suchtext", `%${text}%`).order("art").order("letzter", { ascending: false, nullsFirst: false }).limit(20);
  return (data ?? []) as KundenTreffer[];
}

// ------------------------------------------------------------------ Einstellungen (Firmenangaben, feste Texte)
/** Speichert Einstellungen (nur Admin). Schlüssel siehe src/lib/firma.ts. */
export async function speichereEinstellungen(werte: Record<string, string | null>): Promise<Ergebnis> {
  const ich = await erfordereNutzer();
  if (ich.rolle !== "admin") return fehler("Nur der Admin darf die Firmenangaben ändern.");
  const sb = await db();
  const zeilen = Object.entries(werte).filter(([k]) => /^[a-z0-9_]{2,40}$/.test(k)).map(([schluessel, wert]) => ({ schluessel, wert: wert == null ? "" : String(wert).trim().slice(0, 8000) /* leer = bewusst geleert */, geaendert_am: new Date().toISOString() }));
  if (!zeilen.length) return { ok: true, daten: undefined };
  const { error } = await sb.from("einstellungen").upsert(zeilen, { onConflict: "schluessel" });
  if (error) return fehler("Einstellungen konnten nicht gespeichert werden.");
  revalidatePath("/", "layout");
  return { ok: true, daten: undefined };
}

// ------------------------------------------------------------------ Passwörter
/** Eigenes Passwort ändern (eingeloggt). */
export async function passwortAendern(_: Ergebnis | null, form: FormData): Promise<Ergebnis> {
  await erfordereNutzer();
  const neu = String(form.get("neu") ?? "");
  const wdh = String(form.get("wiederholung") ?? "");
  if (neu.length < 12) return fehler("Das Passwort braucht mindestens 12 Zeichen.");
  if (neu !== wdh) return fehler("Die beiden Eingaben stimmen nicht überein.");
  const sb = await db();
  const { error } = await sb.auth.updateUser({ password: neu });
  if (error) return fehler(/same|different/i.test(error.message) ? "Das neue Passwort muss sich vom alten unterscheiden." : "Das Passwort konnte nicht geändert werden.");
  return { ok: true, daten: undefined };
}

/** Admin setzt einem Nutzer ein neues Startpasswort (wenn jemand sein Passwort vergessen hat). */
export async function nutzerPasswortSetzen(id: string, passwort: string): Promise<Ergebnis> {
  const ich = await erfordereNutzer();
  if (ich.rolle !== "admin") return fehler("Nur der Admin darf Passwörter zurücksetzen.");
  if (String(passwort).length < 12) return fehler("Das Passwort braucht mindestens 12 Zeichen.");
  const { error } = await adminDb().auth.admin.updateUserById(id, { password: String(passwort) });
  if (error) return fehler("Das Passwort konnte nicht gesetzt werden.");
  return { ok: true, daten: undefined };
}
