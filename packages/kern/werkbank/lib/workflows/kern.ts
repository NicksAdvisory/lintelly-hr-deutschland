import { addDays, compare } from "@/lib/regeln/datum";
import type { Aufgabe } from "@/lib/types";

/**
 * Workflows (Nick 21.10.2026: "nicht mit n8n, sondern in der Software selbst, als eigener Workflow-Bereich"). Ein Workflow ist ein Bauplan
 * aus festen Bausteinen: Auslöser liefern Anlässe, je Anlass läuft ein Lauf, dessen Schritte ab ihrem Tag ausgeführt werden. Reine Logik hier,
 * Auslöser in lib/workflows/ausloeser.ts, Ausführung in lib/workflows/lauf.ts.
 */

/** Ein Grund zu handeln, z. B. "Personalfragebogen von Lea fehlt"; der Schlüssel bleibt gleich, solange es derselbe Grund ist. `titel`: wer oder was (Name der Person, Lohnmonat, Sammeltitel); `was`: worum es geht, wenn der Titel die Person ist (Lesebestätigung). */
export type Anlass = {
  schluessel: string; personId: string | null; datum: string | null; titel: string; was?: string; link?: string;
  /** Team der Person, für den Platzhalter {Team}. Kommt beim Lauf dazu. */
  team?: string;
  /** Der Befund ist vertraulich (Gesundheit, Mutterschutz, Elternzeit): gilt wie ein Gesundheits-Workflow, auch wenn der Workflow es nicht ist. */
  vertraulich?: boolean;
};

/** Wer etwas bekommt: Aufgaben gehen an HR-Leitung oder Geschäftsführung, Mitteilungen in Mein Lintelly an die Person oder Führungskräfte. */
export type Empfaenger = "hr" | "gf" | "person" | "fuehrung" | "alle-fuehrung";

/** Tage relativ zum Datum des Anlasses: Zahl, Name einer Einstellung ("vorlauf") oder deren Gegenteil ("-vorlauf"). */
export type Tage = number | string;

/**
 * Ein Schritt. `freigabe` ist eine Aufgabe, auf die die folgenden Schritte warten: freigegeben geht es weiter, abgelehnt endet der Lauf
 * (Nick 24.10.2026). `warten` hält die folgenden Schritte an, bis seit dem letzten Schritt `dauer` Tage vergangen sind.
 */
export type Schritt = { id: string; art: "warten"; dauer: number } | {
  id: string;
  art: "aufgabe" | "mitteilung" | "freigabe";
  an: Empfaenger;
  ab: Tage;
  text: (a: Anlass) => string;
  /** Mitteilung erneut, Aufgabe wieder nach oben (Fälligkeit heute), alle N Tage, höchstens `max`-mal insgesamt. */
  wiederholen?: { alle: Tage; max: number };
  /** Eskalation: kommt nur, wenn der Anlass bis dahin nicht erledigt ist (das ergibt sich von selbst, erledigte Läufe sind zu). */
  eskalation?: boolean;
  /** Gibt es schon eine offene Aufgabe dafür (etwa mit Wirkung "gemeldet" oder Versand), legt der Workflow keine zweite an. */
  schonDa?: (x: Aufgabe, a: Anlass) => boolean;
};

export type Handeln = Exclude<Schritt, { art: "warten" }>;
export const handelt = (s: Schritt): s is Handeln => s.art !== "warten";

/** Ein Lauf je Workflow, Teil und Anlass. Mit Person steht nur ihre Kennung hier (der Name kommt beim Anzeigen dazu, eine Löschung erfasst ihn so mit). */
export type Lauf = {
  id: string; workflow: string; schluessel: string; personId: string | null;
  /** Nur ohne Person (Lohnmonat, Sammelaufgabe). */
  titel: string | null;
  /** Datum des Anlasses beim letzten Lauf, ohne Datum zählt `start`. */
  datum: string | null; start: string;
  status: "laeuft" | "erledigt";
  ende?: string;
  /** Je Schritt die Tage, an denen er ausgeführt wurde. */
  erledigt: Record<string, string[]>;
  /** Je Freigabe-Schritt der Tag, an dem freigegeben wurde. */
  freigaben?: Record<string, string>;
  /** Eine Freigabe wurde abgelehnt, der Lauf ist damit zu Ende. */
  abgelehnt?: boolean;
  /** Angelegte Aufgaben, je Schritt eine. */
  aufgaben: string[];
};

export const tageWert = (t: Tage, einstellung: Record<string, number>): number => {
  if (typeof t === "number") return t;
  const minus = t.startsWith("-");
  const w = einstellung[minus ? t.slice(1) : t];
  if (w === undefined) throw new Error(`Unbekannte Einstellung ${t}`);
  return minus ? -w : w;
};

/**
 * Welche Schritte heute dran sind. Ein Schritt einmal ab seinem Tag, mit `wiederholen` erneut alle N Tage bis zur Höchstzahl.
 * Freigabe und Warten sind Tore: dahinter liegende Schritte kommen frühestens am Tag der Freigabe oder nach der Wartezeit.
 */
export function faelligeSchritte(schritte: Schritt[], lauf: Lauf, heute: string, einstellung: Record<string, number>): Schritt[] {
  if (lauf.status !== "laeuft") return [];
  const basis = lauf.datum ?? lauf.start;
  const out: Schritt[] = [];
  let tor: string | null = null; // frühester Tag nach dem letzten Tor
  let zuletzt: string | null = null; // spätester erster Ausführungstag seit dem letzten Tor
  let luecke = false; // seit dem letzten Tor ist ein Schritt noch nie gelaufen: Warten zählt erst, wenn alles davor einmal gelaufen ist
  for (const s of schritte) {
    if (s.art === "warten") {
      if (luecke) return out;
      const bis = addDays(zuletzt ?? tor ?? lauf.start, s.dauer);
      if (compare(heute, bis) < 0) return out;
      tor = bis; zuletzt = null;
      continue;
    }
    const getan = lauf.erledigt[s.id] ?? [];
    const ab = addDays(basis, tageWert(s.ab, einstellung));
    const frei = compare(heute, ab) >= 0 && (!tor || compare(heute, tor) >= 0);
    if (frei && dran(s, getan, heute, einstellung)) out.push(s);
    const erst = getan[0] ?? (frei ? heute : null);
    if (s.art === "freigabe") {
      const am = lauf.freigaben?.[s.id];
      if (!am) return out;
      tor = am; zuletzt = null; luecke = false;
      continue;
    }
    if (!erst) luecke = true;
    else if (!zuletzt || compare(erst, zuletzt) > 0) zuletzt = erst;
  }
  return out;
}

function dran(s: Handeln, getan: string[], heute: string, einstellung: Record<string, number>): boolean {
  if (!getan.length) return true;
  // Nie zweimal am selben Tag: es gibt mehrere Läufe am Tag (Nacht, Einschalten, Demo-Regie), auch mit 0 Tagen Abstand.
  if (!s.wiederholen || getan.length >= s.wiederholen.max || getan[getan.length - 1] === heute) return false;
  return compare(heute, addDays(getan[getan.length - 1], tageWert(s.wiederholen.alle, einstellung))) >= 0;
}
