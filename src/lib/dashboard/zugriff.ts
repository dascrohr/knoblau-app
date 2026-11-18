// Wer das Geschäftsleitungs-Dashboard sehen darf. Eigene Datei ohne Abhängigkeiten, damit die Regel testbar ist.
export type MoeglicherNutzer = { rolle: string } | null | undefined;

/** Nur angemeldete, aktive Administratoren. `aktuellerNutzer()` liefert für gesperrte Konten bereits null. */
export function darfDashboardSehen(nutzer: MoeglicherNutzer): boolean {
  return Boolean(nutzer) && (nutzer as { rolle: string }).rolle === "admin";
}
