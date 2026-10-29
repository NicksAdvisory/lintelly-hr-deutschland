/** Reine Logik des Mutterschutz-Rechners (§§ 3, 17 MuSchG). */
import { addDays, addMonths, diffDays, parseYmd } from "./datum";
import { plural } from "./format";

/** Rechtsstand: MuSchG in der Fassung ab 01.06.2025 (Mutterschutzanpassungsgesetz). */
export const STAND_2026 = {
  vorTage: 42, // 6 Wochen vor dem errechneten Termin (§ 3 Abs. 1)
  nachTage: 56, // 8 Wochen nach der Entbindung (§ 3 Abs. 2)
  nachTageLang: 84, // 12 Wochen bei Früh-, Mehrlingsgeburt, Behinderung auf Antrag
  kuendigungMonate: 4, // § 17 Abs. 1
  fehlgeburt: [
    { ab: 20, tage: 56, label: "8 Wochen" },
    { ab: 17, tage: 42, label: "6 Wochen" },
    { ab: 13, tage: 14, label: "2 Wochen" },
  ],
};

/**
 * Tage der Schutzfrist nach der Entbindung: 8 oder 12 Wochen. Kommt das Kind vor dem errechneten Termin, verlängert sie
 * sich um die Tage, die vor der Geburt gefehlt haben, höchstens 42 (§ 3 Abs. 2 Satz 3 MuSchG).
 * tageVorTermin: errechneter Termin minus Tag der Geburt.
 */
export const nachfristTage = (lang: boolean, tageVorTermin: number) =>
  (lang ? STAND_2026.nachTageLang : STAND_2026.nachTage) + Math.min(Math.max(0, tageVorTermin), STAND_2026.vorTage);

/** Ab der 24. Woche oder ab 500 Gramm ist es eine Totgeburt und damit eine Entbindung, sonst gilt die Staffel für Fehlgeburten. */
export function berechneFehlgeburt(o: { datum: string; ssw: string; ab500: boolean; et?: string }) {
  const errors: Record<string, string> = {};
  const d = parseYmd(o.datum);
  const ssw = Number(o.ssw);
  if (!o.datum && !o.ssw) return null;
  if (!d) errors.datum = "Bitte ein gültiges Datum eingeben.";
  if (!o.ssw || !Number.isInteger(ssw) || ssw < 1 || ssw > 45) errors.ssw = "Bitte eine Woche zwischen 1 und 45 eingeben.";
  const et = parseYmd(o.et);
  if (o.et && !et) errors.et = "Bitte ein gültiges Datum eingeben.";
  if (Object.keys(errors).length || !d) return { errors };
  if (ssw >= 24 || o.ab500) {
    // Totgeburt: 8 Wochen, keine 12 Wochen (§ 3 Abs. 2 Satz 5), aber verlängert um die verkürzte Frist vor der Geburt
    const verkuerzt = et ? Math.min(Math.max(0, diffDays(d, et)), STAND_2026.vorTage) : 0;
    const ende = addDays(d, nachfristTage(false, verkuerzt));
    const k4 = addMonths(d, STAND_2026.kuendigungMonate);
    return { errors, d, ssw, ende, kEnde: k4 > ende ? k4 : ende, verkuerzt, mindestens: !et, totgeburt: true as const };
  }
  const stufe = STAND_2026.fehlgeburt.find((s) => ssw >= s.ab) ?? null;
  const ende = stufe ? addDays(d, stufe.tage) : null;
  const kEnde = ssw >= 13 ? addMonths(d, STAND_2026.kuendigungMonate) : null;
  return { errors, d, ssw, stufe, ende, kEnde, totgeburt: false as const };
}

export type Phase = { key: string; label: string; von: Date; bis: Date; tone: "ink" | "beam" | "lead" };

export function berechneGeburt(o: { et: string; geb: string; frueh: boolean; mehr: boolean; beh: boolean }) {
  const errors: Record<string, string> = {};
  const et = parseYmd(o.et);
  const geb = parseYmd(o.geb);
  if (!o.et) return null;
  if (!et) return { errors: { et: "Bitte ein gültiges Datum eingeben." } };
  if (o.geb && !geb) errors.geb = "Bitte ein gültiges Datum eingeben.";
  if (geb && (diffDays(geb, et) > 140 || diffDays(et, geb) > 42)) errors.geb = "Das Geburtsdatum liegt sehr weit vom errechneten Termin entfernt. Bitte prüfen.";
  if (Object.keys(errors).length) return { errors };

  const vorBeginn = addDays(et, -STAND_2026.vorTage);
  const lang = o.frueh || o.mehr || o.beh;
  const nach = lang ? STAND_2026.nachTageLang : STAND_2026.nachTage;
  const entb = geb ?? et;
  const verkuerzt = geb && geb < et ? Math.min(diffDays(geb, et), STAND_2026.vorTage) : 0;
  const nachEnde = addDays(entb, nachfristTage(lang, verkuerzt));
  const kEnde4 = addMonths(entb, STAND_2026.kuendigungMonate);
  const kEnde = kEnde4 > nachEnde ? kEnde4 : nachEnde;
  const schwBeginn = addDays(et, -280);
  const vorEnde = geb && geb < vorBeginn ? null : entb;

  const phasen: Phase[] = [];
  if (vorEnde) phasen.push({ key: "vor", label: "Schutzfrist vor der Geburt", von: vorBeginn, bis: vorEnde, tone: "lead" });
  phasen.push({ key: "nach", label: "Schutzfrist nach der Geburt", von: addDays(entb, 1), bis: nachEnde, tone: "ink" });

  const hinweise: string[] = [];
  if (!geb) hinweise.push("Das Ende ist vorläufig. Sobald das Kind da ist, trag das Geburtsdatum ein: Kommt es früher, verlängert sich die Frist danach um die Tage, die vorher gefehlt haben.");
  if (geb && geb > et) hinweise.push(`Das Kind kam ${plural(diffDays(et, geb), "Tag", "Tage")} nach dem errechneten Termin. Die Schutzfrist vor der Geburt verlängert sich bis zur Geburt, die Frist danach bleibt bei ${nach / 7} Wochen.`);
  if (verkuerzt > 0) hinweise.push(`Das Kind kam ${plural(diffDays(geb!, et), "Tag", "Tage")} vor dem errechneten Termin. ${plural(verkuerzt, "Tag", "Tage")} der Schutzfrist vor der Geburt hängen wir nach § 3 Abs. 2 Satz 3 MuSchG hinten an.`);
  if (o.beh) hinweise.push("12 Wochen wegen Behinderung gibt es nur auf Antrag der Mitarbeiterin, wenn die Behinderung innerhalb von 8 Wochen nach der Geburt ärztlich festgestellt wurde.");
  if (o.frueh) hinweise.push("Frühgeburt im Sinne des Gesetzes heißt in der Regel: Geburtsgewicht unter 2.500 Gramm oder ärztlich bescheinigte Unreife. Eine Geburt nur vor dem errechneten Termin ist noch keine Frühgeburt.");

  return { errors, et, geb, vorBeginn, entb, nachEnde, nach, verkuerzt, kEnde, kEnde4, schwBeginn, phasen, hinweise, lang, gesamt: diffDays(vorEnde ? vorBeginn : addDays(entb, 1), nachEnde) + 1 };
}

/**
 * Ausschnitt des Zeitstrahls (Design-Review 28.10.2026): Das Kündigungsverbot beginnt mit der Schwangerschaft, rund 9 Monate
 * vor den Schutzfristen. Die Achse startet deshalb höchstens 4 Wochen vor der ersten Schutzfrist, nie vor dem Verbot.
 */
export function achsenAusschnitt(phasen: Phase[], kVon: Date, kBis: Date): { start: Date; ende: Date; verbotVorStart: boolean } {
  const erste = phasen.reduce((a, p) => (p.von < a ? p.von : a), kBis);
  const frueh = addDays(erste, -28);
  const start = kVon > frueh ? kVon : frueh;
  const ende = phasen.reduce((a, p) => (p.bis > a ? p.bis : a), kBis);
  return { start, ende, verbotVorStart: kVon < start };
}
