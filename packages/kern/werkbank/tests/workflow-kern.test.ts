import { describe, expect, it } from "vitest";
import { faelligeSchritte, type Lauf, type Schritt } from "@/lib/workflows/kern";

// Workflows (Nick 21.10.2026): ein Schritt wird ab seinem Tag einmal ausgeführt, mit `wiederholen` alle N Tage bis zur Höchstzahl.
const tage = { vorlauf: 7 };
type Handeln = Exclude<Schritt, { art: "warten" }>;
const s = (x: Partial<Handeln> & Pick<Handeln, "id" | "ab">): Schritt => ({ art: "aufgabe", an: "hr", text: () => "x", ...x });
const lauf = (erledigt: Record<string, string[]> = {}): Lauf => ({ id: "w:a", workflow: "w", schluessel: "a", personId: null, start: "2026-10-01", datum: "2026-10-20", titel: "A", status: "laeuft", erledigt, aufgaben: [] });

describe("faelligeSchritte", () => {
  it("Schritt vor seinem Tag nicht, ab seinem Tag einmal", () => {
    const sch = [s({ id: "a", ab: -2 })];
    expect(faelligeSchritte(sch, lauf(), "2026-10-17", tage)).toEqual([]);
    expect(faelligeSchritte(sch, lauf(), "2026-10-18", tage).map((x) => x.id)).toEqual(["a"]);
    expect(faelligeSchritte(sch, lauf({ a: ["2026-10-18"] }), "2026-10-25", tage)).toEqual([]);
  });
  it("Tage aus der Einstellung: ab als Name", () => {
    const sch = [s({ id: "a", ab: "-vorlauf" })];
    expect(faelligeSchritte(sch, lauf(), "2026-10-12", tage)).toEqual([]);
    expect(faelligeSchritte(sch, lauf(), "2026-10-13", tage).map((x) => x.id)).toEqual(["a"]);
  });
  it("wiederholen: alle N Tage, höchstens M-mal insgesamt", () => {
    const sch = [s({ id: "a", ab: 0, wiederholen: { alle: 3, max: 3 } })];
    expect(faelligeSchritte(sch, lauf({ a: ["2026-10-20"] }), "2026-10-22", tage)).toEqual([]);
    expect(faelligeSchritte(sch, lauf({ a: ["2026-10-20"] }), "2026-10-23", tage).map((x) => x.id)).toEqual(["a"]);
    expect(faelligeSchritte(sch, lauf({ a: ["2026-10-20", "2026-10-23", "2026-10-26"] }), "2026-10-29", tage)).toEqual([]);
  });
  it("ohne Datum zählt der Start des Laufs", () => {
    const l = { ...lauf(), datum: null };
    expect(faelligeSchritte([s({ id: "a", ab: 0 })], l, "2026-10-01", tage).map((x) => x.id)).toEqual(["a"]);
  });
  it("geschlossene Läufe tun nichts", () => {
    expect(faelligeSchritte([s({ id: "a", ab: 0 })], { ...lauf(), status: "erledigt" }, "2026-10-30", tage)).toEqual([]);
  });
  it("nie zweimal am selben Tag, auch mit 0 Tagen Abstand", () => {
    const sch = [s({ id: "a", ab: 0, wiederholen: { alle: 0, max: 5 } })];
    expect(faelligeSchritte(sch, lauf({ a: ["2026-10-20"] }), "2026-10-20", tage)).toEqual([]);
    expect(faelligeSchritte(sch, lauf({ a: ["2026-10-20"] }), "2026-10-21", tage).map((x) => x.id)).toEqual(["a"]);
  });

});

// Baukasten (Nick 24.10.2026): Freigabe und Warten halten die folgenden Schritte an.
describe("faelligeSchritte mit Toren", () => {
  const warten = (id: string, dauer: number): Schritt => ({ id, art: "warten", dauer });
  it("Freigabe: dahinter nichts, bis freigegeben, dann ab dem Tag der Freigabe", () => {
    const sch = [s({ id: "f", ab: 0, art: "freigabe", an: "gf" }), s({ id: "b", ab: 0 })];
    expect(faelligeSchritte(sch, lauf(), "2026-10-20", tage).map((x) => x.id)).toEqual(["f"]);
    expect(faelligeSchritte(sch, lauf({ f: ["2026-10-20"] }), "2026-10-25", tage)).toEqual([]);
    const frei = { ...lauf({ f: ["2026-10-20"] }), freigaben: { f: "2026-10-23" } };
    expect(faelligeSchritte(sch, frei, "2026-10-22", tage)).toEqual([]);
    expect(faelligeSchritte(sch, frei, "2026-10-23", tage).map((x) => x.id)).toEqual(["b"]);
  });
  it("Warten: n Tage nach dem letzten Schritt davor, ohne Schritt davor ab dem Start des Laufs", () => {
    const sch = [s({ id: "a", ab: 0 }), warten("w", 5), s({ id: "b", ab: 0 })];
    expect(faelligeSchritte(sch, lauf(), "2026-10-20", tage).map((x) => x.id)).toEqual(["a"]);
    expect(faelligeSchritte(sch, lauf({ a: ["2026-10-20"] }), "2026-10-24", tage)).toEqual([]);
    expect(faelligeSchritte(sch, lauf({ a: ["2026-10-20"] }), "2026-10-25", tage).map((x) => x.id)).toEqual(["b"]);
    expect(faelligeSchritte([warten("w", 3), s({ id: "b", ab: -30 })], lauf(), "2026-10-04", tage).map((x) => x.id)).toEqual(["b"]);
  });
  it("Warten zählt erst, wenn alles davor einmal gelaufen ist; Schritte davor laufen unabhängig weiter", () => {
    const sch = [s({ id: "spaet", ab: 10 }), s({ id: "frueh", ab: 0 }), warten("w", 1), s({ id: "b", ab: 0 })];
    expect(faelligeSchritte(sch, lauf(), "2026-10-25", tage).map((x) => x.id)).toEqual(["frueh"]);
    expect(faelligeSchritte(sch, lauf({ frueh: ["2026-10-20"] }), "2026-10-29", tage)).toEqual([]);
  });
});
