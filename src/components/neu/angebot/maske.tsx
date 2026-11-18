"use client";
// Angebotsmaske: ein Formularzustand für alle Abschnitte, Summen live.
// Bearbeitungs-Übergabe: Immer nur ein Fenster bearbeitet (useBearbeitung); alle anderen sehen „nur Ansicht“ und können übernehmen.
// Gespeichert wird automatisch (entprellt, vor jeder Abgabe, beim Wechsel in den Hintergrund) und von Hand (Knopf, Strg/Cmd+S).
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ladeAngebotFrisch } from "@/app/neu/angebote/aktionen";
import { dupliziereAngebot, loescheAngebot, speichereAngebot } from "@/lib/aktionen";
import { adressName, type AngebotKomplett } from "@/lib/angebot-typen";
import { useBearbeitung } from "@/lib/bearbeitung";
import type { StammChecklisteZeile } from "@/lib/db-typen";
import { berechnePreis, formatDatum } from "@/lib/preis";
import { Abzeichen, Hinweis, Knopf, Schalter, Seitenkopf } from "../ui";
import { Adressdaten } from "./adressdaten";
import { Anlagen } from "./anlagen";
import { Besichtigung } from "./besichtigung";
import { Checkliste } from "./checkliste";
import { FreieLeistung, Nebenleistung, Packmaterial } from "./leistungen";
import type { StammEintrag } from "./positionen";
import { Preisuebersicht } from "./preisuebersicht";
import { SummenFuss, SummenKarte, type SpeicherStatus } from "./summen";
import { Termine } from "./termine";
import { TextbausteinAnbieter, type Textbaustein } from "./textbausteine";
import { Transport } from "./transport";
import { UebergabeLeiste } from "./uebergabe-leiste";
import { Umzugsgut } from "./umzugsgut";
import { ABSCHNITTE, speicherAuftrag, startZustand, type Auswahllisten, type Setzer, type Zustand } from "./zustand";

type Props = {
  start: AngebotKomplett;
  listen: Auswahllisten;
  stammLeistungen: StammEintrag[];
  stammPackmaterial: StammEintrag[];
  stammCheckliste: StammChecklisteZeile[];
  textbausteine: Textbaustein[];
  istAdmin: boolean;
};

const VERLASSEN_FRAGE = "Es gibt ungespeicherte Änderungen. Seite trotzdem verlassen? Die Änderungen gehen dann verloren.";
/** Automatisch speichern: so lange nach der letzten Änderung. */
const AUTO_SPEICHERN_MS = 20_000;
const NETZ_FEHLER = "Das Angebot konnte nicht gespeichert werden. Bitte prüfen Sie die Internetverbindung und ob Sie noch angemeldet sind, und versuchen Sie es erneut. Ihre Eingaben bleiben auf dieser Seite erhalten.";

type Beschaeftigt = "uebernahme" | "laden" | "beenden" | "kopie" | "loeschen" | null;

function uhrzeit(): string {
  return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function AngebotMaske({ start, listen, stammLeistungen, stammPackmaterial, stammCheckliste, textbausteine, istAdmin }: Props) {
  const router = useRouter();
  const angebotId = start.angebot.id;
  const [zustand, setZustand] = useState<Zustand>(() => startZustand(start));
  const [gespeichert, setGespeichert] = useState<Zustand>(zustand);
  /** Nur-Anzeige-Teile (Rechnungen, Halteverbotszonen, Arbeitsscheine, Umzugsgut) des zuletzt geladenen Stands. */
  const [geladen, setGeladen] = useState<AngebotKomplett>(start);
  const [version, setVersion] = useState<number>(start.angebot.version);
  /** Zählt jedes Neuladen des Stands: setzt die Abschnitte samt ihrem örtlichen Zustand (aufgeklappte Zeilen usw.) zurück. */
  const [ladung, setLadung] = useState(0);
  const [speichert, setSpeichert] = useState(false);
  const [gespeichertUm, setGespeichertUm] = useState<{ um: string; auto: boolean } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [veraltet, setVeraltet] = useState(false);
  const [wiederholung, setWiederholung] = useState(0);
  const [beschaeftigt, setBeschaeftigt] = useState<Beschaeftigt>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [aktiv, setAktiv] = useState<string>(ABSCHNITTE[0].id);
  const [kopfHoehe, setKopfHoehe] = useState(88);
  const kopf = useRef<HTMLDivElement>(null);

  const offen = zustand !== gespeichert;
  // Maßgeblicher Stand für alle Abläufe außerhalb des Renderns. `gespeichert`, `version` und `veraltet` werden nur dort gesetzt,
  // wo auch der zugehörige State gesetzt wird (speichern, neuLaden); `zustand`, `darf` und `sitzung` folgen dem Rendern.
  const stand = useRef({ zustand, gespeichert, version, veraltet: false, darf: false, sitzung: "", verlassenErlaubt: false });
  const laufend = useRef<Promise<boolean> | null>(null);

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

  /**
   * Speichert, was sich geändert hat. Nie zwei Speichervorgänge zugleich: Läuft einer, wird gewartet und danach bei Bedarf noch einmal gespeichert.
   * Liefert true, wenn danach nichts Ungespeichertes mehr offen ist (Stand zum Zeitpunkt des Aufrufs).
   */
  const speichern = useCallback(async (auto = false): Promise<boolean> => {
    while (laufend.current) await laufend.current;
    const s = stand.current;
    if (s.zustand === s.gespeichert) return true;
    if (!s.darf || (auto && s.veraltet)) return false;
    const lauf = (async () => {
      const jetzt = s.zustand;
      setSpeichert(true);
      setFehler(null);
      try {
        const e = await speichereAngebot({ ...speicherAuftrag(jetzt, s.gespeichert), sitzung: s.sitzung, version: s.version });
        if (e.ok) {
          s.gespeichert = jetzt;
          s.version = e.daten.version;
          s.veraltet = false;
          setGespeichert(jetzt);
          setVersion(e.daten.version);
          setVeraltet(false);
          setGespeichertUm({ um: uhrzeit(), auto });
          return true;
        }
        if (e.grund === "veraltet") {
          // Die Übergabe-Leiste zeigt die Meldung mit „Neuesten Stand laden“; die Eingaben bleiben stehen.
          s.veraltet = true;
          setVeraltet(true);
        } else {
          // Bei „gesperrt“ bringt der Hook die Maske mit dem nächsten Lebenszeichen in den Ansichtsmodus; die Eingaben bleiben stehen.
          setFehler(e.fehler);
        }
        return false;
      } catch {
        setFehler(NETZ_FEHLER);
        setWiederholung((n) => n + 1); // später automatisch noch einmal versuchen
        return false;
      } finally {
        setSpeichert(false);
      }
    })();
    laufend.current = lauf;
    try {
      return await lauf;
    } finally {
      if (laufend.current === lauf) laufend.current = null;
    }
  }, []);

  // Vor jeder Abgabe (Übernahme durch jemand anderen, Pause wegen Leerlauf) speichert die Maske.
  const vorAbgabe = useCallback(async () => {
    await speichern(true);
  }, [speichern]);
  const b = useBearbeitung({ angebotId, sofortBeginnen: true, geladeneVersion: version, onAbgabe: vorAbgabe });

  /** Felder sind nur änderbar, wenn dieses Fenster bearbeitet und gerade kein Stand geladen oder übernommen wird. */
  const darf = b.darfBearbeiten && beschaeftigt !== "uebernahme" && beschaeftigt !== "laden";
  /** Nach einer Pause wegen Leerlauf bleiben die Felder offen: Die erste Eingabe holt die Bearbeitung zurück (Hook), gespeichert wird erst danach. */
  const eingabeFrei = darf || (b.modus === "pausiert" && beschaeftigt == null);
  /** Der Server hat einen neueren Stand, während hier noch Ungespeichertes steht (z. B. nach einer Pause). */
  const konflikt = veraltet || (b.darfBearbeiten && b.neuerStandVorhanden && offen && !speichert);

  useEffect(() => {
    stand.current.zustand = zustand;
    stand.current.darf = darf;
    stand.current.sitzung = b.sitzung;
  });

  /**
   * Holt den neuesten gespeicherten Stand vom Server in die Maske (verwirft, was hier ungespeichert ist).
   * Mit `nurWennNeuer` bleibt die Maske unberührt, wenn der Server keinen anderen Stand hat.
   */
  const neuLaden = useCallback(
    async (nurWennNeuer = false): Promise<boolean> => {
      while (laufend.current) await laufend.current;
      try {
        const k = await ladeAngebotFrisch(angebotId);
        if (!k) {
          setFehler("Dieses Angebot gibt es nicht mehr. Bitte zurück zur Liste gehen.");
          return false;
        }
        const s = stand.current;
        if (nurWennNeuer && k.angebot.version === s.version) return true;
        const z = startZustand(k);
        s.zustand = z;
        s.gespeichert = z;
        s.version = k.angebot.version;
        s.veraltet = false;
        setZustand(z);
        setGespeichert(z);
        setVersion(k.angebot.version);
        setGeladen(k);
        setVeraltet(false);
        setFehler(null);
        setGespeichertUm(null);
        setLadung((n) => n + 1);
        return true;
      } catch {
        setFehler("Der neueste Stand konnte nicht geladen werden. Bitte die Seite im Browser neu laden.");
        return false;
      }
    },
    [angebotId],
  );

  // Automatisch speichern: einige Sekunden nach der letzten Änderung.
  useEffect(() => {
    if (!darf || !offen || konflikt) return;
    const t = setTimeout(() => void speichern(true), AUTO_SPEICHERN_MS);
    return () => clearTimeout(t);
  }, [zustand, darf, offen, konflikt, wiederholung, speichern]);

  // Automatisch speichern, wenn das Fenster in den Hintergrund geht (anderer Tab, Tablet zugeklappt).
  useEffect(() => {
    const wechsel = () => {
      if (document.visibilityState === "hidden") void speichern(true);
    };
    document.addEventListener("visibilitychange", wechsel);
    return () => document.removeEventListener("visibilitychange", wechsel);
  }, [speichern]);

  // Dieses Fenster bearbeitet, aber der Server hat einen neueren Stand (z. B. nach einer Pause, in der jemand anderes gespeichert hat):
  // Ohne eigene Änderungen wird er still geladen. Mit eigenen Änderungen zeigt die Leiste den Konflikt.
  const mussNachladen = b.darfBearbeiten && b.neuerStandVorhanden && !offen && !speichert && !veraltet && beschaeftigt == null;
  const laedtNach = useRef(false);
  useEffect(() => {
    if (!mussNachladen || laedtNach.current) return;
    laedtNach.current = true;
    void (async () => {
      setBeschaeftigt("laden");
      const ok = await neuLaden();
      if (ok) setMeldung("Dieses Angebot wurde inzwischen an anderer Stelle geändert. Der neueste gespeicherte Stand wurde geladen.");
      else {
        // Nicht endlos wiederholen: Die Leiste bietet „Neuesten Stand laden“ an.
        stand.current.veraltet = true;
        setVeraltet(true);
      }
      setBeschaeftigt(null);
      laedtNach.current = false;
    })();
  }, [mussNachladen, neuLaden]);

  // Strg/Cmd+S (im Ansichtsmodus ohne Wirkung)
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (stand.current.darf) void speichern();
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

  // Höhe der festen Leiste (Übergabe + Sprungnavigation) messen: Sprungziele und Summenkarte richten sich danach.
  useEffect(() => {
    const el = kopf.current;
    if (!el || !("ResizeObserver" in window)) return;
    const beobachter = new ResizeObserver(() => setKopfHoehe(Math.round(el.getBoundingClientRect().height)));
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);

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
      { rootMargin: `-${56 + kopfHoehe + 8}px 0px -55% 0px` },
    );
    ziele.forEach((z) => beobachter.observe(z));
    return () => beobachter.disconnect();
  }, [ladung, kopfHoehe]);

  /** Bearbeitung in dieses Fenster holen (frei: beginnen; sonst vom bisherigen Bearbeiter übernehmen) und den neuesten Stand zeigen. */
  const holeBearbeitung = async (art: "beginnen" | "uebernehmen") => {
    if (beschaeftigt) return;
    const wer = b.bearbeiter;
    if (art === "uebernehmen" && wer && !wer.selberNutzer && !window.confirm(`${wer.name} wird gebeten zu speichern und abzugeben. Übernehmen?`)) return;
    if (offen && !window.confirm("In diesem Fenster stehen noch ungespeicherte Änderungen. Wenn inzwischen ein neuerer Stand gespeichert wurde, gehen sie verloren. Fortfahren?")) return;
    setBeschaeftigt("uebernahme");
    setMeldung(null);
    setFehler(null);
    try {
      const ok = art === "uebernehmen" ? await b.uebernehmen() : await b.beginnen();
      if (ok) await neuLaden(true);
      else if (art === "uebernehmen") setFehler("Die Bearbeitung konnte nicht übernommen werden. Bitte erneut versuchen.");
    } finally {
      setBeschaeftigt(null);
    }
  };

  const beenden = async () => {
    if (beschaeftigt) return;
    setBeschaeftigt("beenden");
    try {
      // Ohne erfolgreiches Speichern bleibt die Bearbeitung bestehen (Fehler bzw. Konflikt steht dann in der Leiste).
      if (await speichern()) await b.beenden();
    } finally {
      setBeschaeftigt(null);
    }
  };

  const standLaden = async () => {
    if (beschaeftigt) return;
    if (offen && !window.confirm("Der neueste gespeicherte Stand wird geladen. Die ungespeicherten Änderungen in diesem Fenster gehen dabei verloren. Fortfahren?")) return;
    setBeschaeftigt("laden");
    setMeldung(null);
    try {
      await neuLaden();
    } finally {
      setBeschaeftigt(null);
    }
  };

  const duplizieren = async () => {
    if (beschaeftigt) return;
    const nr = zustand.angebot.angebotnr || "ohne Nummer";
    const zusatz = offen && !darf ? " Kopiert wird der zuletzt gespeicherte Stand, nicht die ungespeicherten Änderungen in diesem Fenster." : "";
    if (!window.confirm(`Angebot ${nr} duplizieren? Es entsteht ein neues Angebot (als Entwurf) mit neuer Nummer und heutigem Datum; Adressen, Positionen und Checkliste werden kopiert, Termine und Status nicht.${zusatz}`)) return;
    setBeschaeftigt("kopie");
    setFehler(null);
    try {
      if (darf && !(await speichern())) {
        setFehler((f) => f ?? "Das Angebot konnte vor dem Duplizieren nicht gespeichert werden. Es wurde keine Kopie angelegt.");
        return;
      }
      const e = await dupliziereAngebot(angebotId);
      if (e.ok) {
        stand.current.verlassenErlaubt = true;
        router.push(`/neu/angebote/${e.daten.id}`);
        return;
      }
      setFehler(e.fehler);
    } catch {
      setFehler("Das Angebot konnte nicht dupliziert werden. Bitte erneut versuchen.");
    } finally {
      setBeschaeftigt(null);
    }
  };

  const loeschen = async () => {
    if (beschaeftigt) return;
    const nr = zustand.angebot.angebotnr || "ohne Nummer";
    if (!window.confirm(`Angebot ${nr} wirklich löschen? Adressen, Positionen, Termine und Checkliste werden mit gelöscht. Das lässt sich nicht rückgängig machen.`)) return;
    setBeschaeftigt("loeschen");
    setFehler(null);
    try {
      const e = await loescheAngebot(angebotId);
      if (e.ok) {
        stand.current.verlassenErlaubt = true;
        router.push("/neu/angebote");
        return;
      }
      setFehler(e.fehler);
    } catch {
      setFehler("Das Angebot konnte nicht gelöscht werden. Bitte erneut versuchen.");
    }
    setBeschaeftigt(null);
  };

  const { angebot, adressen, positionen, termine, checkliste } = zustand;
  const preis = useMemo(() => berechnePreis(angebot, positionen), [angebot, positionen]);
  const status: SpeicherStatus = speichert
    ? { art: "speichert" }
    : (fehler || konflikt) && offen
      ? { art: "fehler" }
      : offen
        ? { art: "offen" }
        : !darf
          ? { art: "ansicht" }
          : gespeichertUm
            ? { art: "gespeichert", um: gespeichertUm.um, auto: gespeichertUm.auto }
            : { art: "sauber" };
  const kunde = adressName(adressen.auftraggeber);
  const leisteBeschaeftigt = beschaeftigt === "uebernahme" || beschaeftigt === "laden" || beschaeftigt === "beenden" ? beschaeftigt : null;
  const vonHand = () => void speichern();

  return (
    <div style={{ "--k-maskenkopf-hoehe": `${kopfHoehe}px` } as CSSProperties}>
      <Seitenkopf
        titel={<>Angebot {angebot.angebotnr || <span className="k-leise">ohne Nummer</span>}</>}
        unter={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-[var(--k-text)]">{kunde || "Kunde noch nicht eingetragen"}</span>
            {angebot.entwurf ? <Abzeichen art="warnung">Entwurf</Abzeichen> : null}
            {angebot.status ? <Abzeichen title="Status">{angebot.status}</Abzeichen> : <Abzeichen title="Status">ohne Status</Abzeichen>}
            {angebot.angebotsdatum ? <span>vom {formatDatum(angebot.angebotsdatum)}</span> : null}
            {angebot.umzugstermin ? <span>Umzug am {formatDatum(angebot.umzugstermin)}</span> : null}
          </span>
        }
        aktionen={
          <>
            <span className="flex flex-col">
              <Schalter label="Entwurf" an={angebot.entwurf} onAn={(w) => setzer.kopf({ entwurf: w })} disabled={!eingabeFrei} aria-describedby="k-entwurf-hilfe" />
              <span id="k-entwurf-hilfe" className="k-leise text-xs" style={{ maxWidth: "15rem" }}>
                Entwürfe sind noch nicht fertig und in der Liste markiert
              </span>
            </span>
            <a href={`/druck/angebot/${angebot.id}`} target="_blank" rel="noopener" className="k-knopf k-knopf-sekundaer" title="Zeigt den zuletzt gespeicherten Stand">
              Druckansicht
            </a>
            <Knopf onClick={duplizieren} disabled={beschaeftigt != null || speichert} title="Legt eine Kopie mit neuer Nummer an">
              {beschaeftigt === "kopie" ? "Wird dupliziert …" : "Duplizieren"}
            </Knopf>
            <Knopf href="/neu/angebote" art="still">
              ← Zur Liste
            </Knopf>
            {istAdmin ? (
              <Knopf art="gefahr" onClick={loeschen} disabled={beschaeftigt != null || speichert || (!darf && !!b.bearbeiter)} title={!darf && b.bearbeiter ? "Das Angebot wird gerade an anderer Stelle bearbeitet" : undefined}>
                {beschaeftigt === "loeschen" ? "Wird gelöscht …" : "Löschen"}
              </Knopf>
            ) : null}
          </>
        }
      />

      <div className="k-maskenkopf" ref={kopf}>
        <UebergabeLeiste
          b={b}
          status={status}
          offen={offen}
          beschaeftigt={leisteBeschaeftigt}
          konflikt={konflikt}
          meldung={meldung}
          onMeldungZu={() => setMeldung(null)}
          onUebernehmen={() => void holeBearbeitung("uebernehmen")}
          onBeginnen={() => void holeBearbeitung("beginnen")}
          onBeenden={() => void beenden()}
          onNeuLaden={() => void standLaden()}
        />
        <nav className="k-abschnittsleiste" aria-label="Abschnitte des Angebots">
          {ABSCHNITTE.map((a) => (
            <a key={a.id} href={`#${a.id}`} aria-current={aktiv === a.id ? "true" : undefined} onClick={() => setAktiv(a.id)}>
              {a.titel}
            </a>
          ))}
        </nav>
      </div>

      {fehler ? (
        <Hinweis art="fehler" titel="Das hat nicht geklappt" className="mb-4">
          {fehler}
        </Hinweis>
      ) : null}

      <div className="k-maske">
        {/* Ansichtsmodus: Das fieldset sperrt alle Eingaben, Auswahlen und Knöpfe der Abschnitte auf einmal. Links bleiben bedienbar. */}
        <fieldset disabled={!eingabeFrei} className="k-maske-feldsatz" aria-label="Angebotsdaten">
          <TextbausteinAnbieter value={textbausteine}>
            <div key={ladung} className="flex min-w-0 flex-col gap-8">
              <Adressdaten angebot={angebot} adressen={adressen} setzer={setzer} listen={listen} />
              <Besichtigung angebot={angebot} setzer={setzer} listen={listen} />
              <Transport angebot={angebot} adressen={adressen} positionen={positionen} setzer={setzer} />
              <FreieLeistung positionen={positionen} text={angebot.freie_leistung_text} setzer={setzer} />
              <Nebenleistung positionen={positionen} text={angebot.handwerker} setzer={setzer} stamm={stammLeistungen} />
              <Packmaterial positionen={positionen} text={angebot.packarbeit} setzer={setzer} stamm={stammPackmaterial} />
              <Termine termine={termine} termineFrei={angebot.termine_frei} info={angebot.info} setzer={setzer} />
              <Preisuebersicht preis={preis} />
              <Anlagen adressen={adressen} setzer={setzer} rechnungen={geladen.rechnungen} halteverbotszonen={geladen.halteverbotszonen} arbeitsscheine={geladen.arbeitsscheine} />
              <Checkliste checkliste={checkliste} vorlage={stammCheckliste} setzer={setzer} />
              <Umzugsgut umzugsgut={geladen.umzugsgut} />
            </div>
          </TextbausteinAnbieter>
        </fieldset>
        <SummenKarte preis={preis} status={status} onSpeichern={vonHand} gesperrt={!darf} />
      </div>
      <SummenFuss preis={preis} status={status} onSpeichern={vonHand} gesperrt={!darf} />
    </div>
  );
}
