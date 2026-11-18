"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Umschalter Altansicht / Neuansicht für die Kopfzeile.
 * Bleibt beim selben Datensatz: /alt/angebote/123 <-> /neu/angebote/123.
 * `className` und `aktivClassName` erlauben das Styling je Ansicht.
 */
export function AnsichtUmschalter({ className = "", aktivClassName = "", inaktivClassName = "" }: { className?: string; aktivClassName?: string; inaktivClassName?: string }) {
  const pfad = usePathname() || "/neu";
  const istAlt = pfad === "/alt" || pfad.startsWith("/alt/");
  const rest = pfad.replace(/^\/(alt|neu)/, "");
  // Nur Bereiche übernehmen, die es in beiden Ansichten gibt.
  const gemeinsam = /^\/(angebote|kunden|rechnungen)(\/|$)/.test(rest) ? rest : "";
  return (
    <nav aria-label="Ansicht" className={className}>
      <Link href={`/alt${gemeinsam}`} aria-current={istAlt ? "page" : undefined} className={istAlt ? aktivClassName : inaktivClassName}>
        Altansicht
      </Link>
      <Link href={`/neu${gemeinsam}`} aria-current={!istAlt ? "page" : undefined} className={!istAlt ? aktivClassName : inaktivClassName}>
        Neuansicht
      </Link>
    </nav>
  );
}
