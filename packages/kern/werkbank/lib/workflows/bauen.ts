import { formatDE } from "@/lib/regeln/datum";
import type { Beschaeftigung, Person } from "@/lib/types";
import type { Anlass, Empfaenger, Handeln, Schritt } from "@/lib/workflows/kern";
import type { Ausloeser, Workflow } from "@/lib/workflows/vorlagen";

/**
 * Baukasten (Nick 24.10.2026: "individualisierbar + selbst baubare workflows"). Mitgelieferte Workflows je Firma anpassen, eigene aus festen
 * Bausteinen bauen: Auslöser aus dem, was die Werkbank schon rechnet, Bedingungen nach Team, Beschäftigungsart und Person, Schritte Aufgabe,
 * Erinnerung, Freigabe und Warten. Keine Skripte, nichts nach außen. Texte sind freier Text mit Platzhaltern, ausgeführt wird daraus nichts.
 * Rein: Prüfen und Umbauen, gespeichert und ausgeführt wird in lib/workflows/lauf.ts.
 */

export type Bedingung = { art: "team" | "beschaeftigung" | "person"; werte: string[]; nicht?: boolean };
export type SchrittDaten = { id: string; art: "warten"; dauer: number } | { id: string; art: "aufgabe" | "mitteilung" | "freigabe"; an: Empfaenger; ab: number; text: string };
export type AusloeserDaten = { art: "befund"; regel: string } | { art: "plan"; aufgabe: string } | { art: "lohn" } | { art: "lesen" };
export type EigenerWorkflow = {
  id: string; name: string; beschreibung: string; an: boolean;
  ausloeser: AusloeserDaten; bedingungen: Bedingung[]; schritte: SchrittDaten[];
  von: string; erstellt: string; geaendert: string;
};
/** Änderungen an einem mitgelieferten Workflow, je Schritt unter `<teil>:<schritt>`. */
export type Anpassung = { schritte?: Record<string, { aus?: boolean; an?: Empfaenger; ab?: number; text?: string }>; bedingungen?: Bedingung[] };

/** Regeln, die ein eigener Workflow auslösen kann. Ohne "gehalt": eine Erinnerung dazu verriete Führungskräften etwas über Gehälter. */
export const REGELN: Record<string, string> = {
  "probezeit-ende": "Probezeit endet", "probezeit-bestanden": "Probezeit bestanden", "feedback-3-monate": "Feedback nach 3 Monaten", // kein-recht: Workflow-Text, die Frist selbst rechnet die Regel
  "befristung-ende": "Befristung endet", "befristung-fortgesetzt": "Befristung abgelaufen, Person arbeitet weiter", start: "Erster Arbeitstag",
  "urlaub-hinweis": "Resturlaub droht zu verfallen", "urlaub-jahreshinweis": "Jahreshinweis Urlaub", "urlaub-lange-nicht": "Lange kein Urlaub", "urlaub-sonderregel": "Urlaub mit Sonderregel",
  "werkstudent-stunden": "Werkstudent über der Stundengrenze", ueberstunden: "Viele Überstunden", mindestlohn: "Lohn unter Mindestlohn",
  "minijob-grenze": "Minijob über der Grenze", "minijob-mindestlohn": "Minijob unter Mindestlohn", "praktikum-mindestlohn": "Praktikum wird mindestlohnpflichtig", "praktikum-ende": "Praktikum endet",
  geburtstag: "Geburtstag", jubilaeum: "Jubiläum", gespraech: "Mitarbeitergespräch fällig",
  "daten-anschrift": "Anschrift fehlt", "daten-nachweis": "Nachweis der Arbeitsbedingungen fehlt", "daten-probezeit": "Probezeit nicht erfasst", "daten-befristung": "Befristung nicht erfasst",
  "daten-mindesturlaub": "Urlaub unter dem Mindesturlaub", "daten-vorbeschaeftigung": "Vorbeschäftigung ungeklärt",
  "au-fehlt": "AU fehlt", bem: "6 Wochen krank (BEM)", "bem-naht": "BEM-Schwelle naht", "efz-ende": "Entgeltfortzahlung endet", "efz-wartezeit": "Entgeltfortzahlung: Wartezeit", // kein-recht: Workflow-Text, die Frist selbst rechnet die Regel
  "mutterschutz-meldung": "Schwangerschaft mitgeteilt", "mutterschutz-gefaehrdung": "Gefährdungsbeurteilung offen", "mutterschutz-arbeitszeit": "Mutterschutz: Arbeitszeit", "mutterschutz-frist": "Mutterschutzfrist",
  elternzeit: "Elternzeit", "elternzeit-rueckkehr": "Rückkehr aus der Elternzeit",
};
/** Gesundheit, Mutterschutz, Elternzeit: Aufgaben nur für die HR-Leitung, keine Erinnerungen an andere, Protokoll vertraulich. */
export const VERTRAULICHE_REGELN = new Set(["au-fehlt", "bem", "bem-naht", "efz-ende", "efz-wartezeit", "mutterschutz-meldung", "mutterschutz-gefaehrdung", "mutterschutz-arbeitszeit", "mutterschutz-frist", "elternzeit", "elternzeit-rueckkehr"]);
export const PLAN_AUFGABEN: Record<string, { label: string; plan: "eintritt" | "austritt" }> = {
  "fragebogen-da": { label: "Personalfragebogen fehlt", plan: "eintritt" }, vertrag: { label: "Vertrag nicht zurück", plan: "eintritt" },
  sofortmeldung: { label: "Sofortmeldung", plan: "eintritt" }, "checkin-30": { label: "Gespräch nach 30 Tagen", plan: "eintritt" }, // kein-recht: Workflow-Text, die Frist selbst rechnet die Regel
  "checkin-90": { label: "Gespräch nach 90 Tagen", plan: "eintritt" }, "befristung-schrift": { label: "Befristung nicht unterschrieben", plan: "eintritt" }, // kein-recht: Workflow-Text, die Frist selbst rechnet die Regel
  entzug: { label: "Zugänge sperren", plan: "austritt" }, rueckgabe: { label: "Rückgabe", plan: "austritt" },
};
export const BESCHAEFTIGUNG: Record<Beschaeftigung, string> = { vollzeit: "Vollzeit", teilzeit: "Teilzeit", werkstudent: "Werkstudent", azubi: "Auszubildende", minijob: "Minijob", praktikum: "Praktikum" };
export const PLATZHALTER = ["{Name}", "{Datum}", "{Team}", "{Was}"] as const;

/** Alles in geschweiften Klammern, das kein fester Platzhalter ist, je einmal. Solche Texte lassen sich nicht speichern. */
export const unbekanntePlatzhalter = (text: string) =>
  [...new Set(text.match(/\{[^{}]*\}/g) ?? [])].filter((p) => !(PLATZHALTER as readonly string[]).includes(p));

export const fuelle = (text: string, a: Anlass) =>
  text.replaceAll("{Name}", a.titel).replaceAll("{Datum}", a.datum ? formatDE(a.datum) : "").replaceAll("{Team}", a.team ?? "").replaceAll("{Was}", a.was ?? "");

/** Text eines mitgelieferten Schritts als Vorlage mit Platzhaltern, damit man ihn ändern kann. */
const MUSTERTAG = "1999-09-09";
export const alsVorlage = (s: Handeln) =>
  s.text({ schluessel: "", personId: null, datum: MUSTERTAG, titel: "{Name}", was: "{Was}" }).replaceAll(formatDE(MUSTERTAG), "{Datum}");

/** Gilt der Anlass für diese Person? Ohne Person (Lohnmonat, Sammelaufgabe) gelten Bedingungen nicht. */
export function passt(bedingungen: Bedingung[] | undefined, p: Person | undefined): boolean {
  if (!p || !bedingungen?.length) return true;
  return bedingungen.every((b) => {
    const wert = b.art === "team" ? p.team : b.art === "beschaeftigung" ? p.art : p.id;
    return b.werte.includes(wert) !== !!b.nicht;
  });
}

export function ausloeserVon(d: AusloeserDaten): Ausloeser {
  if (d.art === "befund") return { art: "befund", regeln: [d.regel] };
  if (d.art === "plan") return { art: "plan", plan: PLAN_AUFGABEN[d.aufgabe].plan, aufgaben: [d.aufgabe], datum: "faellig" };
  return d;
}
export const vertraulicherAusloeser = (d: AusloeserDaten) => d.art === "befund" && VERTRAULICHE_REGELN.has(d.regel);

export function ausEigenem(e: EigenerWorkflow): Workflow {
  return {
    id: e.id, name: e.name, nutzen: e.beschreibung, ersparnis: "", gesundheit: vertraulicherAusloeser(e.ausloeser), tage: {}, bedingungen: e.bedingungen, eigen: { von: e.von, erstellt: e.erstellt },
    teile: [{ ausloeser: ausloeserVon(e.ausloeser), schritte: e.schritte.map((s): Schritt => (s.art === "warten" ? s : { id: s.id, art: s.art, an: s.an, ab: s.ab, text: (a) => fuelle(s.text, a) })) }],
  };
}

/** Mitgelieferter Workflow mit den Änderungen der Firma. Ausgeschaltete Schritte fallen weg. */
export function angepasst(w: Workflow, a: Anpassung | undefined): Workflow {
  if (!a) return w;
  return {
    ...w, bedingungen: a.bedingungen ?? w.bedingungen,
    teile: w.teile.map((t, i) => ({ ...t, schritte: t.schritte.flatMap((s): Schritt[] => {
      const x = a.schritte?.[`${i}:${s.id}`];
      if (!x || s.art === "warten") return [s];
      if (x.aus) return [];
      return [{ ...s, ...(x.an ? { an: x.an } : {}), ...(x.ab !== undefined ? { ab: x.ab } : {}), ...(x.text ? { text: (an: Anlass) => fuelle(x.text!, an) } : {}) }];
    }) })),
  };
}

/* ---------- Prüfen (Eingaben aus dem Browser) ---------- */

const AUFGABE_AN: Empfaenger[] = ["hr", "gf"];
const MITTEILUNG_AN: Empfaenger[] = ["person", "fuehrung", "alle-fuehrung"];
const fehler = (text: string): never => { throw new Error(text); };
const ganz = (v: unknown, min: number, max: number, was: string) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : fehler(`${was}: bitte eine ganze Zahl von ${min} bis ${max}.`));
// Steuerzeichen raus, damit im Text nichts anderes steht als lesbarer Text.
const text = (v: unknown, max: number, was: string, leer = false) => {
  const t = typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim() : "";
  if (!t && !leer) fehler(`${was} fehlt.`);
  if (t.length > max) fehler(`${was}: höchstens ${max} Zeichen.`);
  return t;
};
const schrittText = (v: unknown) => {
  const t = text(v, 300, "Text");
  const falsch = unbekanntePlatzhalter(t);
  return falsch.length ? fehler(`Unbekannter Platzhalter ${falsch.join(", ")}. Möglich sind ${PLATZHALTER.join(", ")}.`) : t;
};
const anFuer = (art: string, an: unknown, vertraulich: boolean, mitPerson: boolean): Empfaenger => {
  if (vertraulich && (art === "mitteilung" || an !== "hr")) fehler("Bei Gesundheit, Mutterschutz und Elternzeit gehen Aufgaben nur an die HR-Leitung, Erinnerungen an andere sind gesperrt.");
  const erlaubt = art === "mitteilung" ? (mitPerson ? MITTEILUNG_AN : ["alle-fuehrung"]) : AUFGABE_AN;
  return erlaubt.includes(an as Empfaenger) ? (an as Empfaenger) : fehler(art === "mitteilung" ? "Erinnerungen gehen an die Person oder Führungskräfte, ohne Person nur an alle Führungskräfte." : "Aufgaben und Freigaben gehen an die HR-Leitung oder die Geschäftsführung.");
};

export function pruefeBedingungen(roh: unknown, mitPerson: boolean): Bedingung[] {
  if (!Array.isArray(roh) || roh.length > 5) fehler("Höchstens fünf Bedingungen.");
  const liste = roh as Record<string, unknown>[];
  if (liste.length && !mitPerson) fehler("Dieser Auslöser hat keine Person, Bedingungen gehen hier nicht.");
  return liste.map((b) => {
    if (b?.art !== "team" && b?.art !== "beschaeftigung" && b?.art !== "person") fehler("Unbekannte Bedingung.");
    const werte = Array.isArray(b.werte) ? b.werte.map((w) => text(w, 60, "Wert")) : [];
    if (!werte.length || werte.length > 30) fehler("Bitte bei jeder Bedingung mindestens einen Wert wählen.");
    if (b.art === "beschaeftigung" && werte.some((w) => !(w in BESCHAEFTIGUNG))) fehler("Unbekannte Beschäftigungsart.");
    return { art: b.art as Bedingung["art"], werte, ...(b.nicht === true ? { nicht: true } : {}) };
  });
}

export function pruefeAusloeser(roh: unknown): AusloeserDaten {
  const d = (roh ?? {}) as Record<string, unknown>;
  if (d.art === "befund" && typeof d.regel === "string" && d.regel in REGELN) return { art: "befund", regel: d.regel };
  if (d.art === "plan" && typeof d.aufgabe === "string" && d.aufgabe in PLAN_AUFGABEN) return { art: "plan", aufgabe: d.aufgabe };
  if (d.art === "lohn" || d.art === "lesen") return { art: d.art };
  return fehler("Bitte einen Auslöser wählen.");
}

/** Eigener Workflow aus dem Formular. Wirft mit einer Meldung für den Menschen, wenn etwas nicht geht. */
export function pruefeEigenen(roh: Record<string, unknown>): Pick<EigenerWorkflow, "name" | "beschreibung" | "ausloeser" | "bedingungen" | "schritte"> {
  const ausloeser = pruefeAusloeser(roh.ausloeser);
  const mitPerson = ausloeser.art !== "lohn";
  const vertraulich = vertraulicherAusloeser(ausloeser);
  if (!Array.isArray(roh.schritte) || !roh.schritte.length || roh.schritte.length > 12) fehler("Ein Workflow hat einen bis zwölf Schritte.");
  const ids = new Set<string>();
  const schritte = (roh.schritte as Record<string, unknown>[]).map((s): SchrittDaten => {
    const id = typeof s?.id === "string" && /^[a-z0-9-]{1,24}$/.test(s.id) && !ids.has(s.id) ? s.id : fehler("Schritt ohne gültige Kennung.");
    ids.add(id);
    if (s.art === "warten") return { id, art: "warten", dauer: ganz(s.dauer, 1, 365, "Warten") };
    if (s.art !== "aufgabe" && s.art !== "mitteilung" && s.art !== "freigabe") return fehler("Unbekannter Schritt.");
    return { id, art: s.art, an: anFuer(s.art, s.an, vertraulich, mitPerson), ab: ganz(s.ab, -365, 365, "Tage"), text: schrittText(s.text) };
  });
  if (schritte.every((s) => s.art === "warten")) fehler("Ein Workflow braucht mindestens einen Schritt, der etwas tut.");
  return { name: text(roh.name, 80, "Name"), beschreibung: text(roh.beschreibung, 300, "Beschreibung", true), ausloeser, bedingungen: pruefeBedingungen(roh.bedingungen ?? [], mitPerson), schritte };
}

/** Änderungen an einem mitgelieferten Workflow. Gesundheit und Mutterschutz: Empfänger bleiben die HR-Leitung. */
export function pruefeAnpassung(w: Workflow, roh: Record<string, unknown>): Anpassung {
  const schritte: NonNullable<Anpassung["schritte"]> = {};
  for (const [key, x] of Object.entries((roh.schritte ?? {}) as Record<string, Record<string, unknown>>)) {
    const [i, id] = key.split(":");
    const s = w.teile[Number(i)]?.schritte.find((y) => y.id === id);
    if (!s || s.art === "warten") fehler("Unbekannter Schritt.");
    const v = s as Handeln;
    const neu: NonNullable<Anpassung["schritte"]>[string] = {};
    if (x.aus === true) neu.aus = true;
    if (x.an !== undefined && x.an !== v.an) neu.an = anFuer(v.art, x.an, !!w.gesundheit, w.teile[Number(i)].ausloeser.art !== "lohn");
    if (x.ab !== undefined && x.ab !== v.ab) {
      if (typeof v.ab !== "number") fehler("Diese Tage stellst du oben unter Tage ein.");
      neu.ab = ganz(x.ab, -365, 365, "Tage");
    }
    if (x.text !== undefined) { const t = schrittText(x.text); if (t !== alsVorlage(v)) neu.text = t; }
    if (Object.keys(neu).length) schritte[key] = neu;
  }
  const mitPerson = w.teile.some((t) => t.ausloeser.art !== "lohn");
  const bedingungen = roh.bedingungen === undefined ? undefined : pruefeBedingungen(roh.bedingungen, mitPerson);
  return { ...(Object.keys(schritte).length ? { schritte } : {}), ...(bedingungen?.length ? { bedingungen } : {}) };
}
