import { AnmeldeRahmen } from "@/app/login/rahmen";
import { VergessenFormular } from "./formular";

export const metadata = { title: "Passwort vergessen" };

export default function PasswortVergessenSeite() {
  return (
    <AnmeldeRahmen titel="Passwort vergessen" unter="Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst. Alternativ kann der Admin dir ein neues Passwort setzen.">
      <VergessenFormular />
      <p className="mt-5 text-sm">
        <a href="/login" className="font-medium text-[#282828] underline underline-offset-4 hover:text-[#e1001a]">← Zurück zur Anmeldung</a>
      </p>
    </AnmeldeRahmen>
  );
}
