/** Reine Logik des Abfindungsrechners (Regelabfindung nach § 1a KSchG, Höchstbetrag nach § 10 KSchG). */
import type { Level } from "./ui";
import { eurRund, parseNum } from "./format";
import { addDays, parseYmd, ymd } from "./datum";

export const STAND_2026 = {
  regelFaktor: 0.5, // § 1a Abs. 2 KSchG
  spanne: [0.25, 0.5, 0.75, 1.0, 1.5, 2.0],
  faktorMin: 0.25,
  faktorMax: 2.0,
  wartezeitMonate: 6, // § 1 Abs. 1 KSchG
  kleinbetrieb: 10, // § 23 Abs. 1 KSchG
  // § 10 KSchG: Höchstbetrag bei gerichtlicher Auflösung
  kappung: [
    { alter: 55, jahre: 20, monate: 18 },
    { alter: 50, jahre: 15, monate: 15 },
    { alter: 0, jahre: 0, monate: 12 },
  ],
};

export function berechneAbfindung(o: { gehalt: string; sonder: string; eintritt: string; austritt: string; zugang?: string; faktor: number; alter: string; klein: boolean }) {
  const errors: Record<string, string> = {};
  const g = parseNum(o.gehalt) ?? NaN;
  const so = o.sonder ? parseNum(o.sonder) ?? NaN : 0;
  const ein = parseYmd(o.eintritt);
  const aus = parseYmd(o.austritt);
  const zug = parseYmd(o.zugang);
  const alter = o.alter ? Number(o.alter) : null;
  if (!o.gehalt && !o.eintritt && !o.austritt) return null;
  if (!o.gehalt || !Number.isFinite(g) || g <= 0) errors.gehalt = "Bitte ein Bruttogehalt größer 0 eingeben.";
  else if (g > 100000) errors.gehalt = "Bitte das Monatsgehalt eingeben, nicht das Jahresgehalt.";
  if (o.sonder && (!Number.isFinite(so) || so < 0)) errors.sonder = "Bitte einen Betrag eingeben oder das Feld leer lassen.";
  if (!ein) errors.eintritt = "Bitte ein gültiges Datum eingeben.";
  if (!aus) errors.austritt = "Bitte ein gültiges Datum eingeben.";
  if (ein && aus && aus < ein) errors.austritt = "Das Ende muss nach dem Eintritt liegen.";
  if (o.zugang && !zug) errors.zugang = "Bitte ein gültiges Datum eingeben.";
  else if (zug && ein && zug < ein) errors.zugang = "Der Zugang muss nach dem Eintritt liegen.";
  else if (zug && aus && zug > aus) errors.zugang = "Der Zugang muss vor dem Ende liegen.";
  if (alter !== null && (!Number.isInteger(alter) || alter < 14 || alter > 80)) errors.alter = "Bitte ein Alter zwischen 14 und 80 eingeben.";
  if (Object.keys(errors).length || !ein || !aus) return { errors };

  const monat = g + (so || 0) / 12;
  const dauer = ymd(ein, addDays(aus, 1));
  const rest = dauer.m > 6 || (dauer.m === 6 && dauer.d > 0);
  const jahre = dauer.y + (rest ? 1 : 0);
  // § 1 Abs. 1 KSchG: Die Wartezeit von 6 Monaten muss beim Zugang der Kündigung erfüllt sein, nicht beim Ende
  const bisZugang = ymd(ein, addDays(zug ?? aus, 1));
  // "länger als sechs Monate": genau 6 Monate reichen noch nicht
  const unterWartezeit = bisZugang.y === 0 && (bisZugang.m < 6 || (bisZugang.m === 6 && bisZugang.d === 0));
  const betrag = monat * o.faktor * jahre;
  const spanne = STAND_2026.spanne.map((f) => ({ f, wert: monat * f * jahre }));
  const kStufe = STAND_2026.kappung.find((k) => (alter ?? 0) >= k.alter && dauer.y >= k.jahre)!;
  const kappung = monat * kStufe.monate;

  const msgs: { level: Level; title: string; text: string }[] = [];
  if (unterWartezeit) msgs.push({ level: "due", title: zug ? "Bei Zugang der Kündigung weniger als 6 Monate beschäftigt" : "Weniger als 6 Monate beschäftigt", text: `Das Kündigungsschutzgesetz greift erst, wenn das Arbeitsverhältnis beim Zugang der Kündigung länger als 6 Monate besteht. Die Person kann eine Kündigung dann kaum angreifen. ${jahre === 0 ? "" : "Gezahlt wird, wenn überhaupt, ein frei verhandelter Betrag."}`.trim() });
  if (o.klein) msgs.push({ level: "due", title: "Kleinbetrieb", text: `Mit regelmäßig ${STAND_2026.kleinbetrieb} oder weniger Vollzeitkräften gilt das Kündigungsschutzgesetz nicht (§ 23 KSchG, Teilzeit zählt anteilig). Das Risiko für dich sinkt, der übliche Faktor auch. Ausnahmen: Sonderkündigungsschutz und Altfälle, wenn noch mehr als 5 Beschäftigte da sind, die schon vor 2004 angefangen haben (§ 23 Abs. 1 Satz 2 KSchG).` });
  // Ohne Alter ist die Grenze erst ab 15 Jahren Zugehörigkeit unsicher (§ 10 Abs. 2 KSchG)
  const alterOffen = alter === null && dauer.y >= 15;
  if (alterOffen) msgs.push({ level: "due", title: "Höchstbetrag ohne Alter", text: "Alter fehlt, wir rechnen mit der Grenze für unter 50 Jahre (12 Monatsverdienste). Ab 50 Jahren kann sie bei 15, ab 55 Jahren bei 18 Monatsverdiensten liegen." });
  else if (betrag > kappung) msgs.push({ level: "due", title: "Über dem gesetzlichen Höchstbetrag", text: `Bei gerichtlicher Auflösung nach §§ 9, 10 KSchG wären höchstens ${kStufe.monate} Monatsverdienste möglich, hier ${eurRund(kappung)}. Im Vergleich darf mehr vereinbart werden, ist aber selten nötig.` });
  // Plausibilität (C9): weicher Hinweis, keine Sperre
  if (dauer.y >= 50) msgs.push({ level: "due", title: "Stimmt der Eintritt?", text: `Die Zugehörigkeit liegt bei ${dauer.y} Jahren. Prüf das Eintrittsdatum.` });
  if (g < 500) msgs.push({ level: "due", title: "Stimmt das Gehalt?", text: `${eurRund(g)} im Monat ist sehr wenig. Gemeint ist das Bruttomonatsgehalt, nicht ein Stundenlohn.` });

  return { errors, monat, dauer, jahre, rest, betrag, spanne, kappung, kStufe, alterOffen, msgs, ein, aus };
}

/** Grundsatz, kein Prüfergebnis: deshalb als neutraler Hinweis, nicht mit grünem Haken (Farbregel UX-Review 28.10.2026). */
export const KEIN_ANSPRUCH = "Einen Anspruch auf Abfindung gibt es nur bei einem Angebot nach § 1a KSchG, aus Sozialplan oder Tarifvertrag, oder wenn das Gericht das Arbeitsverhältnis auflöst. Alles andere ist Verhandlung.";
