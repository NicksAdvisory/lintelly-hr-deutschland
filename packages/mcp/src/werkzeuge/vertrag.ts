/**
 * Vertragsbausteine und rote Liste der Werkbank (lib/vertragsbausteine). Alle 126 Bausteine mit Text, ohne Status-Kennzeichen
 * (Nick 23.10.2026: „Nein, ohne Status“), immer mit dem Hinweis, dass vor dem Versand ein Mensch prüfen sollte.
 * Der Text entsteht nur, wenn alle Pflichtangaben da sind; halbe Texte mit Lücken gibt es nicht. Statt Namen steht [Name].
 * Die Prüfregeln P-001 bis P-104 auf einen konkreten Vertrag bleiben in der Werkbank.
 */
import { BAUSTEIN } from "@/lib/vertragsbausteine/katalog";
import { standardWerte, suche } from "@/lib/vertragsbausteine/empfehlung";
import { findeGesperrte, ROTE_LISTE } from "@/lib/vertragsbausteine/rot";
import { zahl as leseZahl } from "@/lib/vertragsbausteine/hilfen";
import { GRUPPEN, type Baustein, type Feld, type TextKontext, type Vertragsart, type Werte } from "@/lib/vertragsbausteine/typen";
import { isISODate } from "@/lib/regeln/datum";
import { antwort, normQuelle } from "../antwort";
import { datum, liste, schema, text, zahl, type Eingabe } from "../eingabe";
import type { Werkzeug } from "../werkzeug";

const NAME = "[Name]";
const ARTEN: Vertragsart[] = ["arbeitsvertrag", "befristet", "teilzeit", "minijob", "werkstudent", "ausbildung", "aenderung"];
/** Freie Ergänzung läuft durch keine Regel des Bausteins und bleibt in der Werkbank. */
const OHNE_FREITEXT = (f: Feld) => f.id !== "ergaenzung";
const ZAHL_TYP = new Set(["zahl", "betrag", "prozent"]);
const ZAHL = /^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+([.,]\d+)?$/;
const ROT_EINORDNUNG = "Diese Klauseltypen sind in jeder Form unwirksam oder verboten. Lintelly bietet sie nicht an.";

function beispiel(f: Feld): string {
  if (f.optionen?.length) return f.optionen[0];
  if (f.typ === "janein") return "ja";
  if (f.typ === "datum") return "2027-01-01";
  if (f.typ === "staffel") return JSON.stringify([{ ab: 0, bis: null, satz: 3 }]);
  if (ZAHL_TYP.has(f.typ)) return String(f.min && f.min > 0 ? f.min : f.typ === "betrag" ? 500 : f.typ === "prozent" ? 5 : 2);
  return `[${f.label}]`;
}

/** Prüft eine Angabe gegen das Feld: bekannte Option, Zahl in den Grenzen, Datum, Staffel als JSON-Liste. */
function fehlerIn(f: Feld, w: string): string | null {
  if ((f.typ === "auswahl" || f.typ === "mehrfach") && f.optionen) {
    const teile = f.typ === "mehrfach" ? w.split("|").map((x) => x.trim()) : [w];
    const falsch = teile.find((t) => !f.optionen!.includes(t));
    if (falsch !== undefined) return `${f.id}: "${falsch.slice(0, 60)}" ist keine Option. Möglich: ${f.optionen.join(" | ")}`;
  }
  if (f.typ === "janein" && w !== "ja" && w !== "nein") return `${f.id}: ja oder nein`;
  if (f.typ === "datum" && !isISODate(w)) return `${f.id}: Datum als JJJJ-MM-TT`;
  if (ZAHL_TYP.has(f.typ)) {
    const n = ZAHL.test(w.trim()) ? leseZahl(w) : null;
    if (n === null) return `${f.id}: Zahl, z. B. 2 oder 4.500,50`;
    if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) return `${f.id}: zwischen ${f.min ?? "0"} und ${f.max ?? "beliebig"}`;
  }
  if (f.typ === "staffel") {
    try { if (!Array.isArray(JSON.parse(w))) return `${f.id}: JSON-Liste wie [{"ab":0,"bis":null,"satz":3}]`; } catch { return `${f.id}: JSON-Liste wie [{"ab":0,"bis":null,"satz":3}]`; }
  }
  return null;
}

const sichtbar = (f: Feld, w: Werte) => !f.bei || Object.entries(f.bei).every(([id, werte]) => werte.includes(w[id] ?? ""));

type Kontext = { gehalt_monat?: number; wochenstunden?: number; eintritt?: string };
/** Welche Angaben zu Person und Vertrag braucht der Text? Zwei Fassungen rechnen und vergleichen, statt jeden Text zu lesen. */
function brauchtKontext(b: Baustein, w: Werte, heute: string): (keyof Kontext)[] {
  const k = (x: Partial<TextKontext>): TextKontext => ({ vorname: NAME, gehalt: 3000, wochenstunden: 40, eintritt: "2027-01-01", heute, auswahl: { [b.id]: w }, ...x });
  const basis = b.text(w, k({}));
  const out: (keyof Kontext)[] = [];
  if (b.text(w, k({ gehalt: 3100 })) !== basis) out.push("gehalt_monat");
  if (b.text(w, k({ wochenstunden: 30 })) !== basis) out.push("wochenstunden");
  if (b.text(w, k({ eintritt: "2027-02-01" })) !== basis) out.push("eintritt");
  return out;
}

const KONTEXT_LABEL: Record<keyof Kontext, string> = { gehalt_monat: "Bruttomonatsgehalt in Euro", wochenstunden: "Wochenstunden", eintritt: "Beginn des Arbeitsverhältnisses" };
const KONTEXT_BEISPIEL: Record<keyof Kontext, string> = { gehalt_monat: "4000", wochenstunden: "40", eintritt: "2027-01-01" };

function bausteinAntwort(b: Baustein, e: Eingabe, heute: string) {
  const felder = b.felder.filter(OHNE_FREITEXT);
  const w: Werte = standardWerte(b);
  for (const a of (e.angaben ?? []) as { feld: string; wert: string }[]) {
    const f = felder.find((x) => x.id === a.feld);
    if (!f) return { fehler: `Unbekannte Angabe ${a.feld.slice(0, 40)}. Möglich: ${felder.map((x) => x.id).join(", ")}` };
    const fehler = fehlerIn(f, a.wert);
    if (fehler) return { fehler };
    w[f.id] = a.wert;
  }
  const kontext = e as Kontext;
  const probe = (x: Werte) => b.text(x, { vorname: NAME, gehalt: 3000, wochenstunden: 40, eintritt: "2027-01-01", heute, auswahl: { [b.id]: x } });
  // Auch freiwillige Felder fehlen, wenn der Text ohne sie mit 0 rechnet (Weihnachtsgeld von 0,00 €) oder eine Lücke hat.
  const luecken = (t: string) => (t.match(/undefined|NaN/g) ?? []).length;
  const fehltFrei = (f: Feld, x: Werte) => {
    const ohne = probe(x), mit = probe({ ...x, [f.id]: beispiel(f) });
    return ZAHL_TYP.has(f.typ) ? mit !== ohne : luecken(mit) < luecken(ohne);
  };
  const fehltIn = (x: Werte) => felder.filter((f) => sichtbar(f, x) && !(x[f.id] ?? "").trim() && (f.pflicht || fehltFrei(f, x)));
  // Angaben, die erst durch eine fehlende Auswahl sichtbar werden, gleich mitnennen (mit dem Beispielwert gerechnet).
  const offen: Feld[] = [];
  const annahme = { ...w };
  for (let runde = 0; runde < 5; runde++) {
    const neu = fehltIn(annahme).filter((f) => !offen.includes(f));
    if (!neu.length) break;
    for (const f of neu) { offen.push(f); annahme[f.id] = beispiel(f); }
  }
  const fehlend = offen.map((f) => ({ feld: f.id, label: f.label, beispiel: beispiel(f) }));
  const kontextFehlt = brauchtKontext(b, w, heute).filter((k) => kontext[k] === undefined)
    .map((k) => ({ feld: k, label: KONTEXT_LABEL[k], beispiel: KONTEXT_BEISPIEL[k] }));
  const fehlende_angaben = [...fehlend, ...kontextFehlt];
  const textKontext: TextKontext = {
    vorname: NAME, gehalt: kontext.gehalt_monat ?? 0, wochenstunden: kontext.wochenstunden ?? 0, eintritt: kontext.eintritt ?? heute, heute, auswahl: { [b.id]: w },
  };
  return {
    kennung: b.id, name: b.label, gruppe: GRUPPEN[b.gruppe], passt: b.passt, vertragsarten: b.fuer,
    angaben: felder.map((f) => ({
      feld: f.id, label: f.label, typ: f.typ, ...(f.optionen ? { optionen: f.optionen } : {}), pflicht: !!f.pflicht,
      ...(f.min !== undefined ? { min: f.min } : {}), ...(f.max !== undefined ? { max: f.max } : {}),
      ...(f.standard !== undefined ? { standard: f.standard } : {}), ...(f.hinweis ? { hinweis: f.hinweis } : {}), ...(f.bei ? { nur_wenn: f.bei } : {}),
    })),
    gewaehlt: w,
    normen: b.normen,
    urteile: (b.urteile ?? []).map((u) => ({ aktenzeichen: u.az, ...(u.kennung === "P" ? { hinweis: "Aktenzeichen nicht bestätigt" } : {}) })),
    schutz: b.schutz, sperren: b.sperren,
    ...(b.nass ? { schriftform: "Braucht die Originalunterschrift auf Papier (nicht per PDF oder E-Mail)." } : {}),
    ...(b.befristung ? { befristung: "Bringt eine Befristung in den Vertrag: Schriftform vor dem ersten Arbeitstag (§ 14 Abs. 4 TzBfG)." } : {}),
    ...(b.ersetzt ? { ersetzt: b.ersetzt } : {}),
    fehlende_angaben,
    text: fehlende_angaben.length ? null : b.text(w, textKontext),
  };
}

const quellenZu = (b: Baustein) => [...b.normen.map((n) => normQuelle(n)), ...b.quellen.filter((q) => q.startsWith("https://")).map((q) => normQuelle(q, q))];

const vertragsbausteine_suchen: Werkzeug = {
  name: "vertragsbausteine_suchen",
  titel: "Vertragsbausteine suchen",
  beschreibung:
    "Search 126 German employment contract clauses (Vertragsbausteine), e.g. home office (Homeoffice), overtime (Überstunden), bonus, company car (Dienstwagen), non-compete (Wettbewerbsverbot), probation (Probezeit). Returns matching clauses with key and when they fit, and void clause types from the red list with the reason and the safe alternative.",
  eingabe: schema({
    suchtext: text("What the clause should cover, German works best, e.g. Homeoffice", { maxLength: 100 }),
    vertragsart: text("Type of contract, default arbeitsvertrag", { enum: ARTEN }),
  }, ["suchtext"]),
  ausfuehren(e, heute) {
    const r = suche(String(e.suchtext), (e.vertragsart as Vertragsart | undefined) ?? "arbeitsvertrag");
    return antwort({
      ergebnis: {
        treffer: r.treffer.slice(0, 20).map((t) => ({ kennung: t.baustein.id, name: t.baustein.label, gruppe: GRUPPEN[t.baustein.gruppe], passt: t.grund })),
        gesperrt: r.gesperrt.map(({ klausel: k }) => ({ kennung: k.id, klausel: k.klausel, grund: k.grund, alternative: k.alternative })),
      },
      naechster_schritt: r.treffer.length ? ["Mit vertragsbaustein und der Kennung gibt es Angaben, Pflichtsätze und den Text."] : ["Anders suchen, z. B. mit einem Stichwort wie Überstunden, Bonus oder Kündigung."],
    }, heute);
  },
};

const vertragsbaustein: Werkzeug = {
  name: "vertragsbaustein",
  titel: "Vertragsbaustein mit Text",
  beschreibung:
    "Get one German employment contract clause (Vertragsbaustein) by key, e.g. B3 (home office), C2 (overtime allowance), D18 (Christmas bonus). Returns when it fits, the inputs with limits and safe defaults, norms, court rulings, mandatory safeguards, what is blocked and the clause text in German with [Name] as placeholder. If required inputs are missing, it lists them instead of returning a text with gaps; call again with angaben.",
  eingabe: schema({
    kennung: text("Key of the clause, e.g. B3", { pattern: "^[A-S][0-9]{1,2}$", maxLength: 3 }),
    angaben: liste("Inputs of the clause as field and value, e.g. {feld: tage, wert: 2}. Numbers German style (4.500,50), options exactly as listed",
      schema({ feld: text("Field key from angaben", { pattern: "^[A-Za-z0-9]{1,40}$", maxLength: 40 }), wert: text("Value", { maxLength: 500 }) }, ["feld", "wert"]), 30),
    gehalt_monat: zahl("Gross monthly salary in euro, only if the clause needs it", 0, 1000000),
    wochenstunden: zahl("Weekly working hours, only if the clause needs it", 0, 60),
    eintritt: datum("Start of employment, only if the clause needs it"),
  }, ["kennung"]),
  ausfuehren(e, heute) {
    const b = BAUSTEIN[String(e.kennung)];
    if (!b) return antwort({ ergebnis: { gefunden: false, fehler: `Keinen Baustein ${e.kennung} gefunden. Kennungen gehen von A1 bis S…, suche mit vertragsbausteine_suchen.` } }, heute);
    const ergebnis = bausteinAntwort(b, e, heute);
    if ("fehler" in ergebnis) return antwort({ ergebnis }, heute);
    return antwort({
      ergebnis,
      quellen: quellenZu(b),
      naechster_schritt: ergebnis.text
        ? ["Text in den Vertrag übernehmen, [Name] ersetzen, Schutzsätze nicht streichen.", ...(b.nass ? ["Auf Papier mit Originalunterschrift abschließen."] : [])]
        : [`Diese Angaben fehlen noch: ${ergebnis.fehlende_angaben.map((f) => f.label).join(", ")}. Dann noch einmal aufrufen.`],
    }, heute);
  },
};

const klausel_pruefen: Werkzeug = {
  name: "klausel_pruefen",
  titel: "Klausel gegen die rote Liste lesen",
  beschreibung:
    "Read one clause of a German employment contract against 17 clause types that are void or prohibited under German law (rote Liste), e.g. all overtime paid with the salary, non-compete without compensation, cut-off periods without exceptions. Returns matches with reason, norm and the safe alternative clause. No match is not a legal review of validity. The text is only read, never stored.",
  eingabe: schema({ klausel: text("Clause text, up to 3,000 characters", { maxLength: 3000 }) }, ["klausel"]),
  ausfuehren(e, heute) {
    const treffer = findeGesperrte(String(e.klausel)).map((r) => ({ kennung: r.id, klausel: r.klausel, grund: r.grund, alternative: r.alternative, bausteine: r.bausteine }));
    return antwort({
      ergebnis: {
        treffer,
        einordnung: treffer.length ? ROT_EINORDNUNG : `Kein Treffer auf der roten Liste (${ROTE_LISTE.length} Klauseltypen). Das ist keine Prüfung der Wirksamkeit.`,
      },
      naechster_schritt: treffer.length ? ["Die Klausel streichen und die sichere Alternative mit vertragsbaustein holen."] : [],
    }, heute);
  },
};

export const VERTRAG: Werkzeug[] = [vertragsbausteine_suchen, vertragsbaustein, klausel_pruefen];
