/**
 * Briefe zu Trennung und Konflikt: Kündigungsschreiben, Abmahnung, Pflichtangaben einer Kündigung. Vorlage ist lintelly.com
 * (components/tools/kuendigungsschreiben-generator.tsx, abmahnung-generator.tsx, lib/ki/batch-2.ts). Namen und Anschriften
 * bleiben Platzhalter, die Claude oder ChatGPT mit den Angaben des Nutzers füllt. Vor dem Versand prüft ein Mensch (Nick 23.10.2026).
 */
import { berechneKuendigung, formatDE, isISODate, REGEL_GRUNDFRIST, REGEL_PROBEZEIT, STAFFEL_622, type FristRegel, type KuendigungsErgebnis } from "@/lib/regeln/datum";
import { WERTE, fristWort, monateText, zahlwort } from "@/lib/regeln/werte";
import { antwort, normQuelle, registerQuelle } from "../antwort";
import { datum, janein, schema, text, zahl } from "../eingabe";
import type { Werkzeug } from "../werkzeug";

const LINIE = "______________________________";
const ADRESSE = ["[Straße Hausnummer]", "[PLZ Ort]"];
const tag = (d?: string) => (isISODate(d) ? formatDE(d) : "[Datum]");

/** Brief nach DIN 5008 als Klartext wie briefText in components/tools/dokument.tsx, Absender, Empfänger und Unterschrift als Platzhalter. */
function briefText(b: { vermerk: string[]; datum?: string; betreff: string; anrede: string; bloecke: string[]; gruss: string; zusatz?: string; anlage?: string }): string {
  return [
    "[Firma]", ...ADRESSE, "", ...b.vermerk, "", "[Vorname Nachname]", ...ADRESSE, "", `[Ort], ${tag(b.datum)}`, "", b.betreff, "", b.anrede, "",
    ...b.bloecke.flatMap((x) => [x, ""]),
    b.gruss, "", "", LINIE, b.zusatz ? `${b.zusatz} [Vor- und Nachname]` : "[Vor- und Nachname]", "[Funktion]", "[Firma]",
    ...(b.anlage ? ["", "Anlage", b.anlage] : []),
  ].join("\n");
}

/* ---------- Kündigungsschreiben ---------- */

type Freistellung = "keine" | "widerruflich" | "unwiderruflich";

/** Hinweise der Seite zum Unterschriftenfeld (vertretungHinweis im Generator). */
const UNTERSCHRIFT = {
  geschaeftsfuehrung: { zusatz: "", hinweis: "Geschäftsführung oder Inhaber unterschreiben ohne Zusatz. Die Personalleitung darf in der Regel auch ohne Vollmacht kündigen." },
  prokura: { zusatz: "ppa.", hinweis: "Prokuristen dürfen kündigen. Ist die Prokura im Handelsregister eingetragen, braucht es keine Vollmacht im Original." },
  in_vertretung: { zusatz: "i. V.", hinweis: "Wer mit i. V. unterschreibt, legt die Vollmacht im Original bei, sonst kann die Kündigung zurückgewiesen werden (§ 174 BGB). Der Brief hat dafür den Anlagenvermerk." },
  im_auftrag: { zusatz: "i. A.", hinweis: "Für eine Kündigung nicht empfohlen: i. A. kann als bloße Botenrolle gelesen werden. Nimm i. V. mit Originalvollmacht oder lass die Geschäftsführung unterschreiben." },
};

/** Liste „Vor dem Versand“ der Seite, davor die Bestätigung zum Sonderkündigungsschutz, danach der Hinweis zur Arbeitsuchendmeldung. */
const PRUEFLISTE_KUENDIGUNG = [
  "Sonderkündigungsschutz prüfen: Schwangerschaft und Mutterschutz, Elternzeit, Pflegezeit, Schwerbehinderung oder Gleichstellung, Betriebsrat, Datenschutzbeauftragte. Bis das geklärt ist, bleibt das Schreiben ein Entwurf.",
  "Ausdrucken und eigenhändig unterschreiben. E-Mail, Fax, Scan oder WhatsApp sind unwirksam (§ 623 BGB).",
  "Unterschreiben darf, wer die Firma vertritt. Alle anderen legen die Vollmacht im Original bei, sonst droht die Zurückweisung (§ 174 BGB).",
  "Zugang beweisbar machen: persönlich mit Zeugen und Empfangsbestätigung oder per Bote, der den Inhalt kennt und den Einwurf protokolliert. Kein Übergabe-Einschreiben.",
  "Kopie mit Zugangsnachweis in die Personalakte, Lohnbüro über das Enddatum informieren.",
  `Ab Zugang hat die Person ${WERTE.kschgKlageWochen.wert} Wochen Zeit für eine Kündigungsschutzklage (§ 4 KSchG).`,
  "Der Brief weist auf die Pflicht hin, sich bei der Agentur für Arbeit arbeitsuchend zu melden (§ 38 Abs. 1 SGB III). Diesen Hinweis sollst du geben (§ 2 Abs. 2 Satz 2 Nr. 3 SGB III), lass ihn drin.",
];

/** Rechtswert im Register zur gesetzlichen Fristregel. */
const REGEL_WERT: Record<Exclude<FristRegel["art"], "vertrag">, string> = {
  probezeit: "probezeitKuendigungTage", grundfrist: "grundkuendigungsfristTage", kleinbetrieb: "kleinbetriebKuendigung", staffel: "kuendigungsStaffel",
};

/** Text wie baueKuendigung im Kündigungsschreiben-Generator, ohne Namen. */
function kuendigungsbrief(b: { sie: boolean; ende: string; datum?: string; freistellung: Freistellung; freistellungAb?: string; resturlaub?: number; betriebsrat: boolean; rueckgabe: boolean; bote: boolean; zusatz: string }): string {
  const S = b.sie;
  const ihnen = S ? "Ihnen" : "dir";
  const sieA = S ? "Sie" : "dich";
  const ihres = S ? "Ihres" : "deines";
  const fAb = tag(b.freistellungAb);
  const { monate, tage } = WERTE.arbeitsuchendMeldung;
  const t: string[] = [];
  t.push(`hiermit kündigen wir das zwischen ${ihnen} und uns bestehende Arbeitsverhältnis ordentlich und fristgerecht zum ${formatDE(b.ende)}, hilfsweise zum nächstmöglichen Termin.`);
  if (b.betriebsrat) t.push("Der Betriebsrat wurde vor Ausspruch der Kündigung angehört.");
  if (b.freistellung === "widerruflich") {
    t.push(`Ab dem ${fAb} stellen wir ${sieA} bis zur Beendigung des Arbeitsverhältnisses unter Fortzahlung der vereinbarten Vergütung widerruflich von der Pflicht zur Arbeitsleistung frei.`);
  } else if (b.freistellung === "unwiderruflich") {
    const urlaub = b.resturlaub === undefined ? "" : ` von ${String(b.resturlaub).replace(".", ",")} Arbeitstagen`;
    t.push(`Ab dem ${fAb} stellen wir ${sieA} bis zur Beendigung des Arbeitsverhältnisses unter Fortzahlung der vereinbarten Vergütung unwiderruflich von der Pflicht zur Arbeitsleistung frei. Die Freistellung erfolgt unter Anrechnung ${ihres} restlichen Urlaubsanspruchs${urlaub} und eines etwaigen Guthabens auf dem Arbeitszeitkonto. Der Urlaub wird zu Beginn der Freistellung gewährt.`);
  }
  t.push(`Zur Aufrechterhaltung ${ihres} Anspruchs auf Arbeitslosengeld ${S ? "sind Sie" : "bist du"} verpflichtet, ${S ? "sich" : "dich"} spätestens ${zahlwort(monate)} Monate vor Beendigung des Arbeitsverhältnisses bei der Agentur für Arbeit arbeitsuchend zu melden (persönlich, online oder telefonisch). Liegen zwischen dem Zugang dieser Kündigung und dem Ende des Arbeitsverhältnisses weniger als ${zahlwort(monate)} Monate, muss die Meldung innerhalb von ${zahlwort(tage)} Tagen nach Zugang erfolgen. Eine verspätete Meldung kann zu einer Sperrzeit führen. Außerdem ${S ? "sind Sie" : "bist du"} verpflichtet, ${S ? "sich" : "dich"} aktiv um eine neue Beschäftigung zu bemühen.`);
  if (b.rueckgabe)
    t.push(`Bitte ${S ? "geben Sie" : "gib"} alle Arbeitsmittel, Unterlagen, Schlüssel, Zugangskarten und Datenträger, die ${ihnen} überlassen wurden, ${b.freistellung === "keine" ? "spätestens am letzten Arbeitstag" : `spätestens zu Beginn der Freistellung am ${fAb}`} zurück.`);
  t.push(`${S ? "Ihr" : "Dein"} Arbeitszeugnis und die Arbeitspapiere ${S ? "erhalten Sie" : "erhältst du"} zum Ende des Arbeitsverhältnisses.`);
  return briefText({
    vermerk: [b.bote ? "Per Boten" : "Persönliche Übergabe", "Persönlich/Vertraulich"],
    datum: b.datum,
    betreff: "Kündigung des Arbeitsverhältnisses",
    anrede: S ? "Guten Tag [Vorname Nachname]," : "Hallo [Vorname],",
    bloecke: t,
    gruss: S ? "Mit freundlichen Grüßen" : "Viele Grüße",
    zusatz: b.zusatz,
    anlage: b.zusatz === "i. V." || b.zusatz === "i. A." ? "Vollmacht im Original" : undefined,
  });
}

type KuendigungEingabe = {
  eintritt: string; zugang: string; probezeit_monate?: number; vertragsfrist?: "keine" | "monatsende" | "quartalsende"; vertragsfrist_monate?: number;
  kleinbetrieb_vier_wochen?: boolean; tarifvertrag?: boolean; ausbildung?: boolean; anrede?: "sie" | "du"; briefdatum?: string;
  unterschrift?: keyof typeof UNTERSCHRIFT; zustellung?: "persoenlich" | "bote"; freistellung?: Freistellung; freistellung_ab?: string;
  resturlaub_tage?: number; betriebsrat?: "keiner" | "angehoert" | "nicht_angehoert"; rueckgabe?: boolean;
};

const kuendigungsschreiben: Werkzeug = {
  name: "kuendigungsschreiben",
  titel: "Kündigungsschreiben",
  beschreibung:
    "German employment law, Germany only. Builds an employer's termination letter (Kündigungsschreiben, ordentliche Kündigung) in DIN 5008 form with the end date calculated under § 622 BGB from start date and day of receipt (Zugang), plus the checklist before sending (Schriftform § 623 BGB, Zugang, Vollmacht, Klagefrist). Names, addresses and signer stay placeholders in square brackets; you fill them with the user's details. Not for summary dismissal (fristlose Kündigung) or apprentices.",
  eingabe: schema({
    eintritt: datum("First day of employment (Eintritt); apprenticeship in the same company counts"),
    zugang: datum("Day the employee receives the signed original (Zugang), not the date of the letter"),
    probezeit_monate: zahl("Agreed probation in whole months (Probezeit), 0 = none, default 6 as on lintelly.com; ask if unsure", 0, 12),
    vertragsfrist: text("Longer notice period agreed in the contract (Vertrag), default keine", { enum: ["keine", "monatsende", "quartalsende"] }),
    vertragsfrist_monate: zahl("Months of that contractual notice period, default 3", 1, 12),
    kleinbetrieb_vier_wochen: janein(`At most ${WERTE.kleinbetriebKuendigung.hoechstBeschaeftigte} employees and the contract agrees ${WERTE.kleinbetriebKuendigung.tage / 7} weeks without a fixed end date (§ 622 Abs. 5 BGB)`),
    tarifvertrag: janein("A collective agreement (Tarifvertrag) applies; its periods are not calculated"),
    ausbildung: janein("Apprenticeship (Ausbildungsverhältnis); the template does not fit then"),
    anrede: text("Form of address in the letter, default sie", { enum: ["sie", "du"] }),
    briefdatum: datum("Date of the letter; placeholder if empty"),
    unterschrift: text("Who signs: owner or managing director, Prokura (ppa.), in Vertretung (i. V.) or im Auftrag (i. A.); default geschaeftsfuehrung", { enum: Object.keys(UNTERSCHRIFT) }),
    zustellung: text("Delivery: personal handover or messenger (Bote), default persoenlich", { enum: ["persoenlich", "bote"] }),
    freistellung: text("Release from work until the end (Freistellung), default keine", { enum: ["keine", "widerruflich", "unwiderruflich"] }),
    freistellung_ab: datum("First day of the release; placeholder if empty"),
    resturlaub_tage: zahl("Remaining holiday in working days, set off against an irrevocable release", 0, 365),
    betriebsrat: text("Works council (Betriebsrat): none, already heard, or not yet heard; default keiner", { enum: ["keiner", "angehoert", "nicht_angehoert"] }),
    rueckgabe: janein("Ask for return of work equipment, default true"),
  }, ["eintritt", "zugang"]),
  ausfuehren(e, heute) {
    const k = e as KuendigungEingabe;
    const pz = k.probezeit_monate ?? 6; // Vorgabe der Seite
    const vm = k.vertragsfrist_monate ?? 3;
    const vertrag = k.vertragsfrist ?? "keine";
    const freistellung = k.freistellung ?? "keine";
    const fehler = (text: string) => antwort({ ergebnis: { fehler: text } }, heute);
    if (!Number.isInteger(pz)) return fehler("Probezeit in ganzen Monaten angeben, 0 bis 12.");
    if (!Number.isInteger(vm)) return fehler("Vertragliche Frist in ganzen Monaten angeben, 1 bis 12.");
    if (isISODate(k.briefdatum) && k.zugang < k.briefdatum) return fehler("Zugang liegt vor dem Datum des Schreibens.");
    let r: KuendigungsErgebnis;
    try {
      r = berechneKuendigung({
        eintritt: k.eintritt, zugang: k.zugang, kuendigender: "arbeitgeber", probezeitMonate: pz, kleinbetriebVierWochen: k.kleinbetrieb_vier_wochen,
        vertrag: vertrag === "keine" ? null : { monate: vm, termin: vertrag }, tarifvertrag: k.tarifvertrag,
      });
    } catch (x) {
      return fehler(x instanceof Error ? x.message : "Die Frist ließ sich nicht berechnen.");
    }
    if (k.ausbildung)
      return antwort({
        ergebnis: { brief: null, passt_nicht: "Für Ausbildungsverhältnisse passt diese Vorlage nicht. In der Probezeit kann das Ausbildungsverhältnis jederzeit ohne Frist gekündigt werden. Danach kündigt der Betrieb nur aus wichtigem Grund, schriftlich und mit Angabe der Gründe (§ 22 BBiG). Lass solche Kündigungen prüfen." },
        quellen: [normQuelle("§ 22 BBiG")],
      }, heute);

    const termin = {
      ende: r.ende, fristablauf: r.fristablauf, regel: `${r.regel.label} (${r.regel.quelle})`, in_probezeit: r.inProbezeit, betriebszugehoerigkeit_jahre: r.jahre,
      termine: r.termine.map((t) => ({ termin: t.termin, spaetester_zugang: t.spaetesterZugang })),
    };
    const freiNachEnde = freistellung !== "keine" && isISODate(k.freistellung_ab) && k.freistellung_ab > r.ende;
    const fallen = [
      ...(freiNachEnde ? ["Die Freistellung beginnt nach dem Ende des Arbeitsverhältnisses. Prüf das Datum."] : []),
      ...r.hinweise.map((h) => h.text),
      "Keine Begründung in den Brief, sie ist für die ordentliche Kündigung nicht nötig. Fristlose Kündigungen bildet die Vorlage nicht ab.",
    ];
    const quellen = [
      registerQuelle(REGEL_WERT[r.gesetzlich.art as keyof typeof REGEL_WERT], heute), registerQuelle("kuendigungSchriftform", heute), normQuelle("§ 174 BGB"),
      registerQuelle("betriebsratAnhoerung", heute), registerQuelle("kschgKlageWochen", heute), registerQuelle("arbeitsuchendMeldung", heute),
      normQuelle("§ 2 Abs. 2 Satz 2 Nr. 3 SGB III"),
    ];
    if (k.betriebsrat === "nicht_angehoert")
      return antwort({
        ergebnis: {
          ...termin, brief: null,
          betriebsrat: `Erst den Betriebsrat anhören. Ohne vorherige Anhörung ist die Kündigung unwirksam (§ 102 Abs. 1 BetrVG). Teile ihm Person, Kündigungsart, Termin und Gründe mit. Er hat bei einer ordentlichen Kündigung ${fristWort(WERTE.betriebsratAnhoerungFrist.ordentlichTage)} Zeit. Den Brief gibt es erst, wenn er angehört ist.`,
        },
        rechenweg: r.rechenweg, quellen, fallen,
        naechster_schritt: ["Betriebsrat anhören, danach das Werkzeug mit „angehört“ noch einmal aufrufen."],
      }, heute);

    const u = UNTERSCHRIFT[k.unterschrift ?? "geschaeftsfuehrung"];
    const brief = kuendigungsbrief({
      sie: k.anrede !== "du", ende: r.ende, datum: k.briefdatum, freistellung, freistellungAb: k.freistellung_ab, resturlaub: k.resturlaub_tage,
      betriebsrat: k.betriebsrat === "angehoert", rueckgabe: k.rueckgabe ?? true, bote: k.zustellung === "bote", zusatz: u.zusatz,
    });
    return antwort({
      ergebnis: { ...termin, brief, unterschrift: u.hinweis, pruefliste: PRUEFLISTE_KUENDIGUNG },
      rechenweg: r.rechenweg, quellen, fallen,
      naechster_schritt: [
        "Ersetz die Platzhalter in eckigen Klammern, druck den Brief aus und unterschreib ihn eigenhändig.",
        `Für das Ende am ${formatDE(r.ende)} muss der Brief spätestens am ${formatDE(r.spaetesterZugang)} zugehen.`,
      ],
    }, heute);
  },
};

/* ---------- Abmahnung ---------- */

/** Arten des Verstoßes wie auf der Seite, dazu der Anlass für Betreff und Warnung und die verletzte Pflicht als Satzteil. */
const VERSTOESSE: Record<string, { anlass: string; pflicht: string }> = {
  "Unpünktlichkeit": { anlass: "Unpünktlichkeit", pflicht: "die Arbeit zu Beginn der vereinbarten Arbeitszeit aufzunehmen" },
  "Unentschuldigtes Fehlen": { anlass: "unentschuldigten Fehlens", pflicht: "an den vereinbarten Arbeitstagen zur Arbeit zu erscheinen und eine Verhinderung vor Arbeitsbeginn zu melden" },
  "Verspätete Krankmeldung oder fehlende AU-Bescheinigung": { anlass: "Verletzung der Anzeige- und Nachweispflicht bei Arbeitsunfähigkeit", pflicht: "eine Arbeitsunfähigkeit und ihre voraussichtliche Dauer unverzüglich anzuzeigen und nachzuweisen" },
  "Arbeitsverweigerung": { anlass: "Arbeitsverweigerung", pflicht: "die übertragenen Aufgaben auszuführen" },
  "Verstoß gegen eine Anweisung": { anlass: "Verstoßes gegen eine Weisung", pflicht: "die Weisung [Inhalt und Datum der Weisung] zu befolgen" },
  "Verhalten gegenüber Kollegen oder Kunden": { anlass: "Fehlverhaltens gegenüber [Kollegen oder Kunden]", pflicht: "sich gegenüber [Kollegen oder Kunden] sachlich und respektvoll zu verhalten" },
  "Sonstiges": { anlass: "[Anlass]", pflicht: "[verletzte Pflicht in einem Satz]" },
};

/** „Die verletzte Pflicht steht in“ wie auf der Seite. Fundstellen werden nicht erfunden, sie bleiben Platzhalter. */
const PFLICHT_AUS: Record<string, string> = {
  "Arbeitsvertrag": "[Fundstelle] des Arbeitsvertrags",
  "Weisung der Vorgesetzten": "der Weisung vom [Datum der Weisung]",
  "Betriebsordnung oder Betriebsvereinbarung": "[Fundstelle] der [Betriebsordnung oder Betriebsvereinbarung]",
  "Gesetz": "[Paragraf und Gesetz]",
  "Weiß ich nicht genau": "[Fundstelle]",
};

/** Die drei Funktionen einer Abmahnung nach den Vorgaben an Claude in lib/ki/batch-2.ts, die Rüge in zwei Teilen. */
const PFLICHTTEILE = [
  { teil: "Rüge", inhalt: "Das Fehlverhalten so genau beschreiben, dass ein Dritter es ohne Vorwissen nachvollziehen kann: Datum, Uhrzeit, Ort, was genau geschah, Dauer oder Ausmaß. „Sie kommen ständig zu spät“ reicht nicht, „Am 15.09.2026 haben Sie die Arbeit statt um 8:00 Uhr erst um 9:40 Uhr aufgenommen“ reicht." },
  { teil: "Verletzte Pflicht", inhalt: "Die verletzte Pflicht im Perfekt benennen, mit der Fundstelle aus Arbeitsvertrag, Betriebsordnung oder Weisung. Fehlt die Fundstelle, die Pflicht allgemein beschreiben und [Fundstelle] stehen lassen." },
  { teil: "Hinweis", inhalt: "Klare Aufforderung, dieses Verhalten künftig zu unterlassen und die konkrete Pflicht einzuhalten." },
  { teil: "Warnung", inhalt: "Unmissverständlich: Im Wiederholungsfall eines gleichartigen Verstoßes muss die Person mit der Kündigung des Arbeitsverhältnisses rechnen. Das Wort Kündigung muss fallen. Eine frühere Abmahnung wegen eines gleichartigen Verstoßes steht hier mit Datum." },
];

const REGELN_ABMAHNUNG = [
  "Ein Sachverhalt pro Abmahnung. Bei mehreren Vorwürfen für jeden eine eigene Abmahnung, sonst fällt die ganze Abmahnung, wenn ein Vorwurf nicht haltbar ist.",
  "Nur Tatsachen: keine Wertungen über den Charakter, keine Vermutungen über Motive, keine Diagnosen oder Gesundheitsdaten, keine Drohung außer der Kündigungswarnung, kein Sarkasmus.",
  "Sachlicher, ruhiger Ton. Die Anrede bleibt durchgehend gleich (Sie oder du).",
  "Keine Namen Dritter im Brieftext: Kolleginnen, Kunden oder Vorgesetzte als Rolle in eckigen Klammern, zum Beispiel [Kollegin], [Kunde] oder [Vorgesetzte Person].",
  "Erfinde keine Fundstelle. Fehlt sie, beschreib die Pflicht allgemein und lass [Fundstelle] stehen.",
  "Die Warnung besteht nur aus der Kündigungsandrohung: keine weichen Wörter wie eventuell oder unter Umständen, keine Ankündigung, dass die Kündigung sicher kommt, keine Begründung oder Bewertung. „Wir behalten uns weitere Schritte vor“ reicht nicht.",
  "Datum als TT.MM.JJJJ, Uhrzeit als 8:45 Uhr. Keine Markdown-Zeichen, keine Gedankenstriche.",
  "Rückfrage statt Entwurf, wenn nicht erkennbar ist, was genau die Person getan oder unterlassen hat, oder wenn bei Unpünktlichkeit oder Fehlen jede Zeit- oder Mengenangabe fehlt. Fehlende Uhrzeit, fehlender Ort oder fehlende Zeugen allein sind kein Grund für eine Rückfrage, dafür gibt es Platzhalter.",
];

const PRUEFLISTE_ABMAHNUNG = [
  "Sichere den Sachverhalt mit Zeugen oder Belegen, bevor du abmahnst.",
  "Hör die Person vorher zu dem Vorfall an.",
  "Ersetz alle Platzhalter in eckigen Klammern und prüf jede Tatsache gegen deine Belege.",
  "Lass eine weisungsbefugte Person unterschreiben: Geschäftsführung oder die direkte Führungskraft.",
  "Übergib die Abmahnung zeitnah und persönlich gegen Empfangsbestätigung auf einer Kopie oder vor einem Zeugen. Sie wird mit dem Zugang wirksam.",
  "Leg die Kopie mit Empfangsbestätigung in die Personalakte.",
  "Gibt es einen Betriebsrat, informier ihn. Mitbestimmen darf er bei der Abmahnung nicht, die Information ist gute Praxis.",
];

type AbmahnungEingabe = {
  verstoss: string; datum_vorfall: string; uhrzeit?: string; pflicht_aus?: string; fruehere_abmahnung?: "nein" | "gleich" | "andere";
  datum_fruehere_abmahnung?: string; anrede?: "sie" | "du"; briefdatum?: string;
};

const abmahnung: Werkzeug = {
  name: "abmahnung",
  titel: "Abmahnung",
  beschreibung:
    "German employment law, Germany only. Gives you what you need to write a formal warning letter (Abmahnung) yourself: the required parts (Rüge with date and time, verletzte Pflicht, Hinweis, Warnung vor Kündigung), a letter template with placeholders, writing rules, checklist and pitfalls. Use it when an employer wants to warn an employee about misconduct; ask the user for the facts, then fill the template with them, roles instead of names of third parties. The facts themselves never go into this tool.",
  eingabe: schema({
    verstoss: text("Kind of misconduct (Art des Verstoßes)", { enum: Object.keys(VERSTOESSE) }),
    datum_vorfall: datum("Day of the incident (Datum des Vorfalls)"),
    uhrzeit: text("Time of the incident, HH:MM, optional", { pattern: "^([01]?\\d|2[0-3]):[0-5]\\d$", maxLength: 5 }),
    pflicht_aus: text("Where the breached duty is written (Die verletzte Pflicht steht in), default Arbeitsvertrag", { enum: Object.keys(PFLICHT_AUS) }),
    fruehere_abmahnung: text("Earlier warning (frühere Abmahnung): none, for the same kind of misconduct, or for a different kind; default nein", { enum: ["nein", "gleich", "andere"] }),
    datum_fruehere_abmahnung: datum("Date of the earlier warning, optional"),
    anrede: text("Form of address in the letter, default sie", { enum: ["sie", "du"] }),
    briefdatum: datum("Date of the letter; placeholder if empty"),
  }, ["verstoss", "datum_vorfall"]),
  ausfuehren(e, heute) {
    const k = e as AbmahnungEingabe;
    const S = k.anrede !== "du";
    const sie = S ? "Sie" : "dich";
    const v = VERSTOESSE[k.verstoss];
    const quelle = PFLICHT_AUS[k.pflicht_aus ?? "Arbeitsvertrag"];
    const zeit = k.uhrzeit ? `${k.uhrzeit.replace(/^0/, "")} Uhr` : "[Uhrzeit]";
    const frueher = k.fruehere_abmahnung === "gleich" ? `Wir haben ${sie} bereits am ${tag(k.datum_fruehere_abmahnung)} wegen ${v.anlass} abgemahnt. ` : "";
    const vorlage = briefText({
      vermerk: ["Persönliche Übergabe", "Persönlich/Vertraulich"],
      datum: k.briefdatum,
      betreff: `Abmahnung wegen ${v.anlass} am ${tag(k.datum_vorfall)}`,
      anrede: S ? "Guten Tag [Vorname Nachname]," : "Hallo [Vorname],",
      bloecke: [
        `wir müssen ${sie} auf folgendes Fehlverhalten hinweisen: Am ${tag(k.datum_vorfall)} um ${zeit} [Schilderung der Tatsachen: was genau geschah, wo, wie lange, wer es bemerkt hat].`,
        `Damit ${S ? "haben Sie Ihre" : "hast du deine"} Pflicht aus ${quelle} verletzt, ${v.pflicht}.`,
        `Wir fordern ${sie} auf, dieses Verhalten künftig zu unterlassen und ${S ? "Ihrer" : "deiner"} Pflicht nachzukommen, ${v.pflicht}.`,
        `${frueher}Wir weisen ${sie} ausdrücklich darauf hin, dass ${S ? "Sie" : "du"} im Wiederholungsfall mit der Kündigung ${S ? "Ihres" : "deines"} Arbeitsverhältnisses rechnen ${S ? "müssen" : "musst"}.`,
        `Eine Kopie dieses Schreibens nehmen wir zu ${S ? "Ihrer" : "deiner"} Personalakte. ${S ? "Sie können" : "Du kannst"} dazu eine Gegendarstellung abgeben, die wir ebenfalls zur Personalakte nehmen.`,
      ],
      gruss: S ? "Mit freundlichen Grüßen" : "Viele Grüße",
    });
    return antwort({
      ergebnis: { pflichtteile: PFLICHTTEILE, vorlage, regeln: REGELN_ABMAHNUNG, pruefliste: PRUEFLISTE_ABMAHNUNG },
      quellen: [normQuelle("§ 314 Abs. 2 BGB"), registerQuelle("fristloseKenntnisWochen", heute), normQuelle("§ 83 BetrVG"), normQuelle("§ 5 EFZG")],
      fallen: [
        ...(k.verstoss.startsWith("Verspätete Krankmeldung") ? ["Krankheit ist nicht abmahnbar. Abmahnbar ist nur der Verstoß gegen die Pflicht, die Arbeitsunfähigkeit unverzüglich zu melden und nachzuweisen (§ 5 EFZG). Keine Diagnose in die Schilderung."] : []),
        ...(k.fruehere_abmahnung === "andere" ? ["Frühere Abmahnung anderer Art: Für eine spätere Kündigung zählt in der Regel nur eine Abmahnung wegen eines gleichartigen Verstoßes."] : []),
        `Geht es um Diebstahl, Betrug, Gewalt, Bedrohung oder Belästigung, kann eine fristlose Kündigung ohne Abmahnung möglich sein, Frist ${WERTE.fristloseKenntnisWochen.wert} Wochen ab Kenntnis (§ 626 Abs. 2 BGB). Wer abmahnt, verzichtet auf eine Kündigung wegen genau dieses Vorfalls. Lass den Fall vorher prüfen.`,
        "Eine Frist für die Abmahnung gibt es nicht. Wer aber Monate später abmahnt, signalisiert, dass das Verhalten so schlimm nicht war.",
        "Bei einer Bagatelle ohne vorherige Ermahnung kann eine Abmahnung unverhältnismäßig sein.",
      ],
      naechster_schritt: ["Frag nach den Tatsachen (was, wann, wo, wie lange, wer hat es gesehen), füll damit die Vorlage und lass die Platzhalter für Namen und Anschriften stehen, bis du sie hast."],
    }, heute);
  },
};

/* ---------- Pflichtangaben einer Kündigung ---------- */

const zahlText = (n: number) => String(n).replace(".", ",");

const kuendigung_pflichtangaben: Werkzeug = {
  name: "kuendigung_pflichtangaben",
  titel: "Kündigung: Formalien prüfen",
  beschreibung:
    `German employment law, Germany only. Checklist of the formal requirements when an employer gives notice (Kündigung durch den Arbeitgeber), each item with its legal norm: written form, receipt (Zugang), notice period, works council hearing, special protection (Sonderkündigungsschutz), small business without the Kündigungsschutzgesetz up to ${WERTE.kschgSchwelle.wert} employees, ${WERTE.kschgKlageWochen.wert}-week deadline for a claim, Arbeitsbescheinigung, reference (Zeugnis), remaining holiday. Use it before a dismissal; for the end date and the letter use kuendigungsschreiben.`,
  eingabe: schema({
    beschaeftigte: zahl("Number of employees counted under § 23 KSchG: apprentices not counted, part-time pro rata", 1, 10000),
    betriebsrat: janein("There is a works council (Betriebsrat), default false"),
  }, ["beschaeftigte"]),
  baender: (e) => ({ groesse: e.beschaeftigte as number }),
  ausfuehren(e, heute) {
    const n = e.beschaeftigte as number;
    const br = e.betriebsrat === true;
    const schwelle = WERTE.kschgSchwelle.wert;
    const kschg = n > schwelle;
    const tf = WERTE.kschgTeilzeitFaktor;
    const { monate, tage } = WERTE.arbeitsuchendMeldung;
    const erste = STAFFEL_622[0], letzte = STAFFEL_622[STAFFEL_622.length - 1];
    const klein = WERTE.kleinbetriebKuendigung;
    const alt = WERTE.kschgAltfall;
    const pruefliste = [
      { punkt: "Schriftform", norm: "§ 623 BGB", text: "Die Kündigung steht auf Papier und ist eigenhändig unterschrieben. E-Mail, Fax, Scan, WhatsApp oder elektronische Signatur sind unwirksam. Eine Begründung gehört nicht hinein." },
      { punkt: "Unterschrift", norm: "§ 174 BGB", text: "Unterschreiben darf, wer die Firma vertritt. Alle anderen legen die Vollmacht im Original bei, sonst kann die Person die Kündigung zurückweisen." },
      { punkt: "Zugang", norm: "§ 130 BGB", text: "Die Frist läuft ab Zugang, nicht ab Briefdatum. Mach ihn beweisbar: persönlich mit Zeugen und Empfangsbestätigung oder per Bote, der den Inhalt kennt und den Einwurf protokolliert. Kein Übergabe-Einschreiben." },
      {
        punkt: "Frist", norm: "§ 622 BGB",
        text: `In der Probezeit ${REGEL_PROBEZEIT.label}, sonst ${REGEL_GRUNDFRIST.label}. Ab ${erste.jahre} Jahren Betriebszugehörigkeit ${monateText(erste.monate)} zum Monatsende, bis ${monateText(letzte.monate)} ab ${letzte.jahre} Jahren.${n <= klein.hoechstBeschaeftigte ? ` Mit höchstens ${klein.hoechstBeschaeftigte} Beschäftigten darf der Vertrag ${fristWort(klein.tage)} ohne festen Endtermin vorsehen (§ 622 Abs. 5 Satz 1 Nr. 2 BGB).` : ""} Schreib „hilfsweise zum nächstmöglichen Termin“ dazu. Das Ende verschiebt sich nicht auf einen Werktag.`,
      },
      ...(br ? [{ punkt: "Betriebsrat", norm: "§ 102 BetrVG", text: `Hör den Betriebsrat vor der Kündigung an und nenn ihm Person, Kündigungsart, Termin und Gründe. Ohne Anhörung ist die Kündigung unwirksam. Er hat bei einer ordentlichen Kündigung ${fristWort(WERTE.betriebsratAnhoerungFrist.ordentlichTage)} Zeit, erst danach geht die Kündigung raus.` }] : []),
      { punkt: "Sonderkündigungsschutz", norm: "§ 17 MuSchG, § 18 BEEG, § 5 PflegeZG, § 168 SGB IX, § 15 KSchG", text: "Prüf vorher Schwangerschaft und Mutterschutz, Elternzeit, Pflegezeit, Schwerbehinderung oder Gleichstellung, Betriebsrat und Datenschutzbeauftragte. Teils braucht es vorher die Zustimmung einer Behörde, teils ist die Kündigung ganz ausgeschlossen." },
      kschg
        ? { punkt: "Kündigungsschutzgesetz", norm: "§ 1 KSchG, § 23 Abs. 1 KSchG", text: `Mit ${zahlText(n)} Beschäftigten gilt das Kündigungsschutzgesetz für alle, die länger als ${WERTE.kschgWartezeitMonate.wert} Monate dabei sind. Du brauchst dann einen Grund in der Person, im Verhalten oder dringende betriebliche Erfordernisse, bei Gründen im Verhalten in der Regel vorher eine Abmahnung.` }
        : { punkt: "Kleinbetrieb", norm: "§ 23 Abs. 1 KSchG, § 242 BGB", text: `Mit ${zahlText(n)} Beschäftigten gilt das Kündigungsschutzgesetz nicht, es greift erst bei mehr als ${schwelle}. Einen Kündigungsgrund nach dem Gesetz brauchst du nicht. Die Kündigung darf aber nicht willkürlich sein oder diskriminieren.${n > alt.schwelle ? ` Wer vor ${alt.beginnVor.slice(0, 4)} eingestellt wurde, kann noch geschützt sein (§ 23 Abs. 1 Satz 2 KSchG).` : ""}` },
      { punkt: "Klagefrist", norm: "§ 4 KSchG", text: `Ab Zugang hat die Person ${WERTE.kschgKlageWochen.wert} Wochen Zeit für eine Klage. Danach gilt die Kündigung als wirksam (§ 7 KSchG). Das gilt auch im Kleinbetrieb.` },
      { punkt: "Meldung bei der Agentur für Arbeit", norm: "§ 38 Abs. 1 SGB III, § 2 Abs. 2 Satz 2 Nr. 3 SGB III", text: `Weis die Person darauf hin, dass sie sich spätestens ${monate} Monate vor dem Ende arbeitsuchend melden muss, bei kürzerer Zeit innerhalb von ${tage} Tagen nach Zugang.` },
      { punkt: "Arbeitsbescheinigung", norm: "§ 312 SGB III", text: "Zum Ende stellst du die Arbeitsbescheinigung für die Agentur für Arbeit aus. Meist übermittelt sie das Lohnbüro elektronisch." },
      { punkt: "Zeugnis", norm: "§ 109 GewO", text: "Die Person hat Anspruch auf ein schriftliches Zeugnis, auf Wunsch mit Angaben zu Leistung und Verhalten." },
      { punkt: "Resturlaub", norm: "§ 7 Abs. 4 BUrlG", text: "Urlaub, der bis zum Ende nicht genommen werden kann, wird ausbezahlt. Willst du ihn in eine Freistellung legen, muss sie unwiderruflich sein und den Urlaub ausdrücklich anrechnen." },
    ];
    return antwort({
      ergebnis: { beschaeftigte: n, betriebsrat: br, kschg_gilt: kschg, pruefliste },
      rechenweg: [
        `Gezählt wird nach § 23 Abs. 1 Satz 4 KSchG ohne Auszubildende, Teilzeit anteilig: bis ${tf.bis20Std.stunden} Stunden ${zahlText(tf.bis20Std.faktor)}, bis ${tf.bis30Std.stunden} Stunden ${zahlText(tf.bis30Std.faktor)}.`,
        `${zahlText(n)} Beschäftigte: ${kschg ? `mehr als ${schwelle}, das Kündigungsschutzgesetz gilt` : `nicht mehr als ${schwelle}, das Kündigungsschutzgesetz gilt nicht`}.`,
        br ? "Betriebsrat vorhanden: Anhörung vor jeder Kündigung." : "Kein Betriebsrat: die Anhörung nach § 102 BetrVG entfällt.",
      ],
      quellen: [
        registerQuelle("kuendigungSchriftform", heute), normQuelle("§ 174 BGB"), normQuelle("§ 130 BGB"), registerQuelle("grundkuendigungsfristTage", heute),
        registerQuelle("kuendigungsStaffel", heute), ...(br ? [registerQuelle("betriebsratAnhoerung", heute), registerQuelle("betriebsratAnhoerungFrist", heute)] : []),
        registerQuelle("mutterschutzKuendigungsverbot", heute), registerQuelle("schwerbehindertKuendigung", heute),
        registerQuelle("kschgSchwelle", heute), registerQuelle("kschgTeilzeitFaktor", heute), ...(kschg ? [registerQuelle("kschgWartezeitMonate", heute)] : n > alt.schwelle ? [registerQuelle("kschgAltfall", heute)] : []),
        registerQuelle("kschgKlageWochen", heute), registerQuelle("arbeitsuchendMeldung", heute), normQuelle("§ 312 SGB III"), registerQuelle("zeugnisAnspruch", heute), normQuelle("§ 7 Abs. 4 BUrlG"),
      ],
      fallen: [
        `Diese Liste gilt für die ordentliche Kündigung. Eine fristlose Kündigung geht nur innerhalb von ${WERTE.fristloseKenntnisWochen.wert} Wochen ab Kenntnis der Gründe (§ 626 Abs. 2 BGB).`,
        "Für Auszubildende nach der Probezeit gelten eigene Regeln (§ 22 BBiG).",
      ],
      naechster_schritt: ["Mit kuendigungsschreiben rechnest du das Ende aus und bekommst den Brief."],
    }, heute);
  },
};

export const BRIEFE: Werkzeug[] = [kuendigungsschreiben, abmahnung, kuendigung_pflichtangaben];
