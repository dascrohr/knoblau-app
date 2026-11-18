import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AngebotMaske } from "@/components/neu/angebot/maske";
import type { StammEintrag } from "@/components/neu/angebot/positionen";
import { angebotFilter, ladeAngebot, ladeAuswahl, ladeStamm, ladeTextbausteine } from "@/lib/daten";
import type { StammChecklisteZeile, StammLeistungenZeile, StammPackmaterialZeile } from "@/lib/db-typen";
import { aktuellerNutzer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Angebot" };

/** Nur gesetzte Werte übernehmen, damit eine Stammdaten-Übernahme nichts mit „leer“ überschreibt. */
function gesetzt<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== "")) as Partial<T>;
}

export default async function AngebotSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id: roh } = await params;
  const id = Number(roh);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [angebot, nutzer, filter, leistungen, packmaterial, checkliste, herkunft, umzugsart, zahlungsbedingung, sachbearbeiter, besichtigung_art, volumen_ermittlung, mwst, textbausteine] = await Promise.all([
    ladeAngebot(id),
    aktuellerNutzer(),
    angebotFilter(),
    ladeStamm<StammLeistungenZeile>("stamm_leistungen"),
    ladeStamm<StammPackmaterialZeile>("stamm_packmaterial"),
    ladeStamm<StammChecklisteZeile>("stamm_checkliste"),
    ladeAuswahl("herkunft"),
    ladeAuswahl("umzugsart"),
    ladeAuswahl("zahlungsbedingung"),
    ladeAuswahl("sachbearbeiter"),
    ladeAuswahl("besichtigung_art"),
    ladeAuswahl("volumen_ermittlung"),
    ladeAuswahl("mwst"),
    ladeTextbausteine(),
  ]);
  if (!angebot) notFound();

  const stammLeistungen: StammEintrag[] = leistungen.map((l) => ({
    id: l.id,
    text: l.text,
    suchbegriff: l.suchbegriff,
    beschreibung: l.beschreibung,
    werte: { text: l.text, ...gesetzt({ beschreibung: l.beschreibung, anzahl: l.anzahl, einheiten: l.einheiten, einzelpreis: l.einzelpreis, prozent: l.prozent, ust: l.ust, konto: l.konto, kostenstelle: l.kostenstelle }) },
  }));
  const stammPackmaterial: StammEintrag[] = packmaterial.map((p) => ({
    id: p.id,
    text: p.text,
    suchbegriff: p.suchbegriff,
    beschreibung: p.beschreibung,
    werte: { text: p.text, ...gesetzt({ beschreibung: p.beschreibung, art: p.art, einheiten: p.einheiten, einzelpreis: p.einzelpreis, prozent: p.prozent, ust: p.ust, konto: p.konto, kostenstelle: p.kostenstelle }) },
  }));

  return (
    <AngebotMaske
      key={angebot.angebot.id}
      start={angebot}
      listen={{ herkunft, umzugsart, zahlungsbedingung, sachbearbeiter, besichtigung_art, volumen_ermittlung, mwst, status: filter.status }}
      stammLeistungen={stammLeistungen}
      stammPackmaterial={stammPackmaterial}
      stammCheckliste={checkliste}
      textbausteine={textbausteine}
      istAdmin={nutzer?.rolle === "admin"}
    />
  );
}
