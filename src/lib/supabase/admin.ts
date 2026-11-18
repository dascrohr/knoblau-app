import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/** Client mit service_role. Nur serverseitig und nur für die Nutzerverwaltung durch Admins. */
export function adminDb() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "app" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
