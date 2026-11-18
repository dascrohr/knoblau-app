"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { neuesAngebot } from "@/lib/aktionen";
import { Knopf } from "./ui";

export function NeuesAngebotKnopf() {
  const router = useRouter();
  const [laeuft, starte] = useTransition();
  const [fehler, setFehler] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-3">
      {fehler ? (
        <span className="k-feldfehler" role="alert">
          {fehler}
        </span>
      ) : null}
      <Knopf
        art="primaer"
        disabled={laeuft}
        onClick={() =>
          starte(async () => {
            setFehler(null);
            try {
              const e = await neuesAngebot();
              if (e.ok) router.push(`/neu/angebote/${e.daten.id}`);
              else setFehler(e.fehler);
            } catch {
              setFehler("Das Angebot konnte nicht angelegt werden. Bitte erneut versuchen.");
            }
          })
        }
      >
        {laeuft ? "Wird angelegt …" : "+ Neues Angebot"}
      </Knopf>
    </span>
  );
}
