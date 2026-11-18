"use server";
// Lesende Server Action nur für die Angebotsmaske der Neuansicht: holt den neuesten gespeicherten Stand,
// ohne die Seite neu zu laden (nach einer Bearbeitungs-Übernahme oder wenn an anderer Stelle gespeichert wurde).
import type { AngebotKomplett } from "@/lib/angebot-typen";
import { ladeAngebot } from "@/lib/daten";
import { erfordereNutzer } from "@/lib/supabase/server";

export async function ladeAngebotFrisch(id: number): Promise<AngebotKomplett | null> {
  await erfordereNutzer();
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return ladeAngebot(n);
}
