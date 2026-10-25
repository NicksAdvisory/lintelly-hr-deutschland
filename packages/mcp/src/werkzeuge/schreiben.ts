/**
 * Schreiben und Prüflisten von lintelly.com/tools: Arbeitszeugnis, Stellenanzeige, Interviewfragen, Mitarbeitergespräch,
 * Nachweisgesetz. Kein KI-Aufruf: die Werkzeuge liefern Aufbau, Stufen und Prüflisten, den Text schreibt der Assistent.
 * Fachliche Texte wörtlich aus components/tools/*.tsx und den KI-Vorgaben lib/ki/batch-1, 4, 5 der Website.
 */
import { gesamtNote } from "../../../kern/website/components/tools/arbeitszeugnis-logik";
import { eindeutig, findeFallen } from "../../../kern/website/components/tools/stellenanzeigen-agg";
import { addDays, addMonths, formatDE } from "../../../kern/website/lib/fristen";
import { WERTE } from "@/lib/regeln/werte";
import { antwort, normQuelle, registerQuelle } from "../antwort";
import { datum, janein, liste, schema, text, zahl } from "../eingabe";
import type { Werkzeug } from "../werkzeug";

/* ---------- Arbeitszeugnis (arbeitszeugnis-generator.tsx, lib/ki/batch-1.ts) ---------- */

const NOTEN_NAME = ["", "sehr gut", "gut", "befriedigend", "ausreichend", "mangelhaft"];
const FORMEL = ["", "stets zu unserer vollsten Zufriedenheit", "stets zu unserer vollen Zufriedenheit", "zu unserer vollen Zufriedenheit", "zu unserer Zufriedenheit", "im Großen und Ganzen zu unserer Zufriedenheit"];
/** Wortwahl je Teilnote, gilt für jeden Leistungsbereich einzeln. */
const STUFE = [
  "",
  'sehr gut: Verstärker wie "stets", "jederzeit", "außerordentlich", "in jeder Hinsicht", "hervorragend".',
  'gut: "stets" oder "sehr", "jederzeit", aber keine Superlative ("außerordentlich", "hervorragend", "vollsten").',
  'befriedigend: klar positiv und aktiv, ohne "stets", "sehr" oder "jederzeit", z. B. "verfügt über gutes Fachwissen und setzt es sicher ein", "arbeitet sorgfältig und zuverlässig", "erzielt gute Ergebnisse". Nie "entspricht den Anforderungen", "angemessen", "solide" oder "bei Bedarf", das liest sich wie Note 4.',
  'ausreichend: knapp und sachlich, ohne Verstärker, z. B. "verfügt über das erforderliche Fachwissen", "erledigt die Aufgaben ordnungsgemäß". Keine negativen Aussagen.',
  'mangelhaft: zurückhaltend und sachlich, z. B. "entsprach im Wesentlichen den Anforderungen". Keine Ironie, keine Herabsetzung, keine erfundenen Mängel.',
];
/** Verhaltensformel im Präteritum; im Zwischenzeugnis wird aus "war" "ist" und aus "gab" "gibt". */
const VERHALTEN = ["", "war stets vorbildlich", "war stets einwandfrei", "war einwandfrei", "gab keinen Anlass zu Beanstandungen", "war insgesamt zufriedenstellend"];
const BEREICHE = [
  { k: "arbeitsbereitschaft", l: "Arbeitsbereitschaft", vorgabe: "Engagement, Eigeninitiative, Ruhe bei hohem Arbeitsaufkommen." },
  { k: "fachwissen", l: "Fachwissen", vorgabe: "Fachkenntnisse, Auffassungsgabe. Weiterbildung nur allgemein als Bereitschaft, nie erfundene Kurse." },
  { k: "arbeitsweise", l: "Arbeitsweise", vorgabe: "Sorgfalt, Zuverlässigkeit, Selbstständigkeit, Tempo." },
  { k: "arbeitserfolg", l: "Arbeitserfolg", vorgabe: "Qualität und Menge der Ergebnisse. Jeden echten Erfolg in einem eigenen Satz würdigen, Zahlen genau so, wie sie stimmen." },
] as const;
const GRUENDE = ["eigener-wunsch", "einvernehmlich", "betriebsbedingt", "befristung", "ruhestand", "ohne"] as const;
const ZWISCHEN_ANLASS: Record<string, string> = {
  vorgesetztenwechsel: "weil sich der Vorgesetzte bzw. die Vorgesetzte ändert",
  versetzung: "wegen eines Wechsels in eine andere Abteilung",
  elternzeit: "wegen der bevorstehenden Elternzeit",
  betriebsuebergang: "wegen eines Betriebsübergangs",
  wunsch: "auf Wunsch von [Frau/Herr Nachname]",
};
// Platzhalter statt Namen: Lintelly HR nimmt keine Personendaten, der Assistent setzt sie ein.
const P = { voll: "[Frau/Herr Vorname Nachname]", kurz: "[Frau/Herr Nachname]", dat: "[ihr/ihm]", ausscheiden: "[ihr/sein] Ausscheiden" };

function beendigungsSatz(grund: string, bis: string): string {
  const d = `mit Ablauf des ${bis}`;
  switch (grund) {
    case "eigener-wunsch": return `${P.kurz} scheidet ${d} auf eigenen Wunsch aus unserem Unternehmen aus.`;
    case "einvernehmlich": return `Das Arbeitsverhältnis endet ${d} im gegenseitigen Einvernehmen.`;
    case "betriebsbedingt": return `Das Arbeitsverhältnis endet ${d} aus betriebsbedingten Gründen.`;
    case "befristung": return `Das Arbeitsverhältnis endet ${d} mit Ablauf der vereinbarten Befristung.`;
    case "ruhestand": return `${P.kurz} tritt ${d} in den Ruhestand.`;
    default: return `Das Arbeitsverhältnis endet ${d}.`;
  }
}

function schlussSatz(zwischen: boolean, modus: string, note: number, grund: string): string {
  if (modus === "keine") return "";
  if (zwischen) {
    const zs = ["", "die bisher stets hervorragende", "die bisher sehr gute", "die bisher gute", "die bisherige", "die bisherige"][note];
    return modus === "dank" ? `Wir danken ${P.dat} für ${zs} Zusammenarbeit.` : `Wir danken ${P.dat} für ${zs} Zusammenarbeit und freuen uns auf die weitere Zusammenarbeit.`;
  }
  const dank = ["", "für die stets hervorragende Zusammenarbeit", "für die sehr gute Zusammenarbeit", "für die gute Zusammenarbeit", "für die Mitarbeit", "für die Mitarbeit"][note];
  const wunsch = grund === "ruhestand" ? "für den neuen Lebensabschnitt alles Gute"
    : ["", "für die berufliche und private Zukunft alles Gute und weiterhin viel Erfolg", "für die berufliche und private Zukunft alles Gute und weiterhin viel Erfolg", "für die berufliche und private Zukunft alles Gute", "für die Zukunft alles Gute", "für die Zukunft alles Gute"][note];
  if (modus === "dank") return `Wir danken ${P.dat} ${dank}.`;
  // Bei Note 1 und 2 gehört das Bedauern zu jedem Beendigungsgrund außer Ruhestand, sonst liest man es als Abwertung.
  if (note <= 2 && grund !== "ruhestand") return `Wir bedauern ${P.ausscheiden}${note === 1 ? " sehr" : ""}, danken ${P.dat} ${dank} und wünschen ${P.dat} ${wunsch}.`;
  return `Wir danken ${P.dat} ${dank} und wünschen ${P.dat} ${wunsch}.`;
}

type Teil = { teil: string; pflicht: boolean; text?: string; vorgabe?: string; note?: number; stufe?: string };
const notenFeld = (bereich: string) => zahl(`Grade for ${bereich}, 1 (sehr gut) to 5 (mangelhaft), default 2`, 1, 5);
const de = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

const arbeitszeugnis: Werkzeug = {
  name: "arbeitszeugnis",
  titel: "Arbeitszeugnis: Aufbau und Zeugnissprache",
  beschreibung:
    "German employment reference (Arbeitszeugnis, Zwischenzeugnis, Endzeugnis), Germany only. Use it when a founder wants a reference written: give the kind of reference and a grade from 1 to 5 per area, never names. Returns the structure with mandatory parts, the coded wording (Zeugnissprache) for each grade, the overall grade with its satisfaction formula, forbidden codes and traps, and the legal claim under § 109 GewO. You then write the reference text from this structure and let the user fill in names.",
  eingabe: schema({
    art: text("endzeugnis (final reference at the end of employment) or zwischenzeugnis (interim reference while employed), default endzeugnis", { enum: ["endzeugnis", "zwischenzeugnis"] }),
    umfang: text("qualifiziert (with performance and conduct, the usual case) or einfach (only kind and duration of work), default qualifiziert", { enum: ["qualifiziert", "einfach"] }),
    note_arbeitsbereitschaft: notenFeld("willingness to work (Arbeitsbereitschaft: commitment, initiative)"),
    note_fachwissen: notenFeld("expertise (Fachwissen)"),
    note_arbeitsweise: notenFeld("way of working (Arbeitsweise: care, reliability, pace)"),
    note_arbeitserfolg: notenFeld("results (Arbeitserfolg: quality and quantity)"),
    fuehrungsverantwortung: janein("The person leads staff (Führungsverantwortung); then note_fuehrung counts toward the overall grade"),
    note_fuehrung: notenFeld("leadership (Führungsleistung), only with fuehrungsverantwortung"),
    note_verhalten: notenFeld("conduct towards superiors, colleagues and customers (Verhalten), graded separately"),
    beginn: datum("First day of employment"),
    ende: datum("Last day of employment, final reference only"),
    grund: text("Why the employment ends, final reference only, default ohne (no reason stated)", { enum: GRUENDE }),
    zwischen_anlass: text("Occasion of an interim reference, default wunsch (employee asked)", { enum: Object.keys(ZWISCHEN_ANLASS) }),
    schluss: text("Closing formula: note (thanks, regret and wishes matching the grade, default), dank (thanks only), keine (none)", { enum: ["note", "dank", "keine"] }),
  }),
  ausfuehren(e, heute) {
    const zw = e.art === "zwischenzeugnis";
    const qual = e.umfang !== "einfach";
    const fuehrung = e.fuehrungsverantwortung === true;
    const stufe = (n: unknown) => gesamtNote([typeof n === "number" ? n : 2]).note;
    const teilnoten = [...BEREICHE.map((b) => ({ l: b.l, n: stufe(e[`note_${b.k}`]) })), ...(fuehrung ? [{ l: "Führungsleistung", n: stufe(e.note_fuehrung) }] : [])];
    const g = gesamtNote(teilnoten.map((t) => t.n));
    const verhalten = stufe(e.note_verhalten);
    const grund = (e.grund as string | undefined) ?? "ohne";
    const beginn = e.beginn as string | undefined, ende = e.ende as string | undefined;
    const ausgestellt = zw ? heute : ende ?? null;
    const titel = zw ? "Zwischenzeugnis" : "Arbeitszeugnis";

    const von = beginn ? formatDE(beginn) : "[Datum Beginn]";
    const aufbau: Teil[] = [
      { teil: "Überschrift", pflicht: true, text: titel },
      {
        teil: "Einleitung", pflicht: true, vorgabe: "Anrede, Name, Geburtsdatum (optional), Zeitraum und Position.",
        text: zw ? `${P.voll}, geboren am [Geburtsdatum], ist seit dem ${von} in unserem Unternehmen als [Position] tätig.`
          : `${P.voll}, geboren am [Geburtsdatum], war vom ${von} bis zum ${ende ? formatDE(ende) : "[letzter Tag]"} in unserem Unternehmen als [Position] tätig.`,
      },
      { teil: "Firmenbeschreibung", pflicht: false, vorgabe: "1 bis 2 Sätze über das Unternehmen im Präsens, nur aus echten Angaben. Keine Werbung, keine Superlative, keine Zahlen, die nicht stimmen." },
      {
        teil: "Tätigkeitsbeschreibung", pflicht: true, text: `Zu den Aufgaben von ${P.kurz} ${zw ? "gehören" : "gehörten"} insbesondere:`,
        vorgabe: 'Danach jede Aufgabe als Listenpunkt im Nominalstil, wichtigste zuerst, ohne Punkt am Ende: aus "Angebote schreiben" wird "Erstellung von Angeboten". Nichts zusammenlegen, nichts erfinden, keine Erfolge in diese Liste.',
      },
    ];
    if (qual) {
      for (const b of BEREICHE) {
        const n = stufe(e[`note_${b.k}`]);
        aufbau.push({ teil: b.l, pflicht: true, note: n, stufe: STUFE[n], vorgabe: `${b.vorgabe} 2 bis 4 Sätze, die Note dieses Bereichs bestimmt die Wortwahl.` });
      }
      aufbau.push({ teil: "Zufriedenheitsformel", pflicht: true, note: g.note, text: `${P.kurz} ${zw ? "erledigt" : "erledigte"} die ${P.dat} übertragenen Aufgaben ${FORMEL[g.note]}.`, vorgabe: "Steht am Ende des Leistungsteils, an ihr liest jeder die Gesamtnote ab." });
      if (fuehrung) {
        const n = stufe(e.note_fuehrung);
        aufbau.push({ teil: "Führungsleistung", pflicht: true, note: n, stufe: STUFE[n], vorgabe: "2 bis 3 Sätze zu Führung, Motivation, Delegation und Ergebnis des Teams. Teamgröße nur, wenn sie stimmt." });
      }
      const satz = zw ? VERHALTEN[verhalten].replace(/^war /, "ist ").replace(/^gab /, "gibt ") : VERHALTEN[verhalten];
      aufbau.push({
        teil: "Verhalten", pflicht: true, note: verhalten,
        text: `[Ihr/Sein] Verhalten gegenüber Vorgesetzten, Kolleginnen und Kollegen sowie Kunden und Geschäftspartnern ${satz}.`,
        vorgabe: `Vorgesetzte immer zuerst, dann Kolleginnen und Kollegen, dann Kunden.${verhalten === 1 ? ` Dazu ein Satz, dass die Person im Kollegenkreis sehr geschätzt ${zw ? "wird" : "wurde"}.` : ""}${verhalten <= 2 ? " Ein zweiter Satz zu Teamfähigkeit oder Hilfsbereitschaft." : ""}`,
      });
    }
    aufbau.push(zw
      ? { teil: "Anlass", pflicht: false, text: `Dieses Zwischenzeugnis stellen wir ${ZWISCHEN_ANLASS[(e.zwischen_anlass as string | undefined) ?? "wunsch"]} aus.` }
      : { teil: "Beendigung", pflicht: false, text: beendigungsSatz(grund, ende ? formatDE(ende) : "[letzter Tag]"), vorgabe: 'Bei Kündigung durch die Firma ist "Ohne Angabe" üblich.' });
    const schluss = qual ? schlussSatz(zw, (e.schluss as string | undefined) ?? "note", g.note, grund) : e.schluss === "keine" ? "" : `Wir wünschen ${P.dat} für die Zukunft alles Gute.`;
    if (schluss) aufbau.push({ teil: "Schlussformel", pflicht: false, text: schluss, vorgabe: "Einen Rechtsanspruch darauf gibt es nicht. Fehlt sie bei guter Note, fällt das auf." });
    aufbau.push({ teil: "Ort, Datum, Unterschrift", pflicht: true, text: `[Ort], ${ausgestellt ? formatDE(ausgestellt) : "[Datum]"}`, vorgabe: 'Kein "i. A.", das wirkt distanziert. Besser ohne Zusatz, ppa. oder i. V.' });

    const schwach = qual && (g.note >= 4 || verhalten >= 4);
    return antwort({
      ergebnis: {
        titel, umfang: qual ? "qualifiziert" : "einfach", zeitform: zw ? "Präsens" : "Präteritum", ausstellungsdatum: ausgestellt,
        ...(qual ? { gesamtnote: { schnitt: Math.round(g.schnitt * 100) / 100, note: g.note, name: NOTEN_NAME[g.note], formel: FORMEL[g.note] } } : {}),
        aufbau,
        sprache: [
          `${zw ? "Zwischenzeugnis im Präsens" : "Endzeugnis im Präteritum"}, in jedem Absatz. Die Firmenbeschreibung steht immer im Präsens.`,
          'Die Person bleibt aktiv Subjekt. Sätze wie "Das Fachwissen wurde eingesetzt" lesen erfahrene Leser als versteckte Kritik.',
          'Bei Note 1 bis 3 keine abschwächenden Wörter: "angemessen", "solide", "bei Bedarf", "im Rahmen seiner Möglichkeiten", "entspricht den Anforderungen", "bemüht".',
          "Nichts erfinden: keine Aufgaben, Titel, Kunden, Projekte, Zahlen oder Zertifikate, die es nicht gab.",
          "Keine Paragrafen und keine Urteile im Zeugnistext.",
        ],
        rechtsanspruch: [
          "Jede Person hat beim Ende des Arbeitsverhältnisses Anspruch auf ein schriftliches Zeugnis (§ 109 GewO). Das einfache Zeugnis nennt Art und Dauer der Tätigkeit, auf Wunsch der Person erstreckt es sich auch auf Leistung und Verhalten (qualifiziertes Zeugnis).",
          ...(zw ? ["Ein Zwischenzeugnis kann die Person bei einem berechtigten Anlass verlangen, etwa bei einem Wechsel der Vorgesetzten, einer Versetzung, vor einer Elternzeit oder bei einem Betriebsübergang. Viele Tarifverträge regeln diesen Anspruch ausdrücklich."] : []),
        ],
      },
      rechenweg: qual ? [
        `Teilnoten: ${teilnoten.map((t) => `${t.l} ${t.n}`).join(", ")}.`,
        `Schnitt ${de(g.schnitt)}. Bei genau x,5 gilt die bessere Note, weil das Zeugnis wohlwollend sein muss.`,
        `Gesamtnote ${NOTEN_NAME[g.note]}: "${FORMEL[g.note]}". Das Verhalten wird getrennt benotet (${NOTEN_NAME[verhalten]}).`,
      ] : [],
      quellen: [registerQuelle("zeugnisAnspruch", heute), ...(schwach ? [normQuelle("BAG, 18.11.2014, 9 AZR 584/13")] : [])],
      fallen: [
        'Keine Geheimcodes: Das Zeugnis darf nichts enthalten, was etwas anderes aussagen soll als der Wortlaut (§ 109 Abs. 2 GewO). Dazu gehören doppelte Verneinungen, Ironie und "bemühte sich".',
        "Alle Teile folgen derselben Note: Einzelbewertungen, Zufriedenheitsformel, Verhaltenssatz und Schlussformel. Ein Widerspruch fällt jeder Personalerin auf.",
        "Auslassungen senden Signale: Fehlt bei guter Note der Dank oder fehlen beim Verhalten die Vorgesetzten, liest man das als Abwertung.",
        "Im Text zu Leistung und Verhalten nie erwähnen: Krankheiten und Fehlzeiten, Elternzeit, Mutterschutz, Schwangerschaft, Betriebsrats- oder Gewerkschaftstätigkeit, Schwerbehinderung, Abmahnungen, Kündigungsgründe, Straftaten oder Verdachtsfälle, Religion, Herkunft, Familienstand.",
        zw ? "Das Endzeugnis darf später nur dann wesentlich vom Zwischenzeugnis abweichen, wenn sich Leistung oder Verhalten seitdem tatsächlich geändert haben."
          : "Das Endzeugnis trägt als Datum den letzten Tag des Arbeitsverhältnisses, auch wenn du es später schreibst. Ein späteres Datum kann auf Streit hindeuten.",
        ...(schwach ? ["Unter befriedigend musst du im Streitfall die Gründe beweisen (BAG, 18.11.2014, 9 AZR 584/13). Halte Belege bereit."] : []),
        ...(beginn && ende && ende < beginn ? ["Das Ende liegt vor dem Beginn."] : []),
      ],
      naechster_schritt: [
        "Schreib den Text mit diesem Aufbau. Dazu brauchst du Position, Aufgaben (wichtigste zuerst) und echte Erfolge. Namen und Geburtsdatum setzt du selbst ein.",
        "Platzhalter in eckigen Klammern ersetzen und jede Aussage gegenlesen: Würdest du sie im Streit belegen können?",
        "Auf Firmenbogen drucken, ohne Knicke oder Flecken.",
        "Unterschrift von Hand durch eine ranghöhere Person, darunter Name, Funktion und Firma. Elektronisch nur mit Einwilligung der Person (§ 109 Abs. 3 GewO) und qualifizierter elektronischer Signatur.",
        "Bewahr eine Kopie des unterschriebenen Zeugnisses in der Personalakte auf.",
      ],
    }, heute);
  },
};

/* ---------- Stellenanzeige (stellenanzeigen-generator.tsx, stellenanzeigen-agg.ts, lib/ki/batch-1.ts) ---------- */

// Wie die Seite den Titel prüft; fehlt der Zusatz, ergänzt sie (m/w/d).
const MWD = /\((?:m\/w\/d|w\/m\/d|m\/w\/x)\)/i;
const MW = /\(?\b(?:m\/w|w\/m)\b\)?/i;

const stellenanzeige_check: Werkzeug = {
  name: "stellenanzeige_check",
  titel: "Stellenanzeige: AGG-Check",
  beschreibung:
    "Checks a German job ad (Stellenanzeige) for discrimination traps under the AGG (Allgemeines Gleichbehandlungsgesetz), Germany only. Use it before a founder publishes a job ad or after you drafted one: pass the ad text. Returns each risky word with the protected characteristic (Merkmal), the reason and a better wording, plus the parts of a good ad; the text itself is neither stored nor returned. Then rewrite the ad with the better wordings.",
  eingabe: schema({ anzeigentext: text("Full text of the job ad, at most 3000 characters, without names or contact details", { maxLength: 3000 }) }, ["anzeigentext"]),
  ausfuehren(e, heute) {
    const t = String(e.anzeigentext);
    const funde: { wort: string | null; merkmal: string; grund: string; besser: string }[] =
      eindeutig(findeFallen(t)).map((f) => ({ wort: f.wort, merkmal: f.merkmal, grund: f.warum, besser: f.besser }));
    if (!MWD.test(t)) {
      const wort = t.match(MW)?.[0] ?? null;
      funde.push({ wort, merkmal: "Geschlecht", grund: `${wort ? "" : "Kein (m/w/d) gefunden. "}Die Anzeige muss alle Geschlechter ansprechen (§ 11 AGG). (m/w/d) ist der übliche und sichere Weg.`, besser: "Jobtitel mit (m/w/d) und neutrale Beschreibung." });
    }
    return antwort({
      ergebnis: {
        geprueft: "Merkmale nach § 1 AGG: Alter, Geschlecht, ethnische Herkunft, Religion oder Weltanschauung, Behinderung, sexuelle Identität. Für Anzeigen gilt § 11 AGG.",
        anzahl_funde: funde.length,
        funde,
        aufbau: [
          "Titel mit (m/w/d). Gibt es eine weibliche und eine männliche Form, nenn beide: Bürokauffrau / Bürokaufmann (m/w/d).",
          "Eckdaten direkt unter dem Titel: Ort, vor Ort, hybrid oder remote, Arbeitszeit, Start und Gehalt oder Spanne.",
          "Einstieg in 2 bis 3 Sätzen: was die Person hier jeden Tag tut und für wen. Mit dem Alltag beginnen, nicht mit der Firma.",
          "Über uns: 1 bis 3 sachliche Sätze zur Firma.",
          'Aufgaben: 3 bis 7 konkrete Sätze, zum Beispiel "Du schreibst Angebote für Gewerbekunden".',
          'Profil getrennt in Muss und "Schön, wenn". Unter Muss nur, was am ersten Arbeitstag wirklich nötig ist, zusammen höchstens 8 Anforderungen.',
          "Angebot: nur, was es wirklich gibt, mit Zahlen (30 Tage Urlaub, Zuschüsse in Euro).",
          "Bewerbung: so einfach wie möglich. Ein Lebenslauf genügt, dazu eine Ansprechperson mit Namen.",
        ],
      },
      quellen: ["§ 1 AGG", "§ 11 AGG", "§ 15 AGG", "§ 22 AGG"].map((n) => normQuelle(n)),
      fallen: [
        'Floskeln ohne Inhalt sagen nichts: "junges, dynamisches Team", "abwechslungsreiche Tätigkeit", "flache Hierarchien", "familiäre Atmosphäre", "Teil einer Erfolgsgeschichte".',
        "Eine abgelehnte Person kann eine Entschädigung von bis zu 3 Monatsgehältern verlangen, wenn sie auch bei benachteiligungsfreier Auswahl nicht eingestellt worden wäre (§ 15 Abs. 2 AGG). Die Anzeige gilt dabei als Indiz, du musst dann beweisen, dass die Ablehnung nichts mit dem Merkmal zu tun hatte (§ 22 AGG).",
        "Ein Gehalt in der Anzeige ist bisher keine Pflicht. Die EU-Entgelttransparenzrichtlinie wird Gehalt oder Spanne vor dem Gespräch verlangen, das deutsche Umsetzungsgesetz steht noch aus.",
        "Die Prüfung sucht typische Formulierungen. Umschreibungen erkennt sie nicht, lies den Text trotzdem gegen.",
      ],
      naechster_schritt: [
        ...(funde.length ? ["Ersetz jeden Fund durch die bessere Formulierung und prüf den Text danach noch einmal."] : []),
        "Für das Gespräch zeigt interviewfragen_check, welche Fragen du nicht stellen darfst.",
        "Absagen schreibst du freundlich und ohne Begründung. Ansprüche nach dem AGG müssen innerhalb von 2 Monaten nach Zugang der Absage schriftlich geltend gemacht werden (§ 15 Abs. 4 AGG).",
      ],
    }, heute);
  },
};

/* ---------- Interviewfragen (interviewfragen-generator.tsx, lib/ki/batch-4.ts, FAQ in lib/tools/batch-4.ts) ---------- */

/** Fest vorgegeben, nicht von der KI (AGG, Datenschutz). Wörtlich von der Seite, dazu das bisherige Gehalt aus ihrer FAQ. */
const NICHT_FRAGEN: [string, string][] = [
  ["Schwangerschaft und Familienplanung", "Benachteiligung wegen des Geschlechts (§§ 1, 7 AGG). Auch bei befristeten Stellen unzulässig."],
  ["Religion und Weltanschauung", "Geschütztes Merkmal nach § 1 AGG. Ausnahme nur bei kirchlichen Arbeitgebern in engen Grenzen."],
  ["Gewerkschaftszugehörigkeit", "Durch die Koalitionsfreiheit geschützt (Art. 9 Abs. 3 GG)."],
  ["Krankheiten und Behinderung", "Erlaubt ist nur, ob die Person die Kernaufgaben der Stelle ausüben kann. Nach Diagnosen fragst du nicht."],
  ["Herkunft und Staatsangehörigkeit", "Die ethnische Herkunft ist nach § 1 AGG geschützt. Erlaubt ist die Frage nach der Arbeitserlaubnis und nach Sprachkenntnissen, die die Stelle braucht."],
  ["Alter", "Geschütztes Merkmal nach § 1 AGG. Das Geburtsdatum brauchst du erst für den Vertrag."],
  ["Sexuelle Identität, Partnerschaft, Kinder", "Sexuelle Identität ist nach § 1 AGG geschützt. Fragen nach Partnerschaft und Kindern betreffen das Privatleben und deuten schnell auf eine Benachteiligung wegen des Geschlechts hin."],
  ["Vorstrafen", "Nur, soweit sie für die konkrete Stelle relevant sind, etwa Vermögensdelikte bei Kassentätigkeit."],
  ["Vermögen und Schulden", "Nur bei besonderer Vertrauensstellung mit Zugriff auf Geld."],
  ["Bisheriges Gehalt", "Heikel, weil es bestehende Unterschiede fortschreibt. Die EU-Entgelttransparenzrichtlinie (2023/970) verbietet diese Frage in Art. 5 Abs. 2, das deutsche Gesetz steht noch aus. Lass die Frage schon jetzt weg."],
];
const SENIORITAET = ["ausbildung", "berufseinstieg", "berufserfahren", "senior", "fuehrungskraft"];

const interviewfragen_check: Werkzeug = {
  name: "interviewfragen_check",
  titel: "Vorstellungsgespräch: erlaubte und verbotene Fragen",
  beschreibung:
    "Checklist for job interviews in Germany (Vorstellungsgespräch, Interviewfragen), Germany only. Use it when a founder prepares an interview or asks whether a question is allowed, e.g. about pregnancy (Schwangerschaft), religion, health or age under the AGG. Returns forbidden and sensitive topics with the reason, allowed questions, the method for structured questions with rating anchors and the interview flow. Then write the concrete questions for the role from it.",
  eingabe: schema({
    senioritaet: text("Seniority of the role: ausbildung (apprenticeship or internship), berufseinstieg (entry level), berufserfahren (2 to 5 years), senior, fuehrungskraft (manager)", { enum: SENIORITAET }),
    form: text("Interview setting: vor_ort (in person) or telefon_video (phone or video)", { enum: ["vor_ort", "telefon_video"] }),
  }),
  ausfuehren(e, heute) {
    const einsteiger = e.senioritaet === "ausbildung" || e.senioritaet === "berufseinstieg";
    return antwort({
      ergebnis: {
        nicht_fragen: NICHT_FRAGEN.map(([thema, grund]) => ({ thema, grund })),
        erlaubt: [
          "Fragen, die direkt mit der Stelle zu tun haben: Erfahrung, Arbeitsweise, typische Situationen der Rolle.",
          "Ob die Person die Kernaufgaben der Stelle ausüben kann.",
          "Arbeitserlaubnis.",
          'Sprachkenntnisse auf dem Niveau, das die Stelle braucht, nie als "Muttersprache".',
          "Gehaltsvorstellung.",
        ],
        methode: [
          "Strukturiertes Interview: alle Bewerbenden bekommen dieselben Fragen in derselben Reihenfolge und werden mit denselben Ankern bewertet.",
          "Je Anforderung 2 Fragen und 1 Nachfrage, offen, ohne Ja oder Nein, ohne Suggestion.",
          'Frage A, Erfahrung: nach einer echten vergangenen Situation, z. B. "Erzähl von einer Situation, in der ...".',
          'Frage B, Situation: ein typischer Moment genau dieser Rolle, z. B. "Stell dir vor, ... Wie gehst du vor?".',
          'Die Nachfrage vertieft, z. B. "Was hast du selbst getan?" oder "Woran hast du gemerkt, dass es funktioniert hat?".',
          'Bewertungsanker für 1, 3 und 5 Punkte beschreiben beobachtbares Verhalten in der Antwort, je ein Satz, der mit "Die Person" beginnt. 1 = schwach, 3 = solide, 5 = sehr stark.',
          'Allgemeine Begriffe wie "teamfähig", "belastbar", "flexibel", "kommunikativ" auf die Rolle zuspitzen. "Belastbar" heißt Umgang mit Arbeitsspitzen und Prioritäten, nie Gesundheit.',
          "Keine Stressfragen, keine Fangfragen, keine Fragen nach Stärken und Schwächen, Hobbys oder Privatleben.",
        ],
        ablauf: [
          "Begrüßung und Ablauf erklären",
          "Einstieg mit Lebenslauf in Kurzform",
          "Fragen zu den Anforderungen",
          "Fragen der bewerbenden Person",
          "Abschluss mit nächsten Schritten und Zeitrahmen",
          e.form === "telefon_video" ? "Am Telefon oder per Video: kürzerer Einstieg, aktiv nachfragen." : "Vor Ort: Rundgang oder Team kennenlernen nur, wenn die Zeit es zulässt.",
          "In 45 Minuten passen rund acht bis zehn Hauptfragen mit Nachfragen. Die Minuten der Phasen ergeben zusammen die Gesprächsdauer.",
        ],
        ...(einsteiger ? { hinweis_senioritaet: "Einfache Sprache, Situationen aus Schule, Nebenjob, Verein oder Praktikum zulassen." } : {}),
      },
      quellen: [normQuelle("§ 1 AGG"), normQuelle("§ 7 AGG"), normQuelle("§ 15 AGG"), normQuelle("Art. 9 Abs. 3 GG", "https://www.gesetze-im-internet.de/gg/art_9.html")],
      fallen: [
        "Unzulässige Fragen darf die Person falsch beantworten. Bei einer Benachteiligung drohen Entschädigungen, bei Nichteinstellung bis zu drei Monatsgehälter, wenn die Person auch sonst nicht eingestellt worden wäre (§ 15 Abs. 2 AGG).",
      ],
      naechster_schritt: [
        "Schreib für 3 bis 5 Kernanforderungen der Stelle die Fragen nach dieser Methode.",
        "Notizen direkt nach jeder Antwort, Punkte erst nach dem Gespräch vergeben.",
        "Wenn möglich bewerten zwei Personen unabhängig.",
        "Gesprächsnotizen nach Abschluss des Verfahrens löschen, in der Regel nach etwa 6 Monaten wegen möglicher AGG-Ansprüche.",
      ],
    }, heute);
  },
};

/* ---------- Mitarbeitergespräch (mitarbeitergespraech-leitfaden.tsx, lib/ki/batch-5.ts, Seitentext in lib/tools/batch-5.ts) ---------- */

type Phase = { phase: string; ziel: string; fragen: string[]; beispiel?: string };
const BEM = WERTE.bemSchwelleTage;
const PROBEZEIT_WOCHEN = WERTE.probezeitKuendigungTage.wert / 7;

const GESPRAECHE: Record<string, { titel: string; dauer: string; vorbereitung: string[]; ablauf: Phase[]; fallen: string[]; protokoll?: string[] }> = {
  kritik: {
    titel: "Kritikgespräch",
    dauer: "20 bis 30 Minuten",
    vorbereitung: [
      "Beobachtungen notieren: wann, was, welche Folge.",
      "Die Erwartung für die Zukunft in einem Satz festlegen.",
      "Rechnest du mit Widerspruch, nimm eine zweite Person aus der Führung als Zeugin mit und sag das vorher an.",
    ],
    ablauf: [
      { phase: "Einstieg", ziel: "Den Anlass in einem Satz nennen, ohne Umweg.", fragen: [] },
      {
        phase: "Beobachtung", ziel: "Schildern, was passiert ist, wann und mit welcher Folge. Beschreiben, nicht bewerten.", fragen: [],
        beispiel: "Du bist in den letzten sechs Wochen an elf Tagen nach 8 Uhr gekommen, die Kolleginnen haben in der Zeit deine Anrufe übernommen.",
      },
      { phase: "Sicht der Person", ziel: "Fragen und zuhören. Oft gibt es einen Grund, den du nicht kennst.", fragen: ["Wie siehst du das?", "Gibt es etwas, das ich wissen sollte?"] },
      { phase: "Erwartung", ziel: "Die Erwartung für die Zukunft klar benennen.", fragen: ["Was brauchst du, damit das ab jetzt klappt?"] },
      { phase: "Vereinbarung", ziel: "Etwas Überprüfbares mit Termin vereinbaren.", fragen: ["Bis wann können wir das prüfen?"] },
    ],
    fallen: ["Ein Kritikgespräch ist keine Abmahnung. Es hat keine arbeitsrechtliche Warnfunktion und kann eine Kündigung nicht vorbereiten. Wiederholt sich ein Pflichtverstoß nach dem Gespräch, ist eine schriftliche Abmahnung der nächste Schritt."],
    protokoll: ["Konkrete Beobachtung mit Datum", "Erwartung"],
  },
  probezeit: {
    titel: "Probezeitgespräch",
    dauer: "30 bis 45 Minuten",
    vorbereitung: [
      "Stärken und Lücken mit Beispielen notieren.",
      "Festlegen, was bis zum Ende der Probezeit passieren muss.",
      "Am besten zweimal sprechen: nach etwa drei Monaten als Zwischenstand und rechtzeitig vor dem Ende der Probezeit.",
    ],
    ablauf: [
      { phase: "Einstieg", ziel: "Den Zweck nennen: Zwischenstand oder Ende der Probezeit.", fragen: [] },
      { phase: "Sicht der Person", ziel: "Erst zuhören.", fragen: ["Wie erlebst du die ersten Monate?", "Wo brauchst du noch Unterstützung?"] },
      { phase: "Stärken und Lücken", ziel: "Beides konkret mit Beispielen benennen.", fragen: [] },
      { phase: "Stand und Erwartung", ziel: "Ehrlich sagen, wo die Person steht, und konkret nennen, was bis zum Ende passieren muss.", fragen: ["Was brauchst du dafür von mir?"] },
      { phase: "Vereinbarung", ziel: "Wer macht was bis wann, und wann sprecht ihr wieder.", fragen: [] },
    ],
    fallen: [
      "Versprich keine Übernahme, die noch nicht entschieden ist.",
      `Die Kündigungsfrist in der Probezeit beträgt ${PROBEZEIT_WOCHEN} Wochen (§ 622 Abs. 3 BGB), wenn Vertrag oder Tarifvertrag nichts anderes regeln. Die Kündigung muss spätestens am letzten Tag der Probezeit zugehen. Wer erst in der letzten Woche spricht, hat keine Wahl mehr.`,
    ],
  },
  jahr: {
    titel: "Jahresgespräch",
    dauer: "45 bis 60 Minuten",
    vorbereitung: [
      "Zwei oder drei Beispiele aus dem Jahr heraussuchen.",
      "Gehalt nur einplanen, wenn du es bewusst ansprechen willst. Viele Firmen trennen Gehaltsgespräch und Entwicklungsgespräch.",
    ],
    ablauf: [
      { phase: "Rückblick", ziel: "Zwei oder drei Beispiele aus dem Jahr besprechen.", fragen: ["Worauf bist du im letzten Jahr stolz?", "Was lief nicht gut?"] },
      { phase: "Feedback in beide Richtungen", ziel: "Deine Sicht sagen und ihre hören.", fragen: ["Was soll ich als Führungskraft anders machen?"] },
      { phase: "Ziele", ziel: "2 bis 3 Ziele für das nächste Jahr vereinbaren.", fragen: ["Woran merken wir in einem Jahr, dass das Ziel erreicht ist?"] },
      { phase: "Entwicklung", ziel: "Wünsche zur Entwicklung besprechen.", fragen: ["Wo willst du in einem Jahr stehen?"] },
      { phase: "Vereinbarung", ziel: "Wer macht was bis wann, und wann sprecht ihr wieder.", fragen: [] },
    ],
    fallen: ["Gehalt hat im Jahresgespräch nur Platz, wenn du es bewusst einplanst. Sonst überlagert es alles andere."],
  },
  rueckkehr: {
    titel: "Rückkehrgespräch nach Krankheit",
    dauer: "20 bis 30 Minuten",
    vorbereitung: [
      "Zusammenstellen, was sich in der Abwesenheit geändert hat.",
      `Prüfen, ob die Person in den letzten ${BEM.zeitraumMonate} Monaten länger als ${BEM.wert / 7} Wochen arbeitsunfähig war.`,
    ],
    ablauf: [
      { phase: "Willkommen", ziel: "Sagen, dass du dich freust, dass die Person wieder da ist.", fragen: [] },
      { phase: "Information", ziel: "Erzählen, was sich in der Abwesenheit geändert hat.", fragen: ["Was möchtest du als Erstes wissen?"] },
      { phase: "Unterstützung", ziel: "Fragen, ob die Person am Arbeitsplatz Unterstützung braucht.", fragen: ["Brauchst du am Arbeitsplatz Unterstützung?", "Was würde dir den Einstieg leichter machen?"] },
      { phase: "Vereinbarung", ziel: "Festhalten, was ihr ändert und wann ihr wieder sprecht.", fragen: [] },
    ],
    fallen: [
      "Nach Diagnose, Ursache oder Behandlung fragst du nicht. Die Person muss darauf nicht antworten, und Gesundheitsdaten gehören nicht in die Personalakte.",
      "Behaupte nicht, die Person sei wieder gesund. Kein Vorwurf, keine Kontrollfragen.",
      `Ein Rückkehrgespräch ist kein Betriebliches Eingliederungsmanagement. War jemand innerhalb von ${BEM.zeitraumMonate} Monaten länger als ${BEM.wert / 7} Wochen arbeitsunfähig, ob am Stück oder in mehreren Zeiten, musst du ein BEM anbieten (§ 167 Abs. 2 SGB IX).`,
    ],
  },
};

const mitarbeitergespraech_leitfaden: Werkzeug = {
  name: "mitarbeitergespraech_leitfaden",
  titel: "Mitarbeitergespräch: Leitfaden",
  beschreibung:
    "Guide for employee meetings in German companies (Mitarbeitergespräch), Germany only: critical feedback (Kritikgespräch), probation review (Probezeitgespräch), annual review (Jahresgespräch) or return after illness (Rückkehrgespräch). Use it when a founder has to hold such a meeting. Returns duration, preparation, phases with goal and open questions, difficult moments, a minutes template and legal traps such as BEM or works council rights. Then write the exact wording for each phase from it.",
  eingabe: schema({
    art: text("Kind of meeting: kritik (critical feedback), probezeit (probation review), jahr (annual review), rueckkehr (return after illness)", { enum: Object.keys(GESPRAECHE) }),
    betriebsrat: janein("The company has a works council (Betriebsrat), default false"),
  }, ["art"]),
  ausfuehren(e, heute) {
    const art = String(e.art);
    const g = GESPRAECHE[art];
    const br = e.betriebsrat === true;
    const br82 = br && (art === "probezeit" || art === "jahr");
    const br87 = br && art === "rueckkehr";
    return antwort({
      ergebnis: {
        titel: g.titel,
        dauer: g.dauer,
        vorbereitung: [...g.vorbereitung, "Mit ein paar Tagen Vorlauf einladen und das Thema nennen. Ein Raum, in dem niemand mithört, Telefon stumm."],
        ablauf: g.ablauf,
        schwierige_momente: "Für jede typische Reaktion eine ruhige Antwort vorbereiten: Abwehr, Tränen, Gegenangriff, Schweigen.",
        protokoll: ["Datum", "Teilnehmende", "Anlass", ...(g.protokoll ?? []), "Vereinbarungen mit Verantwortlichen und Termin", "Folgetermin"],
        sprache: [
          "Formulierungen in du-Form, kurz, freundlich und klar, wie gesprochen.",
          "Offene Fragen, keine Suggestivfragen.",
          "Beobachtung statt Bewertung: beschreiben, was passiert ist, nicht wie die Person ist.",
          "Keine echten Namen und keine Diagnosen. Fehlende Details als Platzhalter in eckigen Klammern, z. B. [Datum].",
        ],
      },
      quellen: [
        ...(art === "probezeit" ? [registerQuelle("probezeitKuendigungTage", heute)] : []),
        ...(art === "rueckkehr" ? [registerQuelle("bemSchwelleTage", heute)] : []),
        ...(br82 ? [normQuelle("§ 82 Abs. 2 BetrVG")] : []),
        ...(br87 ? [normQuelle("§ 87 Abs. 1 Nr. 1 BetrVG")] : []),
      ],
      fallen: [
        ...g.fallen,
        ...(br82 ? ["Die Person darf ein Betriebsratsmitglied hinzuziehen, wenn es um die Beurteilung ihrer Leistung oder ihre berufliche Entwicklung geht (§ 82 Abs. 2 BetrVG). Weise in der Einladung darauf hin."] : []),
        ...(br87 ? ["Führst du Rückkehrgespräche nach festem Schema mit allen Rückkehrenden, bestimmt der Betriebsrat mit (§ 87 Abs. 1 Nr. 1 BetrVG)."] : []),
        "Ein Trennungsgespräch ist nicht Teil dieses Leitfadens. Es braucht eine rechtliche Vorbereitung, die ein Leitfaden nicht leisten kann.",
      ],
      naechster_schritt: [
        "Schreib mit diesem Ablauf die wörtlichen Sätze für jede Phase, ohne Namen.",
        "Lies den Leitfaden vorher einmal laut. Im Gespräch nicht ablesen, er ist ein Spickzettel.",
        "Protokoll direkt nach dem Gespräch schreiben, der Person eine Kopie oder die Vereinbarung per E-Mail geben und den Folgetermin in beide Kalender eintragen.",
      ],
    }, heute);
  },
};

/* ---------- Nachweisgesetz (arbeitsvertrag-check.tsx, Seitentext in lib/tools/batch-1.ts) ---------- */

type Gruppe = 1 | 7 | 30;
/** Pflichtangaben nach § 2 Abs. 1 NachwG (Stand 2026) mit gestaffelten Aushändigungsfristen, wörtlich von der Seite. */
const PUNKTE: { nr: number; titel: string; detail: string; gruppe: Gruppe; bedingt?: string; tipp: string }[] = [
  { nr: 1, titel: "Name und Anschrift beider Parteien", detail: "Firma mit Anschrift, Mitarbeiter:in mit Wohnanschrift.", gruppe: 1, tipp: "Firmenname mit Anschrift und die Wohnanschrift der Person in den Vertragskopf." },
  { nr: 2, titel: "Beginn des Arbeitsverhältnisses", detail: "Konkretes Datum.", gruppe: 7, tipp: "Ein Satz reicht: Das Arbeitsverhältnis beginnt am [Datum]." },
  { nr: 3, titel: "Enddatum bei Befristung", detail: "Oder die vorhersehbare Dauer.", gruppe: 7, bedingt: "unbefristet", tipp: "Enddatum oder Dauer nennen. Die Befristung selbst braucht Papier mit beiden Unterschriften." },
  { nr: 4, titel: "Arbeitsort", detail: "Oder Hinweis auf wechselnde oder frei wählbare Orte.", gruppe: 7, tipp: "Ort nennen. Bei Homeoffice oder wechselnden Einsatzorten einen Satz dazu." },
  { nr: 5, titel: "Beschreibung der Tätigkeit", detail: "Kurze Charakterisierung reicht.", gruppe: 7, tipp: "Zwei, drei Sätze zu den Aufgaben, nicht nur der Jobtitel." },
  { nr: 6, titel: "Dauer der Probezeit", detail: "Nur wenn vereinbart.", gruppe: 7, bedingt: "keine Probezeit", tipp: "Dauer der Probezeit nennen, zum Beispiel: Die ersten 6 Monate gelten als Probezeit." },
  { nr: 7, titel: "Entgelt mit allen Bestandteilen", detail: "Getrennt: Grundgehalt, Überstunden, Zuschläge, Zulagen, Prämien, Sonderzahlungen. Dazu Fälligkeit und Art der Auszahlung.", gruppe: 1, tipp: "Jeden Bestandteil einzeln aufführen, dazu: fällig am Monatsende, Überweisung auf das Konto der Person." },
  { nr: 8, titel: "Arbeitszeit, Pausen, Ruhezeiten", detail: "Bei Schichtarbeit auch System, Rhythmus und Voraussetzungen für Änderungen.", gruppe: 1, tipp: "Wochenstunden und Verteilung, dazu: Es gelten die Ruhepausen und Ruhezeiten nach §§ 4, 5 ArbZG." },
  { nr: 9, titel: "Arbeit auf Abruf", detail: "Mindeststunden, Zeitrahmen, Ankündigungsfrist (§ 12 TzBfG).", gruppe: 7, bedingt: "keine Abrufarbeit", tipp: "Mindeststunden, Referenztage und -zeiten und die Ankündigungsfrist (mindestens 4 Tage, § 12 Abs. 3 TzBfG)." },
  { nr: 10, titel: "Anordnung von Überstunden", detail: "Ob und unter welchen Voraussetzungen.", gruppe: 7, bedingt: "nicht vereinbart", tipp: "Wann du Überstunden anordnen darfst, wie viele höchstens und wie sie ausgeglichen werden." },
  { nr: 11, titel: "Dauer des Jahresurlaubs", detail: "Anzahl der Urlaubstage.", gruppe: 30, tipp: "Zahl der Urlaubstage und die Arbeitswoche, auf die sie sich bezieht." },
  { nr: 12, titel: "Anspruch auf Fortbildung", detail: "Nur wenn der Arbeitgeber Fortbildung bereitstellt.", gruppe: 30, bedingt: "kein Anspruch", tipp: "Ein Satz genügt, auch: Ein Anspruch auf vom Arbeitgeber bereitgestellte Fortbildung besteht nicht." },
  { nr: 13, titel: "Versorgungsträger der bAV", detail: "Name und Anschrift, wenn die bAV über einen Träger läuft.", gruppe: 30, bedingt: "keine bAV über Träger", tipp: "Name und Anschrift der Pensionskasse, Direktversicherung oder Unterstützungskasse." },
  { nr: 14, titel: "Kündigungsverfahren", detail: "Mindestens Schriftform, Kündigungsfristen und die 3-Wochen-Frist für die Klage.", gruppe: 30, tipp: "Schriftform, Fristen nach § 622 BGB und die 3-Wochen-Frist für die Klage (§ 4 KSchG)." },
  { nr: 15, titel: "Tarifverträge, Betriebsvereinbarungen", detail: "Allgemeiner Hinweis auf die, die gelten.", gruppe: 30, bedingt: "keine gelten", tipp: "Ein allgemeiner Satz, welche Tarifverträge und Betriebsvereinbarungen gelten, oder dass keine gelten." },
];
const FRIST: Record<Gruppe, string> = { 1: "Erster Arbeitstag", 7: "7. Kalendertag nach Beginn", 30: "1 Monat nach Beginn" };
const STAND = ["drin", "fehlt", "entfaellt"];

const nachweis_pflichtangaben: Werkzeug = {
  name: "nachweis_pflichtangaben",
  titel: "Arbeitsvertrag-Check: Pflichtangaben nach NachwG",
  beschreibung:
    "Checklist of the mandatory written terms of employment under § 2 Abs. 1 NachwG (Nachweisgesetz, Arbeitsvertrag-Check), Germany only. Use it when a founder hires someone or checks a contract: with the start date it gives the deadline for each of the 15 items (first working day, 7th calendar day, one month), with an answer per item it shows what is missing or overdue. It also checks the form: written form, text form since 2025 under conditions, paper-only industries and fixed-term contracts. Then draft the missing clauses or a separate written statement from it.",
  eingabe: schema({
    beginn: datum("Agreed first day of employment; deadlines count from it"),
    befristet: janein("Fixed-term contract (befristet), default false"),
    papierpflicht_branche: janein("Industry under § 2a SchwarzArbG (construction, hospitality, passenger transport, logistics, fairground, building cleaning, trade fair construction, meat industry, prostitution, security, hairdressing and cosmetics): paper only, default false"),
    form: text("How the written statement is given: papier (signed paper), textform (PDF or e-mail), nichts (nothing in writing yet)", { enum: ["papier", "textform", "nichts"] }),
    empfangsbestaetigung: janein("With textform: the employee is asked to confirm receipt"),
    angaben: liste(
      "What the contract already contains, per item 1 to 15: drin (included), fehlt (missing), entfaellt (not applicable, only for items that apply only if agreed). Items without an answer count as open",
      schema({ nr: zahl("Item number 1 to 15", 1, 15), stand: text("drin, fehlt or entfaellt", { enum: STAND }) }, ["nr", "stand"]),
      15,
    ),
  }),
  ausfuehren(e, heute) {
    const beginn = e.beginn as string | undefined;
    const befristet = e.befristet === true, branche = e.papierpflicht_branche === true, empfang = e.empfangsbestaetigung === true;
    const form = e.form as string | undefined;
    const antworten = new Map(((e.angaben as { nr: number; stand: string }[] | undefined) ?? []).map((a) => [a.nr, a.stand]));
    const geprueft = antworten.size > 0;
    const altvertrag = !!beginn && beginn < "2022-08-01";
    const faellig = (g: Gruppe) => !beginn || altvertrag ? null
      : g === 1 ? beginn : g === 7 ? addDays(beginn, WERTE.nachwgFristen.tage) : addMonths(beginn, WERTE.nachwgFristen.monate);

    const pflichtangaben = PUNKTE.map((p) => {
      const basis = { nr: p.nr, titel: p.titel, detail: p.detail, frist: FRIST[p.gruppe], faellig_am: faellig(p.gruppe), ...(p.bedingt ? { entfaellt_wenn: p.bedingt } : {}), tipp: p.tipp };
      if (!geprueft) return basis;
      if (p.nr === 3 && !befristet) return { ...basis, stand: "entfaellt" };
      // "entfällt" nur bei Punkten, die nur bei Vereinbarung gelten; Nr. 3 ist bei Befristung immer Pflicht (wie die Seite).
      const a = antworten.get(p.nr);
      const stand = a === "entfaellt" && (!p.bedingt || p.nr === 3) ? "fehlt" : a ?? "offen";
      const f = basis.faellig_am;
      return { ...basis, stand, ...(stand !== "drin" && stand !== "entfaellt" && f && heute > f ? { ueberfaellig: true } : {}) };
    });

    const formHinweise = [
      ...(form === "nichts" ? [{ titel: "Kein schriftlicher Nachweis", text: "Mündliche Absprachen reichen nicht. Sobald die erste Frist abläuft, liegt ein Verstoß gegen § 2 NachwG vor.", rot: true }] : []),
      ...(form === "textform" && branche ? [{ titel: "Textform hier nicht erlaubt", text: "In Branchen nach § 2a SchwarzArbG muss der Nachweis auf Papier mit eigenhändiger Unterschrift übergeben werden.", rot: true }] : []),
      ...(form === "textform" && !branche && !empfang ? [{ titel: "Empfangsnachweis fehlt", text: "Textform reicht nur, wenn das Dokument speicher- und druckbar ist und du zur Bestätigung des Empfangs aufforderst.", rot: false }] : []),
      ...(befristet && form && form !== "papier" ? [{ titel: "Befristung unwirksam", text: "Eine Befristung braucht die Schriftform mit Unterschrift beider Seiten vor dem ersten Arbeitstag (§ 14 Abs. 4 TzBfG). Per PDF oder E-Mail gilt der Vertrag als unbefristet.", rot: true }] : []),
    ];
    const relevant = pflichtangaben.filter((p) => !(p.nr === 3 && !befristet));
    const fehlend = relevant.filter((p) => "stand" in p && p.stand !== "drin" && p.stand !== "entfaellt");
    const offen = relevant.filter((p) => "stand" in p && p.stand === "offen").length;
    const ampel = formHinweise.some((f) => f.rot) || fehlend.some((p) => "ueberfaellig" in p) ? "rot" : fehlend.length || formHinweise.length ? "gelb" : "gruen";
    const AMPEL = {
      rot: { t: "Handlungsbedarf", s: "Fristen sind abgelaufen oder die Form stimmt nicht." },
      gelb: { t: "Lücken schließen", s: "Ergänze die fehlenden Angaben bis zur jeweiligen Frist." },
      gruen: { t: "Vollständig", s: "Alle Pflichtangaben nach § 2 NachwG sind enthalten." },
    }[ampel];

    return antwort({
      ergebnis: {
        beginn: beginn ?? null, altvertrag,
        ...(geprueft ? { ampel: AMPEL.t, erklaerung: AMPEL.s, erfuellt: `${relevant.length - fehlend.length} von ${relevant.length}`, fehlend: fehlend.map((p) => p.nr) } : {}),
        pflichtangaben,
        form: formHinweise.map(({ titel, text }) => ({ titel, text })),
        formregeln: [
          "Seit dem 1. Januar 2025 darfst du den Nachweis auch in Textform erteilen, etwa als PDF per E-Mail (§ 2 Abs. 1 NachwG). Bedingung: Das Dokument ist für die Person zugänglich, speicher- und druckbar, und du forderst sie auf, den Empfang zu bestätigen. Eine kurze Antwortmail reicht als Bestätigung.",
          "In Branchen nach § 2a SchwarzArbG bleibt es beim Papier mit eigenhändiger Unterschrift: Bau, Gaststätten und Beherbergung, Personenbeförderung, Spedition, Transport und Logistik, Schausteller, Gebäudereinigung, Messebau, Fleischwirtschaft, Prostitutionsgewerbe, Wach- und Sicherheitsgewerbe sowie Friseur- und Kosmetikgewerbe.",
          "Die Person kann verlangen, dass du den Nachweis schriftlich auf Papier erteilst.",
          "Ein schriftlicher Arbeitsvertrag erfüllt die Pflicht, wenn er alle Angaben enthält (§ 2 Abs. 5 NachwG). Fehlt etwas, kannst du es in einem separaten Nachweis ergänzen.",
        ],
      },
      rechenweg: beginn && !altvertrag ? ([1, 7, 30] as Gruppe[]).map((g) =>
        `${FRIST[g]}: ${formatDE(faellig(g)!)} (Nr. ${PUNKTE.filter((p) => p.gruppe === g).map((p) => p.nr).join(", ")}), § 2 Abs. 1 Satz 4 NachwG.`) : [],
      quellen: [
        registerQuelle("nachwgFristen", heute), registerQuelle("nachwgBussgeld", heute), normQuelle("§ 3 NachwG"),
        normQuelle("§ 2a SchwarzArbG", "https://www.gesetze-im-internet.de/schwarzarbg_2004/__2a.html"),
        ...(befristet ? [normQuelle("§ 14 Abs. 4 TzBfG")] : []),
        ...(altvertrag ? [normQuelle("§ 5 NachwG")] : []),
      ],
      fallen: [
        `Verstöße gegen die Nachweispflicht kosten bis ${de(WERTE.nachwgBussgeld.wert)} Euro Bußgeld je Fall (§ 4 NachwG). Das gilt auch für Minijobs und Aushilfen.`,
        'Beim Kündigungsverfahren reicht "Es gelten die gesetzlichen Kündigungsfristen" nicht. Nötig sind die Schriftform, die Fristen und die 3-Wochen-Frist zur Klage.',
        "Ändern sich wesentliche Bedingungen, etwa beim Wechsel in Teilzeit, teilst du die Änderung spätestens an dem Tag schriftlich mit, an dem sie wirksam wird (§ 3 NachwG).",
        ...(befristet && !form ? ["Eine Befristung braucht die Schriftform mit Unterschrift beider Seiten vor dem ersten Arbeitstag (§ 14 Abs. 4 TzBfG). Per PDF oder E-Mail gilt der Vertrag als unbefristet."] : []),
        ...(altvertrag ? ["Altvertrag vor dem 01.08.2022: Nachweis nur auf Verlangen (§ 5 NachwG). Nr. 1 bis 10 spätestens am 7. Tag nach der Aufforderung, Nr. 11 bis 15 spätestens einen Monat danach."] : []),
        ...(offen ? [`${offen} Punkte noch offen, sie zählen als fehlend.`] : []),
      ],
      naechster_schritt: [
        ...(fehlend.length ? ["Ergänze die fehlenden Angaben im Vertrag oder in einem separaten Nachweis vor Ablauf der Frist."] : []),
        "Gib den vollständigen Vertrag am besten vor dem ersten Arbeitstag heraus. Das spart doppelte Arbeit.",
        "Bewahr bei Textform die Empfangsbestätigung, bei Papier das unterschriebene Exemplar in der Personalakte auf.",
        "Ob einzelne Klauseln wirksam sind, prüft diese Liste nicht. Dafür gibt es klausel_pruefen.",
      ],
    }, heute);
  },
};

export const SCHREIBEN: Werkzeug[] = [arbeitszeugnis, stellenanzeige_check, interviewfragen_check, mitarbeitergespraech_leitfaden, nachweis_pflichtangaben];
