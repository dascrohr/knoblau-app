"use client";
// Angebotsmaske: ein Formularzustand für alle Abschnitte, Summen live, Speichern ohne Umwege.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loescheAngebot, speichereAngebot } from "@/lib/aktionen";
import { adressName, type AngebotKomplett } from "@/lib/angebot-typen";
import type { StammChecklisteZeile } from "@/lib/db-typen";
import { berechnePreis, formatDatum } from "@/lib/preis";
import { Abzeichen, Hinweis, Knopf, Seitenkopf } from "../ui";
import { Adressdaten } from "./adressdaten";
import { Anlagen } from "./anlagen";
import { Besichtigung } from "./besichtigung";
import { Checkliste } from "./checkliste";
import { FreieLeistung, Nebenleistung, Packmaterial } from "./leistungen";
import type { StammEintrag } from "./positionen";
import { Preisuebersicht } from "./preisuebersicht";
import { SummenFuss, SummenKarte, type SpeicherStatus } from "./summen";
import { Termine } from "./termine";
import { Transport } from "./transport";
import { Umzugsgut } from "./umzugsgut";
import { ABSCHNITTE, speicherAuftrag, startZustand, type Auswahllisten, type Setzer, type Zustand } from "./zustand";

type Props = {
  start: AngebotKomplett;
  listen: Auswahllisten;
  stammLeistungen: StammEintrag[];
  stammPackmaterial: StammEintrag[];
  stammCheckliste: StammChecklisteZeile[];
  istAdmin: boolean;
};

const VERLASSEN_FRAGE = "Es gibt ungespeicherte Änderungen. Seite trotzdem verlassen? Die Änderungen gehen dann verloren.";

export function AngebotMaske({ start, listen, stammLeistungen, stammPackmaterial, stammCheckliste, istAdmin }: Props) {
  const router = useRouter();
  const [zustand, setZustand] = useState<Zustand>(() => startZustand(start));
  const [gespeichert, setGespeichert] = useState<Zustand>(zustand);
  const [speichert, setSpeichert] = useState(false);
  const [gespeichertUm, setGespeichertUm] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [loescht, setLoescht] = useState(false);
  const [aktiv, setAktiv] = useState<string>(ABSCHNITTE[0].id);

  const offen = zustand !== gespeichert;
  const stand = useRef({ zustand, gespeichert, speichert, verlassenErlaubt: false });
  useEffect(() => {
    stand.current.zustand = zustand;
    stand.current.gespeichert = gespeichert;
    stand.current.speichert = speichert;
  });

  const setzer = useMemo<Setzer>(
    () => ({
      kopf: (a) => setZustand((z) => ({ ...z, angebot: { ...z.angebot, ...a } })),
      adresse: (art, a) => setZustand((z) => ({ ...z, adressen: { ...z.adressen, [art]: { ...z.adressen[art], ...a } } })),
      positionen: (f) => setZustand((z) => ({ ...z, positionen: f(z.positionen) })),
      termine: (f) => setZustand((z) => ({ ...z, termine: f(z.termine) })),
      checkliste: (f) => setZustand((z) => ({ ...z, checkliste: f(z.checkliste) })),
    }),
    [],
  );

  const speichern = useCallback(async () => {
    const s = stand.current;
    if (s.speichert || s.zustand === s.gespeichert) return;
    const jetzt = s.zustand;
    s.speichert = true;
    setSpeichert(true);
    setFehler(null);
    try {
      const ergebnis = await speichereAngebot(speicherAuftrag(jetzt, s.gespeichert));
      if (ergebnis.ok) {
        setGespeichert(jetzt);
        setGespeichertUm(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
      } else {
        setFehler(ergebnis.fehler);
      }
    } catch {
      setFehler("Das Angebot konnte nicht gespeichert werden. Bitte prüfen Sie die Internetverbindung und ob Sie noch angemeldet sind, und versuchen Sie es erneut. Ihre Eingaben bleiben auf dieser Seite erhalten.");
    } finally {
      s.speichert = false;
      setSpeichert(false);
    }
  }, []);

  // Strg/Cmd+S
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void speichern();
      }
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [speichern]);

  // Warnung beim Verlassen mit ungespeicherten Änderungen (Tab schließen, Neuladen, Klick auf Links).
  useEffect(() => {
    if (!offen) return;
    const vorEntladen = (e: BeforeUnloadEvent) => {
      if (stand.current.verlassenErlaubt) return;
      e.preventDefault();
    };
    const klick = (e: MouseEvent) => {
      if (stand.current.verlassenErlaubt || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("#")) return;
      if (!window.confirm(VERLASSEN_FRAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", vorEntladen);
    document.addEventListener("click", klick, true);
    return () => {
      window.removeEventListener("beforeunload", vorEntladen);
      document.removeEventListener("click", klick, true);
    };
  }, [offen]);

  // Aktiven Abschnitt in der Sprungleiste markieren.
  useEffect(() => {
    const ziele = ABSCHNITTE.map((a) => document.getElementById(a.id)).filter((x): x is HTMLElement => !!x);
    if (!("IntersectionObserver" in window) || ziele.length === 0) return;
    const sichtbar = new Set<string>();
    const beobachter = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          if (e.isIntersecting) sichtbar.add(e.target.id);
          else sichtbar.delete(e.target.id);
        }
        const erster = ABSCHNITTE.find((a) => sichtbar.has(a.id));
        if (erster) setAktiv(erster.id);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    ziele.forEach((z) => beobachter.observe(z));
    return () => beobachter.disconnect();
  }, []);

  const loeschen = async () => {
    const nr = zustand.angebot.angebotnr || "ohne Nummer";
    if (!window.confirm(`Angebot ${nr} wirklich löschen? Adressen, Positionen, Termine und Checkliste werden mit gelöscht. Das lässt sich nicht rückgängig machen.`)) return;
    setLoescht(true);
    setFehler(null);
    try {
      const e = await loescheAngebot(zustand.angebot.id);
      if (e.ok) {
        stand.current.verlassenErlaubt = true;
        router.push("/neu/angebote");
        return;
      }
      setFehler(e.fehler);
    } catch {
      setFehler("Das Angebot konnte nicht gelöscht werden. Bitte erneut versuchen.");
    }
    setLoescht(false);
  };

  const { angebot, adressen, positionen, termine, checkliste } = zustand;
  const preis = useMemo(() => berechnePreis(angebot, positionen), [angebot, positionen]);
  const status: SpeicherStatus = speichert ? { art: "speichert" } : fehler && offen ? { art: "fehler" } : offen ? { art: "offen" } : gespeichertUm ? { art: "gespeichert", um: gespeichertUm } : { art: "sauber" };
  const kunde = adressName(adressen.auftraggeber);

  return (
    <div>
      <Seitenkopf
        titel={<>Angebot {angebot.angebotnr || <span className="k-leise">ohne Nummer</span>}</>}
        unter={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-[var(--k-text)]">{kunde || "Kunde noch nicht eingetragen"}</span>
            {angebot.status ? <Abzeichen title="Status">{angebot.status}</Abzeichen> : <Abzeichen title="Status">ohne Status</Abzeichen>}
            {angebot.angebotsdatum ? <span>vom {formatDatum(angebot.angebotsdatum)}</span> : null}
            {angebot.umzugstermin ? <span>Umzug am {formatDatum(angebot.umzugstermin)}</span> : null}
          </span>
        }
        aktionen={
          <>
            <Knopf href="/neu/angebote" art="still">
              ← Zur Liste
            </Knopf>
            {istAdmin ? (
              <Knopf art="gefahr" onClick={loeschen} disabled={loescht || speichert}>
                {loescht ? "Wird gelöscht …" : "Löschen"}
              </Knopf>
            ) : null}
          </>
        }
      />

      <nav className="k-abschnittsleiste" aria-label="Abschnitte des Angebots">
        {ABSCHNITTE.map((a) => (
          <a key={a.id} href={`#${a.id}`} aria-current={aktiv === a.id ? "true" : undefined} onClick={() => setAktiv(a.id)}>
            {a.titel}
          </a>
        ))}
      </nav>

      {fehler ? (
        <Hinweis art="fehler" titel="Das hat nicht geklappt" className="mb-4">
          {fehler}
        </Hinweis>
      ) : null}

      <div className="k-maske">
        <div className="flex min-w-0 flex-col gap-8">
          <Adressdaten angebot={angebot} adressen={adressen} setzer={setzer} listen={listen} />
          <Besichtigung angebot={angebot} setzer={setzer} listen={listen} />
          <Transport angebot={angebot} adressen={adressen} positionen={positionen} setzer={setzer} />
          <FreieLeistung positionen={positionen} text={angebot.freie_leistung_text} setzer={setzer} />
          <Nebenleistung positionen={positionen} text={angebot.handwerker} setzer={setzer} stamm={stammLeistungen} />
          <Packmaterial positionen={positionen} text={angebot.packarbeit} setzer={setzer} stamm={stammPackmaterial} />
          <Termine termine={termine} termineFrei={angebot.termine_frei} info={angebot.info} setzer={setzer} />
          <Preisuebersicht preis={preis} />
          <Anlagen adressen={adressen} setzer={setzer} rechnungen={start.rechnungen} halteverbotszonen={start.halteverbotszonen} arbeitsscheine={start.arbeitsscheine} />
          <Checkliste checkliste={checkliste} vorlage={stammCheckliste} setzer={setzer} />
          <Umzugsgut umzugsgut={start.umzugsgut} />
        </div>
        <SummenKarte preis={preis} status={status} onSpeichern={speichern} />
      </div>
      <SummenFuss preis={preis} status={status} onSpeichern={speichern} />
    </div>
  );
}
