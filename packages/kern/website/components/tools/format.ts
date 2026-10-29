/** Zahlen und Texte für die Tools: deutsche Eingaben lesen, Beträge und Zahlen ausgeben, KI-Text säubern. */

/** Zahl im deutschen Format lesen (Komma oder Punkt als Dezimaltrenner, Tausenderpunkte, € erlaubt). null, wenn leer oder keine Zahl. */
export function parseNum(s: string): number | null {
  const t = String(s).trim().replace(/\s|€/g, "");
  if (!t) return null;
  let norm = t;
  if (t.includes(",")) norm = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) norm = t.replace(/\./g, "");
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

/** 1.234,56 € */
export const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
/** 1.235 € (ohne Cent) */
export const eurRund = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
/** Deutsche Zahl mit höchstens `max` Nachkommastellen: 2,5 */
export const zahl = (n: number, max = 2) => n.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: max });
/** Deutsche Zahl mit genau `d` Nachkommastellen: 2,50 */
export const zahlFest = (n: number, d = 2) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Entfernt Markdown-Reste und Gedankenstriche aus KI-Text. */
export function saeubern(t: string): string {
  return t
    .replace(/\r/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\s[–—]\s/g, ", ")
    .replace(/[–—]/g, "-")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Zeilen einer Textarea ohne Aufzählungszeichen. */
export function zeilen(s: string) {
  return s.split("\n").map((l) => l.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
}

/** Kurzname eines Tools für Kacheln und Links: der Teil der H1 vor dem Doppelpunkt ("BEM-Rechner: Ab wann …" wird "BEM-Rechner"). */
export const kurzName = (h1: string) => h1.split(":")[0].trim();

/** Radiogruppe mit Pfeiltasten (ui.tsx, Segmented): neue Position nach Taste, null bei anderen Tasten. Läuft am Ende rundherum. */
export function rovingIndex(i: number, taste: string, n: number): number | null {
  if (taste === "ArrowRight" || taste === "ArrowDown") return (i + 1) % n;
  if (taste === "ArrowLeft" || taste === "ArrowUp") return (i - 1 + n) % n;
  if (taste === "Home") return 0;
  if (taste === "End") return n - 1;
  return null;
}

/** Kalender-Blatt am Handy (datum-feld.tsx): schließen ab 25 % der Höhe nach unten oder bei schnellem Wischen nach unten (px/ms). */
export const blattSchliessen = (dy: number, hoehe: number, tempo: number) => dy > hoehe * 0.25 || (dy > 12 && tempo > 0.5);
