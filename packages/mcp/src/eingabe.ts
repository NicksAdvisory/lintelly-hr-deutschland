/**
 * Eingaben der Werkzeuge als kleines JSON-Schema (die Teilmenge, die Claude und ChatGPT lesen) und ihre Prüfung.
 * Nach dem Muster von lib/werkzeuge/schema.ts der Werkbank, dazu Listen. Unbekannte Felder, falsche Typen, zu lange Texte
 * und zu lange Listen werden abgelehnt, bevor ein Rechner läuft. Freitext gibt es nur, wo ein Werkzeug Text lesen muss.
 * Daten müssen echte Kalendertage zwischen 1950 und 2100 sein (Review 29.10.2026: 2026-02-30 wurde weitergerechnet,
 * ab dem Jahr 2200 läuft die Monatsrechnung der Website endlos, ymd in components/tools/datum.ts).
 */

export type Feld =
  | { type: "string"; description: string; enum?: readonly string[]; pattern?: string; format?: "date"; maxLength?: number }
  | { type: "number"; description: string; minimum?: number; maximum?: number }
  | { type: "integer"; description: string; minimum?: number; maximum?: number }
  | { type: "boolean"; description: string }
  | { type: "array"; description: string; items: Feld | ObjektSchema; maxItems: number };

export type ObjektSchema = { type: "object"; properties: Record<string, Feld>; required?: string[]; additionalProperties: false };
export type Schema = ObjektSchema;
export type Wert = string | number | boolean | Wert[] | { [k: string]: Wert };
export type Eingabe = Record<string, Wert>;

export const DATUM = "^\\d{4}-\\d{2}-\\d{2}$";
export const JAHRE = { von: 1950, bis: 2100 } as const;
const STANDARD_LAENGE = 200;

export const schema = (properties: Record<string, Feld>, required: string[] = []): Schema =>
  ({ type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false });

export const text = (description: string, extra: { enum?: readonly string[]; pattern?: string; maxLength?: number } = {}): Feld =>
  ({ type: "string", description, ...extra });
export const datum = (description: string): Feld => ({ type: "string", description: `${description} (YYYY-MM-DD)`, pattern: DATUM, format: "date", maxLength: 10 });
const grenzen = (minimum?: number, maximum?: number) => ({ ...(minimum !== undefined ? { minimum } : {}), ...(maximum !== undefined ? { maximum } : {}) });
export const zahl = (description: string, minimum?: number, maximum?: number): Feld => ({ type: "number", description, ...grenzen(minimum, maximum) });
export const ganzzahl = (description: string, minimum?: number, maximum?: number): Feld => ({ type: "integer", description, ...grenzen(minimum, maximum) });
export const jahr = (description: string, minimum: number = JAHRE.von, maximum: number = JAHRE.bis) => ganzzahl(description, minimum, maximum);
export const janein = (description: string): Feld => ({ type: "boolean", description });
export const liste = (description: string, items: Feld | ObjektSchema, maxItems: number): Feld => ({ type: "array", description, items, maxItems });

type Ergebnis<T> = { ok: true; wert: T } | { ok: false; fehler: string };

/** Fehler eines Datums JJJJ-MM-TT: Jahr außerhalb 1950 bis 2100 oder ein Tag, den es nicht gibt (2026-02-30). */
function datumFehler(s: string): string | null {
  const [j, m, t] = s.split("-").map(Number);
  if (j < JAHRE.von || j > JAHRE.bis) return `Das Jahr muss zwischen ${JAHRE.von} und ${JAHRE.bis} liegen.`;
  const d = new Date(Date.UTC(j, m - 1, t));
  return d.getUTCMonth() === m - 1 && d.getUTCDate() === t ? null : `Den Tag ${s} gibt es im Kalender nicht.`;
}

function pruefeWert(f: Feld | ObjektSchema, v: unknown, pfad: string): Ergebnis<Wert> {
  if (f.type === "object") {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return { ok: false, fehler: `${pfad} muss ein Objekt sein.` };
    return pruefeObjekt(f, v as Record<string, unknown>, `${pfad}.`);
  }
  if (f.type === "string") {
    if (typeof v !== "string") return { ok: false, fehler: `${pfad} muss Text sein.` };
    if (v.length > (f.maxLength ?? STANDARD_LAENGE)) return { ok: false, fehler: `${pfad} ist zu lang.` };
    if (f.enum && !f.enum.includes(v)) return { ok: false, fehler: `${pfad} muss einer dieser Werte sein: ${f.enum.join(", ")}` };
    if (f.pattern && !new RegExp(f.pattern).test(v)) return { ok: false, fehler: `${pfad} hat ein ungültiges Format${f.format === "date" ? ", erwartet JJJJ-MM-TT" : ""}.` };
    const falsch = f.format === "date" ? datumFehler(v) : null;
    return falsch ? { ok: false, fehler: `${pfad}: ${falsch}` } : { ok: true, wert: v };
  }
  if (f.type === "number" || f.type === "integer") {
    // Ganze Zahlen auch als Text ("2026"): so schickten ältere Aufrufe das Jahr bei minijob und ausgleichsabgabe.
    const n = f.type === "integer" && typeof v === "string" && /^\d{1,9}$/.test(v) ? Number(v) : v;
    if (typeof n !== "number" || !Number.isFinite(n)) return { ok: false, fehler: `${pfad} muss eine Zahl sein.` };
    if (f.type === "integer" && !Number.isInteger(n)) return { ok: false, fehler: `${pfad} muss eine ganze Zahl sein.` };
    if ((f.minimum !== undefined && n < f.minimum) || (f.maximum !== undefined && n > f.maximum)) {
      return { ok: false, fehler: `${pfad} liegt außerhalb des erlaubten Bereichs${f.minimum !== undefined && f.maximum !== undefined ? ` (${f.minimum} bis ${f.maximum})` : ""}.` };
    }
    return { ok: true, wert: n };
  }
  if (f.type === "boolean") return typeof v === "boolean" ? { ok: true, wert: v } : { ok: false, fehler: `${pfad} muss true oder false sein.` };
  if (!Array.isArray(v)) return { ok: false, fehler: `${pfad} muss eine Liste sein.` };
  if (v.length > f.maxItems) return { ok: false, fehler: `${pfad} hat mehr als ${f.maxItems} Einträge.` };
  const out: Wert[] = [];
  for (const [i, x] of v.entries()) {
    const r = pruefeWert(f.items, x, `${pfad}[${i}]`);
    if (!r.ok) return r;
    out.push(r.wert);
  }
  return { ok: true, wert: out };
}

function pruefeObjekt(s: ObjektSchema, ein: Record<string, unknown>, vor = ""): Ergebnis<Eingabe> {
  for (const k of Object.keys(ein)) if (!Object.hasOwn(s.properties, k)) return { ok: false, fehler: `Unbekanntes Feld: ${vor}${k.slice(0, 40)}` };
  for (const k of s.required ?? []) if (ein[k] === undefined || ein[k] === "") return { ok: false, fehler: `Pflichtfeld fehlt: ${vor}${k}` };
  const wert: Eingabe = {};
  for (const [k, f] of Object.entries(s.properties)) {
    if (ein[k] === undefined) continue;
    const r = pruefeWert(f, ein[k], `${vor}${k}`);
    if (!r.ok) return r;
    wert[k] = r.wert;
  }
  return { ok: true, wert };
}

export function pruefeEingabe(s: Schema, roh: unknown): Ergebnis<Eingabe> {
  if (roh === undefined || roh === null) roh = {};
  if (typeof roh !== "object" || Array.isArray(roh)) return { ok: false, fehler: "Die Eingabe muss ein Objekt sein." };
  return pruefeObjekt(s, roh as Record<string, unknown>);
}
