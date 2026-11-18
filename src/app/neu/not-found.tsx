import { Knopf, Leerzustand } from "@/components/neu/ui";

export default function NichtGefunden() {
  return <Leerzustand titel="Diesen Eintrag gibt es nicht (mehr)" text="Vielleicht wurde er gelöscht oder die Adresse ist falsch." aktion={<Knopf href="/neu/angebote">Zur Angebotsliste</Knopf>} />;
}
