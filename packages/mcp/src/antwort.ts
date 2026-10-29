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

/** Antwortform für outputSchema und structuredContent: dieselben Felder wie im JSON-Text, ergebnis je Werkzeug verschieden. */
const texte = { type: "array", items: { type: "string" } } as const;
export const ANTWORT_SCHEMA = {
  type: "object",
  properties: {
    ergebnis: { description: "Result of the tool; its fields differ per tool" },
    rechenweg: texte,
    quellen: {
      type: "array",
      items: {
        type: "object",
        properties: { norm: { type: "string" }, url: { type: ["string", "null"] }, geprueft_am: { type: ["string", "null"] }, status: { type: "string", enum: ["bestätigt", "noch nicht bestätigt", "Prüfung überfällig"] } },
        required: ["norm"],
      },
    },
    fallen: texte,
    naechster_schritt: texte,
    hinweis: { type: "string" },
    stand: { type: "string" },
    herausgeber: { type: "string" },
  },
  required: ["ergebnis", "quellen", "hinweis", "stand", "herausgeber"],
} as const;

/** Eingabe, mit der ein Werkzeug nicht rechnen kann. Der Server antwortet dann wie bei jedem Fehler: isError und { fehler: [...] }. */
export class Fehler extends Error {
  constructor(readonly meldungen: string[]) {
    super(meldungen.join(" "));
  }
}
export function fehler(...meldungen: string[]): never {
  throw new Fehler(meldungen);
}

/** Baut die Antwort. `heute` ist der Tag des Aufrufs (Berlin), gegen ihn wird „Prüfung überfällig“ gesetzt. */
export function antwort(t: AntwortTeile, heute: string): Antwort {
  const { quellen = [], ...rest } = t;
  const leer = (x: unknown) => x === undefined || (Array.isArray(x) && x.length === 0);
  const ohneLeere = Object.fromEntries(Object.entries(rest).filter(([, v]) => !leer(v))) as Omit<Antwort, "hinweis" | "stand" | "herausgeber" | "quellen">;
  return {
    ...ohneLeere,
    quellen: eindeutig(quellen.map((q) => ausRegister(q, heute))),
    hinweis: HINWEIS,
    stand: heute,
    herausgeber: HERAUSGEBER,
  };
}

const ohneKlammer = (n: string) => n.replace(/\s*\([^)]*\)/g, "").trim();
const allgemein = (n: string) => ohneKlammer(n).replace(/ (Abs\.|Satz|Nr\.) \S+/g, "");
/**
 * Doppelte Quellen fallen weg (Review 29.10.2026): dieselbe Norm mit derselben Fundstelle, auch mit Zusatz in Klammern
 * („§ 1 MiLoV5“ neben „§ 1 MiLoV5 (vorher MiLoV4)“), und die allgemeine Norm neben der genaueren („§ 1 AAG“ neben „§ 1 Abs. 1 AAG“).
 * Eine Quelle mit Prüfstatus geht vor, sonst die erste.
 */
const eindeutig = (q: Quelle[]) => q.filter((x, i) => !q.some((y, j) => {
  if (j === i || y.url !== x.url || (!!x.status && !y.status)) return false;
  return ohneKlammer(y.norm) === ohneKlammer(x.norm) ? !!y.status !== !!x.status || j < i : allgemein(y.norm) === ohneKlammer(x.norm);
}));

const EINTRAG: Record<string, RegisterEintrag> = Object.fromEntries(REGISTER.map((e) => [e.id, e]));
/** Register-Kennungen je Norm, ohne die eigenen Annahmen von Lintelly. */
const NACH_NORM = REGISTER.filter((e) => e.rhythmus !== "Lintelly").reduce((m, e) => m.set(ohneKlammer(e.norm), [...(m.get(ohneKlammer(e.norm)) ?? []), e.id]), new Map<string, string[]>());
const RANG = { "Prüfung überfällig": 0, "noch nicht bestätigt": 1, bestätigt: 2 } as const;

/** Steht die Norm im Register, bekommt die Quelle Prüfdatum und Status, bei mehreren Einträgen den schwächsten (README: für jede Quelle). */
function ausRegister(q: Quelle, heute: string): Quelle {
  const ids = q.status ? undefined : NACH_NORM.get(ohneKlammer(q.norm));
  if (!ids) return q;
  const r = ids.map((id) => registerQuelle(id, heute)).sort((a, b) => RANG[a.status!] - RANG[b.status!])[0];
  return { ...q, url: q.url ?? r.url, geprueft_am: r.geprueft_am, status: r.status };
}

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
