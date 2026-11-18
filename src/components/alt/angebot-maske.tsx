"use client";
// Angebotsmaske der Altansicht: ein Formular hält den gesamten Zustand, 13 Reiter zeigen ihn.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useBearbeitung } from "@/lib/bearbeitung";
import { adressName, leerePosition, type AdressArt, type Adresse, type AngebotKomplett } from "@/lib/angebot-typen";
import type { StammChecklisteZeile, StammLeistungenZeile, StammPackmaterialZeile, StammZimmerZeile } from "@/lib/db-typen";
import { dupliziereAngebot, loescheAngebot, speichereAngebot } from "@/lib/aktionen";
import { MaskeKontext, type Maske, type Textbaustein, type Zustand } from "./felder";
import { Statusleiste, Symbolleiste, type Nachbarn } from "./leisten";
import { ReiterAdressdaten, ReiterBesichtigung, type Auswahl } from "./reiter-a";
import { ReiterFrei, ReiterNebenleistung, ReiterPackmaterial, ReiterTransport } from "./reiter-b";
import { ReiterAdressenAnlagen, ReiterCheckliste, ReiterPreis, ReiterTermine } from "./reiter-c";
import { ReiterUmzugsgutErfassung, ReiterUmzugsgutKomplett, ReiterUmzugsgutSummen } from "./reiter-d";

export type MaskeStamm = {
  leistungen: StammLeistungenZeile[];
  packmaterial: StammPackmaterialZeile[];
  checkliste: StammChecklisteZeile[];
  zimmer: StammZimmerZeile[];
  textbausteine: Textbaustein[];
  auswahl: Auswahl;
};

const REITER = ["Adreßdaten", "Besichtigungsergebnisse", "Transport/Maut", "Freie Leistung", "Nebenleistung", "Packmaterial", "Termine", "Preisübersicht", "Adressen+Anlagen", "Checkliste", "UmzugsgutErfassung", "Komplette Umzugsgutliste", "Summen Umzugsgutliste"] as const;
const WARNUNG = "Es gibt ungespeicherte Änderungen. Trotzdem verlassen?";

const AUTO_SPEICHERN_S = 30;
const uhrzeit = (d: Date | string) => new Date(d).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

const hatInhalt = (a: Adresse) => Object.entries(a).some(([k, v]) => k !== "art" && v != null && v !== "");

export function AngebotMaske({ daten, nachbarn, position, gesamt, stamm, admin, neu }: { daten: AngebotKomplett; nachbarn: Nachbarn; position: number; gesamt: number; stamm: MaskeStamm; admin: boolean; neu: boolean }) {
  const id = daten.angebot.id;
  const router = useRouter();
  const [z, setZ] = useState<Zustand>(() => ({ angebot: daten.angebot, adressen: daten.adressen, positionen: daten.positionen, termine: daten.termine, checkliste: daten.checkliste }));
  const [geaendert, setGeaendert] = useState(false);
  const [version, setVersion] = useState(daten.angebot.version);
  const [speichert, setSpeichert] = useState(false);
  const [arbeitet, setArbeitet] = useState<string | null>(null);
  const [veraltet, setVeraltet] = useState(false);
  const [autoZeit, setAutoZeit] = useState<string | null>(null);
  const [reiter, setReiter] = useState(0);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);
  const [laeuft, start] = useTransition();
  const reiterRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Für Abläufe außerhalb des Renderns (automatisches Speichern, Übergabe): stets der neueste Stand.
  const zRef = useRef(z);
  const geaendertRef = useRef(false);
  const aenderungNr = useRef(0);
  const versionRef = useRef(daten.angebot.version);
  const sitzungRef = useRef<string | null>(null);
  const darfRef = useRef(false);
  const wegRef = useRef(false); // Seite wird absichtlich neu geladen: keine Warnung
  const laufRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const ausgangAdressen = daten.adressen;

  /**
   * Speichert, wenn Änderungen vorliegen. Vorgänge laufen strikt nacheinander (nie parallel).
   * Liefert true, wenn danach nichts Ungespeichertes aus diesem Lauf mehr offen ist.
   */
  const speichereJetzt = useCallback((art: "hand" | "auto"): Promise<boolean> => {
    const vor = laufRef.current;
    const lauf = (async () => {
      await vor.catch(() => false);
      if (!geaendertRef.current) return true;
      const nr = aenderungNr.current;
      const s = zRef.current;
      const adressen: Partial<Record<AdressArt, Adresse>> = { auftraggeber: s.adressen.auftraggeber, beladestelle: s.adressen.beladestelle, entladestelle: s.adressen.entladestelle };
      for (const a of ["zusatz1", "zusatz2"] as const) if (hatInhalt(s.adressen[a]) || hatInhalt(ausgangAdressen[a])) adressen[a] = s.adressen[a];
      const angebot = { ...s.angebot, ust_satz: s.angebot.ust_satz ?? 19 };
      setSpeichert(true);
      try {
        const r = await speichereAngebot({ id, sitzung: sitzungRef.current, version: versionRef.current, angebot, adressen, positionen: s.positionen, termine: s.termine, checkliste: s.checkliste });
        if (r.ok) {
          versionRef.current = r.daten.version;
          setVersion(r.daten.version);
          setVeraltet(false);
          const allesGespeichert = aenderungNr.current === nr;
          if (allesGespeichert) {
            geaendertRef.current = false;
            setGeaendert(false);
          }
          if (art === "auto") setAutoZeit(uhrzeit(new Date()));
          setMeldung(art === "hand" ? { art: "ok", text: "Gespeichert." } : null);
          return true;
        }
        if (r.grund === "veraltet") setVeraltet(true);
        setMeldung({ art: "fehler", text: r.fehler });
        return false;
      } catch {
        setMeldung({ art: "fehler", text: "Speichern fehlgeschlagen. Bitte Verbindung und Anmeldung prüfen." });
        return false;
      } finally {
        setSpeichert(false);
      }
    })();
    laufRef.current = lauf;
    return lauf;
  }, [id, ausgangAdressen]);

  // Vor einer Übergabe oder Pause speichert die Maske von selbst, damit nichts verloren geht.
  const onAbgabe = useCallback(async () => { await speichereJetzt("auto"); }, [speichereJetzt]);
  const b = useBearbeitung({ angebotId: id, sofortBeginnen: neu, geladeneVersion: version, onAbgabe });
  const lesen = !b.darfBearbeiten;
  const { beenden } = b;
  useEffect(() => { sitzungRef.current = b.sitzung; }, [b.sitzung]);
  useEffect(() => { darfRef.current = b.darfBearbeiten; }, [b.darfBearbeiten]);

  // Zentrale Sperre: Ohne Bearbeitungsrecht ändert nichts den Zustand – egal, welcher Knopf oder Dialog es versucht.
  const aendere = useCallback((f: (alt: Zustand) => Zustand) => {
    if (!darfRef.current) return;
    zRef.current = f(zRef.current);
    geaendertRef.current = true;
    aenderungNr.current += 1;
    setZ(zRef.current);
    setGeaendert(true);
    setMeldung(null);
  }, []);

  /** Lädt die Seite mit dem neuesten gespeicherten Stand; mit `bearbeiten` beginnt danach sofort die Bearbeitung. */
  const neuLaden = useCallback(async (bearbeiten: boolean, freigeben: boolean) => {
    if (wegRef.current) return;
    wegRef.current = true;
    if (freigeben) await beenden();
    const url = new URL(window.location.href);
    if (bearbeiten) url.searchParams.set("neu", "1");
    else url.searchParams.delete("neu");
    window.location.assign(url.toString());
  }, [beenden]);

  // Bearbeitung hat begonnen, aber auf dem Server liegt ein neuerer Stand (und hier ist nichts Ungespeichertes):
  // erst den neuesten Stand laden, dann weiterbearbeiten. Höchstens einmal je geladenem Stand (keine Ladeschleife).
  useEffect(() => {
    if (!b.darfBearbeiten || !b.neuerStandVorhanden || geaendert || speichert) return;
    const merk = `alt-neuladen-${id}`;
    try {
      if (window.sessionStorage.getItem(merk) === String(version)) return;
      window.sessionStorage.setItem(merk, String(version));
    } catch {
      return;
    }
    void neuLaden(true, true);
  }, [b.darfBearbeiten, b.neuerStandVorhanden, geaendert, speichert, version, id, neuLaden]);

  // Automatisch speichern, sobald eine Weile nichts mehr geändert wurde.
  useEffect(() => {
    if (!b.darfBearbeiten || !geaendert) return;
    const t = setTimeout(() => { void speichereJetzt("auto"); }, AUTO_SPEICHERN_S * 1000);
    return () => clearTimeout(t);
  }, [z, geaendert, b.darfBearbeiten, speichereJetzt]);

  const duplizieren = useCallback(async () => {
    if (!window.confirm(`Angebot ${zRef.current.angebot.angebotnr ?? ""} duplizieren? Es wird ein neues Angebot mit neuer Nummer und heutigem Datum angelegt.`)) return;
    if (geaendertRef.current) {
      if (darfRef.current) {
        if (!(await speichereJetzt("hand"))) return;
      } else if (!window.confirm("In diesem Fenster gibt es nicht gespeicherte Änderungen. Sie werden nicht mitkopiert. Trotzdem duplizieren?")) return;
    }
    setArbeitet("Angebot wird dupliziert …");
    try {
      const r = await dupliziereAngebot(id);
      if (r.ok) router.push(`/alt/angebote/${r.daten.id}?neu=1`);
      else setMeldung({ art: "fehler", text: r.fehler });
    } catch {
      setMeldung({ art: "fehler", text: "Duplizieren fehlgeschlagen. Bitte Verbindung und Anmeldung prüfen." });
    } finally {
      setArbeitet(null);
    }
  }, [id, router, speichereJetzt]);

  const beschaeftigt = speichert || laeuft || arbeitet != null;

  const maske = useMemo<Maske>(() => ({
    z,
    lesen,
    bausteine: stamm.textbausteine,
    duplizieren: () => { void duplizieren(); },
    beschaeftigt,
    setA: (patch) => aendere((s) => ({ ...s, angebot: { ...s.angebot, ...patch } })),
    setAdr: (art, patch) => aendere((s) => ({ ...s, adressen: { ...s.adressen, [art]: { ...s.adressen[art], ...patch } } })),
    setPos: (bereich, zeile, patch) => aendere((s) => {
      const i = s.positionen.findIndex((p) => p.bereich === bereich && p.zeile === zeile);
      const positionen = i >= 0 ? s.positionen.map((p, j) => (j === i ? { ...p, ...patch } : p)) : [...s.positionen, { ...leerePosition(bereich, zeile), ...patch }];
      return { ...s, positionen };
    }),
    entfernePos: (bereich, zeile) => aendere((s) => ({ ...s, positionen: s.positionen.filter((p) => !(p.bereich === bereich && p.zeile === zeile)) })),
    setTermin: (zeile, patch) => aendere((s) => {
      const i = s.termine.findIndex((t) => t.zeile === zeile);
      const termine = i >= 0 ? s.termine.map((t, j) => (j === i ? { ...t, ...patch } : t)) : [...s.termine, { zeile, text: null, datum: null, von: null, bis: null, gebucht: false, ...patch }];
      return { ...s, termine };
    }),
    setCheckliste: (checkliste) => aendere((s) => ({ ...s, checkliste })),
  }), [z, lesen, aendere, stamm.textbausteine, duplizieren, beschaeftigt]);

  // Vor dem Verlassen warnen: Browser (Schließen/Neuladen) und Links innerhalb der Anwendung.
  useEffect(() => {
    if (!geaendert) return;
    const vorEntladen = (e: BeforeUnloadEvent) => { if (!wegRef.current) e.preventDefault(); };
    const klick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || a.getAttribute("target") === "_blank" || (a.getAttribute("href") ?? "").startsWith("#")) return;
      if (!window.confirm(WARNUNG)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", vorEntladen);
    document.addEventListener("click", klick, true);
    return () => {
      window.removeEventListener("beforeunload", vorEntladen);
      document.removeEventListener("click", klick, true);
    };
  }, [geaendert]);

  const darfWeg = () => !geaendert || window.confirm(WARNUNG);
  const VERWERFEN = "In diesem Fenster gibt es nicht gespeicherte Änderungen. Sie gehen verloren, wenn der neueste Stand geladen wird. Fortfahren?";

  /** Knopf „Bearbeiten“ / „Bearbeitung übernehmen“ / „Hier weiterarbeiten“. */
  const bearbeiten = async () => {
    if (b.darfBearbeiten || b.uebernimmt || b.modus === "laedt") return;
    setMeldung(null);
    if (b.bearbeiter) {
      if (!b.bearbeiter.selberNutzer && !window.confirm(`${b.bearbeiter.name} bearbeitet dieses Angebot gerade. Er/sie wird gebeten zu speichern und abzugeben. Übernehmen?`)) return;
      if (geaendert && !window.confirm(VERWERFEN)) return;
      const ok = await b.uebernehmen();
      // Nach der Übernahme zeigt die Maske erst den neuesten gespeicherten Stand, dann beginnt die Bearbeitung.
      if (ok) await neuLaden(true, true);
      else setMeldung({ art: "fehler", text: "Die Bearbeitung konnte nicht übernommen werden. Bitte erneut versuchen." });
      return;
    }
    if (b.neuerStandVorhanden) {
      if (geaendert && !window.confirm(VERWERFEN)) return;
      await neuLaden(true, false);
      return;
    }
    const ok = await b.beginnen();
    if (!ok) setMeldung({ art: "fehler", text: "Bearbeiten ist gerade nicht möglich: Das Angebot wird von jemand anderem bearbeitet oder die Verbindung fehlt." });
  };

  /** Knopf „Fertig“: speichern (falls nötig) und Bearbeitung abgeben. */
  const fertig = async () => {
    if (!b.darfBearbeiten) return;
    if (!(await speichereJetzt("hand"))) return;
    await b.beenden();
  };

  const standLaden = () => {
    if (geaendert && !window.confirm(VERWERFEN)) return;
    void neuLaden(b.darfBearbeiten, b.darfBearbeiten);
  };

  const loeschen = () => {
    if (!window.confirm(`Angebot ${z.angebot.angebotnr ?? ""} wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
    start(async () => {
      try {
        const r = await loescheAngebot(id);
        if (r.ok) {
          geaendertRef.current = false;
          setGeaendert(false);
          router.push("/alt/angebote");
        } else setMeldung({ art: "fehler", text: r.fehler });
      } catch {
        setMeldung({ art: "fehler", text: "Löschen fehlgeschlagen." });
      }
    });
  };

  const reiterTaste = (e: React.KeyboardEvent) => {
    const n = REITER.length;
    const ziel = e.key === "ArrowRight" ? (reiter + 1) % n : e.key === "ArrowLeft" ? (reiter + n - 1) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (ziel < 0) return;
    e.preventDefault();
    setReiter(ziel);
    reiterRefs.current[ziel]?.focus();
  };

  const blatt = () => {
    switch (reiter) {
      case 0: return <ReiterAdressdaten id={id} auswahl={stamm.auswahl} />;
      case 1: return <ReiterBesichtigung id={id} auswahl={stamm.auswahl} />;
      case 2: return <ReiterTransport />;
      case 3: return <ReiterFrei />;
      case 4: return <ReiterNebenleistung stamm={stamm.leistungen} />;
      case 5: return <ReiterPackmaterial stamm={stamm.packmaterial} />;
      case 6: return <ReiterTermine />;
      case 7: return <ReiterPreis auswahl={stamm.auswahl} />;
      case 8: return <ReiterAdressenAnlagen halteverbotszonen={daten.halteverbotszonen} />;
      case 9: return <ReiterCheckliste vorlage={stamm.checkliste} />;
      case 10: return <ReiterUmzugsgutErfassung gut={daten.umzugsgut} zimmer={stamm.zimmer} />;
      case 11: return <ReiterUmzugsgutKomplett gut={daten.umzugsgut} />;
      default: return <ReiterUmzugsgutSummen gut={daten.umzugsgut} />;
    }
  };

  const weiter = b.bearbeiter?.selberNutzer ? "Hier weiterarbeiten" : "Bearbeitung übernehmen";
  const sperre = b.darfBearbeiten
    ? `In Bearbeitung (Sie)${geaendert ? " *" : ""}`
    : b.bearbeiter
      ? (b.bearbeiter.selberNutzer ? "Gesperrt (Sie, anderes Fenster)" : `Gesperrt durch ${b.bearbeiter.name}`)
      : b.modus === "pausiert" ? "Bearbeitung pausiert" : "Nur lesen";

  /** Zustandsbalken über den Reitern. */
  const balken = () => {
    if (b.uebernimmt) return <div className="balken" role="status"><span>Wird übernommen … der aktuelle Stand wird vorher gespeichert.</span></div>;
    if (veraltet) {
      return (
        <div className="balken rot" role="alert">
          <span>Nicht gespeichert: Dieses Angebot wurde inzwischen an anderer Stelle geändert. Ihre Eingaben stehen noch hier, können aber nicht gespeichert werden.</span>
          <button type="button" className="knopf" onClick={standLaden}>Neuesten Stand laden</button>
        </div>
      );
    }
    if (b.modus === "pausiert") return <div className="balken" role="status"><span>Bearbeitung pausiert (längere Zeit keine Eingabe). Der Stand ist gespeichert. Klicken oder tippen, um fortzufahren.</span></div>;
    if (b.modus === "ansicht" && b.bearbeiter) {
      return (
        <div className="balken" role="status">
          <span>
            {b.bearbeiter.selberNutzer
              ? "Nur Ansicht – Sie bearbeiten dieses Angebot in einem anderen Fenster oder an einem anderen Gerät."
              : `Nur Ansicht – ${b.bearbeiter.name} bearbeitet dieses Angebot${b.bearbeiter.seit ? ` seit ${uhrzeit(b.bearbeiter.seit)}` : ""}.`}
          </span>
          <button type="button" className="knopf" onClick={() => { void bearbeiten(); }}>{weiter}</button>
        </div>
      );
    }
    if (b.neuerStandVorhanden && !speichert && b.modus !== "laedt") {
      return (
        <div className="balken" role="status">
          <span>Es gibt einen neueren gespeicherten Stand.</span>
          <button type="button" className="knopf" onClick={standLaden}>Neu laden</button>
        </div>
      );
    }
    return null;
  };

  return (
    <MaskeKontext.Provider value={maske}>
      <Symbolleiste
        nachbarn={nachbarn}
        aktuell={id}
        onSpeichern={() => { void speichereJetzt("hand"); }}
        speichernAktiv={!lesen && geaendert && !beschaeftigt}
        onBearbeiten={() => { void bearbeiten(); }}
        inBearbeitung={!lesen}
        bearbeitenText={!b.darfBearbeiten && b.bearbeiter?.selberNutzer ? "Hier weiterarbeiten" : "Bearbeiten"}
        bearbeitenAus={b.uebernimmt || b.modus === "laedt" || beschaeftigt}
        onFertig={beschaeftigt ? undefined : () => { void fertig(); }}
        onLoeschen={admin ? loeschen : undefined}
        loeschenHinweis="Nur der Admin darf Angebote löschen"
        darfWeg={darfWeg}
        meldung={speichert ? { art: "ok", text: "Wird gespeichert …" } : arbeitet ? { art: "ok", text: arbeitet } : laeuft ? { art: "ok", text: "Bitte warten …" } : meldung}
      />
      <div className="inhalt">
        <div className="kopfzeile">
          <span>Angebotsnr.: <b>{z.angebot.angebotnr ?? "(ohne)"}</b>{geaendert ? <b title="Ungespeicherte Änderungen"> *</b> : null}{z.angebot.entwurf ? <span className="marke">Entwurf</span> : null}</span>
          <span>Auftraggeber: <b>{adressName(z.adressen.auftraggeber) || "–"}</b></span>
          <span>Status: <b>{z.angebot.status ?? "–"}</b></span>
          {daten.rechnungen.length > 0 && (
            <span className="nicht-drucken">Rechnungen: {daten.rechnungen.map((r, i) => <span key={r.id}>{i ? ", " : ""}<Link href={`/alt/rechnungen/${r.id}`}>{r.rechnungnr ?? r.id}</Link></span>)}</span>
          )}
          {z.angebot.kunde_id != null && <span className="nicht-drucken"><Link href={`/alt/kunden/${z.angebot.kunde_id}`}>Kundenstamm</Link></span>}
        </div>
        {b.hinweis && (
          <div className="balken info" role="alert">
            <span>{b.hinweis}</span>
            <button type="button" className="knopf" onClick={b.hinweisSchliessen}>OK</button>
          </div>
        )}
        {balken()}
        <div className="reiter-leiste" role="tablist" aria-label="Reiter des Angebots" onKeyDown={reiterTaste}>
          {REITER.map((titel, i) => (
            <button key={titel} ref={(el) => { reiterRefs.current[i] = el; }} type="button" role="tab" id={`reiter-${i}`} aria-selected={reiter === i} aria-controls="reiter-blatt" tabIndex={reiter === i ? 0 : -1} onClick={() => setReiter(i)}>
              {titel}
            </button>
          ))}
        </div>
        <div className="reiter-blatt" role="tabpanel" id="reiter-blatt" aria-labelledby={`reiter-${reiter}`}>
          {blatt()}
        </div>
      </div>
      <Statusleiste datei="Angebote" satz={`Datensatz ${position} von ${gesamt}`} sperre={sperre} zusatz={autoZeit ? `Automatisch gespeichert ${autoZeit}` : undefined} />
    </MaskeKontext.Provider>
  );
}
