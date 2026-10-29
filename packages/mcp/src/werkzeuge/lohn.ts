/**
 * Arbeitgeberkosten, Mindestlohn, Sofortmeldung und „Frist merken“. Sätze und Grenzen aus dem Rechtswerte-Register der Werkbank
 * (lib/regeln/werte.ts), der Minijob mit dem Rechner von lintelly.com. Im Übergangsbereich (Midijob) rechnet Lintelly wie die
 * Werkbank keinen Arbeitgeberanteil, sondern nennt nur die Untergrenze: nicht berechnet statt falsch.
 */
import { BBG_KV_MONAT, BBG_RV_MONAT, MINIJOB_GRENZE, SATZ_AV, SATZ_KV_PV, SATZ_RV_AV, WERTE, wertZu, type WertZuDatum } from "@/lib/regeln/werte";
import { mindestlohnLuecke } from "@/lib/regeln/mindestlohn";
import { euro as euroDin } from "@/lib/format";
import { SOFORTMELDUNG_BEREICHE, SOFORTMELDUNG_QUELLE } from "@/lib/sofortmeldung";
import { VORLAGE_EINTRITT } from "@/lib/module/plaene";
import { abgabenArbeitgeber } from "../../../kern/website/components/tools/minijob-logik";
import { buildIcs } from "../../../kern/website/components/tools/datum";
import { FRISTNAMEN, moeglicheVorlaeufe } from "../../../kern/website/lib/erinnerung-pruefung";
import { antwort, normQuelle, registerQuelle } from "../antwort";
import { datum, janein, schema, text, zahl } from "../eingabe";
import type { Werkzeug } from "../werkzeug";
import { minijobAbgabenOffen } from "./geld";

const cent = (x: number) => Math.round(x * 100) / 100;
const satz = (x: number) => Math.round(x * 1e6) / 1e6;
const euro = (x: number) => euroDin(x, { cent: true });

type Posten = { name: string; satz: number; basis: number; betrag: number };
const posten = (name: string, s: number, brutto: number, grenze: number): Posten => {
  const basis = Math.min(brutto, grenze);
  return { name, satz: satz(s), basis, betrag: cent(basis * s) };
};

const NICHT_DRIN = "Nicht enthalten: Umlagen U1 und U2 (Satz deiner Krankenkasse), Insolvenzgeldumlage und der Beitrag zur Berufsgenossenschaft.";

/** Vorläufige Werte einmal je Hinweis und mit Namen, statt derselben Zeile mehrmals ohne zu sagen, welcher Wert gemeint ist (Review 29.10.2026). */
function vorlaeufig(werte: [string, WertZuDatum][]): string[] {
  const je = new Map<string, string[]>();
  for (const [name, w] of werte) if (w.hinweis) je.set(w.hinweis, [...(je.get(w.hinweis) ?? []), name]);
  return [...je].map(([hinweis, namen]) => `Vorläufig, ${namen.join(" und ")}: ${hinweis}.`);
}

const arbeitgeberkosten: Werkzeug = {
  name: "arbeitgeberkosten",
  titel: "Was kostet mich eine Person",
  beschreibung:
    "Employer costs (Arbeitgeberkosten) of one employee in Germany per month and year: gross pay plus the employer share of social security (Sozialversicherung) for full-time, part-time, working students (Werkstudent) and mini-jobs (Minijob), with rates, contribution ceilings and sources. In the transition zone (Midijob, Übergangsbereich) it gives only the lower bound instead of guessing.",
  eingabe: schema({
    art: text("Type of employment", { enum: ["vollzeit", "teilzeit", "werkstudent", "minijob"] }),
    brutto_monat: zahl("Gross pay per month in euro", 0, 100000),
    stichtag: datum("Any day in the month the costs apply to; the rates valid on that day are used. Default today"),
    gesetzlich_versichert: janein("Mini-job: person has statutory health insurance, default true"),
    pauschsteuer: janein("Mini-job: employer pays the 2 % flat-rate tax, default true"),
  }, ["art", "brutto_monat"]),
  baender: (e) => ({ art: e.art as string }),
  ausfuehren(e, heute) {
    const tag = (e.stichtag as string | undefined) ?? heute;
    const art = String(e.art);
    const brutto = e.brutto_monat as number;
    const grenze = wertZu(MINIJOB_GRENZE, tag);
    const ober = WERTE.uebergangsbereich.obergrenze;
    const rvav = wertZu(SATZ_RV_AV, tag), av = wertZu(SATZ_AV, tag), kvpv = wertZu(SATZ_KV_PV, tag);
    const bbgKv = wertZu(BBG_KV_MONAT, tag), bbgRv = wertZu(BBG_RV_MONAT, tag);
    const ergebnisMit = (p: Posten[], extra: Record<string, unknown> = {}) => {
      const summe = cent(p.reduce((s, x) => s + x.betrag, 0));
      return { art, brutto_monat: brutto, stichtag: tag, posten: p, summe_arbeitgeber: summe, gesamtkosten_monat: cent(brutto + summe), gesamtkosten_jahr: cent((brutto + summe) * 12), ...extra };
    };

    if (art === "minijob") {
      if (brutto > grenze.wert) {
        return antwort({
          ergebnis: { art, brutto_monat: brutto, stichtag: tag, summe_arbeitgeber: null },
          fallen: [`${euro(brutto)} liegt über der Minijob-Grenze von ${euro(grenze.wert)}. Das ist kein Minijob mehr, rechne mit art teilzeit.`],
          quellen: [registerQuelle("minijobGrenze", heute)],
        }, heute);
      }
      const offen = minijobAbgabenOffen(tag);
      if (offen) {
        return antwort({
          ergebnis: { art, brutto_monat: brutto, stichtag: tag, summe_arbeitgeber: null },
          fallen: [offen, ...vorlaeufig([["Minijob-Grenze", grenze]])],
          quellen: [registerQuelle("minijobAgPauschale", heute), registerQuelle("minijobGrenze", heute)],
        }, heute);
      }
      const m = abgabenArbeitgeber(brutto, { gesetzlichVersichert: e.gesetzlich_versichert !== false, pauschsteuer: e.pauschsteuer !== false });
      return antwort({
        ergebnis: { art, brutto_monat: brutto, stichtag: tag, posten: m.posten, summe_arbeitgeber: m.summe, gesamtkosten_monat: m.gesamtkosten, gesamtkosten_jahr: cent(m.gesamtkosten * 12) },
        rechenweg: m.posten.map((p) => `${p.name}: ${euro(brutto)} mal ${String(cent(p.satz * 100)).replace(".", ",")} % = ${euro(p.betrag)}`),
        quellen: [registerQuelle("minijobGrenze", heute), normQuelle("§ 249b SGB V"), normQuelle("§ 172 Abs. 3 SGB VI"), normQuelle("§ 40a Abs. 2 EStG"), normQuelle("Minijob-Zentrale: Abgaben und Steuern", "https://www.minijob-zentrale.de/DE/fuer-gewerbetreibende/abgaben-und-steuern/abgaben-und-steuern_node.html", "2026-10-23")],
        fallen: ["Sätze für gewerbliche Minijobs 2026 laut Minijob-Zentrale. Der Beitrag zur Berufsgenossenschaft fehlt, er hängt von der Branche ab."],
        naechster_schritt: ["Stunden gegen den Mindestlohn prüfen (minijob oder mindestlohn_check).", "Anmeldung bei der Minijob-Zentrale über das Lohnbüro."],
      }, heute);
    }

    const quellen = [registerQuelle("satzKvPv", heute), registerQuelle("satzRvAv", heute), registerQuelle("bbgKv", heute), registerQuelle("bbgRv", heute)];
    if (art === "werkstudent") {
      if (brutto <= grenze.wert) return antwort({ ergebnis: { art, brutto_monat: brutto, stichtag: tag, summe_arbeitgeber: null }, fallen: [`Bis ${euro(grenze.wert)} im Monat ist das ein Minijob. Rechne mit art minijob.`], quellen: [registerQuelle("minijobGrenze", heute)] }, heute);
      const rv = posten("Rentenversicherung (Hälfte)", (rvav.wert - av.wert) / 2, brutto, bbgRv.wert);
      const ueber = brutto <= ober;
      return antwort({
        ergebnis: ueber ? { art, brutto_monat: brutto, stichtag: tag, uebergangsbereich: true, summe_arbeitgeber: null, mindestens_arbeitgeber: rv.betrag } : ergebnisMit([rv]),
        rechenweg: [`Werkstudium: frei in Kranken-, Pflege- und Arbeitslosenversicherung, pflichtig nur in der Rentenversicherung.`, `Rentenversicherung: ${euro(rv.basis)} mal ${String(cent(rv.satz * 100)).replace(".", ",")} % = ${euro(rv.betrag)}.`],
        quellen: [registerQuelle("satzRvAv", heute), registerQuelle("bbgRv", heute), normQuelle("§ 6 Abs. 1 Nr. 3 SGB V"), normQuelle("§ 27 Abs. 4 SGB III")],
        fallen: [
          ...(ueber ? [`Bis ${euro(ober)} gilt der Übergangsbereich auch hier (§ 20 Abs. 2a SGB IV). Der Arbeitgeber zahlt dann mehr als den regulären Anteil. Die genaue Zahl rechnet das Lohnbüro.`] : []),
          `Gilt nur, solange das Studium im Vordergrund steht: in der Vorlesungszeit höchstens ${WERTE.werkstudentStunden.wert} Stunden pro Woche.`,
          NICHT_DRIN, ...vorlaeufig([["Beitragssatz Renten- und Arbeitslosenversicherung", rvav], ["Beitragssatz Arbeitslosenversicherung", av], ["Beitragsbemessungsgrenze Rentenversicherung", bbgRv], ["Minijob-Grenze", grenze]]),
        ],
      }, heute);
    }

    const p = [
      posten("Kranken- und Pflegeversicherung (Hälfte, mit durchschnittlichem Zusatzbeitrag)", kvpv.wert / 2, brutto, bbgKv.wert),
      posten("Renten- und Arbeitslosenversicherung (Hälfte)", rvav.wert / 2, brutto, bbgRv.wert),
    ];
    const rechenweg = p.map((x) => `${x.name}: ${euro(x.basis)} mal ${String(cent(x.satz * 100)).replace(".", ",")} % = ${euro(x.betrag)}${x.basis < brutto ? " (bis zur Beitragsbemessungsgrenze)" : ""}.`);
    if (brutto <= grenze.wert) {
      return antwort({ ergebnis: { art, brutto_monat: brutto, stichtag: tag, summe_arbeitgeber: null }, fallen: [`Bis ${euro(grenze.wert)} im Monat ist das ein Minijob. Rechne mit art minijob.`], quellen: [registerQuelle("minijobGrenze", heute)] }, heute);
    }
    if (brutto <= ober) {
      return antwort({
        ergebnis: { art, brutto_monat: brutto, stichtag: tag, uebergangsbereich: true, summe_arbeitgeber: null, mindestens_arbeitgeber: cent(p.reduce((s, x) => s + x.betrag, 0)), posten_regulaer: p },
        rechenweg: ["Regulärer Arbeitgeberanteil als Untergrenze:", ...rechenweg],
        quellen: [...quellen, registerQuelle("minijobGrenze", heute)],
        fallen: [
          `${euro(brutto)} liegt im Übergangsbereich (Midijob, über ${euro(grenze.wert)} bis ${euro(ober)}). Die Beiträge folgen einer eigenen Formel (§ 20 Abs. 2a SGB IV): Der Arbeitgeber zahlt mehr als den regulären Anteil, je näher an der Minijob-Grenze, desto mehr. Bei ${euro(ober)} gilt der reguläre Anteil. Die genaue Zahl rechnet das Lohnbüro.`,
          NICHT_DRIN, ...vorlaeufig([["Beitragssatz Kranken- und Pflegeversicherung", kvpv], ["Beitragssatz Renten- und Arbeitslosenversicherung", rvav], ["Beitragsbemessungsgrenze Kranken- und Pflegeversicherung", bbgKv], ["Beitragsbemessungsgrenze Rentenversicherung", bbgRv], ["Minijob-Grenze", grenze]]),
        ],
      }, heute);
    }
    return antwort({
      ergebnis: ergebnisMit(p),
      rechenweg,
      quellen,
      fallen: [
        "Der Zusatzbeitrag ist ein Durchschnitt. Die Krankenkasse der Person setzt ihren eigenen Satz.",
        "In Sachsen trägt der Arbeitgeber einen kleineren Teil der Pflegeversicherung (§ 58 Abs. 3 SGB XI).",
        NICHT_DRIN, ...vorlaeufig([["Beitragssatz Kranken- und Pflegeversicherung", kvpv], ["Beitragssatz Renten- und Arbeitslosenversicherung", rvav], ["Beitragsbemessungsgrenze Kranken- und Pflegeversicherung", bbgKv], ["Beitragsbemessungsgrenze Rentenversicherung", bbgRv], ["Minijob-Grenze", grenze]]),
      ],
      naechster_schritt: ["Stunden gegen den Mindestlohn prüfen (mindestlohn_check)."],
    }, heute);
  },
};

const mindestlohn_check: Werkzeug = {
  name: "mindestlohn_check",
  titel: "Mindestlohn prüfen",
  beschreibung:
    "Check a monthly salary and weekly hours against the German statutory minimum wage (Mindestlohn) on a given date: hourly wage, minimum wage, required monthly pay and the shortfall. Uses 13/3 weeks per month like payroll. Not for apprentices (they have a minimum training allowance).",
  eingabe: schema({
    brutto_monat: zahl("Gross pay per month in euro", 0, 100000),
    wochenstunden: zahl("Contractual hours per week", 0.5, 60),
    stichtag: datum("Date to check, default today"),
  }, ["brutto_monat", "wochenstunden"]),
  ausfuehren(e, heute) {
    const tag = (e.stichtag as string | undefined) ?? heute;
    const m = mindestlohnLuecke(e.brutto_monat as number, e.wochenstunden as number, tag);
    const wochen = WERTE.wochenJeMonat;
    return antwort({
      ergebnis: { stichtag: tag, mindestlohn: m.satz.wert, stundenlohn: m.stundenlohn, soll_monat: m.soll, fehlt_monat: m.fehlt, reicht: m.fehlt === 0 },
      rechenweg: [
        `Monatsstunden: ${String(e.wochenstunden).replace(".", ",")} Stunden pro Woche mal ${wochen.text} Wochen.`,
        `Stundenlohn: ${euro(e.brutto_monat as number)} geteilt durch die Monatsstunden = ${euro(m.stundenlohn)}.`,
        `Mindestlohn am ${tag}: ${euro(m.satz.wert)}. Soll im Monat: ${euro(m.soll)}.`,
      ],
      quellen: [registerQuelle("mindestlohn", heute), normQuelle("§ 1 MiLoG")],
      fallen: [
        ...(m.satz.hinweis ? [m.satz.hinweis] : []),
        "Ausnahmen (Auszubildende, Pflichtpraktika, unter 18 ohne Berufsabschluss, Langzeitarbeitslose in den ersten sechs Monaten) stehen in § 22 MiLoG.",
        "Bei Minijobs kippt eine Erhöhung des Mindestlohns schnell die Grenze. Prüf die Stunden mit dem Werkzeug minijob.",
      ],
    }, heute);
  },
};

const SOFORT = VORLAGE_EINTRITT.find((v) => v.id === "sofortmeldung")!;

const sofortmeldepflicht: Werkzeug = {
  name: "sofortmeldepflicht",
  titel: "Sofortmeldung nötig?",
  beschreibung:
    "Check whether a German employer must file an immediate registration (Sofortmeldung) before the first working hour, by industry under § 28a Abs. 4 SGB IV: construction, hospitality, passenger transport, logistics and delivery, showmen, building cleaning, trade fair construction, meat industry, prostitution, security, hairdressing and cosmetics.",
  eingabe: schema({ branche: text("Industry of the company", { enum: [...SOFORTMELDUNG_BEREICHE.map((b) => b.id), "keine"] }) }, ["branche"]),
  ausfuehren(e, heute) {
    const b = SOFORTMELDUNG_BEREICHE.find((x) => x.id === e.branche);
    return antwort({
      ergebnis: b
        ? { pflicht: true, bereich: b.text, nummer: b.nr, was: SOFORT.text, bis: "spätestens bei Aufnahme der Beschäftigung" }
        : { pflicht: false, bereiche: SOFORTMELDUNG_BEREICHE.map((x) => x.text) },
      quellen: [normQuelle(SOFORTMELDUNG_QUELLE, "https://www.gesetze-im-internet.de/sgb_4/__28a.html", "2026-10-18")],
      fallen: b ? [
        "Die Sofortmeldung ersetzt nicht die normale Anmeldung mit der ersten Lohnabrechnung.",
        "In diesen Branchen müssen Beschäftigte bei der Arbeit einen Ausweis dabeihaben (§ 2a SchwarzArbG). Der Nachweis der Arbeitsbedingungen muss hier auf Papier mit Unterschrift übergeben werden.",
      ] : [`Ohne Sofortmeldepflicht reicht die Anmeldung mit der ersten Lohnabrechnung, spätestens ${WERTE.deuevMeldungWochen.wert} Wochen nach Beginn (§ 6 DEÜV).`],
    }, heute);
  },
};

/** Kalendereintrag mit Erinnerung 7 Tage vorher um 9 Uhr (Review 29.10.2026: ohne VALARM erinnert der Kalender nicht von selbst). */
const mitErinnerung = (ics: string, titel: string) =>
  ics.replace("END:VEVENT", ["BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-P6DT15H", `DESCRIPTION:In 7 Tagen: ${titel.replace(/[,;\\]/g, " ")}`, "END:VALARM", "END:VEVENT"].join("\r\n"));

/** Frist-Name zu Rechner auf lintelly.com (dort steht „Frist merken“ mit Mail per Double-Opt-in). */
const RECHNER = Object.entries(FRISTNAMEN).flatMap(([slug, namen]) => namen.map((n) => [n, slug] as const));

const frist_merken: Werkzeug = {
  name: "frist_merken",
  titel: "Frist merken",
  beschreibung:
    "Remember an HR deadline without storing anything here: returns a calendar entry (iCalendar text the user can save) and a link to the matching calculator on lintelly.com, where the user can request an e-mail reminder (double opt-in). Lintelly HR has no memory and stores no personal data.",
  eingabe: schema({
    datum: datum("The deadline"),
    frist: text("Kind of deadline", { enum: RECHNER.map(([n]) => n) }),
  }, ["datum", "frist"]),
  ausfuehren(e, heute) {
    const tag = String(e.datum);
    const slug = RECHNER.find(([n]) => n === e.frist)![1];
    return antwort({
      ergebnis: {
        datum: tag, frist: e.frist,
        link: `https://lintelly.com/tools/${slug}`,
        erinnerung_moeglich: moeglicheVorlaeufe(tag, heute),
        kalender_ics: mitErinnerung(buildIcs([{ date: new Date(`${tag}T00:00:00Z`), title: String(e.frist), desc: "Gemerkt mit Lintelly HR. Allgemeine Auskunft, keine Rechtsberatung im Einzelfall." }]), String(e.frist)),
      },
      naechster_schritt: [
        "Den Kalendereintrag als .ics-Datei speichern oder das Datum selbst eintragen. Er erinnert 7 Tage vorher.",
        "Für eine Mail-Erinnerung (7 Tage, 1 Tag vorher oder am Tag) den Link öffnen, das Datum eingeben und „Frist merken“ wählen.",
      ],
      fallen: moeglicheVorlaeufe(tag, heute).length ? [] : ["Für diese Frist ist keine Mail-Erinnerung mehr möglich, sie liegt zu nah oder zu weit weg."],
    }, heute);
  },
};

export const LOHN: Werkzeug[] = [arbeitgeberkosten, mindestlohn_check, sofortmeldepflicht, frist_merken];
