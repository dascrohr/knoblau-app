import Image from "next/image";
import { Poppins } from "next/font/google";
import type { ReactNode } from "react";

const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });

/** Gemeinsamer Rahmen für Anmeldung und „Passwort vergessen“: Markenfläche links, Formular rechts. */
export function AnmeldeRahmen({ titel, unter, children }: { titel: string; unter: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-white text-[#282828] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Markenfläche */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-[#282828] px-8 py-8 text-white sm:px-12 lg:py-12">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rotate-45 bg-[#e1001a] lg:h-96 lg:w-96" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 h-80 w-80 rotate-45 border-[28px] border-white/5" />
        <div className="relative inline-flex w-fit rounded-xl bg-white px-5 py-3 shadow-lg">
          <Image src="/marke/knoblau-sohn-logo.png" alt="Knoblau & Sohn Umzüge" width={370} height={220} priority className="h-16 w-auto lg:h-20" />
        </div>
        <div className="relative mt-10 hidden lg:block">
          <div className="mb-5 h-1 w-16 bg-[#e1001a]" />
          <p className={`${poppins.className} max-w-md text-4xl font-semibold leading-tight`}>Angebote, Aufträge und Rechnungen an einem Ort.</p>
          <p className="mt-4 max-w-md text-base text-white/70">Die Umzugsverwaltung von Knoblau &amp; Sohn. Von der Besichtigung bis zur Rechnung, im Büro und unterwegs.</p>
        </div>
        <p className="relative mt-8 hidden text-sm text-white/50 lg:block">Knoblau &amp; Sohn Umzüge · Köln</p>
      </section>

      {/* Formular */}
      <section className="flex items-start justify-center px-6 py-10 sm:px-12 lg:items-center">
        <div className="w-full max-w-sm">
          <h1 className={`${poppins.className} text-3xl font-semibold`}>{titel}</h1>
          <p className="mb-8 mt-2 text-[15px] text-neutral-600">{unter}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

export const anmeldeFeld =
  "rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-base font-normal outline-none transition focus:border-[#282828] focus:ring-2 focus:ring-[#e1001a]/25";
export const anmeldeKnopf =
  "rounded-lg bg-[#e1001a] px-4 py-3 font-semibold text-white transition hover:bg-[#c00008] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#282828] disabled:opacity-60";
