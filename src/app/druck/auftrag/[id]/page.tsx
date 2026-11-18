import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AngebotDruckAnsicht } from "@/components/druck/angebot-blatt";
import { ladeAngebot, ladeFirma } from "@/lib/daten";

export const metadata: Metadata = { title: "Auftragsbestätigung – Druckansicht" };

export default async function AuftragDruck({ params }: { params: Promise<{ id: string }> }) {
  const { id: roh } = await params;
  const id = Number(roh);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [daten, firma] = await Promise.all([ladeAngebot(id), ladeFirma()]);
  if (!daten) notFound();
  return <AngebotDruckAnsicht daten={daten} firma={firma} art="auftrag" />;
}
