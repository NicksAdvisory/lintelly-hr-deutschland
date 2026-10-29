/**
 * Übergangsbereich (lib/regeln/midijob.ts). Prüfwerte: Beispieltabelle 2026 der Deutschen Rentenversicherung (summa summarum, Lexikon
 * "Übergangsbereich", gelesen am 29.10.2026, deutsche-rentenversicherung.de) und eine Rechnung von Hand für den Arbeitgeberanteil.
 */
import { describe, expect, it } from "vitest";
import { midijob } from "@/lib/regeln/midijob";
import { FAKTOR_F } from "@/lib/regeln/werte";
import { REGISTER, wertAm } from "@/lib/regeln/register";

const ok = (ae: number, datum = "2026-06-01") => {
  const r = midijob(ae, datum);
  if (!r.berechnet) throw new Error(r.grund);
  return r;
};

describe("Midijob: beitragspflichtige Einnahmen wie in der DRV-Tabelle 2026", () => {
  // Arbeitsentgelt, BE Gesamtbeitrag, BE Arbeitnehmeranteil (DRV, Faktor F 0,6619, Grenze 603 €).
  it.each([
    [603.01, 399.14, 0.01], [700, 510.28, 138.87], [800, 624.88, 282.03], [1000, 854.06, 568.36], [1200, 1083.25, 854.69],
    [1400, 1312.44, 1141.02], [1600, 1541.63, 1427.34], [1800, 1770.81, 1713.67], [2000, 2000, 2000],
  ])("%s €: %s € gesamt, %s € Person", (ae, be, beAn) => {
    const r = ok(ae);
    expect(r.beGesamt).toBe(be);
    expect(r.beArbeitnehmer).toBe(beAn);
  });
});

describe("Midijob: Beiträge und Arbeitgeberanteil", () => {
  it("1.000 € im Juni 2026: je Zweig gesamt, Person, Arbeitgeber (von Hand nachgerechnet)", () => {
    const r = ok(1000);
    expect(r.faktorF).toBe(0.6619);
    // RV 18,6 %: 854,06 × 0,186 = 158,86; 568,36 × 0,093 = 52,86. AV 2,6 %: 22,21 und 7,39. KV/PV 21,1 %: 180,21 und 59,96.
    expect(r.zweige.map((z) => [z.gesamt, z.arbeitnehmer, z.arbeitgeber])).toEqual([[158.86, 52.86, 106], [22.21, 7.39, 14.82], [180.21, 59.96, 120.25]]);
    expect([r.gesamt, r.arbeitnehmer, r.arbeitgeber]).toEqual([361.28, 120.21, 241.07]);
    expect(r.rechenweg[0]).toMatch(/0,6619/);
    expect(r.quelle).toMatch(/BAnz AT 18\.12\.2025 B5/);
  });

  it("knapp über der Minijob-Grenze trägt der Arbeitgeber fast alles, an der Obergrenze die Hälfte", () => {
    const unten = ok(603.01);
    expect(unten.arbeitnehmer).toBe(0);
    expect(unten.arbeitgeber).toBeGreaterThan(unten.gesamt - 0.01);
    const oben = ok(2000);
    expect(oben.arbeitnehmer).toBeCloseTo(oben.gesamt / 2, 1);
  });

  it("außerhalb des Übergangsbereichs nicht berechnet", () => {
    expect(midijob(603, "2026-06-01").berechnet).toBe(false);
    expect(midijob(2000.01, "2026-06-01").berechnet).toBe(false);
  });

  it("2027: Faktor F noch nicht bekannt gegeben, nicht berechnet statt geschätzt", () => {
    const r = midijob(1000, "2027-01-15");
    expect(r.berechnet).toBe(false);
    if (!r.berechnet) expect(r.grund).toMatch(/Bundesanzeiger/);
  });

  it("Register: Faktor F mit amtlicher Fundstelle, 2027 als ausstehend", () => {
    const e = REGISTER.find((x) => x.id === "faktorF")!;
    expect(wertAm(e, "2026-12-31")?.wert).toBe("0,6619");
    expect(wertAm(e, "2027-01-01")).toBeNull();
    expect(e.werte.some((w) => w.ausstehend && w.gueltigAb === "2027-01-01")).toBe(true);
    expect(e.geprueftAm).toBe("2026-10-29");
    expect(e.status).toBe("bestätigt");
    expect(FAKTOR_F.map((w) => w.gueltigAb)).toEqual(["2026-01-01"]);
  });
});
