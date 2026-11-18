import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { redirect } from "next/navigation";
import { abmelden } from "@/app/login/aktionen";
import { Geruest } from "@/components/neu/geruest";
import { aktuellerNutzer } from "@/lib/supabase/server";
import "./neu.css";

// Schrift der Firmenwebsite (Poppins) für Überschriften; wird beim Build geladen und lokal ausgeliefert.
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--k-font-poppins", display: "swap" });

export const metadata: Metadata = {
  icons: { icon: "/marke/knoblau-sohn-favicon.png" },
};

export default async function NeuLayout({ children }: { children: React.ReactNode }) {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) redirect("/login");
  return (
    <div className={`neu ${poppins.variable}`}>
      <Geruest
        istAdmin={nutzer.rolle === "admin"}
        kopfRechts={
          <>
            <span className="hidden truncate sm:inline k-leise" title="Angemeldet als">
              {nutzer.name || nutzer.email}
            </span>
            <form action={abmelden}>
              <button type="submit" className="k-knopf k-knopf-still k-knopf-klein">
                Abmelden
              </button>
            </form>
          </>
        }
      >
        {children}
      </Geruest>
    </div>
  );
}
