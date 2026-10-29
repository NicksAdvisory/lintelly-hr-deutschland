import { tageWert, type Empfaenger, type Schritt } from "@/lib/workflows/kern";
import { PLAN_AUFGABEN, REGELN } from "@/lib/workflows/bauen";
import type { Ausloeser, Workflow } from "@/lib/workflows/vorlagen";

/** Lesbare Kette je Workflow für die Seite Workflows: Auslöser und Schritte mit den eingestellten Tagen. Rein. */
export const AN: Record<Empfaenger, string> = { hr: "HR-Leitung", gf: "Geschäftsführung", person: "Person", fuehrung: "Führungskraft", "alle-fuehrung": "alle Führungskräfte" };
export const ART: Record<Schritt["art"], string> = { aufgabe: "Aufgabe", mitteilung: "Erinnerung in Mein Lintelly", freigabe: "Freigabe", warten: "Warten" };

export function ausloeserText(a: Ausloeser): string {
  if (a.art === "befund") return a.regeln.map((r) => REGELN[r] ?? r).join(" oder ");
  if (a.art === "plan") return a.aufgaben.map((x) => PLAN_AUFGABEN[x]?.label ?? x).join(" oder ");
  return a.art === "lohn" ? "Abgabetag Lohn-Input" : "Lesebestätigung offen";
}

export const wann = (n: number) => (n < 0 ? `${-n} ${n === -1 ? "Tag" : "Tage"} vorher` : n === 0 ? "am Tag" : `nach ${n} ${n === 1 ? "Tag" : "Tagen"}`);
export const dauerText = (n: number) => `${n} ${n === 1 ? "Tag" : "Tage"}`;

export function schrittText(s: Schritt, tage: Record<string, number>): string {
  if (s.art === "warten") return `Warten, ${dauerText(s.dauer)}`;
  const w = s.wiederholen ? `, erinnert alle ${tageWert(s.wiederholen.alle, tage)} Tage` : "";
  return `${s.eskalation ? "Nachfassen: " : ""}${ART[s.art]} an ${AN[s.an]}, ${wann(tageWert(s.ab, tage))}${w}`;
}

export const kette = (w: Workflow, tage: Record<string, number>) => w.teile.map((t) => ({ wenn: ausloeserText(t.ausloeser), dann: t.schritte.map((s) => schrittText(s, tage)) }));
