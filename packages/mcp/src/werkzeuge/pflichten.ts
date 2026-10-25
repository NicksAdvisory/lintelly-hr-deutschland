/**
 * Pflichten aus den Rechnern von lintelly.com/tools: Schwellenwerte, Sonderkündigungsschutz, BEM.
 * Gerechnet wird nur mit der Logik der Website (packages/kern/website/components/tools/*-logik.ts), Texte und Warnungen
 * folgen den Seiten. Fehlerhafte Angaben kommen als ergebnis.fehler zurück, nicht als Zahl.
 */
import { AB_EINS, gewichtet, gewichtetU1, pruefe, pruefeSwEingabe, REGELN, SW_FELDER, type Regel, type Status, type SwFeld } from "../../../kern/website/components/tools/schwellenwerte-logik";
import { auswerten, SCHUTZ, type Antwort, type Stufe } from "../../../kern/website/components/tools/sonderkuendigungsschutz-logik";
import { berechneBem, TAGE } from "../../../kern/website/components/tools/bem-logik";
import { addMonthsDay, fmtDay, fromDay, toDay, weekdayDay } from "../../../kern/website/components/tools/datum";
import { plural, zahl as dz } from "../../../kern/website/components/tools/format";
import { antwort, normQuelle, registerQuelle, type Quelle } from "../antwort";
import { datum, janein, liste, schema, text, zahl } from "../eingabe";
import type { Werkzeug } from "../werkzeug";

const fehler = (meldung: string, heute: string) => antwort({ ergebnis: { fehler: meldung } }, heute);

/* ---------- Schwellenwerte ---------- */

/** Eingabefeld je Feld der Website-Logik. */
const FELD: Record<SwFeld, string> = {
  koepfe: "koepfe", azubis: "azubis", bis10: "teilzeit_bis_10_stunden", bis20: "teilzeit_11_bis_20_stunden", bis30: "teilzeit_21_bis_30_stunden",
  plaetze18: "arbeitsplaetze_ab_18_stunden", schwerbehindert: "schwerbehinderte", daten: "personen_mit_personendaten",
};
/** Schwellen, deren Wert im Rechtswerte-Register steht. */
const REGISTER_ID: Record<string, string> = {
  br: "radarBetriebsrat", kschg: "kschgSchwelle", tzbfg: "teilzeitSchwelle", u1: "umlageU1Grenze", kleinbetrieb: "kleinbetriebKuendigung",
  sgb9: "radarSchwerbehinderung", dsb: "radarDatenschutzbeauftragte", mel17: "radarMassenentlassung", br99: "br99Schwelle",
  brueckentz: "radarBrueckenteilzeit", hinschg: "radarHinweisgeber",
};
const grenzText = (r: Regel) => (r.bis ? `bis ${r.grenze}` : r.op === ">" ? `mehr als ${r.grenze}` : `ab ${r.grenze}`);
type Treffer = { r: Regel; status: Status; wert: number; fehlt: number };
/** Zeile für gilt oder gilt_nicht. `ohneAngabe`: Zahl für den Datenschutzbeauftragten fehlt, dann kein Wert statt 0. */
const zeile = (x: Treffer, voll: boolean, ohneAngabe = false) => ({
  thema: x.r.thema,
  gesetz: x.r.gesetz,
  schwelle: grenzText(x.r),
  je: x.r.bezug,
  zaehlweise: x.r.zaehlweise,
  dein_wert: ohneAngabe ? null : x.wert,
  ...(x.status === "giltNicht" && !ohneAngabe ? { fehlt: x.fehlt } : {}),
  ...(x.status === "ohneBr" ? { nur_mit_betriebsrat: true } : {}),
  folge: voll ? x.r.folge : x.r.folge.split(". ")[0].replace(/\.?$/, "."),
});
const koepfe = (n: number) => (Number.isInteger(n) ? plural(n, "Kopf", "Köpfe") : `${dz(n)} gewichtete Köpfe`);

const anzahl = (description: string) => zahl(description, 0, 100000);

const schwellen_check: Werkzeug = {
  name: "schwellen_check",
  titel: "Schwellenwerte: was gilt bei wie vielen Leuten",
  beschreibung:
    "Size thresholds in German employment law (Schwellenwerte): which duties apply at how many employees, each counted the way its law counts (heads, part-time weighting, apprentices). Covers works council, unfair dismissal protection above 10 (KSchG), part-time claims, U1 levy, severely disabled quota, data protection officer, whistleblower channel and more, plus what changes at the next threshold. Use it when a founder asks what applies to a team of their size or what changes with the next hire. Germany only.",
  eingabe: schema({
    koepfe: anzahl("Employees by head count without apprentices; part-time staff and mini-jobbers count, managing directors, freelancers and agency workers do not"),
    azubis: anzahl("Apprentices (Auszubildende)"),
    teilzeit_bis_10_stunden: anzahl("Of the employees, those with up to 10 regular hours per week"),
    teilzeit_11_bis_20_stunden: anzahl("Of the employees, those with more than 10 up to 20 hours per week"),
    teilzeit_21_bis_30_stunden: anzahl("Of the employees, those with more than 20 up to 30 hours per week"),
    arbeitsplaetze_ab_18_stunden: anzahl("Jobs with 18 or more hours per week without apprentices, for the severely disabled quota; estimated if left out"),
    schwerbehinderte: anzahl("Severely disabled employees without apprentices"),
    personen_mit_personendaten: anzahl("People who constantly process personal data by computer, incl. part-time, apprentices and freelancers; for the data protection officer"),
    betriebsrat: janein("True if there is a works council (Betriebsrat)"),
  }, ["koepfe"]),
  baender: (e) => ({ groesse: e.koepfe as number }),
  ausfuehren(e, heute) {
    const formular = Object.fromEntries(SW_FELDER.map((k) => [k, e[FELD[k]] === undefined ? "" : String(e[FELD[k]])])) as Record<SwFeld, string>;
    const p = pruefeSwEingabe(formular, !!e.betriebsrat);
    if (!p.ok) return fehler(Object.entries(p.fehler).map(([k, m]) => `${FELD[k as SwFeld]}: ${m}`).join(" "), heute);
    const s = p.e;
    const res: Treffer[] = REGELN.map((r) => ({ r, ...pruefe(r, s) }));
    const gilt = res.filter((x) => x.status === "gilt" || x.status === "bisGrenze");
    const offen = res.filter((x) => x.status === "giltNicht" || x.status === "ueberGrenze" || x.status === "ohneBr");
    const naechste = res.filter((x) => x.status === "giltNicht" && !(x.r.id === "dsb" && s.datenPersonen === null)).sort((a, b) => a.fehlt - b.fehlt)[0];
    // Pflichtplätze wie auf der Seite: 20 bis 39 Plätze 1, 40 bis 59 Plätze 2, darüber 5 %, ab 0,5 aufgerundet
    const plaetze = s.plaetze18 ?? Math.max(0, s.koepfe - s.bis10 - s.bis20);
    const pflichtplaetze = plaetze < 20 ? 0 : plaetze < 40 ? 1 : plaetze < 60 ? 2 : Math.floor(plaetze * 0.05) + ((plaetze * 0.05) % 1 >= 0.5 ? 1 : 0);
    const quelle = (r: Regel): Quelle => (REGISTER_ID[r.id] ? registerQuelle(REGISTER_ID[r.id], heute) : normQuelle(r.gesetz));
    return antwort({
      ergebnis: {
        koepfe_gesamt: s.koepfe + s.azubis,
        gewichtet_kschg: gewichtet(s),
        gewichtet_u1: gewichtetU1(s),
        gilt: gilt.map((x) => zeile(x, true)),
        gilt_nicht: offen.map((x) => zeile(x, false, x.r.id === "dsb" && s.datenPersonen === null)),
        naechste_schwelle: naechste ? { thema: naechste.r.thema, gesetz: naechste.r.gesetz, schwelle: grenzText(naechste.r), fehlt: naechste.fehlt, folge: naechste.r.folge } : null,
        ...(pflichtplaetze ? { pflichtplaetze_schwerbehinderte: pflichtplaetze } : {}),
        ab_dem_ersten_beschaeftigten: AB_EINS,
      },
      rechenweg: [
        `Köpfe: ${s.koepfe} Arbeitnehmer ohne Azubis, dazu ${plural(s.azubis, "Azubi", "Azubis")}.`,
        `Gewichtet nach § 23 KSchG (bis 20 Std. 0,5, bis 30 Std. 0,75, ohne Azubis): ${dz(gewichtet(s))}.`,
        `Gewichtet nach § 3 AAG für die U1 (bis 10 Std. 0,25, bis 20 Std. 0,5, bis 30 Std. 0,75, ohne Azubis und schwerbehinderte Menschen): ${dz(gewichtetU1(s))}.`,
        `Jede Schwelle zählt nach ihrem Gesetz (zaehlweise je Zeile). ${gilt.length} von ${REGELN.length} geprüften Schwellen treffen zu.`,
      ],
      quellen: [...gilt.map((x) => x.r), ...(naechste ? [naechste.r] : [])].map(quelle),
      fallen: [
        "Maßgeblich ist die Zahl, die in der Regel beschäftigt ist, kein Stichtag. Liegst du knapp an einer Schwelle, lass die Zählung prüfen.",
        "Manche Schwellen zählen je Betrieb (Standort mit eigener Personalleitung), andere für das ganze Unternehmen. Bei mehreren Standorten prüf die Betriebs-Zeilen je Standort. Leiharbeitskräfte auf Stammplätzen zählen bei einigen Schwellen mit, etwa beim KSchG und im BetrVG.",
        ...(s.datenPersonen === null ? ["Für den Datenschutzbeauftragten fehlt die Zahl der Personen, die ständig mit Personendaten am Rechner arbeiten (personen_mit_personendaten)."] : []),
        ...(pflichtplaetze && s.plaetze18 === null ? ["Die Zahl der Arbeitsplätze ab 18 Stunden ist geschätzt (alle über 20 Stunden). Wer 18 bis 20 Stunden arbeitet, zählt mit."] : []),
        ...(s.schwerbehindert ? ["Für die U1-Zählung ist je schwerbehinderter Person ein voller Kopf abgezogen, bei Teilzeit ist das etwas zu viel."] : []),
      ],
      naechster_schritt: [
        ...(naechste
          ? [`Nächste Schwelle: ${naechste.r.thema} (${grenzText(naechste.r)}). Dir ${naechste.fehlt === 1 ? "fehlt" : "fehlen"} ${koepfe(naechste.fehlt)}. Dann gilt: ${naechste.r.folge}`]
          : []),
        ...(pflichtplaetze > s.schwerbehindert
          ? [`Pflichtplätze für schwerbehinderte Menschen: ${pflichtplaetze}, besetzt ${s.schwerbehindert}. Für unbesetzte Pflichtplätze fällt Ausgleichsabgabe an, Anzeige und Zahlung bis 31. März für das Vorjahr (Werkzeug ausgleichsabgabe).`]
          : []),
        "Prüf die Pflichten ab dem ersten Beschäftigten (ab_dem_ersten_beschaeftigten), sie gelten unabhängig von der Größe.",
      ],
    }, heute);
  },
};

/* ---------- Sonderkündigungsschutz ---------- */

const ANTWORTEN = ["ja", "nein", "unklar"] as const;
const BEDEUTUNG: Record<Stufe, string> = { zustimmung: "Ohne Zustimmung keine Kündigung", ausgeschlossen: "Ordentliche Kündigung ausgeschlossen", pruefen: "Vor der Kündigung klären" };
/** Die Fragen der Seite auf Englisch für das Modell. */
const FRAGE: Record<string, string> = {
  mutterschutz: "Is the person pregnant, gave birth up to 4 months ago, still in the protection period after birth, or had a miscarriage after the 12th week of pregnancy?",
  elternzeit: "Has the person requested parental leave (Elternzeit) or is on it, or works part-time while receiving parental allowance?",
  pflege: "Has the person announced or is taking short-term care leave, care leave or family care leave (Pflegezeit, Familienpflegezeit)?",
  betriebsrat: "Is the person a member of the works council, the youth representation or representative of severely disabled employees, or left such office within the last 12 months?",
  wahl: "Is the person on the election board or a candidate, or did they invite to or prepare a works council election?",
  schwerbehindert: "Is the person severely disabled (degree of disability 50 or more) or treated as equal (gleichgestellt)? Answer unklar if an application is pending or you do not know.",
  dsb: "Is the person your mandatory data protection officer, or was removed from that role within the last 12 months?",
  azubi: "Is the person an apprentice whose probation period is over?",
  beauftragte: "Is the person an appointed officer for emission control, incidents, waste or water protection, or was removed from that role within the last 12 months?",
  wehrdienst: "Has the person received a call-up notice or is doing military service or a military exercise?",
  hinweisgeber: "Has the person recently reported a violation (whistleblowing), internally or to an external reporting channel?",
};
const antwortFeld = (frage: string) => text(`${frage} Answer ja, nein or unklar; not answered counts as nein.`, { enum: ANTWORTEN });

const sonderkuendigungsschutz_check: Werkzeug = {
  name: "sonderkuendigungsschutz_check",
  titel: "Sonderkündigungsschutz prüfen",
  beschreibung:
    "Special protection against dismissal under German law (Sonderkündigungsschutz): checks 11 grounds such as pregnancy, parental leave, care leave, works council, severe disability, data protection officer, apprentices and whistleblowers. Returns a traffic light, the authority whose consent is needed, the protected period and the steps before giving notice. Use it before any dismissal, also in small businesses. Germany only.",
  eingabe: schema({
    ...Object.fromEntries(SCHUTZ.map((s) => [s.id, antwortFeld(FRAGE[s.id] ?? s.frage)])),
    laenger_als_6_monate: antwortFeld("Only for severe disability: has the employment lasted more than 6 months without interruption? Default ja."),
    betriebsrat_vorhanden: antwortFeld("Is there a works council (Betriebsrat) in the business? Default nein."),
  }),
  ausfuehren(e, heute) {
    const treffer = auswerten(e as Record<string, Antwort>, (e.laenger_als_6_monate as Antwort | undefined) ?? "ja");
    const offen = SCHUTZ.filter((s) => !e[s.id]).length;
    const rot = treffer.filter((t) => t.effektiv !== "pruefen").length, gelb = treffer.length - rot;
    const br = (e.betriebsrat_vorhanden as Antwort | undefined) ?? "nein";
    return antwort({
      ergebnis: {
        // Treffer sind nach Schwere sortiert, der erste gibt die Überschrift
        ergebnis: treffer.length ? BEDEUTUNG[treffer[0].effektiv] : "Kein Sonderschutz erkennbar",
        ampel: rot ? "rot" : gelb ? "gelb" : "gruen",
        rot,
        gelb,
        offene_fragen: offen,
        treffer: treffer.map((t) => ({
          schutz: t.titel,
          grundlage: t.grundlage,
          stufe: t.effektiv,
          bedeutung: BEDEUTUNG[t.effektiv],
          ampel: t.effektiv === "pruefen" ? "gelb" : "rot",
          zustaendig: t.stelle,
          zeitraum: t.zeitraum,
          ...(t.zusatz ? { hinweis: t.zusatz } : {}),
          schritte: t.schritte,
        })),
      },
      rechenweg: [`${SCHUTZ.length} Schutzgründe geprüft, ${treffer.length} treffen zu: ${rot} rot, ${gelb} gelb. Rot heißt: ohne Zustimmung keine Kündigung oder ordentliche Kündigung ausgeschlossen. Gelb heißt: vor der Kündigung klären.`],
      quellen: [
        ...treffer.map((t) => normQuelle(t.grundlage)),
        ...(treffer.some((t) => t.id === "schwerbehindert") ? [registerQuelle("schwerbehindertKuendigung", heute)] : []),
        ...(br !== "nein" ? [registerQuelle("betriebsratAnhoerung", heute)] : []),
        normQuelle("§ 623 BGB"),
      ],
      fallen: [
        ...(treffer.length === 0 && offen ? [`${offen} Fragen sind nicht beantwortet und zählen als „nein“. Prüf sie, bevor du dich auf das Ergebnis verlässt.`] : []),
        ...(treffer.length === 0 ? ["Das Kündigungsschutzgesetz kann trotzdem gelten (mehr als 10 Beschäftigte, mehr als 6 Monate im Betrieb)."] : []),
        ...(treffer.filter((t) => t.effektiv === "zustimmung").length > 1 ? ["Jeder Schutz gilt für sich, du brauchst jede Zustimmung einzeln."] : []),
        "Der Sonderkündigungsschutz gilt auch im Kleinbetrieb ohne Kündigungsschutzgesetz.",
      ],
      naechster_schritt: [
        ...(br === "ja" ? ["Hör den Betriebsrat vor jeder Kündigung an (§ 102 BetrVG). Ohne Anhörung ist die Kündigung unwirksam."] : []),
        ...(br === "unklar" ? ["Kläre, ob es einen Betriebsrat gibt. Wenn ja, hör ihn vor jeder Kündigung an (§ 102 BetrVG)."] : []),
        "Übergib die Kündigung schriftlich auf Papier mit eigenhändiger Unterschrift (§ 623 BGB). E-Mail oder Scan reichen nicht.",
        "Mach den Zugang beweisbar: persönliche Übergabe mit Zeugin oder Zeuge, oder Einwurf durch einen Boten.",
      ],
    }, heute);
  },
};

/* ---------- BEM (§ 167 Abs. 2 SGB IX) ---------- */

const bem_pflicht: Werkzeug = {
  name: "bem_pflicht",
  titel: "BEM-Pflicht prüfen",
  beschreibung:
    "Checks whether an employer must offer occupational integration management under German law (betriebliches Eingliederungsmanagement, BEM, § 167 Abs. 2 SGB IX): more than 6 weeks of incapacity to work within the last 12 months, counted in calendar days and in working days, whatever the cause. Returns the counts, the day the limit was crossed and the next steps. Applies from the first employee. Germany only.",
  eingabe: schema({
    stichtag: datum("Reference date, the 12 months before it are counted; default today"),
    zeitraeume: liste(
      "Periods of incapacity to work (Arbeitsunfähigkeit) of any cause, incl. partial incapacity. Follow-up notes as one period.",
      schema({ von: datum("First day"), bis: datum("Last day; leave out if still ongoing") }, ["von"]),
      20,
    ),
    arbeitstage: liste("Working days of the person, default Mo to Fr", text("Weekday", { enum: TAGE }), 7),
  }, ["zeitraeume"]),
  ausfuehren(e, heute) {
    const st = toDay((e.stichtag as string | undefined) ?? heute);
    if (Number.isNaN(st)) return fehler("Der Stichtag ist kein gültiges Datum.", heute);
    const tage = (e.arbeitstage as string[] | undefined) ?? ["Mo", "Di", "Mi", "Do", "Fr"];
    const woche = TAGE.map((t) => tage.includes(t));
    if (!woche.some(Boolean)) return fehler("Wähle mindestens einen Arbeitstag.", heute);
    const perioden: { von: number; bis: number | null }[] = [];
    const spaeter: number[] = [];
    for (const [i, z] of (e.zeitraeume as { von: string; bis?: string }[]).entries()) {
      const von = toDay(z.von), bis = z.bis === undefined ? null : toDay(z.bis);
      if (Number.isNaN(von) || (bis !== null && Number.isNaN(bis))) return fehler(`Zeitraum ${i + 1}: kein gültiges Datum.`, heute);
      if (bis !== null && bis < von) return fehler(`Zeitraum ${i + 1}: Das Ende liegt vor dem Beginn.`, heute);
      if (von > st) spaeter.push(i + 1);
      else perioden.push({ von, bis });
    }
    if (!perioden.length) return fehler("Trag mindestens einen Zeitraum ein, der vor dem Stichtag beginnt.", heute);
    const r = berechneBem(perioden, st, woche);
    const proWoche = woche.filter(Boolean).length;
    const pflicht = r.ueberKalender || r.ueberArbeit;
    const erstmals = [r.erstmalsKalender, r.erstmalsArbeit].filter((x): x is number => x !== null).sort((a, b) => a - b)[0] ?? null;
    const nach = r.erstmalsKalender === erstmals && r.erstmalsArbeit === erstmals ? "Kalendertage und Arbeitstage" : r.erstmalsArbeit === erstmals ? "Arbeitstage" : "Kalendertage";
    const bloecke: [number, number][] = [];
    for (const d of r.tage) {
      const l = bloecke[bloecke.length - 1];
      if (l && d === l[1] + 1) l[1] = d;
      else bloecke.push([d, d]);
    }
    const wiedervorlage = addMonthsDay(st, 1);
    return antwort({
      ergebnis: {
        stichtag: fromDay(st),
        betrachtungszeitraum: { von: fromDay(r.fensterVon), bis: fromDay(r.fensterBis) },
        au_kalendertage: r.kalendertage,
        au_arbeitstage: r.arbeitstage,
        grenze_kalendertage: 42,
        grenze_arbeitstage: r.schwelleArbeitstage,
        bem_pflicht: pflicht,
        ...(pflicht ? { grenze_ueberschritten_am: erstmals === null ? null : fromDay(erstmals), gezaehlt_nach: nach } : { fehlen_noch_kalendertage: 43 - r.kalendertage }),
        zeitraeume: bloecke.map(([a, b]) => ({ von: fromDay(a), bis: fromDay(b), tage: b - a + 1 })),
      },
      rechenweg: [
        `Gezählt werden die 12 Monate bis zum Stichtag: ${fmtDay(r.fensterVon)} bis ${fmtDay(r.fensterBis)}. Überschneidungen zählen einmal, ein Zeitraum ohne Ende läuft bis zum Stichtag.`,
        `Kalendertage mit Arbeitsunfähigkeit: ${r.kalendertage}, die Grenze ist mehr als 42 (6 Wochen).`,
        `Arbeitstage mit Arbeitsunfähigkeit: ${r.arbeitstage}, die Grenze ist mehr als ${r.schwelleArbeitstage} (6 × ${proWoche} Arbeitstage).`,
        ...(pflicht && erstmals !== null ? [`Die Grenze wurde am ${weekdayDay(erstmals)}, ${fmtDay(erstmals)} überschritten${nach === "Kalendertage" ? " (nach Kalendertagen gezählt)" : nach === "Arbeitstage" ? " (nach Arbeitstagen gezählt)" : ""}. Ab da musst du das BEM anbieten. Eine feste Frist gibt es nicht, warte aber nicht lange.`] : []),
      ],
      quellen: [registerQuelle("bemSchwelleTage", heute)],
      fallen: [
        ...(r.ueberKalender !== r.ueberArbeit ? ["Die Zählweisen kommen zu verschiedenen Ergebnissen. Ob sechs Wochen 42 Kalendertage oder Arbeitstage sind, ist nicht abschließend geklärt. Biete das BEM an, sobald eine Zählweise die Grenze überschreitet. Ein angebotenes BEM schadet nie."] : []),
        ...(spaeter.length ? [`Zeitraum ${spaeter.join(", ")} beginnt nach dem Stichtag und zählt nicht.`] : []),
        "Seit 30.07.2026 zählen auch Zeiten mit Teilarbeitsunfähigkeit (§ 167 Abs. 2 Satz 1 SGB IX).",
        "Die Pflicht gilt auch im Kleinbetrieb, ab dem ersten Beschäftigten.",
        "Vor einer krankheitsbedingten Kündigung lass den Ablauf prüfen. Ohne angebotenes BEM wird sie schwer zu halten.",
      ],
      naechster_schritt: pflicht
        ? [
          "Schriftlich einladen. Ziele nennen und sagen, welche Daten du erhebst, wofür und wer sie sieht (§ 167 Abs. 2 Satz 4 SGB IX).",
          "Freiwilligkeit betonen. Die Person darf eine Vertrauensperson eigener Wahl mitbringen.",
          "Betriebsrat beteiligen, falls vorhanden und die Person zustimmt. Bei Schwerbehinderung zusätzlich die Schwerbehindertenvertretung.",
          "BEM-Unterlagen getrennt von der Personalakte führen. Dorthin nur Einladung, Antwort und Maßnahmen.",
          "Jeden Schritt mit Datum festhalten, auch eine Ablehnung.",
        ]
        : [
          "Prüf die Krankmeldungen einmal im Monat. Wer die Grenze überschreitet, bekommt innerhalb von zwei Wochen eine Einladung.",
          `Frist merken: Werkzeug frist_merken, Frist „Wiedervorlage BEM-Prüfung“ am ${fmtDay(wiedervorlage)}.`,
        ],
    }, heute);
  },
};

export const PFLICHTEN: Werkzeug[] = [schwellen_check, sonderkuendigungsschutz_check, bem_pflicht];
