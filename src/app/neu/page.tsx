import { AnsichtUmschalter } from "@/components/ansicht-umschalter";
import { abmelden } from "@/app/login/aktionen";
export default function Neu() {
  return <main className="p-6"><AnsichtUmschalter className="flex gap-3" aktivClassName="font-bold" /><p className="mt-4">Neuansicht (in Arbeit)</p><form action={abmelden}><button className="mt-4 underline">Abmelden</button></form></main>;
}
