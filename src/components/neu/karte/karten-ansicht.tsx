"use client";
// Leaflet-Karte mit OSM-Kacheln. Wird erst eingebunden, wenn eine Route berechnet wurde –
// vorher werden weder die Bibliothek noch Kacheln geladen.
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type KartenPunkt = { lon: number; lat: number; label: string };
export type KartenAnsichtProps = {
  linie: [number, number][]; // [lon, lat]
  start: KartenPunkt;
  ziel: KartenPunkt;
  zwischen?: KartenPunkt[];
};

export function KartenAnsicht({ linie, start, ziel, zwischen }: KartenAnsichtProps) {
  const halter = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let abgebaut = false;
    let karte: import("leaflet").Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      const el = halter.current;
      if (abgebaut || !el) return;
      karte = L.map(el, { scrollWheelZoom: false, attributionControl: true });
      karte.attributionControl.setPrefix(false);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>-Mitwirkende · Route: <a href="https://openrouteservice.org" target="_blank" rel="noreferrer">openrouteservice</a>',
      }).addTo(karte);
      const farbe = getComputedStyle(el).getPropertyValue("--k-marke").trim() || "#e1001a";
      const weg = L.polyline(
        linie.map(([lon, lat]) => [lat, lon] as [number, number]),
        { color: farbe, weight: 5, opacity: 0.85 },
      ).addTo(karte);
      const marke = (p: KartenPunkt, fuellung: string, titel: string) =>
        L.circleMarker([p.lat, p.lon], { radius: 9, color: "#fff", weight: 3, fillColor: fuellung, fillOpacity: 1 })
          .addTo(karte!)
          .bindTooltip(`${titel}: ${p.label}`);
      marke(start, "#15803d", "Start");
      (zwischen ?? []).forEach((p, i) => marke(p, "#b45309", `Zwischenstopp ${i + 1}`));
      marke(ziel, "#b91c1c", "Ziel");
      karte.fitBounds(weg.getBounds().extend([start.lat, start.lon]).extend([ziel.lat, ziel.lon]), { padding: [24, 24] });
    })().catch(() => {
      // Karte ist Beiwerk: Zahlen stehen daneben, ein Ladefehler bleibt ohne Folgen.
    });
    return () => {
      abgebaut = true;
      karte?.remove();
    };
  }, [linie, start, ziel, zwischen]);

  return (
    <div
      ref={halter}
      role="img"
      aria-label={`Karte der Route von ${start.label} nach ${ziel.label}`}
      className="isolate h-80 w-full overflow-hidden"
      style={{ border: "1px solid var(--k-rahmen, #dadada)", borderRadius: "var(--k-radius, 6px)", background: "var(--k-flaeche-3, #ebebeb)" }}
    />
  );
}
