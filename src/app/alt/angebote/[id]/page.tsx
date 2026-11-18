import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { angebotNachbarn, ladeAngebot, ladeAuswahl, ladeStamm } from "@/lib/daten";
import { aktuellerNutzer } from "@/lib/supabase/server";
import type { StammChecklisteZeile, StammLeistungenZeile, StammPackmaterialZeile, StammZimmerZeile } from "@/lib/db-typen";
import { AngebotMaske } from "@/components/alt/angebot-maske";
import { eins, type SuchParameter } from "@/components/alt/hilfen";

export const metadata: Metadata = { title: "Angebot (Altansicht)" };

const LISTEN = ["herkunft", "zahlungsbedingung", "umzugsart", "sachbearbeiter", "besichtigung_art", "volumen_ermittlung"] as const;

/** Stammdaten sind Komfort; fällt eine Abfrage aus, bleibt die Maske benutzbar. */
async function sicher<T>(p: Promise<T[]>): Promise<T[]> {
  try {
    return await p;
  } catch {
    return [];
  }
}

export default async function AngebotSeite({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SuchParameter }) {
  const [{ id: roh }, sp] = await Promise.all([params, searchParams]);
  const id = Number(roh);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [daten, nachbarn, nutzer, leistungen, packmaterial, checkliste, zimmer, ...listen] = await Promise.all([
    ladeAngebot(id),
    angebotNachbarn(id),
    aktuellerNutzer(),
    sicher(ladeStamm<StammLeistungenZeile>("stamm_leistungen")),
    sicher(ladeStamm<StammPackmaterialZeile>("stamm_packmaterial")),
    sicher(ladeStamm<StammChecklisteZeile>("stamm_checkliste")),
    sicher(ladeStamm<StammZimmerZeile>("stamm_zimmer")),
    ...LISTEN.map((l) => sicher(ladeAuswahl(l))),
  ]);
  if (!daten) notFound();
  const auswahl = Object.fromEntries(LISTEN.map((l, i) => [l, listen[i]]));
  return (
    <AngebotMaske
      key={id}
      daten={daten}
      nachbarn={{ erster: nachbarn.erster, zurueck: nachbarn.zurueck, vor: nachbarn.vor, letzter: nachbarn.letzter }}
      position={nachbarn.position}
      gesamt={nachbarn.gesamt}
      stamm={{ leistungen, packmaterial, checkliste, zimmer, auswahl }}
      admin={nutzer?.rolle === "admin"}
      neu={eins(sp, "neu") === "1"}
    />
  );
}
