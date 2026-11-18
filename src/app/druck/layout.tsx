import { redirect } from "next/navigation";
import { aktuellerNutzer } from "@/lib/supabase/server";
import "./druck.css";

export default async function DruckLayout({ children }: { children: React.ReactNode }) {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) redirect("/login");
  return <div className="druck">{children}</div>;
}
