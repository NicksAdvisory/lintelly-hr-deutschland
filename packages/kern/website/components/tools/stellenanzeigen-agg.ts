/**
 * Lokaler AGG-Check für Stellenanzeigen (läuft ohne KI beim Tippen und noch einmal über die fertige Anzeige).
 * Merkmale nach § 1 AGG; Grundlage § 11 AGG (Ausschreibung), § 22 AGG (Indizwirkung). Stand 05.10.2026.
 * Keine Fehlalarme (Review 28.10.2026): „Kein Foto nötig“, „junge Familien“, „Kinder unter 12 Jahren“.
 */
export type Fall = { re: RegExp; merkmal: string; warum: string; besser: string };
export type Fund = { start: number; ende: number; wort: string; merkmal: string; warum: string; besser: string };

export const FALLEN: Fall[] = [
  { re: /\bjung(?:e|en|er|es|em)?\b(?!\s+(?:familie|eltern|mütter|väter)\w*)|\bjugendlich\w*/gi, merkmal: "Alter", warum: "Ein Altersbezug gilt vor Gericht als Indiz für Altersbenachteiligung, auch als Beschreibung des Teams.", besser: "Beschreib die Zusammenarbeit, z. B. „ein Team, das sich gegenseitig einarbeitet“." },
  { re: /\bdynamisch\w*/gi, merkmal: "Alter", warum: "Wird oft als Altersbezug gelesen, besonders mit „Team“ oder „jung“.", besser: "Konkret werden: „kurze Wege, Entscheidungen am selben Tag“." },
  { re: /(?<!\bkind\w*\s+)\b(?:max(?:\.|imal)?|höchstens|bis|unter)\s*\d{2}\s*jahr\w*\b(?!\s*(?:berufs)?erfahrung)/gi, merkmal: "Alter", warum: "Eine Altersgrenze ist eine unmittelbare Benachteiligung wegen des Alters.", besser: "Weglassen. Nenn die Erfahrung, die die Stelle braucht." },
  { re: /\bzwischen\s*\d{2}\s*und\s*\d{2}\s*jahr\w*|\b\d{2}\s*(?:bis|-)\s*\d{2}\s*jahre?\s*alt/gi, merkmal: "Alter", warum: "Eine Altersspanne ist eine unmittelbare Benachteiligung wegen des Alters.", besser: "Weglassen." },
  { re: /\b(?:höchstens|maximal|max\.?|nicht mehr als|bis zu)\s*\d+\s*jahre?n?\s*(?:berufs)?erfahrung/gi, merkmal: "Alter", warum: "Eine Obergrenze für Berufserfahrung trifft ältere Bewerbende und gilt als Indiz für Altersbenachteiligung.", besser: "Mindestens nötige Erfahrung nennen, keine Obergrenze." },
  { re: /\bberufseinsteiger\w*|\bberufsanfänger\w*|\bberufsanfaenger\w*|\bdigital natives?\b|\byoung professionals?\b|\bgeneration\s*z\b|\bfrisch\w*\s+(?:von der|aus dem|aus der)\s+\w+/gi, merkmal: "Alter", warum: "Zielt auf eine Altersgruppe. Als Anforderung ein Indiz für Altersbenachteiligung.", besser: "Offen formulieren: „Auch für Quereinsteigende oder nach der Ausbildung geeignet“." },
  { re: /\bmuttersprach\w*|\bnative\s+speaker\w*|\bakzentfrei\w*/gi, merkmal: "Ethnische Herkunft", warum: "Knüpft an die Herkunft an, nicht an die Sprachfähigkeit.", besser: "„Sehr gute Deutschkenntnisse (C1)“ oder das Niveau, das die Stelle braucht." },
  { re: /\bstaatsangehörig\w*|\bnationalität\w*|\bdeutsche\s+herkunft|\bherkunft\b/gi, merkmal: "Ethnische Herkunft", warum: "Herkunft und Staatsangehörigkeit sind kein zulässiges Kriterium. Eine Arbeitserlaubnis prüfst du erst bei der Einstellung.", besser: "Weglassen." },
  { re: /(?<!\b(?:kein\w*|ohne)\s+)(?:\b(?:bewerbungs)?fotos?\b|\blichtbild\w*|\bbewerbungsbild\w*)(?!\s+(?:ist\s+)?nicht\s+(?:nötig|erforderlich|notwendig))/gi, merkmal: "Alter, Geschlecht, Herkunft", warum: "Ein Foto zeigt Merkmale nach § 1 AGG und kann als Indiz dienen, wenn die Absage folgt.", besser: "Nicht verlangen. „Ein Lebenslauf genügt.“" },
  { re: /\bbelastbar\w*/gi, merkmal: "Behinderung, Alter", warum: "Kann als Indiz gegen ältere Menschen oder Menschen mit Behinderung gewertet werden.", besser: "Die Situation nennen: „Du behältst auch bei vielen Anfragen den Überblick.“" },
  { re: /\bkörperlich\s+(?:fit|gesund|belastbar)\w*|\bkerngesund\w*|\bgesund(?:heitlich)?\b/gi, merkmal: "Behinderung", warum: "Ohne sachlichen Grund ein Indiz für Benachteiligung wegen Behinderung.", besser: "Die konkrete Anforderung nennen, z. B. „Heben bis 20 kg gehört dazu“." },
  { re: /\bgeburtsdatum\b|\baltersangabe\w*|\bfamilienstand\w*|\bledig\b|\bkinderlos\w*|\bschwanger\w*|\breligion\w*|\bkonfession\w*/gi, merkmal: "Alter, Geschlecht, Religion", warum: "Gehört nicht in Anzeige oder Bewerbung und kann als Indiz für Benachteiligung dienen.", besser: "Weglassen." },
  { re: /\b(?:nur\s+)?(?:männlich|weiblich)\w*|\bnur\s+(?:frauen|männer)\b/gi, merkmal: "Geschlecht", warum: "Eine Anzeige muss alle Geschlechter ansprechen (§ 11 AGG).", besser: "Jobtitel mit (m/w/d) und neutrale Beschreibung." },
];

export function findeFallen(text: string): Fund[] {
  const funde: Fund[] = [];
  for (const f of FALLEN) {
    f.re.lastIndex = 0;
    for (const m of text.matchAll(f.re)) {
      const start = m.index ?? 0;
      const ende = start + m[0].length;
      if (funde.some((x) => start < x.ende && ende > x.start)) continue;
      funde.push({ start, ende, wort: m[0].trim(), merkmal: f.merkmal, warum: f.warum, besser: f.besser });
    }
  }
  return funde.sort((a, b) => a.start - b.start);
}

/** Ein Fund je Wort (für Listen), Groß-/Kleinschreibung zusammengefasst. */
export function eindeutig(funde: Fund[]): Fund[] {
  const seen = new Set<string>();
  return funde.filter((f) => {
    const k = f.wort.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
