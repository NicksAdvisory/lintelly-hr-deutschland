/** Fristen und Zeiten aus den Rechnern von lintelly.com/tools. Die Rechnung steht in packages/kern, hier nur Eingabe und Antwort. */
import { DOKUMENTE, jetztLoeschen, loeschplan, pruefungLesen, verbindlicheFrist } from "../../../kern/website/components/tools/aufbewahrungsfristen-logik";
import { pruefeBefristung, type Schrift, type Vorbesch } from "../../../kern/website/components/tools/befristung-logik";
import { addDays, diffDays, fmt, fmtDay, fromDay, parseYmd, toDay, toYmd } from "../../../kern/website/components/tools/datum";
import { berechneElternzeit, TEXTFORM_AB } from "../../../kern/website/components/tools/elternzeit-logik";
import { zahl as dezimal } from "../../../kern/website/components/tools/format";
import { berechneFehlgeburt, berechneGeburt } from "../../../kern/website/components/tools/mutterschutz-logik";
import { hm, pruefeTage, STAND_2026 as PAUSEN } from "../../../kern/website/components/tools/pausen-logik";
import { berechneProbezeit } from "../../../kern/website/components/tools/probezeit-logik";
import { antwort, normQuelle, registerQuelle } from "../antwort";
import { datum, janein, liste, schema, text, zahl } from "../eingabe";
import type { Werkzeug } from "../werkzeug";

/** Hinweis auf „Frist merken“ (lintelly.com), dort heißt die Frist wie auf der Seite. */
const merken = (fristname: string, tag: string) => `Frist merken: Werkzeug frist_merken (${fristname}, ${tag})`;

type ProbezeitE = { beginn: string; dauer: number; einheit?: "monate" | "wochen"; beschaeftigte?: number; befristet_bis?: string; ausbildung?: boolean };

const probezeit: Werkzeug = {
  name: "probezeit",
  titel: "Probezeit-Rechner",
  beschreibung:
    "German employment law, Germany only: end of the probation period (Probezeit) from the first working day, the last day a dismissal with 2 weeks notice can be delivered (§ 622 Abs. 3 BGB), when protection against dismissal (Kündigungsschutz, KSchG) starts and dates for the review meeting. Covers apprenticeships (Ausbildung, BBiG) and fixed-term contracts (Befristung). Use it when someone asks when a probation period ends or until when they can still dismiss with the short notice.",
  eingabe: schema({
    beginn: datum("First working day according to the contract"),
    dauer: zahl("Length of the probation period as a whole number, unit see einheit", 1, 26),
    einheit: text("Unit of dauer, default monate", { enum: ["monate", "wochen"] }),
    beschaeftigte: zahl("Employees in the business, part-time counted pro rata, apprentices not counted (§ 23 KSchG). Leave out if unknown", 0, 100000),
    befristet_bis: datum("End date if the contract is fixed-term (Befristung)"),
    ausbildung: janein("true for an apprenticeship (Ausbildung, BBiG): 1 to 4 months, dismissal without notice period"),
  }, ["beginn", "dauer"]),
  baender: (e) => (e.beschaeftigte === undefined ? {} : { groesse: e.beschaeftigte as number }),
  ausfuehren(roh, heute) {
    const e = roh as ProbezeitE;
    const azubi = e.ausbildung ?? false;
    const groesse = e.beschaeftigte === undefined ? "unklar" : e.beschaeftigte > 10 ? "gross" : "klein";
    const quellen = azubi
      ? [registerQuelle("azubiProbezeitMonate", heute), registerQuelle("azubiProbezeit", heute)]
      : [registerQuelle("probezeitHoechstMonate", heute), registerQuelle("probezeitKuendigungTage", heute), registerQuelle("kschgWartezeitMonate", heute)];
    const res = berechneProbezeit({
      beginn: e.beginn, einheit: e.einheit ?? "monate", dauer: e.dauer, befristet: !!e.befristet_bis, befristetBis: e.befristet_bis ?? "", groesse, azubi,
    });
    const r = res.ergebnis;
    if (!r) return antwort({ ergebnis: { fehler: Object.values(res.fehler ?? {}) as string[] }, quellen }, heute);

    const vorbei = toYmd(r.ende) < heute;
    const wochenende = +r.zugangEmpf !== +r.ende;
    const anteil = r.anteil === null ? null : Math.round(r.anteil * 100);
    // Bei kurzer Probezeit liegen Gespräch oder Entscheidung vor dem ersten Arbeitstag und entfallen (lintelly.com 28.10.2026).
    const termine = r.gespraech && r.entscheidung
      ? `Probezeitgespräch 4 Wochen vor dem Ende: bis ${fmt(r.gespraech)}. Entscheidung 2 Wochen vor dem Ende: bis ${fmt(r.entscheidung)}.`
      : r.entscheidung ? `Probezeit kurz: Gespräch und Entscheidung zusammen bis ${fmt(r.entscheidung)}.` : "Probezeit sehr kurz: Gespräch und Entscheidung gleich in den ersten Tagen.";
    quellen.push(normQuelle("§ 188 Abs. 2 BGB"), normQuelle("§ 623 BGB"));
    if (!azubi && groesse !== "gross") quellen.push(normQuelle("§ 23 Abs. 1 KSchG"));
    if (r.luecke) quellen.push(normQuelle("§ 622 Abs. 1 BGB"));
    if (r.befristetBis) quellen.push(registerQuelle("probezeitBefristungAnteil", heute), normQuelle("§ 15 Abs. 4 TzBfG"));

    return antwort({
      ergebnis: {
        probezeit_ende: toYmd(r.ende),
        probezeit_tage: r.probeTage,
        zugang_empfohlen_bis: toYmd(r.zugangEmpf),
        kuendigungsfrist_tage: azubi ? 0 : 14,
        ende_bei_kuendigung_am_letzten_tag: toYmd(r.kuendEnde),
        wartezeit_kschg_ende: azubi ? null : toYmd(r.wartezeitEnde),
        kuendigungsschutz_ab: azubi || groesse === "klein" ? null : toYmd(r.kschgAb),
        luecke_bis_kuendigungsschutz: r.luecke,
        probezeitgespraech_bis: r.gespraech ? toYmd(r.gespraech) : null,
        entscheidung_bis: r.entscheidung ? toYmd(r.entscheidung) : null,
        ...(r.befristetBis ? { befristung_laufzeit_tage: r.laufTage, probezeit_anteil_prozent: anteil } : {}),
      },
      rechenweg: [
        `Probezeit ${e.dauer} ${e.einheit === "wochen" ? "Wochen" : "Monate"} ab ${fmt(r.beginn)}: letzter Tag ${fmt(r.ende, true)} (§§ 187 Abs. 2, 188 Abs. 2 BGB), ${r.probeTage} Kalendertage.`,
        azubi
          ? "In der Ausbildung kündigen beide Seiten in der Probezeit ohne Frist (§ 22 Abs. 1 BBiG). Die Kündigung muss spätestens am letzten Probezeittag zugehen."
          : `Eine Kündigung muss spätestens am ${fmt(r.ende)} zugehen. Mit 2 Wochen Frist (§ 622 Abs. 3 BGB) endet das Arbeitsverhältnis dann am ${fmt(r.kuendEnde, true)}.`,
        ...(azubi ? [] : [groesse === "klein"
          ? `Die Wartezeit nach § 1 KSchG endet am ${fmt(r.wartezeitEnde)}. Mit 10 oder weniger Beschäftigten gilt das KSchG aber nicht (§ 23 KSchG).`
          : `Die Wartezeit nach § 1 KSchG endet am ${fmt(r.wartezeitEnde)}, Kündigungsschutz ab ${fmt(r.kschgAb)}${groesse === "unklar" ? ", nur bei mehr als 10 Beschäftigten" : ""}.`]),
        termine,
        ...(r.befristetBis ? [`Befristung bis ${fmt(r.befristetBis)}: ${r.laufTage} Tage Laufzeit, die Probezeit nimmt ${anteil} % davon ein.`] : []),
      ],
      quellen,
      fallen: [
        ...(vorbei ? [azubi ? "Die Probezeit ist vorbei. Kündigen kannst du nur noch aus wichtigem Grund." : "Die Probezeit ist vorbei. Es gilt die normale Kündigungsfrist."] : []),
        ...(wochenende ? [`Der letzte Probezeittag fällt aufs Wochenende (${fmt(r.ende, true)}). Ein Brief im Briefkasten geht erst zu, wenn man ihn zur üblichen Postzeit erwarten kann, samstags nachmittags oder sonntags eingeworfen meist erst am Montag. Das Ende der Probezeit verschiebt sich nicht. Übergib die Kündigung bis ${fmt(r.zugangEmpf, true)} persönlich. Feiertage deines Bundeslands sind nicht geprüft.`] : []),
        ...(r.befristetBis && anteil !== null ? [
          anteil >= 100
            ? "Die Probezeit ist so lang wie die Befristung. Das ist nach § 15 Abs. 3 TzBfG kaum zu begründen. Kürze die Probezeit."
            : `Bei Befristungen muss die Probezeit zur Laufzeit und zur Tätigkeit passen (§ 15 Abs. 3 TzBfG). Einen festen Prozentwert gibt es nicht (BAG, 30.10.2025, 2 AZR 160/24).${r.anteil! > 0.5 ? " Mehr als die Hälfte der Laufzeit ist schwer zu begründen." : ""}`,
          "Nach der Probezeit ist ein befristeter Vertrag nur ordentlich kündbar, wenn das ausdrücklich vereinbart ist (§ 15 Abs. 4 TzBfG).",
        ] : []),
        ...(r.luecke ? ["Probezeit kürzer als 6 Monate: Danach gilt die Frist von 4 Wochen zum 15. oder zum Monatsende (§ 622 Abs. 1 BGB). Kündigungsschutz nach dem KSchG gibt es trotzdem erst nach 6 Monaten."] : []),
        ...(!azubi && groesse === "unklar" ? ["Das KSchG gilt nur in Betrieben mit mehr als 10 Beschäftigten. Teilzeit zählt anteilig, Azubis zählen nicht (§ 23 KSchG)."] : []),
        azubi
          ? "Nach der Probezeit kannst du nur noch aus wichtigem Grund kündigen und musst die Gründe ins Schreiben nehmen. Der Azubi kann mit 4 Wochen Frist kündigen, wenn er die Ausbildung aufgibt oder wechselt (§ 22 Abs. 2 BBiG)."
          : "Verlängern geht nur bis zur Grenze von 6 Monaten, per Vereinbarung vor dem Ende der Probezeit. Danach bleibt nur, noch in der Wartezeit zu kündigen oder einen Aufhebungsvertrag mit längerer Auslauffrist und Wiedereinstellungszusage bei Bewährung zu schließen (BAG, 07.03.2002, 2 AZR 93/01).",
        "Die Kündigung braucht Papier mit Originalunterschrift (§ 623 BGB). E-Mail, PDF oder Messenger reichen nicht.",
      ],
      naechster_schritt: toYmd(r.ende) > heute ? [
        ...(r.entscheidung ? [termine] : []),
        merken("Ende der Probezeit", toYmd(r.ende)),
      ] : [],
    }, heute);
  },
};

type BefristungE = {
  beginn: string; ende?: string; verlaengerungen?: { vereinbart_am: string; neues_ende: string; bedingungen_geaendert?: boolean }[];
  vorbeschaeftigung?: Vorbesch; vorbeschaeftigung_ende?: string; regelaltersgrenze?: boolean; gruendung?: string; ab52?: boolean; schriftform?: Schrift;
};
const AMPEL = { ok: "grün", due: "gelb", late: "rot" } as const;
const BEWERTUNG = { ok: "Nach deinen Angaben zulässig", due: "Zulässig, aber mit offenen Punkten", late: "Befristung so nicht haltbar" } as const;

const befristung: Werkzeug = {
  name: "befristung",
  titel: "Befristungs-Rechner",
  beschreibung:
    "German employment law, Germany only: checks a fixed-term contract without objective reason (sachgrundlose Befristung, § 14 TzBfG). Returns the latest allowed end date (2 years, 4 for new companies, 5 from age 52), extensions used and left, and a traffic light with findings on prior employment (Vorbeschäftigung), written form (Schriftform) and extensions (Verlängerung). Use it before signing or extending a fixed-term contract.",
  eingabe: schema({
    beginn: datum("Start of the first fixed-term contract"),
    ende: datum("End of the first contract, without extensions"),
    verlaengerungen: liste("Extensions in order", schema({
      vereinbart_am: datum("Day both sides signed the extension"),
      neues_ende: datum("New end date"),
      bedingungen_geaendert: janein("Salary, hours or tasks were changed together with the extension"),
    }, ["vereinbart_am", "neues_ende"]), 6),
    vorbeschaeftigung: text("Employed before by the same employer: nein (never), arbeit (as employee, also mini-job or working student), azubi (only apprenticeship), praktikum (internship), leih (temp agency worker). Default nein", { enum: ["nein", "arbeit", "azubi", "praktikum", "leih"] }),
    vorbeschaeftigung_ende: datum("End of the earlier employment, optional"),
    regelaltersgrenze: janein("Person had reached the standard retirement age at contract start (§ 41 Abs. 2 SGB VI)"),
    gruendung: datum("Founding date if the company is a new business (§ 14 Abs. 2a TzBfG)"),
    ab52: janein("Special case: at least 52 at start and unemployed for at least 4 months before (§ 14 Abs. 3 TzBfG)"),
    schriftform: text("Signed on paper by both sides before the first working day: ja, nein, unklar. Default unklar", { enum: ["ja", "nein", "unklar"] }),
  }, ["beginn"]),
  ausfuehren(roh, heute) {
    const e = roh as BefristungE;
    const verl = (e.verlaengerungen ?? []).map((v, i) => ({ id: i + 1, am: v.vereinbart_am, bis: v.neues_ende, geaendert: v.bedingungen_geaendert ?? false }));
    const r = pruefeBefristung({
      beginn: e.beginn, ende1: e.ende ?? "", verl, vorbesch: e.vorbeschaeftigung ?? "nein", vorbeschEnde: e.vorbeschaeftigung_ende ?? "",
      gruendung: e.gruendung ?? "", ab52: e.ab52 ?? false, rente: e.regelaltersgrenze ?? false, schrift: e.schriftform ?? "unklar", heute: parseYmd(heute)!,
    });
    const quellen = [registerQuelle("befristungSachgrundlosMonate", heute), registerQuelle("befristungVerlaengerungenMax", heute), registerQuelle("befristungSchriftform", heute)];
    if (r.maxEnde === undefined) return antwort({ ergebnis: { fehler: Object.values(r.errors ?? {}) as string[] }, quellen }, heute);
    const fehler = [...Object.values(r.errors), ...Object.entries(r.vErr).map(([id, f]) => `Verlängerung ${id}: ${f}`)];
    if (fehler.length) return antwort({ ergebnis: { fehler }, quellen }, heute);

    const texte = r.msgs.map((m) => m.text ?? "").join(" ");
    if (e.vorbeschaeftigung === "arbeit" && !e.regelaltersgrenze) quellen.push(registerQuelle("vorbeschaeftigungVerbot", heute));
    if (e.regelaltersgrenze) quellen.push(normQuelle("§ 41 Abs. 2 SGB VI"));
    if (r.basis.key !== "regel") quellen.push(normQuelle(r.basis.norm));
    if (texte.includes("§ 15 Abs. 6")) quellen.push(normQuelle("§ 15 Abs. 6 TzBfG"));
    if (texte.includes("§ 16 TzBfG")) quellen.push(normQuelle("§ 16 TzBfG"));
    quellen.push(normQuelle("§ 17 TzBfG"));

    const frist = toYmd(r.aktEnde ?? r.maxEnde);
    const verlaengern = r.aktEnde && r.aktEnde >= r.heute && r.verlUebrig !== 0 && r.aktEnde < r.maxEnde && r.ampel !== "late";
    return antwort({
      ergebnis: {
        bewertung: BEWERTUNG[r.ampel],
        ampel: AMPEL[r.ampel],
        grundlage: r.basis.name,
        norm: r.basis.norm,
        hoechstdauer_jahre: r.basis.jahre,
        spaetestes_ende: toYmd(r.maxEnde),
        aktuelles_ende: r.aktEnde ? toYmd(r.aktEnde) : null,
        verlaengerungen_genutzt: r.nVerl,
        verlaengerungen_uebrig: r.verlUebrig,
        restlaufzeit_tage: r.aktEnde && r.aktEnde >= r.heute ? diffDays(r.heute, r.aktEnde) : null,
        spielraum_tage: r.aktEnde ? Math.max(0, diffDays(r.aktEnde, r.maxEnde)) : null,
        pruefpunkte: r.msgs.map((m) => ({ stufe: AMPEL[m.level], titel: m.title })),
      },
      rechenweg: [
        `Grundlage: ${r.basis.name} (${r.basis.norm}), höchstens ${r.basis.jahre} Jahre ab ${fmt(r.beginn)}, also bis ${fmt(r.maxEnde)}.`,
        ...r.segs.map((s) => `${s.label}: ${fmt(s.von)} bis ${fmt(s.bis)}.`),
        r.verlUebrig === null ? "Verlängerungen: beliebig viele bis zur Höchstdauer." : `Verlängerungen: ${r.nVerl} genutzt, ${r.verlUebrig} von ${r.basis.maxVerl} übrig.`,
        ...r.msgs.filter((m) => m.level === "ok").map((m) => `${m.title}. ${m.text}`),
      ],
      quellen,
      fallen: [
        ...r.msgs.filter((m) => m.level !== "ok").map((m) => `${m.title}. ${m.text}`),
        "Die Klagefrist beträgt 3 Wochen nach dem vereinbarten Ende (§ 17 TzBfG).",
      ],
      naechster_schritt: [
        ...(verlaengern ? [`Eine Verlängerung muss spätestens am ${fmt(r.aktEnde!, true)} von beiden auf Papier unterschrieben sein. Plan zwei Wochen Vorlauf ein und ändere dabei nichts außer dem Enddatum.`] : []),
        ...(frist > heute ? [merken(r.aktEnde ? "Ende des befristeten Vertrags" : "Spätestes Ende ohne Sachgrund", frist)] : []),
      ],
    }, heute);
  },
};

type ElternzeitE = {
  geburt: string; noch_nicht_geboren?: boolean; elternteil?: "mutter" | "anderer"; mutterschutz_12_wochen?: boolean; errechneter_termin?: string;
  beginn: string; ende: string; antrag_zugang?: string; jahresurlaub?: number; teilzeit?: boolean; beschaeftigte?: number;
};

const elternzeit_fristen: Werkzeug = {
  name: "elternzeit_fristen",
  titel: "Elternzeit-Fristen",
  beschreibung:
    "German employment law, Germany only: deadlines for parental leave (Elternzeit, §§ 15 to 18 BEEG). Returns the last day the request must reach the employer (7 weeks, 13 weeks after the 3rd birthday), the required form, start and end of protection against dismissal (Kündigungsschutz), the end of maternity protection for the mother and the possible cut of annual leave (Urlaubskürzung). Use it when an employee announces parental leave or a request has arrived.",
  eingabe: schema({
    geburt: datum("Child's date of birth, or the expected date if not born yet"),
    noch_nicht_geboren: janein("true if the child is not born yet, geburt is then the expected date"),
    elternteil: text("Who takes the leave: mutter (mother) or anderer (father or other parent). Default anderer", { enum: ["mutter", "anderer"] }),
    mutterschutz_12_wochen: janein("Mother only: premature or multiple birth or disability, maternity protection 12 instead of 8 weeks after birth"),
    errechneter_termin: datum("Mother only, child born: expected date of delivery if the child came early, extends maternity protection"),
    beginn: datum("First day of parental leave"),
    ende: datum("Last day of parental leave"),
    antrag_zugang: datum("Day the request reached the employer, optional"),
    jahresurlaub: zahl("Annual leave in days, optional, for the possible cut", 0, 60),
    teilzeit: janein("Employee works part-time for you during parental leave"),
    beschaeftigte: zahl("Employees without apprentices, optional, decides the claim to part-time (more than 15)", 0, 100000),
  }, ["geburt", "beginn", "ende"]),
  baender: (e) => (e.beschaeftigte === undefined ? {} : { groesse: e.beschaeftigte as number }),
  ausfuehren(roh, heute) {
    const e = roh as ElternzeitE;
    const mutter = e.elternteil === "mutter";
    const g = toDay(e.geburt), b = toDay(e.beginn), en = toDay(e.ende), z = e.antrag_zugang ? toDay(e.antrag_zugang) : null;
    const et = mutter && !e.noch_nicht_geboren && e.errechneter_termin ? toDay(e.errechneter_termin) : null;
    const quellen = [registerQuelle("elternzeitAnmeldungWochen", heute), registerQuelle("elternzeitSchutzVorherWochen", heute), normQuelle("§ 15 Abs. 2 BEEG")];
    if ([g, b, en, z, et].some((x) => Number.isNaN(x))) return antwort({ ergebnis: { fehler: ["Eines der Daten gibt es im Kalender nicht."] }, quellen }, heute);
    const r = berechneElternzeit({
      geburt: g, et, elternteil: mutter ? "mutter" : "anderer", mutterschutz12: e.mutterschutz_12_wochen ?? false,
      beginn: b, ende: en, zugang: z, teilzeit: e.teilzeit ?? false, urlaub: e.jahresurlaub ?? null, heute: toDay(heute),
    });
    if (r.fehler.length) return antwort({ ergebnis: { fehler: r.fehler }, quellen, fallen: r.warnungen }, heute);

    const a0 = r.abschnitte[0];
    const textform = g >= TEXTFORM_AB;
    const ueber15 = e.beschaeftigte === undefined ? null : e.beschaeftigte > 15;
    const anspruch = `Anspruch bei mehr als 6 Monaten Beschäftigung, 15 bis 32 Wochenstunden für mindestens 2 Monate und ohne dringende betriebliche Gründe dagegen. Ablehnen nur mit Begründung: bis zum 3. Geburtstag binnen 4 Wochen, danach binnen 8 Wochen, sonst gilt die Zustimmung als erteilt.${textform ? " Textform reicht." : " Bei Kindern vor dem 01.05.2025 schriftlich."}`;
    const teilzeit = ueber15 === false
      ? "Mit 15 oder weniger Beschäftigten gibt es keinen Anspruch auf Teilzeit in Elternzeit (§ 15 Abs. 7 BEEG). Ihr könnt sie trotzdem vereinbaren, bis 32 Wochenstunden."
      : ueber15 ? `Teilzeit in Elternzeit: ${anspruch}` : `Einen Anspruch auf Teilzeit in Elternzeit gibt es nur mit mehr als 15 Beschäftigten ohne Azubis (§ 15 Abs. 7 BEEG). Dann gilt: ${anspruch}`;
    if (r.abschnitte.some((a) => a.ab3)) quellen.push(registerQuelle("elternzeitAnmeldungWochenNach3", heute));
    quellen.push(registerQuelle("elternzeitKuerzungMonate", heute));
    if (mutter) quellen.push(registerQuelle("mutterschutzNachTage", heute));
    if (e.teilzeit) quellen.push(registerQuelle("elternzeitTeilzeit", heute), normQuelle("§ 15 Abs. 7 BEEG"));

    const frist = z === null ? ["Spätester Eingang des Elternzeit-Antrags", fromDay(a0.spaetesterZugang)] : ["Beginn der Elternzeit", e.beginn];
    return antwort({
      ergebnis: {
        antrag_spaetestens: fromDay(a0.spaetesterZugang),
        antrag_frist_wochen: a0.fristWochen,
        antrag_form: textform ? "Textform, eine E-Mail reicht" : "Schriftform mit Unterschrift",
        ...(z !== null ? { antrag_rechtzeitig: !r.zuSpaet, ...(r.zuSpaet ? { beginn_fruehestens: fromDay(r.fruehesterBeginnBeiZugang!) } : {}) } : {}),
        ...(r.fristVorbei ? { antragsfrist_vorbei: true, beginn_fruehestens: fromDay(r.fruehesterBeginnAbHeute!) } : {}),
        ...(r.abschnitte.length > 1 ? { abschnitte: r.abschnitte.map((a) => ({ von: fromDay(a.von), bis: fromDay(a.bis), frist_wochen: a.fristWochen, antrag_spaetestens: fromDay(a.spaetesterZugang) })) } : {}),
        kuendigungsschutz_ab: r.schutzAb === null ? null : fromDay(r.schutzAb),
        kuendigungsschutz_fruehestens: fromDay(a0.schutzFruehestens),
        kuendigungsschutz_bis: e.ende,
        mutterschutz_ende: r.mutterschutzEnde === null ? null : fromDay(r.mutterschutzEnde),
        dauer: r.monateGesamt,
        laengstens_bis_3_geburtstag: fromDay(r.dritterGeb - 1),
        spaetestens_bis_8_geburtstag: fromDay(r.achterGeb - 1),
        urlaubskuerzung: r.kuerzung.map((k) => (e.jahresurlaub ? k : { jahr: k.jahr, monate: k.monate })),
      },
      rechenweg: [
        ...r.abschnitte.map((a) => `Antrag für ${fmtDay(a.von)} bis ${fmtDay(a.bis)}: ${a.fristWochen} Wochen vorher (§ 16 Abs. 1 BEEG), sicher rechtzeitig bei Zugang bis ${fmtDay(a.spaetesterZugang)}.`),
        "Wir rechnen vorsichtig mit vollen Wochen zwischen Zugang und Beginn, manche Rechner zeigen einen Tag später.",
        `Kündigungsschutz ab Zugang des Antrags, frühestens ${a0.ab3 ? 14 : 8} Wochen vor Beginn (${fmtDay(a0.schutzFruehestens)}), bis zum Ende der Elternzeit am ${fmtDay(en)} (§ 18 BEEG).`,
        textform ? "Kind ab 01.05.2025 geboren: Für den Antrag reicht Textform." : "Kind vor dem 01.05.2025 geboren: Der Antrag braucht Schriftform mit Unterschrift.",
        ...(r.mutterschutzEnde === null ? [] : [`Mutterschutz nach der Geburt bis ${fmtDay(r.mutterschutzEnde)} (§ 3 Abs. 2 MuSchG). Er wird auf die 3 Jahre angerechnet (§ 15 Abs. 2 BEEG).`]),
        `Elternzeit bis zum 3. Geburtstag längstens bis ${fmtDay(r.dritterGeb - 1)}, danach bis zu 24 Monate bis spätestens ${fmtDay(r.achterGeb - 1)}.`,
        `Dauer: ${r.monateGesamt.monate} Monate${r.monateGesamt.tage ? ` und ${r.monateGesamt.tage} Tage` : ""}.`,
        ...r.kuerzung.map((k) => `Urlaubskürzung ${k.jahr}: ${k.monate} volle Kalendermonate, je 1/12${e.jahresurlaub ? ` von ${dezimal(e.jahresurlaub)} Tagen = ${dezimal(k.tage)} Tage` : " des Jahresurlaubs"} (§ 17 Abs. 1 BEEG).`),
      ],
      quellen,
      fallen: [
        ...r.warnungen,
        ...(r.fristVorbei ? [`Die Antragsfrist ist schon vorbei. Kommt der Antrag heute, beginnt die Elternzeit ohne dringenden Grund frühestens am ${fmtDay(r.fruehesterBeginnAbHeute!)}. Die Elternzeit entfällt nicht. Ihr könnt euch auch auf den Wunschtermin einigen.`] : []),
        ...(r.zuSpaet ? [`Der Antrag kam zu spät. Sicher rechtzeitig wäre ${fmtDay(a0.spaetesterZugang)} gewesen. Ohne dringenden Grund verschiebt sich der Beginn auf frühestens ${fmtDay(r.fruehesterBeginnBeiZugang!)}, die Elternzeit entfällt nicht. Ihr könnt euch auch auf den Wunschtermin einigen.`] : []),
        ...(z !== null && z < a0.schutzFruehestens ? [`Der Antrag kam früh. Der Kündigungsschutz beginnt erst ${a0.ab3 ? 14 : 8} Wochen vor der Elternzeit, also am ${fmtDay(a0.schutzFruehestens)}.`] : []),
        e.teilzeit ? "Bei Teilzeit bei dir darfst du den Urlaub nicht kürzen (§ 17 Abs. 1 Satz 2 BEEG)."
          : r.kuerzung.length ? "Den Urlaub kürzt du nur, wenn du die Kürzung erklärst." : "Kein voller Kalendermonat in der Elternzeit. Eine Kürzung des Urlaubs ist nicht möglich.",
        ...(e.teilzeit ? [teilzeit] : []),
        ...(e.noch_nicht_geboren ? ["Du rechnest mit dem errechneten Termin. Nach der Geburt noch einmal rechnen."] : []),
        "Kündigungen in der Elternzeit brauchen die Zustimmung der Landesbehörde.",
      ],
      naechster_schritt: [
        ...(r.kuerzung.length && !e.teilzeit ? ["Bestätige die Elternzeit schriftlich und erkläre dabei die Urlaubskürzung, wenn du kürzen willst."] : []),
        ...(frist[1] > heute ? [merken(frist[0], frist[1])] : []),
      ],
    }, heute);
  },
};

type MutterschutzE = {
  fall?: "schwangerschaft" | "fehlgeburt"; errechneter_termin?: string; geburt?: string; fruehgeburt?: boolean; mehrlinge?: boolean; behinderung?: boolean;
  fehlgeburt_am?: string; schwangerschaftswoche?: number; ab_500_gramm?: boolean;
};
const verbot = (bis: Date) => `Kündigungsverbot bis ${fmt(bis)}: Kündigen geht nur mit vorheriger Zustimmung der Aufsichtsbehörde (§ 17 MuSchG).`;
const U2 = "Zahl für die Schutzfrist den Zuschuss zum Mutterschaftsgeld. Du bekommst ihn über die Umlage U2 von der Krankenkasse vollständig erstattet (§ 1 Abs. 2 AAG).";
const DISKRET = "Geh mit dem Thema sehr diskret um. Gesundheitsdaten gehören nicht in die normale Personalakte.";

const mutterschutz: Werkzeug = {
  name: "mutterschutz",
  titel: "Mutterschutz-Rechner",
  beschreibung:
    "German employment law, Germany only: maternity protection periods (Mutterschutz, MuSchG) from the expected delivery date, protection before and after birth, extension after premature or multiple birth, the ban on dismissal (Kündigungsverbot) and the employer's duties: notify the supervisory authority (Aufsichtsbehörde) and get the maternity pay supplement refunded (Umlage U2). Also covers miscarriage and stillbirth (Fehlgeburt, Totgeburt). Use it when an employee is pregnant, has given birth or lost a pregnancy.",
  eingabe: schema({
    fall: text("schwangerschaft (pregnancy or birth) or fehlgeburt (miscarriage or stillbirth). Default schwangerschaft", { enum: ["schwangerschaft", "fehlgeburt"] }),
    errechneter_termin: datum("Expected date of delivery from the maternity record; for a stillbirth it extends the period"),
    geburt: datum("Actual date of birth, leave out while the child is not born"),
    fruehgeburt: janein("Premature birth as medically certified (12 weeks after birth)"),
    mehrlinge: janein("Twins or more (12 weeks after birth)"),
    behinderung: janein("Disability of the child certified within 8 weeks, on request (12 weeks after birth)"),
    fehlgeburt_am: datum("Date of the miscarriage or stillbirth"),
    schwangerschaftswoche: zahl("Week of pregnancy at the miscarriage, the 13th week starts after 12 completed weeks", 1, 45),
    ab_500_gramm: janein("Weight at least 500 grams, then it counts as stillbirth even before week 24"),
  }),
  ausfuehren(roh, heute) {
    const e = roh as MutterschutzE;
    if (e.fall === "fehlgeburt") {
      const quellen = [registerQuelle("mutterschutzFehlgeburt", heute), registerQuelle("mutterschutzFehlgeburtVerbot", heute)];
      const f = berechneFehlgeburt({ datum: e.fehlgeburt_am ?? "", ssw: e.schwangerschaftswoche === undefined ? "" : String(e.schwangerschaftswoche), ab500: e.ab_500_gramm ?? false, et: e.errechneter_termin });
      if (!f) return antwort({ ergebnis: { fehler: ["Es fehlen Datum und Schwangerschaftswoche."] }, quellen }, heute);
      if (f.d === undefined) return antwort({ ergebnis: { fehler: Object.values(f.errors) }, quellen }, heute);
      if (f.totgeburt) {
        const min = f.mindestens ? "mindestens " : "";
        quellen.push(registerQuelle("mutterschutzNachTage", heute), registerQuelle("mutterschutzKuendigungsverbotMonate", heute), normQuelle("§ 1 Abs. 2 AAG"));
        return antwort({
          ergebnis: { totgeburt: true, schutzfrist_von: toYmd(addDays(f.d, 1)), schutzfrist_bis: toYmd(f.ende), mindestens: f.mindestens, verlaengert_um_tage: f.verkuerzt, kuendigungsverbot_bis: toYmd(f.kEnde) },
          rechenweg: [
            "Ab der 24. Woche oder ab 500 Gramm ist es rechtlich eine Totgeburt und damit eine Entbindung (§ 3 Abs. 2 MuSchG).",
            `Schutzfrist 8 Wochen ab ${fmt(f.d)}${f.verkuerzt ? `, verlängert um ${f.verkuerzt} Tage, die bis zum errechneten Termin fehlten (§ 3 Abs. 2 Satz 3 MuSchG)` : ""}: bis ${min}${fmt(f.ende)}.`,
            `Kündigungsverbot 4 Monate nach der Entbindung, mindestens bis zum Ende der Schutzfrist: bis ${min}${fmt(f.kEnde)} (§ 17 Abs. 1 MuSchG).`,
          ],
          quellen,
          fallen: [
            ...(f.mindestens ? ["Ohne errechneten Termin ist das die Mindestfrist. Kam die Geburt vor dem Termin, verlängert sich die Frist um die fehlenden Tage."] : []),
            "Die Mitarbeiterin darf nach den ersten 2 Wochen wieder arbeiten, wenn sie das ausdrücklich verlangt und ärztlich nichts dagegen spricht (§ 3 Abs. 4 MuSchG). Die 12 Wochen nach einer Früh- oder Mehrlingsgeburt gelten bei einer Totgeburt nicht (§ 3 Abs. 2 Satz 5 MuSchG).",
            DISKRET,
          ],
          naechster_schritt: [verbot(f.kEnde), U2],
        }, heute);
      }
      if (f.stufe) quellen.push(normQuelle("§ 1 Abs. 2 AAG"));
      return antwort({
        ergebnis: { totgeburt: false, schwangerschaftswoche: f.ssw, schutzfrist_wochen: f.stufe ? f.stufe.tage / 7 : 0, schutzfrist_bis: f.ende ? toYmd(f.ende) : null, kuendigungsverbot_bis: f.kEnde ? toYmd(f.kEnde) : null },
        rechenweg: [
          f.stufe && f.ende
            ? `Fehlgeburt in der ${f.ssw}. Woche: Schutzfrist ${f.stufe.label} nach der Staffel in § 3 Abs. 5 MuSchG (ab der 13. Woche 2, ab der 17. Woche 6, ab der 20. Woche 8 Wochen), bis ${fmt(f.ende)}.`
            : `Fehlgeburt in der ${f.ssw}. Woche: Die Staffel nach § 3 Abs. 5 MuSchG beginnt erst ab der 13. Woche, es gibt keine Schutzfrist.`,
          f.kEnde
            ? `Kündigungsverbot ab der 13. Woche bis 4 Monate nach der Fehlgeburt: bis ${fmt(f.kEnde)} (§ 17 Abs. 1 Satz 1 Nr. 2 MuSchG).`
            : "Vor der 13. Woche gibt es kein Kündigungsverbot über die Schwangerschaft hinaus.",
        ],
        quellen,
        fallen: [
          f.stufe
            ? "Die Mitarbeiterin darf während der Schutzfrist nur arbeiten, wenn sie das ausdrücklich erklärt, und kann das jederzeit widerrufen."
            : "Vor der 13. Woche gibt es keine Schutzfrist. Ist die Mitarbeiterin krankgeschrieben, gilt die normale Entgeltfortzahlung.",
          DISKRET,
        ],
        naechster_schritt: [...(f.kEnde ? [verbot(f.kEnde)] : []), ...(f.stufe ? [U2] : [])],
      }, heute);
    }

    const quellen = [registerQuelle("mutterschutzVorTage", heute), registerQuelle("mutterschutzNachTage", heute)];
    const g = berechneGeburt({ et: e.errechneter_termin ?? "", geb: e.geburt ?? "", frueh: e.fruehgeburt ?? false, mehr: e.mehrlinge ?? false, beh: e.behinderung ?? false });
    if (!g) return antwort({ ergebnis: { fehler: ["Es fehlt der errechnete Entbindungstermin."] }, quellen }, heute);
    if (g.phasen === undefined) return antwort({ ergebnis: { fehler: Object.values(g.errors) }, quellen }, heute);
    if (g.lang) quellen.push(registerQuelle("mutterschutzNachTageVerlaengert", heute));
    if (g.verkuerzt) quellen.push(registerQuelle("mutterschutzVorzeitig", heute));
    quellen.push(
      registerQuelle("mutterschutzKuendigungsverbot", heute), registerQuelle("mutterschutzKuendigungsverbotMonate", heute), registerQuelle("mutterschutzMeldung", heute),
      registerQuelle("mutterschutzGefaehrdung", heute), normQuelle("§ 1 Abs. 2 AAG"), normQuelle("§ 24 MuSchG"),
    );
    return antwort({
      ergebnis: {
        vorlaeufig: !g.geb,
        schutzfrist_vor_geburt_ab: toYmd(g.vorBeginn),
        schutzfrist_vor_geburt_bis: g.phasen.some((p) => p.key === "vor") ? toYmd(g.entb) : null,
        schutzfrist_nach_geburt_bis: toYmd(g.nachEnde),
        wochen_nach_geburt: g.nach / 7,
        verlaengert_um_tage: g.verkuerzt,
        tage_gesamt: g.gesamt,
        kuendigungsverbot_bis: toYmd(g.kEnde),
        schwangerschaft_rechnerisch_ab: toYmd(g.schwBeginn),
      },
      rechenweg: [
        `Schutzfrist vor der Geburt: 6 Wochen vor dem errechneten Termin ${fmt(g.et)}, also ab ${fmt(g.vorBeginn, true)} (§ 3 Abs. 1 MuSchG).`,
        `Schutzfrist nach der Geburt: ${g.nach / 7} Wochen${g.lang ? " (Früh- oder Mehrlingsgeburt oder Behinderung)" : ""} ab ${g.geb ? "der Geburt" : "dem Termin"} am ${fmt(g.entb)}${g.verkuerzt ? ` plus ${g.verkuerzt} Tage, die vor der Geburt gefehlt haben` : ""}, bis ${fmt(g.nachEnde, true)} (§ 3 Abs. 2 MuSchG).`,
        `Kündigungsverbot ab Beginn der Schwangerschaft bis 4 Monate nach der Entbindung, mindestens bis zum Ende der Schutzfrist: bis ${fmt(g.kEnde)} (§ 17 Abs. 1 MuSchG).`,
        `Beginn der Schwangerschaft rechnerisch 280 Tage vor dem Termin: ${fmt(g.schwBeginn)}. Insgesamt ${g.gesamt} Tage Schutzfrist.`,
      ],
      quellen,
      fallen: [
        ...g.hinweise,
        "Das Kündigungsverbot gilt auch ohne dein Wissen: Teilt dir die Mitarbeiterin die Schwangerschaft innerhalb von 2 Wochen nach Zugang einer Kündigung mit, ist die Kündigung unwirksam (§ 17 MuSchG).",
      ],
      naechster_schritt: [
        "Informiere die Aufsichtsbehörde (meist Gewerbeaufsicht oder Amt für Arbeitsschutz) unverzüglich, sobald du von der Schwangerschaft weißt (§ 27 MuSchG).",
        "Pass die Gefährdungsbeurteilung für den Arbeitsplatz an und besprich sie mit der Mitarbeiterin (§ 10 MuSchG).",
        verbot(g.kEnde),
        U2,
        "Kürze den Urlaub nicht: Schutzfristen zählen als Beschäftigungszeit, Resturlaub kann nach dem Mutterschutz genommen werden (§ 24 MuSchG).",
        "Elternzeit muss spätestens 7 Wochen vor Beginn verlangt werden, für Kinder ab 01.05.2025 reicht Textform (§ 16 BEEG). Die Fristen rechnet das Werkzeug elternzeit_fristen.",
        ...(toYmd(g.vorBeginn) > heute ? [merken("Beginn der Schutzfrist vor der Geburt", toYmd(g.vorBeginn))] : []),
      ],
    }, heute);
  },
};

type AufbewahrungE = { modus?: "dokument" | "austritt"; dokument?: string; datum?: string; pruefung_zeitraum_bis?: string; pruefung_am?: string; verfahren_laeuft?: boolean };
/** Normen je Unterlage mit Link, wie in den Quellen der Seite aufbewahrungsfristen-rechner. Die volle Grundlage steht im Ergebnis. */
const NORMEN: Record<string, string[]> = {
  lohn: ["§ 147 AO", "§ 257 HGB"], reise: ["§ 147 AO", "§ 257 HGB"], lohnkonto: ["§ 41 Abs. 1 EStG"], sv: ["§ 28f Abs. 1 SGB IV"],
  arbeitszeit: ["§ 16 Abs. 2 ArbZG", "§ 17 Abs. 1 MiLoG"], vertrag: ["§ 147 AO"], akte: ["§ 195 BGB", "§ 199 BGB"],
  bewerbung: ["§ 15 Abs. 4 AGG", "§ 61b ArbGG"], abmahnung: ["Art. 5 Abs. 1 lit. e DSGVO"],
};
const STREIT = "Nicht löschen, solange ein Rechtsstreit oder eine Prüfung läuft. Du brauchst die Unterlagen als Beweis. Steuerlich relevante Unterlagen bleiben ohnehin, solange die Festsetzungsfrist offen ist (§ 147 Abs. 3 Satz 5 AO).";

const aufbewahrungsfristen: Werkzeug = {
  name: "aufbewahrungsfristen",
  titel: "Aufbewahrungsfristen",
  beschreibung:
    "German employment law, Germany only: retention periods for HR documents (Aufbewahrungsfristen) and the earliest day to delete them: payslips, payroll account, social security pay records, time records, contract and personnel file after exit, rejected applications, warning letters. With modus austritt it returns a deletion plan (Löschplan) for the personnel file after an exit date. Use it when someone asks how long to keep employee documents or when they may or must be deleted.",
  eingabe: schema({
    modus: text("dokument (one document type) or austritt (deletion plan after exit). Default dokument", { enum: ["dokument", "austritt"] }),
    dokument: text(
      "Document type: lohn (payslips, Lohnabrechnungen), reise (travel expense reports), lohnkonto (payroll account), sv (social security pay records, Entgeltunterlagen), arbeitszeit (time records), vertrag (employment contract after exit), akte (personnel file after exit), bewerbung (rejected applications), abmahnung (warning letter in ongoing employment)",
      { enum: DOKUMENTE.map((d) => d.id) },
    ),
    datum: datum("Start date: date of the document, last entry (lohnkonto), pay month (sv), rejection (bewerbung) or exit date (vertrag, akte, modus austritt). Not needed for abmahnung"),
    pruefung_zeitraum_bis: datum("Only sv: end of the period covered by the last social security audit (Betriebsprüfung), from the audit notice"),
    pruefung_am: datum("Only sv: day of that audit"),
    verfahren_laeuft: janein("A lawsuit or an audit about these documents is ongoing"),
  }),
  ausfuehren(roh, heute) {
    const e = roh as AufbewahrungE;
    const streit = e.verfahren_laeuft ?? false;
    const h = parseYmd(heute)!;
    const d = e.datum ? parseYmd(e.datum) : null;
    const ungueltig = (fehler: string) => antwort({ ergebnis: { fehler: [fehler] } }, heute);
    if (e.datum && !d) return ungueltig("Das Datum gibt es im Kalender nicht.");

    if (e.modus === "austritt") {
      if (!d) return ungueltig("Es fehlt das Austrittsdatum (datum).");
      const plan = loeschplan(d);
      return antwort({
        ergebnis: {
          austritt: e.datum,
          loeschplan: plan.map((r) => ({ unterlage: r.label, aufbewahren_bis: toYmd(r.f.bis), loeschen_ab: toYmd(r.f.ab), jetzt: r.f.ab <= h, grundlage: r.t.grundlage, hinweis: r.note })),
        },
        rechenweg: plan.map((r) => `${r.label}: ${r.t.frist}, aufbewahren bis ${fmt(r.f.bis)}, löschen ab ${fmt(r.f.ab)}.`),
        quellen: [...plan.flatMap((r) => NORMEN[r.typ]), "§ 28f Abs. 1 SGB IV", "Art. 9 DSGVO"].map((n) => normQuelle(n)),
        fallen: [
          "Entgeltunterlagen der Sozialversicherung bewahrst du bis Ende des Jahres nach der nächsten Betriebsprüfung auf, die den Zeitraum erfasst (§ 28f Abs. 1 SGB IV). In der Praxis ist das meist kürzer als die 8 Jahre für Lohnbelege.",
          ...(streit ? ["Vorher nichts löschen: Ein laufendes Verfahren geht vor. Lösch erst nach dem Abschluss und rechne die Fristen dann neu."] : []),
          "Gesundheitsdaten getrennt halten: AU-Daten, BEM-Unterlagen und ärztliche Bescheinigungen gehören in einen getrennten, verschlossenen Teil der Akte (Art. 9 DSGVO). Lösch sie, sobald du sie nicht mehr brauchst.",
        ],
        naechster_schritt: streit ? [] : ["Lösch jede Unterlage ab ihrem Tag im Löschplan, auch Kopien im Postfach und auf Laufwerken."],
      }, heute);
    }

    const typ = DOKUMENTE.find((x) => x.id === e.dokument);
    if (!typ) return ungueltig("Es fehlt die Unterlage (dokument), oder nimm modus austritt für den Löschplan.");
    const quellen = NORMEN[typ.id].map((n) => normQuelle(n));
    const kopf = { dokument: typ.label, frist: typ.frist, grundlage: typ.grundlage };
    if (typ.regel.art === "keine") {
      return antwort({
        ergebnis: { ...kopf, aufbewahren_bis: null, loeschen_ab: null },
        rechenweg: ["Für Abmahnungen im laufenden Arbeitsverhältnis gibt es keine gesetzliche Frist."],
        quellen,
        fallen: ["Mitarbeitende können die Entfernung verlangen, wenn die Abmahnung inhaltlich falsch ist, auf falschen Tatsachen beruht oder für das Arbeitsverhältnis keine Rolle mehr spielt. Viele Firmen prüfen nach 2 bis 3 Jahren ohne weiteren Vorfall, ob sie noch gebraucht wird. Das ist Praxis, kein Gesetz. Nach dem Austritt gilt die Frist der Personalakte."],
      }, heute);
    }
    if (!d) return ungueltig(`Es fehlt das Datum: ${typ.datum}.`);
    const p = pruefungLesen(e.pruefung_zeitraum_bis ? parseYmd(e.pruefung_zeitraum_bis) : null, e.pruefung_am ? parseYmd(e.pruefung_am) : null);
    if (p.fehler) return ungueltig(p.fehler);
    const pr = p.pruefung;
    // Verbindlich ist bei Entgeltunterlagen die spätere von SV-Frist und steuerlicher Frist (lintelly.com 28.10.2026).
    const f = verbindlicheFrist(typ, d, pr);
    const hinweise = [...(typ.hinweis ? [typ.hinweis] : []), ...(streit ? [STREIT] : [])];
    if (!f) {
      return antwort({
        ergebnis: { ...kopf, datum: e.datum, aufbewahren_bis: null, loeschen_ab: null, jetzt_loeschen: false },
        rechenweg: ["Keine Betriebsprüfung hat den Zeitraum dieser Unterlage bisher geprüft. Die Frist läuft erst ab der Prüfung, die ihn abdeckt (§ 28f Abs. 1 SGB IV)."],
        quellen,
        fallen: ["Noch nicht löschen. Entgeltunterlagen bewahrst du bis zum Ende des Kalenderjahres nach der Betriebsprüfung auf, die sie erfasst. Welcher Zeitraum geprüft wurde, steht im Prüfbescheid. Liegt die Unterlage danach, wartest du die nächste Prüfung ab.", ...hinweise],
      }, heute);
    }
    const jetzt = jetztLoeschen(typ, d, pr, h);
    const sv = typ.regel.art === "sv";
    return antwort({
      ergebnis: { ...kopf, datum: e.datum, aufbewahren_bis: toYmd(f.bis), loeschen_ab: toYmd(f.ab), jetzt_loeschen: jetzt && !streit },
      rechenweg: [
        `${typ.label}: ${f.sv ? "8 Jahre ab Ende des Kalenderjahres (als Lohnbeleg, § 147 AO)" : typ.frist}.`,
        `Fristbeginn ${typ.regel.art === "jahresende" || f.sv ? `mit Ablauf des 31.12.${d.getUTCFullYear()}` : sv ? `mit Ablauf des 31.12.${pr!.am.getUTCFullYear()}, dem Jahr der Prüfung` : `am ${fmt(d)}`}. Aufbewahren bis ${fmt(f.bis)}, frühestens löschen ab ${fmt(f.ab)}.`,
        ...(f.sv ? [`Nach § 28f SGB IV allein: aufbewahren bis ${fmt(f.sv.bis)}.`] : []),
      ],
      quellen,
      fallen: [
        ...hinweise,
        ...(f.sv && !jetzt && !streit ? [`Führt dein Lohnbüro die Unterlage nicht als Lohnbeleg, gilt nur § 28f SGB IV. Dann darfst du sie ab ${fmt(f.sv.ab)} löschen. Frag dein Lohnbüro, wie es die Unterlagen führt.`] : []),
      ],
      naechster_schritt: streit ? [] : jetzt
        ? ["Lösch das Dokument jetzt, wenn keine andere Frist greift. Nach Art. 17 DSGVO müssen personenbezogene Daten gelöscht werden, wenn der Zweck entfallen ist. Denk an Kopien im Postfach und auf Laufwerken."]
        : toYmd(f.bis) > heute ? [merken("Ende der Aufbewahrungsfrist", toYmd(f.bis))] : [],
    }, heute);
  },
};

type PausenE = {
  tage: { datum?: string; beginn: string; ende: string; pausen?: { von: string; bis: string }[] }[];
  jugendlich?: boolean; branche_10_stunden_ruhezeit?: boolean; vortag_ende?: string;
};
const uhr = (d: string) => text(`${d} (HH:MM, 24 h)`, { pattern: "^([01]?\\d|2[0-3]):[0-5]\\d$", maxLength: 5 });

const pausen: Werkzeug = {
  name: "pausen",
  titel: "Pausen und Ruhezeit",
  beschreibung:
    "German employment law, Germany only: checks shifts against the rules on breaks (Pausen), maximum daily and weekly working time (Höchstarbeitszeit) and rest between shifts (Ruhezeit) under the ArbZG, or the stricter JArbSchG for employees under 18. Returns working time, required and actual break per day, rest period and each violation. Use it to check a shift plan or a time sheet.",
  eingabe: schema({
    tage: liste("Shifts in order, one per day", schema({
      datum: datum("Date of the shift, optional, needed for Sundays and totals per calendar week"),
      beginn: uhr("Start"),
      ende: uhr("End, after midnight allowed"),
      pausen: liste("Breaks within the shift", schema({ von: uhr("Break start"), bis: uhr("Break end") }, ["von", "bis"]), 4),
    }, ["beginn", "ende"]), 14),
    jugendlich: janein("Person is under 18 (JArbSchG)"),
    branche_10_stunden_ruhezeit: janein("Industry that may shorten rest to 10 hours: hospital, care, restaurants, transport, broadcasting, agriculture (§ 5 Abs. 2 ArbZG)"),
    vortag_ende: uhr("End of the last shift on the day before the first day, optional"),
  }, ["tage"]),
  ausfuehren(roh, heute) {
    const e = roh as PausenE;
    const jugend = e.jugendlich ?? false, ausnahme = e.branche_10_stunden_ruhezeit ?? false;
    const tage = e.tage.map((t, i) => ({ id: i + 1, datum: t.datum ?? "", von: t.beginn, bis: t.ende, pausen: (t.pausen ?? []).map((p, k) => ({ id: k + 1, ...p })) }));
    const r = pruefeTage(tage, { jugend, ausnahme, vortagEnde: e.vortag_ende ?? "" });
    const quellen = jugend
      ? [registerQuelle("jugendlicheBisJahre", heute), normQuelle("§ 8 JArbSchG"), normQuelle("§ 11 JArbSchG"), normQuelle("§ 13 JArbSchG")]
      : [registerQuelle("arbzgPause6", heute), registerQuelle("arbzgRuhezeit", heute), registerQuelle("hoechstarbeitszeitWoche", heute), ...(ausnahme ? [normQuelle("§ 5 Abs. 2 ArbZG")] : [])];
    const fehler = r.ergebnisse.filter((x) => x.fehler).map((x) => `${x.label}: ${x.fehler}`);
    if (!r.voll.length) return antwort({ ergebnis: { fehler: fehler.length ? fehler : ["Trag mindestens eine Schicht mit Beginn und Ende ein."] }, quellen }, heute);

    const R = jugend ? PAUSEN.jug : PAUSEN.erw;
    const std = (min: number) => dezimal(min / 60);
    const ruhe = jugend ? PAUSEN.jug.ruhe : ausnahme ? PAUSEN.erw.ruheAusnahme : PAUSEN.erw.ruhe;
    const verstoss = r.voll.filter((x) => x.level === "late").length;
    return antwort({
      ergebnis: {
        ampel: AMPEL[r.gesamt],
        bewertung: verstoss ? `${verstoss} ${verstoss === 1 ? "Tag" : "Tage"} mit Verstoß` : r.gesamt === "ok" ? "Alles im Rahmen" : "Prüfen",
        arbeitszeit_summe_minuten: r.summe,
        tage: r.voll.map((x) => ({ tag: x.label, arbeit_minuten: x.arbeit, pause_minuten: x.pause, pause_noetig_minuten: x.soll, ruhezeit_davor_minuten: x.ruhe, ampel: AMPEL[x.level] })),
      },
      rechenweg: [
        `Regeln ${jugend ? "für Jugendliche (JArbSchG)" : "nach dem ArbZG"}: bei mehr als ${std(R.pause1.ab)} Stunden Arbeit ${R.pause1.min} Minuten Pause, bei mehr als ${std(R.pause2.ab)} Stunden ${R.pause2.min} Minuten, höchstens ${std(R.block)} Stunden am Stück, höchstens ${std(jugend ? R.regel : R.max)} Stunden am Tag und ${std(R.woche)} Stunden in der Woche${jugend ? "" : " im Schnitt"}, Ruhezeit ${std(ruhe)} Stunden. Pausen zählen erst ab ${PAUSEN.minAbschnitt} Minuten am Stück.`,
        ...r.voll.map((x) => `${x.label}: ${hm(x.arbeit)} Arbeit, ${x.pause} Minuten Pause, nötig ${x.soll}${x.ruhe === null ? "" : `, Ruhezeit davor ${hm(x.ruhe)}`}.`),
        `Summe Arbeitszeit: ${hm(r.summe)}.`,
      ],
      quellen,
      fallen: [
        ...fehler,
        ...r.voll.flatMap((x) => x.msgs.filter((m) => m.level !== "ok").map((m) => `${x.label}: ${m.text}`)),
        ...(r.wocheMsg ? [r.wocheMsg.text] : []),
        `Stand ${PAUSEN.stand}: Die Bundesregierung plant eine Reform des Arbeitszeitgesetzes mit einer wöchentlichen statt täglichen Höchstarbeitszeit. Bisher liegt nur ein Referentenentwurf vor, bis zu einem Beschluss gilt das aktuelle Recht.`,
        "Tarifverträge und Betriebsvereinbarungen können abweichen.",
      ],
      naechster_schritt: verstoss ? ["Pass Pausen und Schichtplan an den Tagen mit Verstoß an, bevor so gearbeitet wird."] : [],
    }, heute);
  },
};

export const FRISTEN: Werkzeug[] = [probezeit, befristung, elternzeit_fristen, mutterschutz, aufbewahrungsfristen, pausen];
