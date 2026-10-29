/** Reine Logik des Pausen-Rechners (ArbZG, JArbSchG). */
import type { Level } from "./ui";
import { addDays, diffDays, fmt, parseYmd, weekday } from "./datum";

/** Rechtsstand 04.10.2026. ArbZG-Reform liegt als Referentenentwurf vor (Juni 2026), nicht beschlossen. */
export const STAND_2026 = {
  stand: "04.10.2026",
  erw: { pause1: { ab: 360, min: 30 }, pause2: { ab: 540, min: 45 }, block: 360, regel: 480, max: 600, ruhe: 660, ruheAusnahme: 600, woche: 2880 },
  jug: { pause1: { ab: 270, min: 30 }, pause2: { ab: 360, min: 60 }, block: 270, regel: 480, max: 510, schicht: 600, ruhe: 720, woche: 2400, nachtVon: 1200, nachtBis: 360 },
  minAbschnitt: 15,
};

export type Pause = { id: number; von: string; bis: string };
export type Tag = { id: number; datum: string; von: string; bis: string; pausen: Pause[] };
type Msg = { level: Level; text: string };
export type TagErgebnis = { id: number; label: string; arbeit: number; pause: number; soll: number; ruhe: number | null; level: Level; msgs: Msg[]; leer: boolean; fehler?: string; s?: number; e?: number; ps?: { a: number; b: number }[] };

const toMin = (s: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  return h < 24 && mi < 60 ? h * 60 + mi : null;
};
export const hm = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")} h`;
const worst = (ls: Level[]): Level => (ls.includes("late") ? "late" : ls.includes("due") ? "due" : "ok");

export function pruefeTage(tage: Tag[], o: { jugend: boolean; ausnahme: boolean; vortagEnde: string }) {
  const R = o.jugend ? STAND_2026.jug : STAND_2026.erw;
  const ergebnisse: TagErgebnis[] = [];
  let firstDate: Date | null = null;
  let prevIdx = -1;
  let prevEndAbs: number | null = null;
  const vEnd = toMin(o.vortagEnde);
  let summe = 0;
  // Wochensumme je Kalenderwoche (Montag bis Sonntag). Ohne Datum gelten je 7 eingetragene Tage als eine Woche.
  const wochen = new Map<string, { summe: number; montag: Date | null }>();

  tage.forEach((t, i) => {
    const d = parseYmd(t.datum);
    if (d && !firstDate) firstDate = d;
    const idx = d && firstDate ? diffDays(firstDate, d) : prevIdx + 1;
    const label = d ? `${weekday(d)}, ${fmt(d)}` : `Tag ${i + 1}`;
    const s = toMin(t.von);
    let e = toMin(t.bis);
    const base: TagErgebnis = { id: t.id, label, arbeit: 0, pause: 0, soll: 0, ruhe: null, level: "ok", msgs: [], leer: false };
    if (!t.von && !t.bis) { ergebnisse.push({ ...base, leer: true }); prevIdx = idx; return; }
    if (s === null || e === null) { ergebnisse.push({ ...base, leer: true, fehler: "Bitte Beginn und Ende als Uhrzeit eingeben." }); prevIdx = idx; return; }
    if (s === e) { ergebnisse.push({ ...base, leer: true, fehler: "Beginn und Ende sind gleich." }); prevIdx = idx; return; }
    if (d && prevIdx >= 0 && idx <= prevIdx) { ergebnisse.push({ ...base, leer: true, fehler: "Die Tage müssen zeitlich aufeinander folgen." }); return; }
    if (e <= s) e += 1440; // Schicht über Mitternacht
    const dauer = e - s;
    const msgs: Msg[] = [];
    if (e > 1440) msgs.push({ level: "ok", text: "Schicht geht über Mitternacht, wir rechnen sie dem Beginntag zu." });

    // Pausen normalisieren und prüfen
    const ps: { a: number; b: number }[] = [];
    let pFehler = "";
    for (const p of t.pausen) {
      if (!p.von && !p.bis) continue;
      let a = toMin(p.von), b = toMin(p.bis);
      if (a === null || b === null) { pFehler = "Bitte jede Pause mit Beginn und Ende angeben."; continue; }
      if (a < s) a += 1440;
      if (b <= a) b += 1440;
      if (a < s || b > e) { pFehler = "Eine Pause liegt außerhalb der Arbeitszeit."; continue; }
      ps.push({ a, b });
    }
    ps.sort((x, y) => x.a - y.a);
    for (let k = 1; k < ps.length; k++) if (ps[k].a < ps[k - 1].b) pFehler = "Zwei Pausen überschneiden sich.";
    if (pFehler) { ergebnisse.push({ ...base, leer: true, fehler: pFehler }); prevIdx = idx; return; }

    const gueltig = ps.filter((p) => p.b - p.a >= STAND_2026.minAbschnitt);
    const kurz = ps.filter((p) => p.b - p.a < STAND_2026.minAbschnitt);
    const pause = gueltig.reduce((a, p) => a + (p.b - p.a), 0);
    const arbeit = dauer - pause;
    const soll = arbeit > R.pause2.ab ? R.pause2.min : arbeit > R.pause1.ab ? R.pause1.min : 0;

    // längster Block ohne gültige Pause
    let block = 0, cur = s;
    for (const p of gueltig) { block = Math.max(block, p.a - cur); cur = p.b; }
    block = Math.max(block, e - cur);

    if (o.jugend) {
      const falsch = gueltig.filter((p) => p.a - s < 60 || e - p.b < 60);
      if (falsch.length) msgs.push({ level: "late", text: `${falsch.length === 1 ? "Eine Pause liegt" : `${falsch.length} Pausen liegen`} in der ersten oder letzten Stunde der Arbeitszeit. Bei Jugendlichen müssen Pausen frühestens 1 Stunde nach Beginn und spätestens 1 Stunde vor Ende liegen (§ 11 Abs. 2 JArbSchG).` });
    }
    if (kurz.length) msgs.push({ level: "due", text: `${kurz.length === 1 ? "Eine Pause ist" : `${kurz.length} Pausen sind`} kürzer als 15 Minuten. Das ist keine Ruhepause im Sinne des Gesetzes und zählt arbeitszeitrechtlich als Arbeitszeit.` });
    if (pause < soll) msgs.push({ level: "late", text: `Pause zu kurz: ${pause} Minuten, nötig sind mindestens ${soll} Minuten bei ${hm(arbeit)} Arbeit (${o.jugend ? "§ 11 JArbSchG" : "§ 4 ArbZG"}).` });
    if (block > R.block) msgs.push({ level: "late", text: `${hm(block)} am Stück ohne Pause. Erlaubt sind höchstens ${o.jugend ? "4,5" : "6"} Stunden.` });
    if (o.jugend) {
      if (arbeit > R.max) msgs.push({ level: "late", text: `${hm(arbeit)} Arbeit. Jugendliche dürfen höchstens 8 Stunden arbeiten, 8,5 nur als Ausgleich für kürzere Tage in derselben Woche (§ 8 JArbSchG).` });
      else if (arbeit > R.regel) msgs.push({ level: "due", text: "Über 8 Stunden: nur zulässig, wenn andere Tage derselben Woche kürzer sind (§ 8 Abs. 2a JArbSchG)." });
      if (dauer > STAND_2026.jug.schicht) msgs.push({ level: "late", text: `Schichtzeit ${hm(dauer)} inklusive Pausen. Für Jugendliche sind höchstens 10 Stunden erlaubt, in Gastronomie, Landwirtschaft, Tierhaltung und auf Bau- und Montagestellen 11 Stunden (§ 12 JArbSchG).` });
      if (s < STAND_2026.jug.nachtBis || e > STAND_2026.jug.nachtVon) msgs.push({ level: "due", text: "Arbeit vor 6 Uhr oder nach 20 Uhr. Für Jugendliche gilt Nachtruhe (§ 14 JArbSchG). Ausnahmen gibt es ab 16 Jahren für einzelne Branchen, zum Beispiel Gastronomie bis 22 Uhr oder Bäckereien ab 5 Uhr." });
    } else {
      if (arbeit > R.max) msgs.push({ level: "late", text: `${hm(arbeit)} Arbeit. Mehr als 10 Stunden am Tag sind nach § 3 ArbZG nicht erlaubt (Ausnahmen nur per Tarifvertrag oder Bewilligung).` });
      else if (arbeit > R.regel) msgs.push({ level: "due", text: "Über 8 Stunden: zulässig, wenn im Schnitt von 6 Monaten oder 24 Wochen 8 Stunden pro Werktag nicht überschritten werden (§ 3 ArbZG)." });
    }
    if (d && d.getUTCDay() === 0)
      msgs.push({
        level: "due",
        text: o.jugend
          ? "Sonntag: Jugendliche dürfen sonntags nur ausnahmsweise arbeiten, etwa in Gastronomie, Krankenhaus und Pflege oder Landwirtschaft, und bekommen einen Ersatzruhetag in derselben Woche (§ 17 JArbSchG)."
          : "Sonntag: Arbeit nur mit Ausnahme nach § 10 ArbZG (z. B. Gastronomie, Pflege, Notdienste) und mit Ersatzruhetag.",
      });

    // Ruhezeit
    const startAbs = idx * 1440 + s;
    let ruhe: number | null = null;
    if (prevEndAbs !== null) ruhe = startAbs - prevEndAbs;
    else if (i === 0 && vEnd !== null) ruhe = s + 1440 - vEnd;
    if (ruhe !== null) {
      const min = o.jugend ? STAND_2026.jug.ruhe : o.ausnahme ? STAND_2026.erw.ruheAusnahme : STAND_2026.erw.ruhe;
      if (ruhe < 0) msgs.push({ level: "late", text: "Diese Schicht beginnt, bevor die vorige endet." });
      else if (ruhe < min) msgs.push({ level: "late", text: `Ruhezeit nur ${hm(ruhe)} seit der letzten Schicht. Nötig sind ${o.jugend ? "12 Stunden (§ 13 JArbSchG)" : o.ausnahme ? "10 Stunden in deiner Branche, mit Ausgleich (§ 5 Abs. 2 ArbZG)" : "11 Stunden (§ 5 ArbZG)"}.` });
      else if (!o.jugend && o.ausnahme && ruhe < STAND_2026.erw.ruhe) msgs.push({ level: "due", text: `Ruhezeit ${hm(ruhe)}: in deiner Branche zulässig, wenn du die fehlende Stunde innerhalb eines Monats oder 4 Wochen durch eine Ruhezeit von mindestens 12 Stunden ausgleichst (§ 5 Abs. 2 ArbZG).` });
    }
    prevEndAbs = idx * 1440 + e;
    prevIdx = idx;
    summe += arbeit;
    const wTag = d ? Math.round(d.getTime() / 86_400_000) : null;
    const wKey = wTag !== null ? `k${Math.floor((wTag + 3) / 7)}` : `n${Math.floor(idx / 7)}`;
    const w = wochen.get(wKey) ?? { summe: 0, montag: wTag !== null ? addDays(d!, -((wTag + 3) % 7)) : null };
    w.summe += arbeit;
    wochen.set(wKey, w);
    if (!msgs.some((m) => m.level !== "ok")) msgs.push({ level: "ok", text: "Pausen, Höchstarbeitszeit und Ruhezeit passen." });
    ergebnisse.push({ ...base, arbeit, pause, soll, ruhe, msgs, level: worst(msgs.map((m) => m.level)), s, e, ps });
  });

  const voll = ergebnisse.filter((r) => !r.leer);
  // Tage mit Eingabefehler: im Ergebnis nennen statt still weglassen
  const nichtGeprueft = ergebnisse.filter((r) => r.fehler).map((r) => ({ label: r.label, fehler: r.fehler! }));
  const wocheMax = o.jugend ? STAND_2026.jug.woche : STAND_2026.erw.woche;
  const vollste = [...wochen.values()].sort((a, b) => b.summe - a.summe)[0];
  const inWoche = vollste?.montag ? `in der Woche ab ${fmt(vollste.montag)}` : "in 7 eingetragenen Tagen";
  const wocheMsg: Msg | null =
    voll.length > 1 && vollste && vollste.summe > wocheMax
      ? { level: o.jugend ? "late" : "due", text: o.jugend ? `${hm(vollste.summe)} ${inWoche}. Jugendliche dürfen höchstens 40 Stunden pro Woche arbeiten (§ 8 Abs. 1 JArbSchG).` : `${hm(vollste.summe)} ${inWoche}. Im Durchschnitt sind höchstens 48 Stunden pro Woche erlaubt (6 Werktage zu 8 Stunden).` }
      : null;
  const gesamt = worst([...voll.map((r) => r.level), ...(wocheMsg ? [wocheMsg.level] : [])]);
  return { ergebnisse, voll, nichtGeprueft, summe, wocheMsg, gesamt };
}
