/** Urlaub aus den Rechnern von lintelly.com/tools. Die Rechnung des Anspruchs steht in packages/kern, der Hinweis zum Verfall hier. */
import { fmt, parseYmd, toYmd } from "../../../kern/website/components/tools/datum";
import { zahl as dezimal } from "../../../kern/website/components/tools/format";
import { berechneUrlaub, pruefeWechsel } from "../../../kern/website/components/tools/urlaubsanspruch-logik";
import { istFeiertag } from "@/lib/regeln/datum";
import { antwort, fehler, normQuelle, registerQuelle } from "../antwort";
import { datum, jahr as jahrFeld, janein, schema, text, zahl } from "../eingabe";
import type { Werkzeug } from "../werkzeug";

type AnspruchE = {
  jahresurlaub: number; bezugswoche?: "5_tage" | "6_tage"; arbeitstage_pro_woche: number; jahr?: number; eintritt?: string; austritt?: string;
  wechsel_ab?: string; wechsel_tage?: number; schwerbehindert?: boolean; schwerbehindert_ab?: string; mehrurlaub?: "wie-gesetz" | "anteilig";
};

const urlaubsanspruch: Werkzeug = {
  name: "urlaubsanspruch",
  titel: "Urlaubsanspruch",
  beschreibung:
    "German employment law, Germany only: annual leave entitlement (Urlaubsanspruch, BUrlG) in working days, split into statutory minimum (gesetzlicher Mindesturlaub) and contractual extra leave (Mehrurlaub). Handles part-time (Teilzeit), alternating weeks, a change of working days during the year, entry or exit during the year (Teilurlaub) and extra leave for severe disability (§ 208 SGB IX). Use it when someone asks how many leave days an employee has.",
  eingabe: schema({
    jahresurlaub: zahl("Annual leave in the contract for full time, in days of the reference week", 1, 60),
    bezugswoche: text("Reference week of the contract: 5_tage (working days) or 6_tage (Werktage). Default 5_tage", { enum: ["5_tage", "6_tage"] }),
    arbeitstage_pro_woche: zahl("Days with work per week, each day counts fully however short; average for alternating weeks, e.g. 2.5", 0.5, 6),
    jahr: jahrFeld("Leave year, default the current year"),
    eintritt: datum("Entry date if in or after the start of the year, optional"),
    austritt: datum("Last day of employment if in the year, optional"),
    wechsel_ab: datum("Day the number of working days changes, optional"),
    wechsel_tage: zahl("Working days per week from wechsel_ab", 0.5, 6),
    schwerbehindert: janein("Recognised severe disability (GdB from 50), not equal status"),
    schwerbehindert_ab: datum("Recognised only from this date in the year, optional"),
    mehrurlaub: text("Contract rule for extra leave on entry or exit in the year: wie-gesetz (contract says nothing, follows the law) or anteilig (contract cuts it pro rata). Default wie-gesetz", { enum: ["wie-gesetz", "anteilig"] }),
  }, ["jahresurlaub", "arbeitstage_pro_woche"]),
  ausfuehren(roh, heute) {
    const e = roh as AnspruchE;
    const jahr = e.jahr ?? Number(heute.slice(0, 4));
    const quellen = [registerQuelle("mindesturlaub", heute), registerQuelle("urlaubWartezeitMonate", heute)];
    if (e.wechsel_ab && e.wechsel_tage === undefined) return fehler("Zum Wechsel fehlen die neuen Arbeitstage pro Woche (wechsel_tage).");
    const wechselFehler = e.wechsel_ab && pruefeWechsel(e.wechsel_ab, jahr, e.eintritt ?? null, e.austritt ?? null);
    if (wechselFehler) return fehler(wechselFehler);
    let r;
    try {
      r = berechneUrlaub({
        jahresurlaub: e.jahresurlaub, bezug: e.bezugswoche === "6_tage" ? 6 : 5, tage: e.arbeitstage_pro_woche, jahr,
        eintritt: e.eintritt ?? null, austritt: e.austritt ?? null, wechsel: e.wechsel_ab ? { ab: e.wechsel_ab, tage: e.wechsel_tage! } : null,
        schwerbehindert: e.schwerbehindert ?? false, schwerbehindertAb: e.schwerbehindert_ab ?? null, mehrRegel: e.mehrurlaub ?? "wie-gesetz",
      });
    } catch (f) {
      return fehler((f as Error).message);
    }
    if (r.gesetzlich.zwoelftel < 12) quellen.push(normQuelle("§ 5 Abs. 1 BUrlG"));
    if (r.zusatz) quellen.push(registerQuelle("zusatzurlaubSchwerbehindert", heute));
    if (e.eintritt || e.austritt) quellen.push(normQuelle("§ 6 BUrlG"));
    if (e.austritt) quellen.push(normQuelle("§ 7 Abs. 4 BUrlG"));
    quellen.push(registerQuelle("urlaubHinweispflicht", heute));
    return antwort({
      ergebnis: {
        jahr, gesamt_tage: r.gesamt, gesetzlich_tage: r.gesetzlich.wert, mehrurlaub_tage: r.mehr.wert, zusatzurlaub_tage: r.zusatz?.wert ?? null,
        zwoelftel: r.gesetzlich.zwoelftel, arbeitstage_pro_woche: r.tageEffektiv, fall: r.fall, wartezeit_ende: r.wartezeitEnde,
      },
      rechenweg: r.rechenweg,
      quellen,
      fallen: [...r.hinweise.map((h) => h.text), "Tarifverträge regeln Urlaub oft abweichend, etwa in Werktagen oder mit eigener Rundung."],
      naechster_schritt: ["Damit Resturlaub am Jahresende verfallen kann, braucht die Person vorher einen Hinweis: Werkzeug urlaubsverfall_hinweis."],
    }, heute);
  },
};

/* ---------- Hinweis zum Urlaubsverfall: Logik und Brief aus website/components/tools/urlaubsverfall-hinweis-generator.tsx ---------- */

/** Arbeitstage Montag bis Freitag zwischen zwei Daten (beide eingeschlossen), ohne bundesweite Feiertage. */
function werktageMoFr(von: Date, bis: Date): number {
  let n = 0;
  for (const d = new Date(von); d <= bis; d.setUTCDate(d.getUTCDate() + 1)) if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !istFeiertag(toYmd(d))) n++;
  return n;
}

const LINIE = "______________________________";
const NAME = "[Vorname Nachname]";

export type HinweisEingabe = {
  jahr: number; anspruch: number; genommen: number; geplant: number; vorjahr: number;
  regel: "gesetzlich" | "vertraglich"; vertragDatum: Date | null; datum: Date; art: "jahresbeginn" | "erinnerung"; sie: boolean;
};

/** Brief wie baueBrief und briefText der Seite, mit Platzhaltern statt Firma, Ort, Unterzeichner und Empfänger. */
export function hinweisBrief(i: HinweisEingabe) {
  const rest = Math.max(0, i.anspruch - i.genommen - i.geplant);
  const ende = new Date(Date.UTC(i.jahr, 11, 31));
  const uebertragEnde = i.regel === "vertraglich" && i.vertragDatum ? i.vertragDatum : new Date(Date.UTC(i.jahr + 1, 2, 31));
  const vorjahrEnde = i.regel === "vertraglich" && i.vertragDatum ? new Date(Date.UTC(i.jahr, i.vertragDatum.getUTCMonth(), i.vertragDatum.getUTCDate())) : new Date(Date.UTC(i.jahr, 2, 31));
  const zeigeVorjahr = i.vorjahr > 0 && i.datum <= vorjahrEnde;
  const w = (du: string, sie: string) => (i.sie ? sie : du);
  const konto = [`Urlaubsanspruch ${i.jahr}: ${dezimal(i.anspruch)} Arbeitstage`];
  if (i.genommen > 0) konto.push(`Davon schon genommen: ${dezimal(i.genommen)} Arbeitstage`);
  if (i.geplant > 0) konto.push(`Davon genehmigt und geplant: ${dezimal(i.geplant)} Arbeitstage`);
  konto.push(`Noch offen (Stand ${fmt(i.datum)}): ${dezimal(rest)} Arbeitstage`);
  const bloecke = [
    i.art === "erinnerung"
      ? `wir möchten ${w("dich", "Sie")} rechtzeitig vor dem Jahresende an ${w("deinen", "Ihren")} offenen Urlaub für ${i.jahr} erinnern.`
      : `wir möchten, dass ${w("du dich erholst und deinen", "Sie sich erholen und Ihren")} Urlaub für ${i.jahr} vollständig ${w("nimmst", "nehmen")}. Deshalb informieren wir ${w("dich", "Sie")} hier über ${w("deinen", "Ihren")} Anspruch und darüber, wann er verfällt.`,
    konto.join("\n"),
    ...(zeigeVorjahr ? [`Außerdem ${w("hast du", "haben Sie")} noch ${dezimal(i.vorjahr)} Arbeitstage Resturlaub aus ${i.jahr - 1}. Diese Tage ${w("musst du", "müssen Sie")} bis zum ${fmt(vorjahrEnde)} nehmen. Danach verfallen sie.`] : []),
    rest > 0
      ? `Bitte ${w("beantrage deinen", "beantragen Sie Ihren")} offenen Urlaub so rechtzeitig, dass ${w("du", "Sie")} ihn bis zum ${fmt(ende)} vollständig nehmen ${w("kannst", "können")}. ${w("Stimm", "Stimmen Sie")} die Termine wie gewohnt mit [zuständige Person oder Abteilung] ab.`
      : `${w("Du hast deinen", "Sie haben Ihren")} Urlaub für ${i.jahr} schon vollständig genommen oder verplant. Wenn sich an ${w("deinen", "Ihren")} geplanten Tagen etwas ändert, ${w("beantrage", "beantragen Sie")} die frei gewordenen Tage bitte so, dass ${w("du", "Sie")} sie bis zum ${fmt(ende)} nehmen ${w("kannst", "können")}.`,
    i.regel === "gesetzlich"
      ? `Wichtig: Urlaub, den ${w("du", "Sie")} bis zum ${fmt(ende)} nicht ${w("beantragst und nimmst", "beantragen und nehmen")}, verfällt mit Ablauf dieses Tages ersatzlos. Das gilt nach § 7 Abs. 3 Bundesurlaubsgesetz.`
      : `Wichtig: ${w("Beantrage und nimm deinen", "Beantragen und nehmen Sie Ihren")} Urlaub möglichst bis zum ${fmt(ende)}. Was dann noch offen ist, verfällt nach ${w("deinem", "Ihrem")} Arbeitsvertrag mit Ablauf des ${fmt(uebertragEnde)} ersatzlos.`,
    i.regel === "gesetzlich"
      ? `Eine Übertragung in das Jahr ${i.jahr + 1} ist nur möglich, wenn dringende betriebliche oder in ${w("deiner", "Ihrer")} Person liegende Gründe das rechtfertigen. Übertragener Urlaub muss bis zum ${fmt(uebertragEnde)} genommen werden und verfällt danach. Eine Auszahlung von Urlaub ist im laufenden Arbeitsverhältnis nicht möglich.`
      : `Nach ${w("deinem", "Ihrem")} Arbeitsvertrag kann offener Urlaub bis zum ${fmt(uebertragEnde)} übertragen werden. Urlaub, den ${w("du", "Sie")} bis dahin nicht ${w("nimmst", "nehmen")}, verfällt mit Ablauf dieses Tages. Eine Auszahlung von Urlaub ist im laufenden Arbeitsverhältnis nicht möglich.`,
    `Wenn ${w("du Fragen zu deinem", "Sie Fragen zu Ihrem")} Urlaub ${w("hast", "haben")} oder die Zahlen nicht zu ${w("deiner", "Ihrer")} Übersicht passen, ${w("sprich", "sprechen Sie")} uns bitte an.`,
  ];
  const betreff = i.art === "erinnerung"
    ? `Erinnerung: ${w("Dein", "Ihr")} Resturlaub ${i.jahr} und sein Verfall`
    : `${w("Dein", "Ihr")} Urlaubsanspruch ${i.jahr}: Bitte ${w("plane deinen", "planen Sie Ihren")} Urlaub, sonst verfällt er`;
  const text = [
    "[Firma]", "[Straße Hausnummer]", "[PLZ Ort]", "", "Persönlich", "", NAME, "[Abteilung oder Anschrift]", "", `[Ort], ${fmt(i.datum)}`, "",
    betreff, "", i.sie ? `Guten Tag ${NAME},` : "Hallo [Vorname],", "",
    ...bloecke.flatMap((b) => [b, ""]),
    i.sie ? "Mit freundlichen Grüßen" : "Viele Grüße", "", "", LINIE, "[Vor- und Nachname]", "[Funktion]", "[Firma]",
    "", "", "Empfangsbestätigung", `Ich habe dieses Schreiben zu meinem Urlaub ${i.jahr} erhalten und gelesen.`, "", "", LINIE, "Ort, Datum", "", "", LINIE, NAME,
  ].join("\n");
  return { text, betreff, rest, ende, uebertragEnde, vorjahrEnde, zeigeVorjahr };
}

type VerfallE = {
  art?: "jahresbeginn" | "erinnerung"; jahr?: number; datum?: string; anspruch: number; genommen?: number; geplant?: number; vorjahr?: number;
  uebertragung?: "gesetzlich" | "vertraglich"; uebertragung_bis?: string; ansprache?: "sie" | "du";
};

const urlaubsverfall_hinweis: Werkzeug = {
  name: "urlaubsverfall_hinweis",
  titel: "Hinweis Urlaubsverfall",
  beschreibung:
    "German employment law, Germany only: writes the notice an employer must give before unused leave can expire (Hinweis auf Urlaubsverfall, § 7 Abs. 3 BUrlG, BAG 9 AZR 423/16), as a finished letter with placeholders instead of names. Returns open days, expiry date, end of carry-over (Übertragung) and whether the letter comes too late. Use it at the start of the year or in autumn when someone asks how to stop leave from piling up or whether leave expires.",
  eingabe: schema({
    art: text("jahresbeginn (start of year) or erinnerung (autumn reminder). Default by date: from July erinnerung", { enum: ["jahresbeginn", "erinnerung"] }),
    jahr: jahrFeld("Leave year, default the year of datum"),
    datum: datum("Date of the letter, must be in the leave year, default today"),
    anspruch: zahl("Leave entitlement of the year in working days", 0.5, 60),
    genommen: zahl("Days already taken, default 0", 0, 60),
    geplant: zahl("Days approved and planned, default 0", 0, 60),
    vorjahr: zahl("Days left from the previous year that were carried over after a timely notice, default 0", 0, 60),
    uebertragung: text("Carry-over: gesetzlich (until 31 March) or vertraglich (contract allows longer). Default gesetzlich", { enum: ["gesetzlich", "vertraglich"] }),
    uebertragung_bis: datum("Only vertraglich: carry-over end date in the following year, at the earliest 31 March"),
    ansprache: text("Form of address in the letter: sie or du. Default sie", { enum: ["sie", "du"] }),
  }, ["anspruch"]),
  ausfuehren(roh, heute) {
    const e = roh as VerfallE;
    const quellen = [registerQuelle("urlaubUebertragBis", heute), registerQuelle("urlaubHinweispflicht", heute), registerQuelle("urlaubSonderregel", heute)];
    const d = parseYmd(e.datum ?? heute);
    const j = e.jahr ?? Number((e.datum ?? heute).slice(0, 4));
    const g = e.genommen ?? 0, p = e.geplant ?? 0, regel = e.uebertragung ?? "gesetzlich";
    const vd = regel === "vertraglich" && e.uebertragung_bis ? parseYmd(e.uebertragung_bis) : null;
    const falsch: string[] = [];
    if (!d) falsch.push("Das Datum gibt es im Kalender nicht.");
    if (g + p > e.anspruch) falsch.push("Genommen und geplant liegen über dem Anspruch.");
    if (regel === "vertraglich" && !vd) falsch.push("Bis wann erlaubt der Vertrag die Übertragung (uebertragung_bis)?");
    else if (vd && (vd.getUTCFullYear() !== j + 1 || vd < new Date(Date.UTC(j + 1, 2, 31)))) falsch.push(`Die Übertragung endet an einem Datum im Jahr ${j + 1}, frühestens am 31.03.`);
    if (d && d.getUTCFullYear() !== j) falsch.push(`Das Schreiben muss im Urlaubsjahr ${j} kommen.`);
    if (falsch.length || !d) return fehler(...falsch);

    const art = e.art ?? (d.getUTCMonth() >= 6 ? "erinnerung" : "jahresbeginn");
    const b = hinweisBrief({ jahr: j, anspruch: e.anspruch, genommen: g, geplant: p, vorjahr: e.vorjahr ?? 0, regel, vertragDatum: vd, datum: d, art, sie: e.ansprache !== "du" });
    const ab = new Date(d);
    ab.setUTCDate(ab.getUTCDate() + 1);
    const verfuegbar = werktageMoFr(ab, b.ende);
    const spaet = b.rest > 0 && b.rest > verfuegbar * 0.8;
    const erinnerung = new Date(Date.UTC(j, 9, 1));
    return antwort({
      ergebnis: {
        art, offen_tage: b.rest, verfall_am: toYmd(b.ende), uebertragung_bis: toYmd(b.uebertragEnde), vorjahr_verfall_am: b.zeigeVorjahr ? toYmd(b.vorjahrEnde) : null,
        arbeitstage_bis_verfall: verfuegbar, schreiben_kommt_spaet: spaet, betreff: b.betreff, text: b.text,
      },
      rechenweg: [
        `Offen: ${dezimal(e.anspruch)} Tage Anspruch, davon ${dezimal(g)} genommen und ${dezimal(p)} geplant, bleiben ${dezimal(b.rest)} Arbeitstage.`,
        regel === "gesetzlich"
          ? `Verfall mit Ablauf des ${fmt(b.ende)} (§ 7 Abs. 3 BUrlG), bei Übertragung aus dringenden Gründen mit Ablauf des ${fmt(b.uebertragEnde)}.`
          : `Nach dem Vertrag kann offener Urlaub bis ${fmt(b.uebertragEnde)} übertragen werden und verfällt danach.`,
        `Zwischen Schreiben und Verfall liegen ${verfuegbar} Arbeitstage (Montag bis Freitag, ohne bundesweite Feiertage).`,
        ...(b.zeigeVorjahr ? [`Rest aus ${j - 1}: ${dezimal(e.vorjahr!)} Tage, zu nehmen bis ${fmt(b.vorjahrEnde)}.`] : []),
      ],
      quellen,
      fallen: [
        ...(spaet ? [`Das Schreiben kommt spät: ${dezimal(b.rest)} offene Tage bei nur ${verfuegbar} Arbeitstagen bis Jahresende. Ein Hinweis, nach dem der Urlaub praktisch nicht mehr nehmbar ist, gilt nicht als rechtzeitig. Dann verfällt nichts. Plane die Tage jetzt gemeinsam fest ein.`] : []),
        "Langzeiterkrankte: Der gesetzliche Urlaub verfällt frühestens 15 Monate nach Ende des Urlaubsjahres. Elternzeit, Mutterschutz und Austritt im Jahr verändern den Anspruch. Prüf diese Fälle einzeln.",
        "Rest aus dem Vorjahr: Der Stichtag 31.03. gilt nur für Tage, die nach einem rechtzeitigen Hinweis im Vorjahr übertragen wurden. Alte Tage ohne Hinweis im Vorjahr rechnest du zum Anspruch dieses Jahres. Sie verfallen frühestens mit Ablauf des 31.12.",
        "Bei abweichenden Tarifregeln oder Streit über Altansprüche lohnt ein Blick auf den Einzelfall.",
      ],
      naechster_schritt: [
        "Füll die Platzhalter in eckigen Klammern aus. Je Person ein Schreiben mit den echten Zahlen, kein Aushang. Übergabe gegen Unterschrift oder per E-Mail mit Lesebestätigung, Nachweis in die Personalakte.",
        ...(art === "jahresbeginn" && d < erinnerung ? [`Erinnerung im Kalender: ${fmt(erinnerung)}.`] : []),
        ...(b.rest > 0 && toYmd(b.ende) > heute ? [`Frist merken: Werkzeug frist_merken (Verfall des Resturlaubs, ${toYmd(b.ende)})`] : []),
      ],
    }, heute);
  },
};

export const URLAUB: Werkzeug[] = [urlaubsanspruch, urlaubsverfall_hinweis];
