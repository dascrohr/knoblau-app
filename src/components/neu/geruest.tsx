"use client";
// Seitengerüst der Neuansicht: Navigation links (unter 1024 px einklappbar), Kopfzeile oben.
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AnsichtUmschalter } from "@/components/ansicht-umschalter";

const PUNKTE = [
  { href: "/neu/angebote", text: "Angebote" },
  { href: "/neu/kunden", text: "Kunden" },
  { href: "/neu/rechnungen", text: "Rechnungen" },
  { href: "/neu/stammdaten", text: "Stammdaten" },
];

export function Geruest({ istAdmin, kopfRechts, children }: { istAdmin: boolean; kopfRechts: ReactNode; children: ReactNode }) {
  const pfad = usePathname() || "";
  const [offen, setOffen] = useState(false); // schmale Bildschirme: Navigation eingeblendet
  const [eingeklappt, setEingeklappt] = useState(false); // breite Bildschirme: Navigation ausgeblendet
  const zu = () => setOffen(false);
  return (
    <div className="k-geruest" data-eingeklappt={eingeklappt}>
      <button type="button" className="k-nav-schleier" data-offen={offen} aria-label="Navigation schließen" onClick={zu} tabIndex={offen ? 0 : -1} />
      <aside id="k-seitennav" className="k-seitennav" data-offen={offen}>
        <Link href="/neu/angebote" className="k-logo" onClick={zu} aria-label="Knoblau & Sohn – zur Angebotsliste">
          <Image src="/marke/knoblau-sohn-logo.png" alt="Knoblau & Sohn Umzüge | Transporte" width={370} height={220} priority unoptimized style={{ width: "9.5rem", height: "auto" }} />
        </Link>
        <nav aria-label="Hauptnavigation" className="k-navliste">
          {PUNKTE.map((p) => (
            <Link key={p.href} href={p.href} className="k-navlink" aria-current={pfad === p.href || pfad.startsWith(p.href + "/") ? "page" : undefined} onClick={zu}>
              {p.text}
            </Link>
          ))}
          {istAdmin ? (
            <>
              <div className="k-navtrenner" role="presentation" />
              <Link href="/neu/geschaeftsleitung" className="k-navlink" aria-current={pfad.startsWith("/neu/geschaeftsleitung") ? "page" : undefined} onClick={zu}>
                Geschäftsleitung
              </Link>
              <Link href="/nutzer" className="k-navlink" onClick={zu}>
                Nutzer
              </Link>
            </>
          ) : null}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="k-kopf">
          <button type="button" className="k-knopf k-knopf-sekundaer k-nav-knopf" aria-controls="k-seitennav" title="Navigation ein- oder ausblenden" onClick={() => { setOffen((o) => !o); setEingeklappt((e) => !e); }}>
            <span aria-hidden="true">☰</span> Menü
          </button>
          <AnsichtUmschalter className="k-segment" aktivClassName="k-segment-aktiv" />
          <div className="ml-auto flex min-w-0 items-center gap-3">{kopfRechts}</div>
        </header>
        <main className="k-inhalt">{children}</main>
      </div>
    </div>
  );
}
