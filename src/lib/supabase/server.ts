import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** Supabase-Client mit der Sitzung des eingeloggten Nutzers. Alle Abfragen laufen im Schema `app` unter Row Level Security. */
export async function db() {
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: "app" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (liste) => {
        try {
          liste.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // In Server Components nicht erlaubt; die Sitzung erneuert der Proxy.
        }
      },
    },
  });
}

export type Nutzer = { id: string; email: string; name: string | null; rolle: "admin" | "nutzer" };

/** Eingeloggter, aktiver Nutzer oder null. */
export async function aktuellerNutzer(): Promise<Nutzer | null> {
  const sb = await db();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await sb.from("profile").select("id,email,name,rolle,aktiv").eq("id", data.user.id).maybeSingle();
  if (!p || !p.aktiv) return null;
  return { id: p.id, email: p.email, name: p.name, rolle: p.rolle };
}

/** Wirft, wenn niemand eingeloggt ist. Für Server Actions und Route Handler. */
export async function erfordereNutzer(): Promise<Nutzer> {
  const n = await aktuellerNutzer();
  if (!n) throw new Error("Nicht angemeldet");
  return n;
}
