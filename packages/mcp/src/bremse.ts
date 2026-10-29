/**
 * Bremse im Speicher (Wissen-Konzept Abschnitt 5, geändert 29.10.2026): je Adresse 300 Aufrufe je Minute. Eine IPv6-Adresse zählt
 * mit ihrem ganzen /64-Netz, denn ein Anschluss bekommt meist ein /64 und kann darin beliebig viele Adressen wählen.
 * claude.ai und ChatGPT rufen von wenigen eigenen Adressen aus, viele Nutzer teilen sich also eine; ein Gespräch macht je
 * Werkzeug drei bis vier Anfragen (initialize, tools/list, tools/call). Darum großzügig je Adresse.
 * Die Obergrenze für alle (6.000 je Minute, 100 je Sekunde, weit unter dem, was der Dienst schafft) schützt nur den Prozess.
 * Ist sie erreicht, bremst sie nur Adressen, die in dieser Minute schon mehr als 60 Aufrufe hatten: wenige laute Adressen
 * sperren so nie alle anderen aus.
 * Festes Fenster: Adressen stehen höchstens 60 Sekunden im Speicher, dann wird alles geleert.
 */
import { isIPv4, isIPv6 } from "node:net";

export type Bremse = (adresse: string, jetzt?: number) => boolean;

/** Schlüssel für die Bremse: IPv4 wie sie ist, IPv6 als /64-Netz (2001:db8:1:2::/64), IPv4 in IPv6 (::ffff:1.2.3.4) als IPv4. */
export function adressGruppe(a: string): string {
  const ohneZone = a.split("%")[0];
  const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ohneZone);
  if (v4 && isIPv4(v4[1])) return v4[1];
  if (!isIPv6(ohneZone)) return a;
  const [links, rechts] = ohneZone.split("::");
  // Eine IPv4-Schreibweise am Ende belegt zwei Gruppen; für das /64 zählen nur die ersten vier.
  const teile = (s: string | undefined) => (s ? s.split(":").flatMap((t) => (t.includes(".") ? ["0", "0"] : [t])) : []);
  const l = teile(links), r = teile(rechts);
  const alle = rechts === undefined ? l : [...l, ...Array(8 - l.length - r.length).fill("0"), ...r];
  return `${alle.slice(0, 4).map((h) => parseInt(h, 16).toString(16)).join(":")}::/64`;
}

export const GRENZEN = { jeAdresse: 300, gesamt: 6000, leise: 60, fensterMs: 60_000 };

export function bremse(teil: Partial<typeof GRENZEN> = {}): Bremse {
  const o = { ...GRENZEN, ...teil };
  let start = 0;
  let gesamt = 0;
  const je = new Map<string, number>();
  return (adresse, jetzt = Date.now()) => {
    if (jetzt - start >= o.fensterMs) { start = jetzt; gesamt = 0; je.clear(); }
    const k = adressGruppe(adresse);
    const n = je.get(k) ?? 0;
    if (n >= o.jeAdresse || (gesamt >= o.gesamt && n >= o.leise)) return false;
    gesamt++;
    je.set(k, n + 1);
    return true;
  };
}
