import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ladeStamm } from "@/lib/daten";
import { Knopf, Seitenkopf } from "@/components/neu/ui";
import { auswahlListeVersteckt, konfigZuSlug } from "../konfig";
import { StammPflege, type StammZeile } from "../stamm-pflege";

type Props = { params: Promise<{ tabelle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const k = konfigZuSlug((await params).tabelle);
  return { title: k ? `${k.titel} – Stammdaten` : "Stammdaten" };
}

export default async function StammTabelleSeite({ params }: Props) {
  const { tabelle } = await params;
  const konfig = konfigZuSlug(tabelle);
  if (!konfig) notFound();
  let zeilen = await ladeStamm<StammZeile>(konfig.tabelle, { alle: true });
  if (konfig.tabelle === "stamm_auswahl") zeilen = zeilen.filter((z) => !auswahlListeVersteckt(z.liste));
  return (
    <>
      <Seitenkopf titel={konfig.titel} unter={konfig.beschreibung} aktionen={<Knopf href="/neu/stammdaten">← Alle Stammdaten</Knopf>} />
      <StammPflege slug={konfig.slug} zeilen={zeilen} />
    </>
  );
}
