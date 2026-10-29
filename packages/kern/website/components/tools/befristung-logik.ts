/** Reine Logik des Befristungs-Rechners (§ 14 TzBfG, § 41 Abs. 2 SGB VI). */
import type { Level } from "./ui";
import { plural } from "./format";
import { addDays, diffDays, fmt, parseYmd, periodEnd, ymd } from "./datum";

export type Vorbesch = "nein" | "arbeit" | "azubi" | "praktikum" | "leih";
export type Schrift = "ja" | "nein" | "unklar";
export type Verl = { id: number; am: string; bis: string; geaendert: boolean };

export type BefristInput = {
  beginn: string;
  ende1: string;
  verl: Verl[];
  vorbesch: Vorbesch;
  vorbeschEnde: string;
  gruendung: string;
  ab52: boolean;
  /** Regelaltersgrenze bei Vertragsbeginn erreicht (§ 41 Abs. 2 SGB VI, seit 01.01.2026) */
  rente: boolean;
  schrift: Schrift;
  heute: Date;
};

type Msg = { level: Level; title: string; text?: string };
type Segment = { von: Date; bis: Date; label: string };

export function pruefeBefristung(i: BefristInput) {
  const errors: Record<string, string> = {};
  const beginn = parseYmd(i.beginn);
  const ende1 = parseYmd(i.ende1);
  if (!i.beginn) return { leer: true as const };
  if (!beginn) errors.beginn = "Bitte ein gültiges Datum eingeben.";
  if (i.ende1 && !ende1) errors.ende1 = "Bitte ein gültiges Datum eingeben.";
  if (beginn && ende1 && ende1 <= beginn) errors.ende1 = "Das Ende muss nach dem Beginn liegen.";
  if (!beginn) return { leer: false as const, errors, vErr: {} as Record<number, string> };

  // Grundlage wählen: Regelfall, Neugründung (Abs. 2a), ab 52 (Abs. 3)
  const gr = parseYmd(i.gruendung);
  if (i.gruendung && !gr) errors.gruendung = "Bitte ein gültiges Datum eingeben.";
  if (gr && gr > beginn) errors.gruendung = "Die Gründung muss vor dem Vertragsbeginn liegen.";
  const neugr = !!gr && gr <= beginn && beginn <= periodEnd(gr, 48);
  type Basis = { key: "regel" | "2a" | "3"; jahre: number; maxVerl: number | null; norm: string; name: string };
  const basen: Basis[] = [{ key: "regel", jahre: 2, maxVerl: 3, norm: "§ 14 Abs. 2 TzBfG", name: "Regelfall" }];
  if (neugr) basen.push({ key: "2a", jahre: 4, maxVerl: null, norm: "§ 14 Abs. 2a TzBfG", name: "Neugründung" });
  if (i.ab52) basen.push({ key: "3", jahre: 5, maxVerl: null, norm: "§ 14 Abs. 3 TzBfG", name: "ab 52 Jahren" });
  const basis = basen[basen.length - 1];
  const maxEnde = periodEnd(beginn, basis.jahre * 12);

  const msgs: Msg[] = [];
  const segs: Segment[] = [];

  // Vorbeschäftigung
  const vb = parseYmd(i.vorbeschEnde);
  if (i.vorbesch === "arbeit") {
    const vor = vb && vb < beginn ? ymd(vb, beginn) : null;
    const abstand = vor ? ` Das letzte Arbeitsverhältnis endete vor ${vor.y > 0 ? plural(vor.y, "Jahr", "Jahren") : plural(vor.m, "Monat", "Monaten")}.` : "";
    if (i.rente) {
      msgs.push({ level: "ok", title: "Vorbeschäftigung: ab der Regelaltersgrenze erlaubt", text: `Seit 01.01.2026 gilt das Vorbeschäftigungsverbot nicht für Beschäftigte, die die Regelaltersgrenze erreicht haben (§ 41 Abs. 2 SGB VI). Eine vorgezogene Altersrente reicht nicht. Jeder Vertrag hält die Grenzen ohne Sachgrund ein, also 2 Jahre und 3 Verlängerungen. Alle befristeten Verträge nach dieser Regel bei dir dürfen zusammen höchstens 8 Jahre dauern und es dürfen höchstens 12 sein.${abstand}` });
    } else if (basis.key === "3") {
      msgs.push({ level: "due", title: "Vorbeschäftigung: genau prüfen", text: `Bei der Befristung ab 52 Jahren steht das Vorbeschäftigungsverbot nicht im Gesetz. Reihst du aber Verträge mit derselben Person aneinander, kann das missbräuchlich sein.${abstand}` });
    } else {
      msgs.push({ level: "late", title: "Vorbeschäftigung: sachgrundlose Befristung in der Regel unzulässig", text: `Wer schon einmal bei dir angestellt war, egal ob befristet, unbefristet, Minijob oder Werkstudent, darf nach § 14 Abs. 2 Satz 2 TzBfG nicht erneut ohne Sachgrund befristet werden. Die frühere 3-Jahres-Regel gilt seit dem Beschluss des Bundesverfassungsgerichts vom 06.06.2018 nicht mehr. Ausnahmen gibt es nur, wenn die Vorbeschäftigung sehr lange zurückliegt, ganz anders geartet war oder sehr kurz war. Das ist immer ein Einzelfall. Hat die Person bei Vertragsbeginn die Regelaltersgrenze erreicht, gilt das Verbot seit 01.01.2026 nicht (§ 41 Abs. 2 SGB VI).${abstand}` });
    }
  } else if (i.vorbesch === "azubi") {
    msgs.push({ level: "ok", title: "Ausbildung zählt nicht als Vorbeschäftigung", text: "Nach der Rechtsprechung des Bundesarbeitsgerichts ist ein Ausbildungsverhältnis kein Arbeitsverhältnis im Sinne des Vorbeschäftigungsverbots. Eine sachgrundlose Befristung nach der Ausbildung ist möglich." });
  } else if (i.vorbesch === "praktikum") {
    msgs.push({ level: "due", title: "Praktikum: kommt auf den Vertrag an", text: "Ein echtes Praktikum (Pflichtpraktikum im Studium, Lernzweck im Vordergrund) ist kein Arbeitsverhältnis. Hat die Person als Praktikant normal mitgearbeitet und Mindestlohn bekommen, kann es eines gewesen sein. Dann gilt das Vorbeschäftigungsverbot." });
  } else if (i.vorbesch === "leih") {
    msgs.push({ level: "due", title: "Leiharbeit: kein Arbeitsverhältnis mit dir", text: "Als Leiharbeitskraft war die Person bei der Verleihfirma angestellt, nicht bei dir. Das sperrt die sachgrundlose Befristung grundsätzlich nicht. Wird die Kombination gezielt genutzt, um die Höchstdauer zu umgehen, kann das rechtsmissbräuchlich sein." });
  } else {
    msgs.push({ level: "ok", title: "Keine Vorbeschäftigung angegeben", text: "Die Person war nach deiner Angabe noch nie bei dir (demselben Arbeitgeber, also derselben GmbH oder demselben Einzelunternehmen) angestellt." });
  }

  // Schriftform
  if (i.schrift === "nein") msgs.push({ level: "late", title: "Schriftform fehlt: Befristung unwirksam", text: "Die Befristung muss vor Arbeitsantritt auf Papier von beiden Seiten eigenhändig unterschrieben sein (§ 14 Abs. 4 TzBfG). E-Mail, Scan oder die einfache Signatur gängiger Signaturplattformen reichen nicht, nur eine qualifizierte elektronische Signatur beider Seiten. Fehlt das, gilt der Vertrag als unbefristet (§ 16 TzBfG). Eine Unterschrift nach Arbeitsbeginn heilt das nicht." });
  else if (i.schrift === "unklar") msgs.push({ level: "due", title: "Schriftform prüfen", text: "Prüf, ob beide Unterschriften auf Papier vor dem ersten Arbeitstag geleistet wurden. Das ist der häufigste Grund, warum Befristungen vor Gericht kippen." });

  // Erster Vertrag
  if (ende1 && !errors.ende1) {
    segs.push({ von: beginn, bis: ende1, label: "Erster Vertrag" });
    if (ende1 > maxEnde) msgs.push({ level: "late", title: "Erster Vertrag länger als erlaubt", text: `Ohne Sachgrund ist nach ${basis.norm} höchstens bis ${fmt(maxEnde)} möglich.` });
  }

  // Verlängerungen. Gezählt werden nur ausgefüllte Zeilen, eine leere Zeile dazwischen verschiebt die Nummer nicht.
  const nr = nummern(i.verl);
  let prev = ende1 && !errors.ende1 ? ende1 : null;
  const vErr: Record<number, string> = {};
  i.verl.forEach((v) => {
    const am = parseYmd(v.am);
    const bis = parseYmd(v.bis);
    if (!v.am && !v.bis) return;
    const n = nr[v.id];
    if (!am || !bis) { vErr[v.id] = "Bitte beide Daten eingeben."; return; }
    if (!prev) { vErr[v.id] = "Bitte zuerst das Ende des ersten Vertrags eingeben."; return; }
    if (am < beginn) { vErr[v.id] = "Die Vereinbarung kann nicht vor dem Vertragsbeginn liegen."; return; }
    if (bis <= prev) { vErr[v.id] = `Das neue Ende muss nach dem bisherigen Ende (${fmt(prev)}) liegen.`; return; }
    segs.push({ von: addDays(prev, 1), bis, label: `Verlängerung ${n}` });
    if (am > prev) msgs.push({ level: "late", title: `Verlängerung ${n} erst nach Ablauf vereinbart`, text: `Der Vertrag lief am ${fmt(prev)} aus, die Verlängerung wurde am ${fmt(am)} vereinbart. Das ist rechtlich ein neuer Vertrag mit Vorbeschäftigung, eine sachgrundlose Befristung ist dann nicht mehr möglich. Hat die Person dazwischen weitergearbeitet, gilt der Vertrag als unbefristet (§ 15 Abs. 6 TzBfG).` });
    if (v.geaendert) msgs.push({ level: "late", title: `Verlängerung ${n} mit geänderten Bedingungen`, text: "Eine Verlängerung darf nur das Enddatum verschieben. Ändern sich gleichzeitig Gehalt, Stunden oder Aufgaben, sieht das Bundesarbeitsgericht darin einen neuen Vertrag, und die sachgrundlose Befristung ist unwirksam. Änderungen deshalb getrennt vereinbaren, vorher oder nachher." });
    if (basis.maxVerl !== null && n > basis.maxVerl) msgs.push({ level: "late", title: `Verlängerung ${n}: mehr als ${basis.maxVerl} Verlängerungen`, text: `Im Regelfall sind höchstens drei Verlängerungen innerhalb von zwei Jahren erlaubt. Mit der ${n}. Verlängerung ist die Befristung unwirksam.` });
    if (bis > maxEnde) msgs.push({ level: "late", title: `Verlängerung ${n} überschreitet die Höchstdauer`, text: `Das Ende ${fmt(bis)} liegt nach dem spätesten zulässigen Ende ${fmt(maxEnde)}.` });
    prev = bis;
  });

  const aktEnde = prev;
  const nVerl = i.verl.filter((v) => !vErr[v.id] && v.am && v.bis).length;
  const verlUebrig = basis.maxVerl === null ? null : Math.max(0, basis.maxVerl - nVerl);
  const heute = i.heute;

  if (aktEnde && aktEnde < heute) msgs.push({ level: "due", title: "Das vereinbarte Ende liegt in der Vergangenheit", text: `Arbeitet die Person nach dem ${fmt(aktEnde)} mit deinem Wissen weiter und widersprichst du nicht sofort, gilt das Arbeitsverhältnis als auf unbestimmte Zeit verlängert (§ 15 Abs. 6 TzBfG).` });

  if (basis.key === "2a") msgs.push({ level: "ok", title: "Neugründung: bis zu 4 Jahre", text: `Dein Unternehmen ist bei Vertragsbeginn jünger als 4 Jahre. Bis zur Gesamtdauer von 4 Jahren sind beliebig viele Verlängerungen erlaubt. Das gilt nicht, wenn die Gründung aus einer Umstrukturierung bestehender Unternehmen oder Konzerne entstanden ist.` });
  if (basis.key === "3") msgs.push({ level: "due", title: "Befristung ab 52: Voraussetzungen belegen", text: "Bis zu 5 Jahre sind nur möglich, wenn die Person bei Beginn mindestens 52 Jahre alt war und unmittelbar davor mindestens 4 Monate beschäftigungslos war, Transferkurzarbeitergeld bezogen oder an einer öffentlich geförderten Beschäftigungsmaßnahme teilgenommen hat. Lass dir das schriftlich bestätigen." });
  if (gr && !neugr && !errors.gruendung) msgs.push({ level: "ok", title: "Keine Neugründung im Sinne des Gesetzes", text: "Der Vertrag beginnt mehr als 4 Jahre nach der Gründung. Es gilt der Regelfall." });

  const levels = msgs.map((m) => m.level);
  const ampel: Level = levels.includes("late") ? "late" : levels.includes("due") ? "due" : "ok";
  msgs.sort((a, b) => ({ late: 0, due: 1, ok: 2 })[a.level] - ({ late: 0, due: 1, ok: 2 })[b.level]);

  return { leer: false as const, errors, vErr, basis, basen, maxEnde, aktEnde, nVerl, verlUebrig, msgs, ampel, segs, beginn, heute };
}

/** Nummer jeder ausgefüllten Verlängerung (1, 2, 3 ...), leere Zeilen bekommen keine. */
export function nummern(verl: Verl[]) {
  const out: Record<number, number> = {};
  let n = 0;
  for (const v of verl) if (v.am || v.bis) out[v.id] = ++n;
  return out;
}

/**
 * Spielraum bis zur Höchstdauer, lesbar gemacht (Design-Review 28.10.2026: "1188 Tage" allein sagt wenig).
 * Ab 2 Monaten in ganzen Monaten (abgerundet), darunter in Tagen.
 */
export function spielraumText(aktEnde: Date, maxEnde: Date): { wert: string; unter: string } {
  const tage = Math.max(0, diffDays(aktEnde, maxEnde));
  const monate = Math.floor(tage / 30.44);
  return monate >= 2 ? { wert: `${monate} Monate`, unter: `${tage.toLocaleString("de-DE")} Tage, bis ${fmt(maxEnde)}` } : { wert: plural(tage, "Tag", "Tage"), unter: `bis ${fmt(maxEnde)}` };
}
