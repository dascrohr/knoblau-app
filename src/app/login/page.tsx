import { LoginFormular } from "./formular";
import { AnmeldeRahmen } from "./rahmen";

export const metadata = { title: "Anmelden" };

export default function LoginSeite() {
  return (
    <AnmeldeRahmen titel="Willkommen" unter="Bitte melde dich mit deiner E-Mail-Adresse an.">
      <LoginFormular />
      <p className="mt-5 text-sm">
        <a href="/passwort-vergessen" className="font-medium text-[#282828] underline underline-offset-4 hover:text-[#e1001a]">Passwort vergessen?</a>
      </p>
      <p className="mt-10 border-t border-neutral-200 pt-5 text-xs text-neutral-500">Zugänge legt der Admin an. Eine Selbstregistrierung gibt es nicht.</p>
    </AnmeldeRahmen>
  );
}
