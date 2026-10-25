/**
 * Geld aus den Rechnern von lintelly.com/tools: Entgeltfortzahlung, Urlaubsabgeltung, Abfindung, Ausgleichsabgabe, Minijob.
 * Gerechnet wird nur mit der Logik der Website (packages/kern/website/components/tools/*-logik.ts), Texte und Warnungen
 * folgen den Seiten. Fehlerhafte Angaben kommen als ergebnis.fehler zurück, nicht als Zahl.
 */
import { berechneEfz, type FallErgebnis } from "../../../kern/website/components/tools/entgeltfortzahlung-logik";
import { berechneBem } from "../../../kern/website/components/tools/bem-logik";
import { anspruchImAustrittsjahr, tagessatz, type AnspruchErgebnis } from "../../../kern/website/components/tools/urlaubsabgeltung-logik";
import { berechneAbfindung } from "../../../kern/website/components/tools/abfindung-logik";
import { berechne as ausgleich, SAETZE } from "../../../kern/website/components/tools/ausgleichsabgabe-logik";
import { abgabenArbeitgeber, berechneMinijob, MIDIJOB_OBERGRENZE, STAND, WOCHEN_PRO_MONAT, type Basis, type Jahr } from "../../../kern/website/components/tools/minijob-logik";
import { addDays, diffDays, fmt, fmtDay, parseYmd, toDay, toYmd } from "../../../kern/website/components/tools/datum";
import { eur, plural, zahl as dz, zahlFest } from "../../../kern/website/components/tools/format";
import { antwort, normQuelle, registerQuelle } from "../antwort";
import { datum, janein, liste, schema, text, zahl } from "../eingabe";
import type { Werkzeug } from "../werkzeug";

const fehler = (meldung: string, heute: string) => antwort({ ergebnis: { fehler: meldung } }, heute);
const ymd = (d: Date | null) => (d ? toYmd(d) : null);
const cent = (x: number) => Math.round(x * 100) / 100;
/** Jahr aus der Eingabe, sonst das laufende, sonst das letzte bekannte. */
const jahrAus = (wahl: unknown, jahre: string[], heute: string) =>
  Number((wahl as string | undefined) ?? (jahre.includes(heute.slice(0, 4)) ? heute.slice(0, 4) : jahre.at(-1)));

/* ---------- Entgeltfortzahlung (§ 3 EFZG) ---------- */

type Zeitraum = { von: string; bis: string; gleiche_erkrankung_wie?: number; ursache_unsicher?: boolean; erster_tag_gearbeitet?: boolean };

const fall = (f: FallErgebnis) => ({
  zeitraeume: f.nrs,
  von: toYmd(f.von),
  bis: toYmd(f.bis),
  entgeltfortzahlung_von: ymd(f.efzVon),
  entgeltfortzahlung_bis: ymd(f.efzBis),
  bezahlte_tage: f.bezahlt,
  krankengeld_ab: ymd(f.kgAb),
  wartezeit_tage: f.wartezeitTage,
  resttage_dieser_erkrankung: f.rest,
  neuer_anspruch: f.neuerAnspruch,
  ...(f.rest < 42 ? { neue_6_wochen_spaetestens_ab: ymd(f.naechsterVoll), neue_6_wochen_frueher_ab: ymd(f.sechsMonateAb) } : {}),
});

const fallText = (f: FallErgebnis) =>
  `Zeitraum ${f.nrs.join(" + ")} (${fmt(f.von)} bis ${fmt(f.bis)}): ${f.grund} `
  + (f.efzVon ? `Entgeltfortzahlung ${fmt(f.efzVon)} bis ${fmt(f.efzBis)}, ${plural(f.bezahlt, "Tag", "Tage")}.` : "Keine Entgeltfortzahlung.")
  + (f.wartezeitTage ? ` ${plural(f.wartezeitTage, "Tag", "Tage")} in der Wartezeit.` : "")
  + (f.kgAb ? ` Krankengeld der Krankenkasse ab ${fmt(f.kgAb)}.` : "");

const entgeltfortzahlung: Werkzeug = {
  name: "entgeltfortzahlung",
  titel: "Entgeltfortzahlung bei Krankheit",
  beschreibung:
    "Continued pay during sickness under German law (Entgeltfortzahlung, § 3 EFZG): up to 6 weeks per illness after a 4-week waiting period, with repeated sickness from the same illness (Fortsetzungserkrankung). Returns paid days, the last day of continued pay and when sickness benefit (Krankengeld) starts, the refund via the U1 levy (Umlage U1) and when a BEM is due. Use it when an employee is or was sick. Germany only.",
  eingabe: schema({
    beginn: datum("First day of the employment relationship, starts the 4-week waiting period"),
    zeitraeume: liste(
      "Periods of incapacity to work (Arbeitsunfähigkeit) in date order, first and last day as on the sick note. Follow-up notes without a gap are one period.",
      schema({
        von: datum("First day of incapacity to work"),
        bis: datum("Last day of incapacity to work"),
        gleiche_erkrankung_wie: zahl("Number of an earlier period (1 = first) with the same illness (Fortsetzungserkrankung). Leave out for a new illness", 1, 11),
        ursache_unsicher: janein("True if it is not certain that it is the same illness; both variants are then calculated"),
        erster_tag_gearbeitet: janein("True if the person still worked on the first day; that day does not count"),
      }, ["von", "bis"]),
      12,
    ),
  }, ["beginn", "zeitraeume"]),
  ausfuehren(e, heute) {
    const beginn = parseYmd(e.beginn as string);
    const zr = e.zeitraeume as Zeitraum[];
    if (!beginn) return fehler("Der Beginn ist kein gültiges Datum.", heute);
    if (!zr.length) return fehler("Trag mindestens einen Krankheitszeitraum ein.", heute);
    const perioden: { nr: number; von: Date; bis: Date; angefangen: boolean }[] = [];
    for (const [i, z] of zr.entries()) {
      const nr = i + 1, von = parseYmd(z.von), bis = parseYmd(z.bis), ref = z.gleiche_erkrankung_wie;
      if (!von || !bis) return fehler(`Zeitraum ${nr}: kein gültiges Datum.`, heute);
      if (bis < von) return fehler(`Zeitraum ${nr}: Der letzte Tag liegt vor dem ersten Tag.`, heute);
      if (von < beginn) return fehler(`Zeitraum ${nr} liegt vor dem Arbeitsbeginn.`, heute);
      if (i && von < perioden[i - 1].von) return fehler(`Zeitraum ${nr}: Bitte die Zeiträume in zeitlicher Reihenfolge angeben.`, heute);
      if (ref !== undefined && (!Number.isInteger(ref) || ref >= nr)) return fehler(`Zeitraum ${nr}: gleiche_erkrankung_wie muss die Nummer eines früheren Zeitraums sein.`, heute);
      perioden.push({ nr, von, bis, angefangen: !!z.erster_tag_gearbeitet });
    }
    // Wie auf der Website: dieselbe Erkrankung übernimmt die Gruppe des genannten Zeitraums, unsichere nur in Variante A
    const variante = (unsicherAlsGleich: boolean) => {
      const gruppe: number[] = [];
      return perioden.map((p, i) => {
        const ref = zr[i].gleiche_erkrankung_wie;
        gruppe[i] = ref !== undefined && (unsicherAlsGleich || !zr[i].ursache_unsicher) ? gruppe[ref - 1] : i;
        return { ...p, gruppe: gruppe[i] };
      });
    };
    const a = berechneEfz(beginn, variante(true));
    const b = zr.some((z) => z.gleiche_erkrankung_wie !== undefined && z.ursache_unsicher) ? berechneEfz(beginn, variante(false)) : null;
    const anspruchAb = addDays(beginn, 28);
    const letzter = a[a.length - 1];
    const bezahlt = a.reduce((s, f) => s + f.bezahlt, 0);
    const ueberSechsWochen = a.some((f) => diffDays(f.von, f.bis) + 1 > 42 || (f.rest === 0 && f.kgAb !== null));
    const tag = (d: Date) => toDay(toYmd(d));
    const stichtag = Math.max(...perioden.map((p) => tag(p.bis)));
    const bem = berechneBem(perioden.map((p) => ({ von: tag(p.von), bis: tag(p.bis) })), stichtag, [true, true, true, true, true, false, false]);
    return antwort({
      ergebnis: {
        anspruch_ab: toYmd(anspruchAb),
        letzter_tag_entgeltfortzahlung: ymd(letzter.efzBis),
        faelle: a.map(fall),
        ...(b ? { variante_neue_erkrankung: { letzter_tag_entgeltfortzahlung: ymd(b[b.length - 1].efzBis), faelle: b.map(fall) } } : {}),
      },
      rechenweg: [
        `Anspruch ab ${fmt(anspruchAb)}: 4 Wochen nach Beginn des Arbeitsverhältnisses (§ 3 Abs. 3 EFZG).`,
        "Je Erkrankung zahlst du bis zu 6 Wochen, das sind 42 Kalendertage. Dieselbe Erkrankung bekommt neue 6 Wochen nach 6 Monaten ohne sie oder 12 Monate nach Beginn der ersten Arbeitsunfähigkeit (§ 3 Abs. 1 Satz 2 EFZG).",
        ...a.map(fallText),
        ...(letzter.rest < 42 && letzter.naechsterVoll && letzter.sechsMonateAb
          ? [`Wieder volle 6 Wochen für diese Erkrankung: spätestens bei einer neuen Arbeitsunfähigkeit ab ${fmt(letzter.naechsterVoll)} (12 Monate nach Beginn der ersten). Früher, wenn bis ${fmt(addDays(letzter.sechsMonateAb, -1))} keine Arbeitsunfähigkeit wegen dieser Erkrankung dazukommt: dann ab ${fmt(letzter.sechsMonateAb)}.`]
          : []),
      ],
      quellen: [
        registerQuelle("entgeltfortzahlungTage", heute),
        registerQuelle("efzWartezeitTage", heute),
        registerQuelle("efzNeuerAnspruch", heute),
        registerQuelle("krankAuAbTag", heute),
        registerQuelle("umlageU1Grenze", heute),
        registerQuelle("bemSchwelleTage", heute),
        ...(a.some((f) => f.direktAnschluss) ? [normQuelle("BAG, 11.12.2019, 5 AZR 505/18")] : []),
      ],
      fallen: [
        ...(b ? ["Ursache unklar: Ob dieselbe Erkrankung vorliegt, sagt dir die Krankenkasse auf Anfrage, ohne Diagnose. Bis dahin stehen beide Varianten im Ergebnis."] : []),
        ...(a.some((f) => f.zusammengefasst) ? ["Zeiträume überschneiden sich: Eine neue Erkrankung während laufender Arbeitsunfähigkeit verlängert die 6 Wochen nicht."] : []),
        ...(a.some((f) => f.direktAnschluss)
          ? ["Direkter Anschluss ohne Arbeitstag: Das ist ein Fall mit einmal 6 Wochen. Das Bundesarbeitsgericht vermutet dann, dass die erste Arbeitsunfähigkeit noch andauerte (BAG, 11.12.2019, 5 AZR 505/18). Neue 6 Wochen gibt es nur, wenn die Person beweist, dass die erste vorher geendet hat. Feiertage kennt die Rechnung nicht, nur Wochenenden."]
          : []),
        ...(a.some((f) => f.wartezeitTage) ? ["In den ersten 4 Wochen des Arbeitsverhältnisses zahlst du nichts. Bei gesetzlich Versicherten zahlt die Krankenkasse Krankengeld."] : []),
      ],
      naechster_schritt: [
        `U1-Erstattung beantragen: Bei in der Regel höchstens 30 Beschäftigten erstattet dir die Krankenkasse über die Umlage U1 einen Teil des fortgezahlten Entgelts${bezahlt ? ` für die ${bezahlt} Tage` : ""} (§ 1 AAG). Wie viel, hängt vom Erstattungssatz ab, den du bei der Krankenkasse gewählt hast. Den Antrag stellt meist dein Lohnbüro.`,
        "Dauert die Arbeitsunfähigkeit länger als 3 Kalendertage, muss die Person sie spätestens am folgenden Arbeitstag ärztlich feststellen lassen, du darfst das früher verlangen (§ 5 Abs. 1 EFZG). Bei gesetzlich Versicherten rufst du die eAU bei der Krankenkasse ab, meist über dein Lohnprogramm oder Lohnbüro.",
        bem.ueberKalender
          ? `BEM anbieten: In den 12 Monaten bis ${fmtDay(stichtag)} kommen ${bem.kalendertage} Kalendertage Arbeitsunfähigkeit zusammen, mehr als 6 Wochen (§ 167 Abs. 2 SGB IX). Werkzeug bem_pflicht zeigt Zählung und Schritte.`
          : "Kommen in 12 Monaten mehr als 6 Wochen Arbeitsunfähigkeit zusammen, egal aus welcher Ursache, bietest du ein BEM an (§ 167 Abs. 2 SGB IX). Werkzeug bem_pflicht prüft das.",
        ...(letzter.efzBis ? [`Frist merken: Werkzeug frist_merken, Frist „Ende der Entgeltfortzahlung“ am ${fmt(letzter.efzBis)}.`] : []),
      ],
    }, heute);
  },
};

/* ---------- Urlaubsabgeltung (§§ 5, 7 Abs. 4, 11 BUrlG) ---------- */

const urlaubsabgeltung: Werkzeug = {
  name: "urlaubsabgeltung",
  titel: "Urlaubsabgeltung",
  beschreibung:
    "Payment in lieu of untaken holiday when employment ends under German law (Urlaubsabgeltung, § 7 Abs. 4 and § 11 BUrlG). Calculates the holiday entitlement in the year of leaving (full or partial, Teilurlaub), adds carry-over, subtracts days taken and multiplies the open days by the daily rate from the last 13 weeks' pay. Use it when someone leaves with holiday left. Germany only.",
  eingabe: schema({
    eintritt: datum("First day of employment"),
    austritt: datum("Last day of employment"),
    jahresurlaub: zahl("Contractual annual holiday for full time in a 5-day week, in days (legal minimum 20)", 20, 60),
    tage_pro_woche: zahl("Working days per week of the person, 0.5 to 6", 0.5, 6),
    schon_genommen: zahl("Holiday days already taken in the year of leaving", 0, 200),
    rest_vorjahr: zahl("Holiday carried over from the previous year that has not lapsed. Leave out to add partial holiday from the year of entry automatically where it applies", 0, 200),
    mehrurlaub_gezwoelftelt: janein("True only if the contract expressly reduces holiday above the legal minimum pro rata (1/12 per month) when leaving"),
    schwerbehindert: janein("True if the person is severely disabled; the additional holiday (§ 208 SGB IX) is paid out too"),
    offene_tage: zahl("Open holiday days if already known; then entry and exit dates are not needed", 0, 200),
    monatsgehalt_brutto: zahl("Fixed gross monthly salary in euros", 1),
    variabel_13_wochen: zahl("Variable pay (commission, allowances) in the last 13 weeks in euros, without overtime pay", 0),
    verdienst_13_wochen: zahl("Alternative to the monthly salary: gross pay of the last 13 weeks in euros, without overtime pay and one-off payments", 1),
  }, ["tage_pro_woche"]),
  ausfuehren(e, heute) {
    const tw = e.tage_pro_woche as number;
    const gehalt = e.monatsgehalt_brutto as number | undefined, variabel = (e.variabel_13_wochen as number | undefined) ?? 0;
    const v13 = (e.verdienst_13_wochen as number | undefined) ?? (gehalt !== undefined ? 3 * gehalt + variabel : undefined);
    if (v13 === undefined) return fehler("Es fehlt der Verdienst: monatsgehalt_brutto oder verdienst_13_wochen.", heute);
    let offen = e.offene_tage as number | undefined;
    let r: AnspruchErgebnis | null = null;
    let austritt: Date | null = null;
    let uebertrag = 0, genommen = 0, vorjahrAuto = false;
    if (offen === undefined) {
      const ein = parseYmd(e.eintritt as string | undefined);
      austritt = parseYmd(e.austritt as string | undefined);
      if (!ein || !austritt || e.jahresurlaub === undefined) return fehler("Für die Berechnung fehlen Eintritt, Ende und Jahresurlaub. Oder gib die offenen Tage direkt an.", heute);
      if (austritt < ein) return fehler("Das Ende liegt vor dem Eintritt.", heute);
      r = anspruchImAustrittsjahr({ eintritt: ein, austritt, jahresurlaub: e.jahresurlaub as number, tageWoche: tw, mehrZwoelfteln: !!e.mehrurlaub_gezwoelftelt, schwerbehindert: !!e.schwerbehindert });
      vorjahrAuto = e.rest_vorjahr === undefined && r.vorjahrTeil > 0;
      uebertrag = (e.rest_vorjahr as number | undefined) ?? r.vorjahrTeil;
      genommen = (e.schon_genommen as number | undefined) ?? 0;
      offen = Math.max(0, r.anspruch + uebertrag - genommen);
    }
    const ts = tagessatz(v13, tw);
    const betrag = cent(ts * offen);
    const vorjahr = r ? r.wartezeitEnde.getUTCFullYear() - 1 : 0;
    return antwort({
      ergebnis: {
        ...(r ? {
          anspruch_austrittsjahr: r.anspruch,
          art: r.art,
          ...(r.art === "teil" ? { volle_monate: r.monate } : {}),
          gesetzlicher_anteil: r.gesetzlich,
          mehrurlaub: r.mehr,
          wartezeit_erfuellt_am: toYmd(r.wartezeitEnde),
          rest_vorjahr: uebertrag,
          schon_genommen: genommen,
        } : {}),
        offene_tage: offen,
        verdienst_13_wochen: cent(v13),
        tagessatz: cent(ts),
        abgeltung_brutto: betrag,
      },
      rechenweg: [
        ...(r && austritt ? [
          r.begruendung
            + (r.wartezeitEnde > austritt ? ` Die Wartezeit wäre am ${fmt(r.wartezeitEnde)} erfüllt gewesen.` : ` Wartezeit erfüllt am ${fmt(r.wartezeitEnde)}.`)
            + (r.art === "teil" ? " Bruchteile werden auf volle Tage aufgerundet." : ""),
          ...(vorjahrAuto ? [`Weil die Wartezeit nicht mehr ${vorjahr} endete, gibt es für ${vorjahr} Teilurlaub: 1/12 je vollem Monat (§ 5 Abs. 1 a BUrlG). Er wird ins Austrittsjahr übertragen und mit abgegolten (§ 7 Abs. 3 Satz 4, Abs. 4 BUrlG). Hat die Person ihn schon genommen, gib rest_vorjahr 0 an.`] : []),
          `Offene Tage: ${dz(r.anspruch)} Anspruch${uebertrag ? ` plus ${dz(uebertrag)} aus dem Vorjahr` : ""}${genommen ? ` minus ${dz(genommen)} genommen` : ""} = ${dz(offen)}.`,
        ] : []),
        `Verdienst der letzten 13 Wochen: ${e.verdienst_13_wochen === undefined && gehalt !== undefined ? `3 × ${eur(gehalt)}${variabel ? ` + ${eur(variabel)} variabel` : ""} = ` : ""}${eur(v13)}.`,
        `Tagessatz: ${eur(v13)} ÷ (13 × ${dz(tw)}) = ${eur(ts)} (§ 11 Abs. 1 BUrlG).`,
        `Urlaubsabgeltung brutto: ${dz(offen)} × ${eur(ts)} = ${eur(betrag)}.`,
      ],
      quellen: [
        normQuelle("§ 7 Abs. 4 BUrlG"),
        registerQuelle("urlaubsentgeltWochen", heute),
        ...(r ? [normQuelle("§ 5 BUrlG"), registerQuelle("urlaubWartezeitMonate", heute)] : []),
        ...(e.schwerbehindert ? [registerQuelle("zusatzurlaubSchwerbehindert", heute)] : []),
        normQuelle("§ 157 Abs. 2 SGB III"),
      ],
      fallen: [
        ...(r && austritt && genommen > r.anspruch + uebertrag
          ? [r.art === "teil" && r.wartezeitEnde <= austritt
            ? "Mehr Urlaub genommen als zusteht: Zu viel gezahltes Urlaubsentgelt darfst du nicht zurückfordern oder mit dem letzten Gehalt verrechnen (§ 5 Abs. 3 BUrlG). Es wird nichts abgegolten."
            : r.art === "teil"
            ? "Mehr Urlaub genommen als zusteht: Es wird nichts abgegolten. Das Rückforderungsverbot in § 5 Abs. 3 BUrlG gilt nur beim Austritt im ersten Halbjahr nach erfüllter Wartezeit. Ob du vor erfüllter Wartezeit zu viel gezahltes Urlaubsentgelt zurückverlangen darfst, ist umstritten. Zieh nichts vom letzten Gehalt ab, ohne das prüfen zu lassen."
            : "Mehr Urlaub genommen als zusteht: Es wird nichts abgegolten. Ein Abzug vom letzten Gehalt ist ohne ausdrückliche Vereinbarung nicht möglich. Kläre das vor der letzten Abrechnung."]
          : []),
        ...(uebertrag > 0 && !vorjahrAuto ? ["Resturlaub aus Vorjahren verfällt nur nach einem rechtzeitigen Hinweis an die Person. Ohne Hinweis bleibt er bestehen und wird abgegolten."] : []),
        "Überstundenvergütung zählt beim Verdienst nicht mit. Eine dauerhafte Erhöhung im Bezugszeitraum zählt ab Beginn voll.",
        "Der Betrag ist brutto. Dazu kommen deine Arbeitgeberanteile zur Sozialversicherung, grob 21 % bis zur Beitragsbemessungsgrenze. Arbeitslosengeld ruht für die abgegoltenen Tage (§ 157 Abs. 2 SGB III).",
      ],
      naechster_schritt: [
        `Mit der letzten Abrechnung${austritt ? ` zum ${fmt(austritt)}` : ""} auszahlen. Die Abgeltung ist Arbeitslohn (sonstiger Bezug, einmalig gezahltes Arbeitsentgelt), Steuer und Sozialversicherung rechnet dein Lohnbüro.`,
      ],
    }, heute);
  },
};

/* ---------- Abfindung (§ 1a, § 10 KSchG) ---------- */

/** Wann welcher Faktor üblich ist, wie auf der Seite abfindungsrechner. */
const STUFEN: Record<number, string> = {
  0.25: "Kündigung wahrscheinlich wirksam, kurze Zugehörigkeit oder Kleinbetrieb",
  0.5: "Regelwert, so steht es auch in § 1a KSchG",
  0.75: "Kündigung angreifbar, z. B. Sozialauswahl oder Abmahnung fraglich",
  1: "Kündigung voraussichtlich unwirksam, z. B. Fehler bei der Anhörung des Betriebsrats",
  1.5: "schwache Position: Kündigung kaum haltbar, Sonderkündigungsschutz, Lohnnachzahlung bei langem Verfahren droht",
};

/** Die Logik liest deutsche Texte: 4200.5 wird "4200,5". */
const alsText = (n: unknown) => (n === undefined ? "" : String(n).replace(".", ","));

const abfindung_faustformel: Werkzeug = {
  name: "abfindung_faustformel",
  titel: "Abfindung nach Faustformel",
  beschreibung:
    "Rule-of-thumb severance pay under German law (Abfindung, § 1a KSchG): monthly pay × factor × years of service, with the usual range of factors and the legal cap if a court dissolves the employment (§ 10 KSchG). There is usually no legal right to severance; use it to size an offer or a settlement. Germany only.",
  eingabe: schema({
    monatsgehalt_brutto: zahl("Gross monthly salary incl. regular allowances, in euros", 0),
    sonderzahlungen_jahr: zahl("Annual one-off payments such as Christmas or holiday bonus, in euros; added with 1/12", 0),
    eintritt: datum("First day of employment"),
    austritt: datum("Last day of employment"),
    zugang_kuendigung: datum("Day the notice of termination was received; the 6-month waiting period of the KSchG counts to this day"),
    faktor: zahl("Monthly salaries per year of service, default 0.5 (statutory value), commonly up to 1.0", 0.25, 2),
    alter: zahl("Age at leaving in years, only for the legal cap", 14, 80),
    kleinbetrieb: janein("True for a small business with regularly 10 or fewer full-time employees (part-time counted pro rata)"),
  }, ["monatsgehalt_brutto", "eintritt", "austritt"]),
  ausfuehren(e, heute) {
    const faktor = (e.faktor as number | undefined) ?? 0.5;
    const roh = berechneAbfindung({
      gehalt: alsText(e.monatsgehalt_brutto), sonder: alsText(e.sonderzahlungen_jahr), eintritt: e.eintritt as string, austritt: e.austritt as string,
      zugang: (e.zugang_kuendigung as string | undefined) ?? "", faktor, alter: e.alter === undefined ? "" : String(e.alter), klein: !!e.kleinbetrieb,
    });
    if (!roh || roh.betrag === undefined) return fehler(Object.values(roh?.errors ?? {}).join(" "), heute);
    const r = roh as Extract<typeof roh, { betrag: number }>;
    const sonder = (e.sonderzahlungen_jahr as number | undefined) ?? 0;
    const rest = r.dauer.m || r.dauer.d ? (r.rest ? " Der Rest über 6 Monate wird aufgerundet." : " Ein Rest bis 6 Monate fällt weg.") : "";
    return antwort({
      ergebnis: {
        monatsverdienst: cent(r.monat),
        betriebszugehoerigkeit: { jahre: r.dauer.y, monate: r.dauer.m, tage: r.dauer.d },
        gerechnete_jahre: r.jahre,
        faktor,
        abfindung_brutto: cent(r.betrag),
        spanne: r.spanne.map((s) => ({ faktor: s.f, betrag: cent(s.wert), wann: STUFEN[s.f] })),
        hoechstbetrag_gericht: { monatsverdienste: r.kStufe.monate, betrag: cent(r.kappung) },
      },
      rechenweg: [
        `Monatsverdienst: ${sonder ? `${eur(e.monatsgehalt_brutto as number)} + ${eur(sonder)} Sonderzahlungen ÷ 12 = ` : ""}${eur(r.monat)}.`,
        `Betriebszugehörigkeit ${fmt(r.ein)} bis ${fmt(r.aus)}: ${plural(r.dauer.y, "Jahr", "Jahre")}, ${plural(r.dauer.m, "Monat", "Monate")}, ${plural(r.dauer.d, "Tag", "Tage")}.${rest} Gerechnet: ${plural(r.jahre, "Jahr", "Jahre")}.`,
        `Abfindung: ${eur(r.monat)} × ${dz(faktor)} × ${plural(r.jahre, "Jahr", "Jahre")} = ${eur(r.betrag)}. 0,5 ist der Regelwert aus § 1a KSchG.`,
        `Höchstbetrag, wenn das Gericht das Arbeitsverhältnis auflöst: ${r.kStufe.monate} Monatsverdienste = ${eur(r.kappung)} (§ 10 KSchG).`,
      ],
      quellen: [normQuelle("§ 1a KSchG"), normQuelle("§ 9 KSchG"), normQuelle("§ 10 KSchG"), registerQuelle("kschgWartezeitMonate", heute), registerQuelle("kschgSchwelle", heute)],
      fallen: [
        ...r.msgs.map((m) => `${m.title}: ${m.text}`),
        "Eine echte Abfindung ist frei von Sozialversicherungsbeiträgen, aber lohnsteuerpflichtig. Seit 2025 zieht das Lohnbüro die volle Lohnsteuer ab, die Fünftelregelung bekommt die Person erst über ihre Steuererklärung.",
        "Ob die Agentur für Arbeit eine Sperrzeit verhängt oder das Arbeitslosengeld ruhen lässt, hängt vor allem davon ab, ob die Kündigungsfrist eingehalten wurde und wer die Trennung ausgelöst hat.",
      ],
      naechster_schritt: [
        "Bevor du eine Zahl nennst: Kündigungsgrund, Frist und Sonderkündigungsschutz prüfen (Werkzeug sonderkuendigungsschutz_check).",
        "Halte eine vereinbarte Abfindung schriftlich fest, im Abwicklungs- oder Aufhebungsvertrag oder im Vergleich vor Gericht. Die Lohnsteuer rechnet dein Lohnbüro.",
      ],
    }, heute);
  },
};

/* ---------- Ausgleichsabgabe (§§ 154, 160 SGB IX) ---------- */

const ausgleichsabgabe: Werkzeug = {
  name: "ausgleichsabgabe",
  titel: "Ausgleichsabgabe",
  beschreibung:
    "Compensatory levy for unfilled jobs for severely disabled people under German law (Ausgleichsabgabe, §§ 154, 160 SGB IX), years 2024 to 2026. Takes the jobs and the severely disabled employees per month (or one value for all months) and returns required places, employment rate, rate per place and month, the levy and the 31 March deadline. Only employers with 20 or more jobs on annual average are affected. Germany only.",
  eingabe: schema({
    jahr: text("Calendar year of employment, default the current year", { enum: Object.keys(SAETZE) }),
    arbeitsplaetze: liste("Jobs (Arbeitsplätze) of 18 or more hours per week without apprentices and fixed terms up to 8 weeks: one value for every month or 12 values January to December", zahl("Number of jobs", 0, 100000), 12),
    schwerbehinderte: liste("Severely disabled or equivalent employees as counted by the employment agency (angerechnet): one value or 12 monthly values, default 0", zahl("Number of people", 0, 100000), 12),
  }, ["arbeitsplaetze"]),
  ausfuehren(e, heute) {
    const jahr = jahrAus(e.jahr, Object.keys(SAETZE), heute);
    const monate = (x: number[] | undefined) => (x === undefined ? Array(12).fill(0) : x.length === 1 ? Array(12).fill(x[0]) : x);
    const ap: number[] = monate(e.arbeitsplaetze as number[]), b: number[] = monate(e.schwerbehinderte as number[] | undefined);
    if (ap.length !== 12 || b.length !== 12) return fehler("Gib einen Wert für alle Monate an oder 12 Monatswerte von Januar bis Dezember.", heute);
    if (![...ap, ...b].every(Number.isInteger)) return fehler("Nur ganze Zahlen ab 0.", heute);
    if (ap.every((x) => x === 0)) return fehler("Trag für mindestens einen Monat Arbeitsplätze ein.", heute);
    const r = ausgleich(ap, b, jahr);
    const ersparnis = r.abgabe - ausgleich(ap, b.map((x) => x + 1), jahr).abgabe;
    const faellig = `${jahr + 1}-03-31`, faelligDe = `31.03.${jahr + 1}`;
    const gruppe = { unter20: "", unter40: "20 bis unter 40 Arbeitsplätze: 1 Pflichtplatz je Monat.", unter60: "40 bis unter 60 Arbeitsplätze: 2 Pflichtplätze je Monat.", regel: "Ab 60 Arbeitsplätzen: 5 % je Monat, ab 0,5 aufgerundet." }[r.gruppe];
    return antwort({
      ergebnis: {
        jahr,
        pflichtig: r.pflichtig,
        arbeitsplaetze_durchschnitt: cent(r.avgAP),
        ...(r.pflichtig ? {
          pflichtplaetze_je_monat: r.pflichtJeMonat,
          besetzt_durchschnitt: cent(r.avgB),
          quote_prozent: cent(r.quote),
          stufe: r.stufe,
          satz_je_platz_und_monat: r.satz,
          unbesetzte_pflichtplatz_monate: r.unbesetzt,
          faellig_am: faellig,
        } : {}),
        ausgleichsabgabe: r.abgabe,
        ...(ersparnis > 0 ? { weniger_mit_einer_person_mehr: ersparnis } : {}),
      },
      rechenweg: [
        `Arbeitsplätze im Jahresdurchschnitt: ${dz(r.avgAP)} (Summe der Monate ÷ 12).`,
        ...(r.pflichtig
          ? [
            `${gruppe} Zusammen ${r.sumP} Pflichtplatz-Monate im Jahr.`,
            `Besetzt im Jahresdurchschnitt: ${dz(r.avgB)}, Quote ${dz(r.quote)} %. Stufe: ${r.stufe}.`,
            ...(r.satz ? [`${r.unbesetzt} unbesetzte Pflichtplatz-Monate × ${eur(r.satz)} = ${eur(r.abgabe)}.`] : []),
            `Beträge ${jahr}: ${SAETZE[jahr].quelle}.`,
          ]
          : ["Unter 20 Arbeitsplätzen im Jahresdurchschnitt gibt es keine Beschäftigungspflicht und keine Abgabe (§ 154 Abs. 1 SGB IX)."]),
      ],
      quellen: [
        registerQuelle("pflichtplatzStufen", heute), normQuelle("§ 156 SGB IX"), normQuelle("§ 157 SGB IX"), normQuelle("§ 160 SGB IX"),
        normQuelle(SAETZE[jahr].quelle), registerQuelle("schwerbehindertAnzeige", heute),
      ],
      fallen: [
        "Arbeitsplätze: Stellen ab 18 Wochenstunden, ohne Auszubildende und ohne Befristungen bis 8 Wochen. Schwerbehinderte Auszubildende zählen doppelt, Mehrfachanrechnungen der Agentur für Arbeit zählst du mit.",
        ...(r.pflichtig && r.abgabe === 0 ? ["Die Pflicht ist erfüllt. Die Anzeige an die Agentur für Arbeit musst du trotzdem abgeben."] : []),
        ...(!r.pflichtig && r.avgAP >= 15 ? ["Knapp unter der Schwelle: Wächst die Firma, prüf die Pflicht jedes Jahr neu. Maßgeblich ist der Jahresdurchschnitt."] : []),
        "Nicht berechnet: Aufträge an anerkannte Werkstätten für behinderte Menschen oder Inklusionsbetriebe können die Abgabe mindern (§ 223 SGB IX).",
        "Verbindlich sind die Anzeige über IW-Elan und der Bescheid des Integrationsamts.",
      ],
      naechster_schritt: r.pflichtig
        ? [
          `Bis ${faelligDe}: Anzeige an die Agentur für Arbeit (§ 163 Abs. 2 SGB IX), meist über IW-Elan, und Zahlung an das Integrationsamt (§ 160 Abs. 4 SGB IX).`,
          "Führ das Verzeichnis der schwerbehinderten Beschäftigten laufend.",
          `Frist merken: Werkzeug frist_merken, Frist „Anzeige und Zahlung der Ausgleichsabgabe“ am ${faelligDe}.`,
        ]
        : [],
    }, heute);
  },
};

/* ---------- Minijob (§ 8 SGB IV, MiLoG) ---------- */

const minijob: Werkzeug = {
  name: "minijob",
  titel: "Minijob: Stunden, Grenze und Kosten",
  beschreibung:
    "Mini-job check under German law (Minijob, geringfügige Beschäftigung, § 8 SGB IV) for 2026 and 2027: maximum hours under the monthly earnings limit, minimum wage check (Mindestlohn), annual limit including one-off payments, and the employer's flat-rate contributions and levies (Pauschalabgaben). Use it before hiring a mini-jobber or changing hours or pay. Germany only.",
  eingabe: schema({
    jahr: text("Year, default the current year", { enum: Object.keys(STAND) }),
    stundenlohn: zahl("Gross hourly wage in euros", 0.01, 200),
    stunden: zahl("Planned working hours, leave out to get only the maximum hours", 0, 300),
    stunden_je: text("Whether the hours are per week or per month, default week", { enum: ["woche", "monat"] }),
    einmalzahlungen_jahr: zahl("Promised one-off payments in the year in euros, e.g. Christmas bonus", 0),
    gesetzlich_krankenversichert: janein("True (default) if the person has statutory health insurance; then the employer pays the 13 % health flat rate"),
    pauschsteuer: janein("True (default) for the usual 2 % flat-rate tax"),
    unter_18_ohne_berufsabschluss: janein("True if the person is under 18 without vocational qualification; then the minimum wage does not apply (§ 22 Abs. 2 MiLoG)"),
  }, ["stundenlohn"]),
  ausfuehren(e, heute) {
    const jahr = jahrAus(e.jahr, Object.keys(STAND), heute) as Jahr;
    const lohn = e.stundenlohn as number, stunden = (e.stunden as number | undefined) ?? null, basis = (e.stunden_je as Basis | undefined) ?? "woche";
    const einmal = (e.einmalzahlungen_jahr as number | undefined) ?? 0, minderjaehrig = !!e.unter_18_ohne_berufsabschluss;
    if (stunden !== null && stunden > (basis === "monat" ? 300 : 70)) return fehler("Das sind mehr Stunden, als ein Minijob haben kann.", heute);
    const r = berechneMinijob(lohn, stunden, basis, jahr, einmal);
    const kostenBasis = r.monatsEntgelt ?? r.grenze;
    // Abgabensätze gibt es nur für 2026 (wie auf der Seite)
    const kosten = jahr === 2026 && r.imMinijob !== false
      ? abgabenArbeitgeber(kostenBasis, { gesetzlichVersichert: e.gesetzlich_krankenversichert !== false, pauschsteuer: e.pauschsteuer !== false })
      : null;
    const n = STAND[(jahr + 1) as Jahr] as (typeof STAND)[Jahr] | undefined;
    const lohnNeu = n && !minderjaehrig ? Math.max(lohn, n.mindestlohn) : lohn;
    return antwort({
      ergebnis: {
        jahr,
        mindestlohn: r.mindestlohn,
        verdienstgrenze_monat: r.grenze,
        jahresgrenze: r.jahresGrenze,
        hoechststunden_monat: r.maxMonat,
        hoechststunden_woche: r.maxWoche,
        mindestlohn_eingehalten: minderjaehrig ? null : !r.unterMindestlohn,
        geplant: r.monatsStunden === null ? null : {
          stunden_monat: cent(r.monatsStunden), entgelt_monat: r.monatsEntgelt, entgelt_jahr: r.jahresEntgelt, im_minijob: r.imMinijob, spielraum_einmalzahlungen: r.spielraum,
        },
        kosten_arbeitgeber: kosten && {
          lohn_monat: kostenBasis,
          posten: kosten.posten.map((p) => ({ name: p.name, satz_prozent: cent(p.satz * 100), betrag: p.betrag })),
          abgaben: kosten.summe,
          gesamtkosten: kosten.gesamtkosten,
        },
      },
      rechenweg: [
        `Verdienstgrenze ${jahr}: ${eur(r.grenze)} im Monat (Mindestlohn ${eur(r.mindestlohn)} × 130 ÷ 3, aufgerundet), ${eur(r.jahresGrenze)} im Jahr.`,
        `Höchststunden: ${eur(r.grenze)} ÷ ${eur(lohn)} = ${zahlFest(r.maxMonat)} Stunden im Monat, ÷ ${dz(WOCHEN_PRO_MONAT)} = ${zahlFest(r.maxWoche)} Stunden pro Woche (abgerundet).`,
        ...(r.monatsStunden !== null && stunden !== null
          ? [
            `Geplant: ${basis === "woche" ? `${dz(stunden)} Stunden pro Woche × ${dz(WOCHEN_PRO_MONAT)} = ${zahlFest(r.monatsStunden)} Stunden im Monat` : `${dz(stunden)} Stunden im Monat`} × ${eur(lohn)} = ${eur(r.monatsEntgelt!)}.`,
            `Jahr: 12 × ${eur(r.monatsEntgelt!)}${einmal ? ` + ${eur(einmal)} Einmalzahlungen` : ""} = ${eur(r.jahresEntgelt!)}, Grenze ${eur(r.jahresGrenze)}.`,
          ]
          : []),
        ...(kosten
          ? [`Abgaben des Arbeitgebers auf ${eur(kostenBasis)}${r.monatsEntgelt === null ? " (ohne geplante Stunden: Lohn genau an der Grenze)" : ""}, Sätze 2026: ${kosten.posten.map((p) => `${p.name} ${dz(p.satz * 100)} %`).join(", ")}. Zusammen ${eur(kosten.summe)}, Gesamtkosten ${eur(kosten.gesamtkosten)} im Monat.`]
          : []),
      ],
      quellen: [
        registerQuelle("minijobGrenze", heute), registerQuelle("mindestlohn", heute),
        ...(minderjaehrig ? [normQuelle("§ 22 Abs. 2 MiLoG")] : []),
        ...(kosten ? [registerQuelle("minijobAgPauschale", heute)] : []),
        registerQuelle("milogAufzeichnung", heute),
      ],
      fallen: [
        ...(r.unterMindestlohn && !minderjaehrig
          ? [`${eur(lohn)} liegt ${eur(r.differenz)} unter dem Mindestlohn von ${eur(r.mindestlohn)}. Der Mindestlohn gilt auch im Minijob. Bei ${eur(r.mindestlohn)} wären höchstens ${zahlFest(Math.floor((r.grenze / r.mindestlohn) * 100) / 100)} Stunden im Monat möglich.`]
          : []),
        ...(r.imMinijob === false
          ? [`Übergangsbereich statt Minijob: Über ${eur(r.grenze)} im Monat ist die Stelle sozialversicherungspflichtig. Bis ${eur(MIDIJOB_OBERGRENZE)} gilt der Übergangsbereich (Midijob, Stand 2026) mit reduzierten Beiträgen für die beschäftigte Person. Sag deinem Lohnbüro vor dem Start Bescheid.`]
          : []),
        ...(jahr !== 2026
          ? ["Abgaben 2027 noch offen: Ab 01.01.2027 steigt die Pauschale zur Krankenversicherung von 13 % auf 14,6 % plus den durchschnittlichen Zusatzbeitrag (GKV-Beitragssatzstabilisierungsgesetz). Der Zusatzbeitrag für 2027 wird erst im Herbst festgelegt. Mit jahr 2026 siehst du die Kosten mit den heutigen Sätzen."]
          : []),
        ...(n
          ? [`Ab 01.01.${jahr + 1} gelten ${eur(n.mindestlohn)} Mindestlohn und ${eur(n.grenze)} Grenze.`
            + (minderjaehrig ? " Für Minderjährige ohne Berufsabschluss gilt der Mindestlohn weiter nicht, die Grenze steigt trotzdem." : lohn < n.mindestlohn ? ` Der Stundenlohn von ${eur(lohn)} muss dann auf mindestens ${eur(n.mindestlohn)} steigen.` : "")
            + (r.monatsStunden !== null && r.monatsStunden * lohnNeu > n.grenze
              ? ` Mit ${zahlFest(r.monatsStunden)} Stunden kämen dann ${eur(r.monatsStunden * lohnNeu)} heraus, mehr als ${eur(n.grenze)}. Die Stunden müssen auf höchstens ${zahlFest(Math.floor((n.grenze / lohnNeu) * 100) / 100)} im Monat sinken.`
              : "")]
          : []),
        `Gelegentlich mehr arbeiten: Unvorhersehbare Mehrarbeit, etwa als Krankheitsvertretung, ist in bis zu 2 Kalendermonaten innerhalb von 12 Monaten erlaubt, bis ${eur(r.grenze * 2)} im Monat (§ 8 Abs. 1b SGB IV).`,
        "Nicht berechnet: Unfallversicherung (Satz deiner Berufsgenossenschaft) und Minijobs im Privathaushalt.",
      ],
      naechster_schritt: [
        "Arbeitszeit aufzeichnen: Beginn, Ende und Dauer spätestens 7 Tage nach dem Arbeitstag, 2 Jahre aufbewahren (§ 17 Abs. 1 MiLoG).",
        "Anmeldung bei der Minijob-Zentrale und Abrechnung macht dein Lohnbüro.",
      ],
    }, heute);
  },
};

export const GELD: Werkzeug[] = [entgeltfortzahlung, urlaubsabgeltung, abfindung_faustformel, ausgleichsabgabe, minijob];
