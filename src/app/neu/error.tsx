"use client";
import { Hinweis, Knopf } from "@/components/neu/ui";

export default function Fehler({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-xl pt-8">
      <Hinweis art="fehler" titel="Die Seite konnte nicht geladen werden">
        <p>Bitte versuchen Sie es noch einmal. Wenn der Fehler bleibt, prüfen Sie die Internetverbindung oder melden Sie sich neu an.</p>
        <div className="mt-3 flex gap-2">
          <Knopf art="primaer" onClick={() => retry()}>
            Erneut versuchen
          </Knopf>
          <Knopf href="/neu/angebote">Zur Angebotsliste</Knopf>
        </div>
      </Hinweis>
    </div>
  );
}
