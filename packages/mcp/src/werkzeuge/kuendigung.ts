/**
 * Kündigungsfrist (§§ 187, 188, 622 BGB) mit der Rechnung der Werkbank (lib/regeln/datum.ts berechneKuendigung, dieselbe wie
 * auf lintelly.com/tools/kuendigungsfrist-rechner) und Klagefrist (§ 4 KSchG, Ende nach § 222 Abs. 2 ZPO auf den nächsten Werktag).
 */
import { berechneKuendigung, compare, fristEndeWerktag, probezeitEnde, type Bundesland, type FristRegel } from "@/lib/regeln/datum";
import { gii } from "@/lib/regeln/fundstellen";
import { WERTE } from "@/lib/regeln/werte";
import { antwort, normQuelle, registerQuelle } from "../antwort";
import { datum, ganzzahl, janein, schema, text } from "../eingabe";
import { LAENDER, type Werkzeug } from "../werkzeug";

const BUNDESLAND = text("Federal state of the company for public holidays (Bundesland), e.g. HE", { enum: LAENDER });

/** Rechtswert im Register zur gesetzlichen Fristregel, auch für das Kündigungsschreiben. */
export const REGEL_WERT: Record<Exclude<FristRegel["art"], "vertrag">, string> = {
  probezeit: "probezeitKuendigungTage", grundfrist: "grundkuendigungsfristTage", kleinbetrieb: "kleinbetriebKuendigung", staffel: "kuendigungsStaffel",
};

/**
 * Probezeit nur, wenn angegeben: Fristrechner und Kündigungsschreiben rechnen ohne Angabe gleich, ohne Probezeit und damit mit der
 * längeren Frist (Review 29.10.2026: das Schreiben nahm still 6 Monate an und nannte ein zu frühes Ende).
 */
export const PROBEZEIT_FELD = ganzzahl("Agreed probation in whole months (Probezeit), 0 for none. If left out, no probation is assumed and the longer notice period applies", 0, 12);
export const ohneProbezeitHinweis = (e: { eintritt: string; zugang: string; probezeit_monate?: number }) =>
  e.probezeit_monate === undefined && compare(e.zugang, probezeitEnde(e.eintritt, WERTE.probezeitHoechstMonate.wert)) <= 0
    ? ["Gerechnet ohne Probezeit, weil probezeit_monate fehlt. Ist eine Probezeit vereinbart und geht die Kündigung in ihr zu, gilt die kürzere Frist von 2 Wochen (§ 622 Abs. 3 BGB). Dann probezeit_monate angeben."]
    : [];

const kuendigungsfrist_rechnen: Werkzeug = {
  name: "kuendigungsfrist_rechnen",
  titel: "Kündigungsfrist rechnen",
  beschreibung:
    "Calculate the notice period (Kündigungsfrist) for a German employment contract under §§ 187, 188, 622 BGB: end of employment, latest day the notice must be received, the next three possible end dates, the rule applied and warnings (e.g. notice received on a Sunday). Covers probation, length of service, small businesses and longer contractual periods. Use it for dismissals by the employer and resignations.",
  eingabe: schema({
    eintritt: datum("First day of employment"),
    zugang: datum("Day the notice is received by the other side, not the date of the letter"),
    wer_kuendigt: text("Who gives notice, default arbeitgeber", { enum: ["arbeitgeber", "arbeitnehmer"] }),
    probezeit_monate: PROBEZEIT_FELD,
    kleinbetrieb_vier_wochen: janein("Small business with at most 20 employees that agreed 4 weeks to any day (§ 622 Abs. 5 Nr. 2 BGB)"),
    vertrag_monate: ganzzahl("Longer notice period in the contract, whole months", 0, 24),
    vertrag_termin: text("End date of the contractual period", { enum: ["monatsende", "quartalsende"] }),
    staffel_auch_arbeitnehmer: janein("Contract extends the longer statutory periods to resignations too"),
    tarifvertrag: janein("A collective agreement applies (it may set other periods)"),
    bundesland: BUNDESLAND,
  }, ["eintritt", "zugang"]),
  baender: (e) => ({ land: e.bundesland as string | undefined }),
  ausfuehren(e, heute) {
    const wer = (e.wer_kuendigt as "arbeitgeber" | "arbeitnehmer" | undefined) ?? "arbeitgeber";
    const r = berechneKuendigung({
      eintritt: String(e.eintritt), zugang: String(e.zugang), kuendigender: wer,
      probezeitMonate: e.probezeit_monate as number | undefined,
      kleinbetriebVierWochen: e.kleinbetrieb_vier_wochen === true,
      vertrag: e.vertrag_monate ? { monate: e.vertrag_monate as number, termin: (e.vertrag_termin as "monatsende" | "quartalsende" | undefined) ?? "monatsende" } : null,
      staffelAuchFuerArbeitnehmer: e.staffel_auch_arbeitnehmer === true,
      tarifvertrag: e.tarifvertrag === true,
      bundesland: e.bundesland as Bundesland | undefined,
    });
    return antwort({
      ergebnis: {
        ende: r.ende, spaetester_zugang: r.spaetesterZugang, regel: r.regel.label, norm: r.regel.quelle,
        naechste_termine: r.termine.map((t) => ({ ende: t.termin, spaetester_zugang: t.spaetesterZugang })),
        beschaeftigungsjahre: r.jahre, in_probezeit: r.inProbezeit, ...(r.probezeitEnde ? { probezeit_ende: r.probezeitEnde } : {}),
        ende_gesetzlich: r.endeGesetzlich, ...(r.endeVertrag ? { ende_vertrag: r.endeVertrag } : {}),
      },
      rechenweg: r.rechenweg,
      quellen: [registerQuelle(REGEL_WERT[r.gesetzlich.art as keyof typeof REGEL_WERT], heute), normQuelle("§ 622 BGB", gii("bgb", "622")), normQuelle("§ 187 BGB"), normQuelle("§ 188 BGB")],
      fallen: [...ohneProbezeitHinweis(e as { eintritt: string; zugang: string; probezeit_monate?: number }), ...r.hinweise.map((h) => h.text)],
      naechster_schritt: wer === "arbeitgeber"
        ? ["Sonderkündigungsschutz prüfen (sonderkuendigungsschutz_check).", "Schriftform mit Originalunterschrift und Zugang mit Zeugen planen (kuendigung_pflichtangaben).", "Frist merken: Werkzeug frist_merken."]
        : ["Eingang mit Datum bestätigen, Resturlaub und Zeugnis planen (ablauf mit art austritt)."],
    }, heute);
  },
};

const klagefrist: Werkzeug = {
  name: "klagefrist",
  titel: "Klagefrist nach einer Kündigung",
  beschreibung:
    "Calculate the deadline for an unfair dismissal claim (Klagefrist, Kündigungsschutzklage) in Germany: 3 weeks after the written notice was received (§ 4 KSchG), moved to the next working day if it ends on a weekend or public holiday (§ 222 Abs. 2 ZPO). Applies in small businesses too. Use it to know from when a dismissal can be treated as final.",
  eingabe: schema({ zugang: datum("Day the written notice was received"), bundesland: BUNDESLAND }, ["zugang"]),
  baender: (e) => ({ land: e.bundesland as string | undefined }),
  ausfuehren(e, heute) {
    const wochen = WERTE.kschgKlageWochen.wert;
    const ende = fristEndeWerktag(String(e.zugang), wochen * 7, e.bundesland as Bundesland | undefined);
    return antwort({
      ergebnis: { zugang: e.zugang, ende, wochen },
      rechenweg: [
        `Zugang ${e.zugang}, plus ${wochen} Wochen.`,
        "Endet die Frist an einem Samstag, Sonntag oder Feiertag, läuft sie bis zum nächsten Werktag (§ 222 Abs. 2 ZPO).",
        e.bundesland ? `Feiertage im Bundesland ${e.bundesland} sind berücksichtigt.` : "Nur bundesweite Feiertage berücksichtigt, ohne Bundesland.",
      ],
      quellen: [normQuelle(WERTE.kschgKlageWochen.quelle.split(" (")[0]), normQuelle("§ 222 ZPO", gii("zpo", "222")), normQuelle("§ 23 Abs. 1 KSchG")],
      fallen: [
        "Die Frist gilt auch im Kleinbetrieb (§ 23 Abs. 1 Satz 2 KSchG).",
        "Braucht die Kündigung die Zustimmung einer Behörde (Schwerbehinderung, Mutterschutz, Elternzeit), beginnt die Frist erst mit der Bekanntgabe der Entscheidung an die Person (§ 4 Satz 4 KSchG).",
        "Auch nach Ablauf kann ein Gericht eine verspätete Klage nachträglich zulassen (§ 5 KSchG).",
      ],
      naechster_schritt: ["Den Nachweis des Zugangs in die Personalakte legen.", "Frist merken: Werkzeug frist_merken."],
    }, heute);
  },
};

export const KUENDIGUNG: Werkzeug[] = [kuendigungsfrist_rechnen, klagefrist];
