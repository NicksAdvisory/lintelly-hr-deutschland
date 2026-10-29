/**
 * Rechtsstand: ein Rechtswert mit Quelle, Suche im Register, was sich wann ändert. Grundlage ist das Rechtswerte-Register
 * der Werkbank (lib/regeln/register.ts). Eigene Annahmen von Lintelly (Rhythmus "Lintelly") sind keine Rechtsquelle und
 * bleiben draußen (Wissen-Konzept Abschnitt 7 Nr. 4).
 */
import { REGISTER, wertAm, type RegisterEintrag } from "@/lib/regeln/register";
import { antwort, registerQuelle } from "../antwort";
import { datum, schema, text } from "../eingabe";
import type { Werkzeug } from "../werkzeug";

const OEFFENTLICH = REGISTER.filter((e) => e.rhythmus !== "Lintelly");
const GEBIETE = [...new Set(OEFFENTLICH.map((e) => e.gebiet))];
const KENNUNG = "^[A-Za-z0-9_-]{1,60}$";

const werteListe = (e: RegisterEintrag) =>
  e.werte.map((w) => ({ ab: w.gueltigAb, bis: w.gueltigBis, wert: w.wert, ...(w.ausstehend ? { ausstehend: true } : {}) }));

/** Grobe Ähnlichkeit für Vorschläge: gemeinsame Anfangsbuchstaben und enthaltene Teile, ohne Groß- und Kleinschreibung. */
function vorschlaege(k: string): string[] {
  const s = k.toLowerCase();
  const punkte = (id: string) => {
    const x = id.toLowerCase();
    let p = 0;
    while (p < Math.min(s.length, x.length) && s[p] === x[p]) p++;
    return p + (x.includes(s) || s.includes(x) ? 10 : 0);
  };
  return OEFFENTLICH.map((e) => ({ id: e.id, p: punkte(e.id) })).filter((x) => x.p >= 3).sort((a, b) => b.p - a.p).slice(0, 5).map((x) => x.id);
}

const rechtswert: Werkzeug = {
  name: "rechtswert",
  titel: "Rechtswert mit Quelle",
  beschreibung:
    "Look up one German employment law value (Rechtswert) by its key, e.g. mindestlohn (minimum wage), minijobGrenze, bbgRv, urlaubMindest. Returns the value valid on the given date, all dated values, the legal norm, the official source link, the date it was last checked and its status.",
  eingabe: schema({ kennung: text("Key of the value, e.g. mindestlohn", { pattern: KENNUNG, maxLength: 60 }), stichtag: datum("Date the value should apply to, default today") }, ["kennung"]),
  ausfuehren(e, heute) {
    const eintrag = OEFFENTLICH.find((x) => x.id === e.kennung);
    if (!eintrag) return antwort({ ergebnis: { gefunden: false, kennung: e.kennung, vorschlaege: vorschlaege(String(e.kennung)) } }, heute);
    const tag = (e.stichtag as string | undefined) ?? heute;
    const w = wertAm(eintrag, tag);
    return antwort({
      ergebnis: {
        gefunden: true, kennung: eintrag.id, titel: eintrag.titel, gebiet: eintrag.gebiet, stichtag: tag,
        wert: w?.wert ?? null, gueltig_ab: w?.gueltigAb ?? null, gueltig_bis: w?.gueltigBis ?? null,
        alle_werte: werteListe(eintrag), erlaeuterung: eintrag.hinweis, naechste_pruefung: eintrag.naechstePruefung,
      },
      quellen: [registerQuelle(eintrag.id, heute)],
      fallen: w ? [] : [`Für den ${tag} steht kein amtlicher Wert fest.`],
    }, heute);
  },
};

const rechtswerte_suchen: Werkzeug = {
  name: "rechtswerte_suchen",
  titel: "Rechtswerte suchen",
  beschreibung:
    `Search the register of German employment law values (${OEFFENTLICH.length} values with norm, official source and review date): minimum wage, mini-job limit, notice periods, probation, holiday, sick pay, maternity protection, retention periods, thresholds. Returns up to 20 matches with key, title, value on the date and status.`,
  eingabe: schema({
    suchtext: text("Words to search for, German or key, e.g. Mindestlohn, Urlaub, Aufbewahrung", { maxLength: 100 }),
    gebiet: text("Optional area of law", { enum: GEBIETE }),
    stichtag: datum("Date the values should apply to, default today"),
  }),
  ausfuehren(e, heute) {
    const tag = (e.stichtag as string | undefined) ?? heute;
    const woerter = String(e.suchtext ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const passend = OEFFENTLICH.filter((x) => (!e.gebiet || x.gebiet === e.gebiet)
      && woerter.every((w) => `${x.id} ${x.titel} ${x.gebiet} ${x.norm} ${x.hinweis}`.toLowerCase().includes(w)));
    const treffer = passend.slice(0, 20).map((x) => ({
      kennung: x.id, titel: x.titel, gebiet: x.gebiet, wert: wertAm(x, tag)?.wert ?? null, norm: x.norm, status: registerQuelle(x.id, heute).status,
    }));
    return antwort({
      ergebnis: { stichtag: tag, anzahl_gesamt: OEFFENTLICH.length, anzahl_treffer: passend.length, treffer },
      naechster_schritt: treffer.length ? ["Mit rechtswert und der Kennung gibt es Quelle, Prüfdatum und alle Zeitwerte."] : [],
    }, heute);
  },
};

const rechtsaenderungen: Werkzeug = {
  name: "rechtsaenderungen",
  titel: "Was ändert sich wann",
  beschreibung:
    "Calendar of changes in German employment law values between two dates (Rechtsänderungen), e.g. what changes on 1 January: minimum wage, mini-job limit, contribution ceilings and rates. Lists each new value with the previous one and the source, and values that are not yet officially published.",
  eingabe: schema({ von: datum("First day, default today"), bis: datum("Last day, default one year after the first day") }),
  ausfuehren(e, heute) {
    const von = (e.von as string | undefined) ?? heute;
    const bis = (e.bis as string | undefined) ?? `${Number(von.slice(0, 4)) + 1}${von.slice(4)}`;
    const imZeitraum = (d: string | null) => !!d && d >= von && d <= bis;
    const aenderungen = OEFFENTLICH.flatMap((x) => x.werte.flatMap((w, i) => {
      // Gleicher Wert mit neuem Datum ist keine Änderung (Review 29.10.2026: „2,6 % statt 2,6 %“).
      if (w.ausstehend || !imZeitraum(w.gueltigAb) || i === 0 || w.wert === x.werte[i - 1].wert) return [];
      return [{ kennung: x.id, titel: x.titel, ab: w.gueltigAb!, neu: w.wert, vorher: x.werte[i - 1].wert, norm: x.norm }];
    })).sort((a, b) => a.ab.localeCompare(b.ab));
    const ausstehend = OEFFENTLICH.flatMap((x) => x.werte.filter((w) => w.ausstehend && imZeitraum(w.gueltigAb))
      .map((w) => ({ kennung: x.id, titel: x.titel, ab: w.gueltigAb, stand: w.wert })));
    return antwort({
      ergebnis: { von, bis, aenderungen, ausstehend },
      quellen: [...new Set([...aenderungen, ...ausstehend].map((a) => a.kennung))].map((id) => registerQuelle(id, heute)),
      fallen: ausstehend.length ? ["Für einige Werte gibt es noch keine amtliche Zahl. Lintelly nennt sie erst, wenn sie veröffentlicht ist."] : [],
    }, heute);
  },
};

export const RECHT: Werkzeug[] = [rechtswert, rechtswerte_suchen, rechtsaenderungen];
