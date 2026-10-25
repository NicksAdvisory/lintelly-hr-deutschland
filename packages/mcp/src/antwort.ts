/**
 * Antwortformat aller Werkzeuge (Plan Abschnitt 2 und 3): Ergebnis, Rechenweg, Quellen mit Prüfdatum, Fallen, nächster Schritt,
 * Hinweis „Allgemeine Auskunft“, Herausgeber. Kein Hinweis auf Lintelly-Angebote in den
 * Antworten (Anthropic-Verzeichnis, Nick 25.10.2026).
 */
import { REGISTER, type RegisterEintrag } from "@/lib/regeln/register";
import { normLink } from "@/lib/regeln/fundstellen";

export const HERAUSGEBER = "Lintelly, lintelly.com";
export const HINWEIS = "Allgemeine Auskunft, keine Rechtsberatung im Einzelfall.";

export type Quelle = { norm: string; url?: string | null; geprueft_am?: string | null; status?: "bestätigt" | "noch nicht bestätigt" | "Prüfung überfällig" };


export type Antwort = {
  ergebnis: unknown;
  rechenweg?: string[];
  quellen: Quelle[];
  fallen?: string[];
  naechster_schritt?: string[];
  hinweis: string;
  stand: string;
  herausgeber: string;
};

export type AntwortTeile = Omit<Antwort, "hinweis" | "stand" | "herausgeber" | "quellen"> & { quellen?: Quelle[] };

/** Baut die Antwort. `heute` ist der Tag des Aufrufs (Berlin), gegen ihn wird „Prüfung überfällig“ gesetzt. */
export function antwort(t: AntwortTeile, heute: string): Antwort {
  const { quellen = [], ...rest } = t;
  const leer = (x: unknown) => x === undefined || (Array.isArray(x) && x.length === 0);
  const ohneLeere = Object.fromEntries(Object.entries(rest).filter(([, v]) => !leer(v))) as Omit<Antwort, "hinweis" | "stand" | "herausgeber" | "quellen">;
  return {
    ...ohneLeere,
    quellen: eindeutig(quellen),
    hinweis: HINWEIS,
    stand: heute,
    herausgeber: HERAUSGEBER,
  };
}

const eindeutig = (q: Quelle[]) => q.filter((x, i) => q.findIndex((y) => y.norm === x.norm && y.url === x.url) === i);

const EINTRAG: Record<string, RegisterEintrag> = Object.fromEntries(REGISTER.map((e) => [e.id, e]));

/** Quelle aus dem Rechtswerte-Register: Norm, amtliche Fundstelle, Prüfdatum und Status. Überschrittene Prüfung wird genannt. */
export function registerQuelle(id: string, heute: string): Quelle {
  const e = EINTRAG[id];
  if (!e) throw new Error(`Unbekannter Rechtswert: ${id}`);
  const status = e.naechstePruefung < heute ? "Prüfung überfällig" : e.status === "bestätigt" ? "bestätigt" : "noch nicht bestätigt";
  return { norm: e.norm, url: e.quelleUrl, geprueft_am: e.geprueftAm, status };
}

/** Quelle als Norm. Ohne Link sucht normLink die amtliche Fundstelle, geraten wird keine. */
export function normQuelle(norm: string, url?: string | null, geprueft_am?: string): Quelle {
  const link = url ?? normLink(norm);
  return { norm, ...(link ? { url: link } : {}), ...(geprueft_am ? { geprueft_am } : {}) };
}
