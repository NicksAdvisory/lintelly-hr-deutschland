/**
 * Datumshilfen für die Tools. Die Kalenderregeln (Monatsende, Schaltjahr, §§ 187, 188 BGB) stehen nur in
 * lib/fristen.ts und sind dort getestet. Diese Datei übersetzt sie in zwei Formen, die die Rechner nutzen:
 * Date-Objekte auf UTC-Mitternacht und Tageszahlen (Tage seit 01.01.1970).
 */
import * as F from "../../lib/fristen";

const DAY = 86_400_000;
const WT_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WT_LANG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/* ---------- Date auf UTC-Mitternacht ---------- */

/** "JJJJ-MM-TT" zu Date (UTC). null bei ungültigem Datum oder Jahr außerhalb 1901 bis 2199. */
export function parseYmd(s: string | null | undefined): Date | null {
  if (!F.isISODate(s)) return null;
  const p = F.parts(s);
  return p.y > 1900 && p.y < 2200 ? new Date(Date.UTC(p.y, p.m - 1, p.d)) : null;
}
const von = (s: F.ISODate) => parseYmd(s)!;
export const toYmd = (d: Date): F.ISODate => d.toISOString().slice(0, 10);
/** Heute (Gerätezeit) als "JJJJ-MM-TT". */
export const todayYmd = F.heute;
/** Heute (Gerätezeit) als Date auf UTC-Mitternacht. */
export const today = () => von(F.heute());

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
export const diffDays = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);
/** Monate addieren; fehlt der Tag im Zielmonat, gilt der Monatsletzte (§ 188 Abs. 3 BGB). */
export const addMonths = (d: Date, n: number) => von(F.addMonths(toYmd(d), n));
/** Letzter Tag eines Zeitraums von n Monaten ab Tagesbeginn (§ 187 Abs. 2, § 188 Abs. 2 und 3 BGB). */
export const periodEnd = (start: Date, n: number) => von(F.zeitraumEnde(toYmd(start), n));
export const daysInMonth = (y: number, m0: number) => F.daysInMonth(y, m0 + 1);

export const weekday = (d: Date) => WT_KURZ[d.getUTCDay()];
/** "TT.MM.JJJJ", mit wochentag "Mo, TT.MM.JJJJ". */
export function fmt(d: Date | null | undefined, wochentag = false) {
  if (!d) return "";
  const s = F.formatDE(toYmd(d));
  return wochentag ? `${weekday(d)}, ${s}` : s;
}

/**
 * Zeitraum von "from" bis vor "to" in Jahren, vollen Monaten und Resttagen (für Anzeige). Volle Monate zählen wie
 * Fristen nach §§ 187 Abs. 2, 188 Abs. 2 und 3 BGB: 30.01. bis 28.02. ist ein voller Monat, die Tage sind nie negativ.
 */
export function ymd(from: Date, to: Date) {
  let m = 0;
  // Ohne gültiges Ende (Jahr ab 2200) bricht die Zählung ab, statt endlos zu laufen.
  for (let e = periodEnd(from, 1); e && e < to; e = periodEnd(from, m + 1)) m++;
  const d = diffDays(m ? addDays(periodEnd(from, m), 1) : from, to);
  return { y: Math.floor(m / 12), m: m % 12, d: Math.max(0, d) };
}

/** iCalendar-Datei mit ganztägigen Terminen. */
export function buildIcs(events: { date: Date; title: string; desc?: string }[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const d = (x: Date) => toYmd(x).replace(/-/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lintelly//Tools//DE", "CALSCALE:GREGORIAN"];
  events.forEach((e, i) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d(e.date)}-${i}-${Math.random().toString(36).slice(2)}@lintelly.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d(e.date)}`,
      `DTEND;VALUE=DATE:${d(addDays(e.date, 1))}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.desc ? [`DESCRIPTION:${esc(e.desc)}`] : []),
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/* ---------- Tageszahlen (Tage seit 01.01.1970, UTC) ---------- */

/** "JJJJ-MM-TT" zu Tageszahl, NaN bei ungültigem Datum. */
export const toDay = (s: string) => (F.isISODate(s) ? Math.round(Date.parse(s) / DAY) : NaN);
export const fromDay = (n: number): F.ISODate => new Date(n * DAY).toISOString().slice(0, 10);
export const fmtDay = (n: number) => F.formatDE(fromDay(n));
export const weekdayDay = (n: number) => WT_LANG[F.wochentag(fromDay(n))];
export const addMonthsDay = (n: number, m: number) => toDay(F.addMonths(fromDay(n), m));
/** Jahrestag; 29.02. wird im Nicht-Schaltjahr zum 01.03. (wie jahrestag() in lib/fristen.ts). */
export const addYearsDay = (n: number, y: number) => toDay(F.jahrestag(fromDay(n), y));
/** Jahr, Monat (0 bis 11) und Tag einer Tageszahl. */
export function partsDay(n: number) {
  const p = F.parts(fromDay(n));
  return { y: p.y, m: p.m - 1, d: p.d };
}
