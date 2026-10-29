/**
 * Prüft freien Text, bevor er an die KI geht: Namen und Gesundheitsangaben (Art. 9 DSGVO) gehören nicht hinein.
 * Gewarnt wird bei Herr/Frau mit Namen und bei Diagnosen oder Krankheiten. Dauer einer Arbeitsunfähigkeit, Branchen
 * und Berufe (Krankenhaus, Physiotherapeut) sind erlaubt, ebenso der übliche Satz in Stellenanzeigen „Schwerbehinderte
 * Menschen werden bevorzugt“. Gilt in allen 5 KI-Tools.
 */
const NAME = /\b(Herr|Frau|Hr\.|Fr\.)\s+[A-ZÄÖÜ][a-zäöüß]+/;
const GESUNDHEIT =
  /\b(diagnos|depressi|diabet|krebs|tumor|chemo|burn-?out|medikament|therapie|schwanger|schwerbehindert(?!\w*\s+(?:menschen|bewerb))|psychisch|alkohol(krank|iker|sucht|problem)|angststörung|panikattack|adhs|autis|migräne|bandscheib|herzinfarkt|schlaganfall|epilep|demenz|hiv\b)|(?<!mit )\bbehinderung/i;

export function sensibel(text: string): { name: boolean; gesundheit: boolean } {
  return { name: NAME.test(text), gesundheit: GESUNDHEIT.test(text) };
}

/** Hinweistext für das Formular, null wenn nichts auffällt. Solange er steht, geht nichts an die KI. */
export function sensiblerHinweis(text: string): string | null {
  const s = sensibel(text);
  if (!s.name && !s.gesundheit) return null;
  return "In deinem Text stehen offenbar ein Name oder Gesundheitsangaben. Ersetz sie durch eine Rolle wie „ein Kollege“ und lass Diagnosen weg.";
}

/** Nur Namen: für Texte ohne Person (Stellenanzeige) und als Sperre im Zeugnis. Berufswörter wie „Medikamentengabe“ in Pflegeberufen sind dort Aufgaben, keine Gesundheitsdaten. */
export function namensHinweis(text: string): string | null {
  return NAME.test(text) ? "In deinem Text steht offenbar ein Name. Ersetz ihn durch eine Rolle wie „eine Kollegin“." : null;
}

/** Genug Stoff für die KI: mindestens 2 Zeilen oder 60 Zeichen. */
export function genugText(text: string): boolean {
  return text.split("\n").filter((z) => z.trim()).length >= 2 || text.trim().length >= 60;
}
