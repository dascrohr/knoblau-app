import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { aktuellerNutzer } from "@/lib/supabase/server";
import { abmelden } from "@/app/login/aktionen";
import { AnsichtUmschalter } from "@/components/ansicht-umschalter";
import { Menue } from "@/components/alt/menue";
import "./alt.css";

export const metadata: Metadata = { title: "Altansicht" };

export default async function AltLayout({ children }: { children: React.ReactNode }) {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) redirect("/login");
  return (
    <div className="alt">
      <div className="hinweis">
        <strong>Altansicht zum Abgleich</strong>
        <span>Aufbau und Beschriftungen wie in der bisherigen Software.</span>
        <div className="rechts">
          <AnsichtUmschalter className="umschalter" aktivClassName="aktiv" />
          <span>{nutzer.name || nutzer.email}{nutzer.rolle === "admin" ? " (Admin)" : ""}</span>
          <form action={abmelden}>
            <button type="submit" className="knopf klein">Abmelden</button>
          </form>
        </div>
      </div>
      <Menue />
      {children}
    </div>
  );
}
