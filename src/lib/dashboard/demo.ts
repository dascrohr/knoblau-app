// Erfundene Daten für lokale Tests und Screenshots des Dashboards. Enthält keine echten Vorgänge.
// Fester Zufallsstartwert: jede Ausführung liefert dieselben Zahlen.
import type { AngebotRoh, RechnungRoh } from "./rechnen";

export function erzeugeDemoDaten(heute = "2026-11-17", jahre = 11): { angebote: AngebotRoh[]; rechnungen: RechnungRoh[] } {
  let zustand = 20261117;
  const zufall = () => {
    zustand = (zustand * 1664525 + 1013904223) % 4294967296;
    return zustand / 4294967296;
  };
  const tag0 = Date.UTC(Number(heute.slice(0, 4)) - jahre, 0, 1);
  const ende = Date.UTC(Number(heute.slice(0, 4)), Number(heute.slice(5, 7)) - 1, Number(heute.slice(8, 10)));
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const gebiete = ["50", "51", "50", "51", "53", "40", "41", "42", "52", "01", "10", "80", "20", "60", "45", "47"];
  const saison = [0.6, 0.65, 0.9, 1.0, 1.15, 1.3, 1.45, 1.4, 1.1, 1.0, 0.8, 0.6];
  const angebote: AngebotRoh[] = [];
  const rechnungen: RechnungRoh[] = [];
  let id = 1, rid = 1;
  for (let ms = tag0; ms <= ende; ms += 86_400_000) {
    const d = new Date(ms);
    const wachstum = 1 + (ms - tag0) / (ende - tag0) * 0.5;
    const erwartet = 1.6 * saison[d.getUTCMonth()] * wachstum;
    const anzahl = Math.floor(erwartet) + (zufall() < erwartet % 1 ? 1 : 0);
    for (let i = 0; i < anzahl; i++) {
      const z = zufall();
      const bela = gebiete[Math.floor(zufall() * gebiete.length)];
      const entla = gebiete[Math.floor(zufall() * gebiete.length)];
      const ausland = z > 0.985;
      const a: AngebotRoh = {
        id, angebotnr: z < 0.01 ? null : z < 0.014 ? "DEMO-DOPPELT" : `D${id}`, angebotsdatum: z > 0.995 ? null : iso(ms), entwurf: z > 0.97 && z < 0.975,
        bela_lkz: ausland ? "CH" : z < 0.08 ? "D" : null, bela_plz: z > 0.96 && z < 0.97 ? null : ausland ? "8001" : `${bela}${String(100 + Math.floor(zufall() * 800))}`,
        entla_lkz: null, entla_plz: zufall() < 0.04 ? null : `${entla}${String(100 + Math.floor(zufall() * 800))}`,
      };
      angebote.push(a);
      // Rund 42 % werden fakturiert, meist nach 2 bis 10 Wochen, wenige erst nach einem halben Jahr.
      if (a.angebotsdatum && zufall() < 0.42) {
        const abstand = zufall() < 0.93 ? 14 + Math.floor(zufall() * 60) : 150 + Math.floor(zufall() * 120);
        const betrag = Math.round((900 + zufall() * 2600) * (0.85 + saison[d.getUTCMonth()] * 0.25) * wachstum * 100) / 100;
        const rms = ms + abstand * 86_400_000;
        if (rms <= ende) rechnungen.push({ id: rid++, angebot_id: id, rechnungsdatum: iso(rms), gesamtsumme: zufall() < 0.01 ? null : zufall() < 0.008 ? 0 : betrag, waehrung: "EUR" });
        if (rms <= ende && zufall() < 0.05) rechnungen.push({ id: rid++, angebot_id: id, rechnungsdatum: iso(rms + 20 * 86_400_000), gesamtsumme: Math.round(betrag * 0.2 * 100) / 100, waehrung: "EUR" });
      }
      id++;
    }
    // Rechnungen ohne Angebotszuordnung (etwa jede dritte)
    if (zufall() < 0.28 * saison[d.getUTCMonth()]) rechnungen.push({ id: rid++, angebot_id: null, rechnungsdatum: iso(ms), gesamtsumme: Math.round((300 + zufall() * 2200) * 100) / 100, waehrung: "EUR" });
  }
  return { angebote, rechnungen };
}
