/** Reine Logik des Probezeit-Rechners (§ 622 Abs. 3 BGB, § 1 KSchG, §§ 20, 22 BBiG). */
import { addDays, diffDays, fmt, parseYmd, periodEnd } from "./datum";

export type Einheit = "monate" | "wochen";
export type Groesse = "gross" | "klein" | "unklar";

export type ProbezeitInput = { beginn: string; einheit: Einheit; dauer: number; befristet: boolean; befristetBis: string; groesse: Groesse; azubi: boolean };

/** Reine Berechnung, ohne UI. Liefert Fehler oder Ergebnis. */
export function berechneProbezeit(i: ProbezeitInput) {
  const beginn = parseYmd(i.beginn);
  if (!beginn) return { fehler: { beginn: "Gib das Datum des ersten Arbeitstags ein." } } as const;
  if (!Number.isFinite(i.dauer) || i.dauer <= 0 || !Number.isInteger(i.dauer)) {
    const bereich = i.einheit === "monate" ? `1 bis ${i.azubi ? 4 : 6} Monate` : `1 bis ${i.azubi ? 17 : 26} Wochen`;
    return { fehler: { dauer: `Gib die Probezeit als ganze Zahl ein, ${bereich}.` } } as const;
  }
  const ende = i.einheit === "monate" ? periodEnd(beginn, i.dauer) : addDays(beginn, i.dauer * 7 - 1);
  if (i.azubi) {
    // § 20 BBiG: Probezeit mindestens 1, höchstens 4 Monate
    const min = periodEnd(beginn, 1);
    const max = periodEnd(beginn, 4);
    if (ende < min || ende > max)
      return { fehler: { dauer: `In der Ausbildung dauert die Probezeit mindestens 1 Monat und höchstens 4 Monate (§ 20 BBiG). Bei diesem Beginn endet sie zwischen ${fmt(min)} und ${fmt(max)}.` } } as const;
  } else {
    const max = periodEnd(beginn, 6);
    if (ende > max)
      return {
        fehler: {
          dauer: `Die Probezeit mit verkürzter Kündigungsfrist darf höchstens 6 Monate dauern (§ 622 Abs. 3 BGB). Bei diesem Beginn endet sie spätestens am ${fmt(max)}.`,
        },
      } as const;
  }
  // Ausbildung ist von Natur aus befristet, die Prüfung nach § 15 Abs. 3 TzBfG passt dort nicht
  const befristet = i.befristet && !i.azubi;
  let befristetBis: Date | null = null;
  if (befristet) {
    befristetBis = parseYmd(i.befristetBis);
    if (!befristetBis) return { fehler: { befristetBis: "Gib das Enddatum der Befristung ein." } } as const;
    if (befristetBis <= beginn) return { fehler: { befristetBis: "Das Ende der Befristung muss nach dem Arbeitsbeginn liegen." } } as const;
    if (ende > befristetBis) return { fehler: { dauer: `Die Probezeit endet nach dem Vertragsende. Der Vertrag endet am ${fmt(befristetBis)}, die Probezeit erst am ${fmt(ende)}.` } } as const;
  }
  // § 22 Abs. 1 BBiG: In der Probezeit kündigen beide Seiten ohne Frist
  const kuendEnde = i.azubi ? ende : addDays(ende, 14);
  const wartezeitEnde = periodEnd(beginn, 6);
  const kschgAb = addDays(wartezeitEnde, 1);
  // Termine nie vor den ersten Arbeitstag: bei kurzer Probezeit entfällt erst das Gespräch, dann auch die Entscheidung
  const vorBeginnNull = (d: Date) => (d < beginn ? null : d);
  const gespraech = vorBeginnNull(addDays(ende, -28));
  const entscheidung = vorBeginnNull(addDays(ende, -14));
  // Zugang am Wochenende ist riskant: letzter Werktag davor (Mo bis Fr) als Empfehlung
  let zugangEmpf = ende;
  while (zugangEmpf.getUTCDay() === 0 || zugangEmpf.getUTCDay() === 6) zugangEmpf = addDays(zugangEmpf, -1);
  if (zugangEmpf < beginn) zugangEmpf = ende;
  const probeTage = diffDays(beginn, ende) + 1;
  const laufTage = befristetBis ? diffDays(beginn, befristetBis) + 1 : null;
  return {
    ergebnis: {
      beginn, ende, kuendEnde, wartezeitEnde, kschgAb, gespraech, entscheidung, zugangEmpf, probeTage, laufTage, befristetBis,
      anteil: laufTage ? probeTage / laufTage : null,
      // Nach der Probezeit gilt für Azubis § 22 Abs. 2 BBiG, keine Lücke mit 4-Wochen-Frist
      luecke: !i.azubi && diffDays(ende, wartezeitEnde) > 0,
    },
  } as const;
}
