/** Allgemeine Regeln (Katalog 8.1 und 8.8): roter und grüner Fall je Regel. */
import { describe, expect, it } from "vitest";
import { schlaegt } from "./hilfe";
import { pruefeVertrag } from "@/lib/vertragsbausteine/pruefen";
import { lage } from "./hilfe";

describe("Form und Freigabe", () => {
  it("P-001 Schriftform", () => { expect(schlaegt({ M2: {} }, "P-001")).toBe(true); expect(schlaegt({ D1: {} }, "P-001")).toBe(false); });
  it("P-002 gelber Baustein ohne Freigabe, mit Freigabe still", () => {
    expect(schlaegt({ D5: {} }, "P-002")).toBe(true);
    expect(schlaegt({ D5: {} }, "P-002", { freigaben: { "D5@1+en": "2026-10-12" } })).toBe(false);
  });
  it("P-003 Freitext ungeprüft", () => { expect(schlaegt({ D1: { ergaenzung: "Sonderregel" } }, "P-003")).toBe(true); expect(schlaegt({ D1: {} }, "P-003")).toBe(false); });
  it("P-004 Schriftform für Erklärungen der Person", () => {
    expect(schlaegt({ G1: { ergaenzung: "Nebentätigkeiten sind schriftlich anzuzeigen." } }, "P-004")).toBe(true);
    expect(schlaegt({ G1: { ergaenzung: "Nebentätigkeiten sind in Textform anzuzeigen." } }, "P-004")).toBe(false);
  });
  it("P-005 Tatsachenbestätigung im Text", () => {
    expect(schlaegt({ D1: { ergaenzung: "Die Person bestätigt, die Richtlinien erhalten zu haben." } }, "P-005")).toBe(true);
    expect(schlaegt({ D1: { ergaenzung: "Richtlinien im Intranet." } }, "P-005")).toBe(false);
  });
  it("P-006 Betriebsrat ohne Q3", () => {
    expect(schlaegt({ D1: {} }, "P-006", { firma: { betriebsrat: true, mitarbeiter: 30 } })).toBe(true);
    expect(schlaegt({ D1: {}, Q3: {} }, "P-006", { firma: { betriebsrat: true, mitarbeiter: 30 } })).toBe(false);
  });
  it("P-104 Betriebsrat ohne Betriebsvereinbarung sperrt B3, J6, I3", () => {
    expect(schlaegt({ B3: {} }, "P-104", { firma: { betriebsrat: true, mitarbeiter: 30, ohneBv: ["B3"] } })).toBe(true);
    expect(schlaegt({ B3: {} }, "P-104", { firma: { betriebsrat: true, mitarbeiter: 30, ohneBv: [] } })).toBe(false);
  });
  it("P-008 Mitbestimmung", () => {
    expect(schlaegt({ C3: {} }, "P-008", { firma: { betriebsrat: true, mitarbeiter: 30 } })).toBe(true);
    expect(schlaegt({ C3: {} }, "P-008")).toBe(false);
  });
  it("P-009 widersprüchliche Zahlen", () => {
    expect(schlaegt({ D5: { abrechnungMonate: "1" }, D13: { abrechnungMonate: "3" } }, "P-009")).toBe(true);
    expect(schlaegt({ D5: { abrechnungMonate: "1" }, D13: { abrechnungMonate: "1" } }, "P-009")).toBe(false);
  });
});

describe("Person und Teilzeit", () => {
  it("P-100 Jugendliche", () => {
    expect(schlaegt({ C2: { stunden: "5" } }, "P-100", { person: { geburtstag: "2010-01-01" } })).toBe(true);
    expect(schlaegt({ C2: { stunden: "5" } }, "P-100")).toBe(false);
  });
  it("P-102 Teilzeit nicht anteilig ohne Grund", () => {
    expect(schlaegt({ D16: { teilzeit: "nicht anteilig" } }, "P-102")).toBe(true);
    expect(schlaegt({ D16: { teilzeit: "nicht anteilig", teilzeitGrund: "Prämie je Kopf für Teilnahme am Projekt" } }, "P-102")).toBe(false);
  });
  it("K-38 Ausschlussfrist und Beanstandungsfrist mit Verfall", () => {
    expect(schlaegt({ Q1: {}, D13: { verfall: "ja" } }, "K-38")).toBe(true);
    expect(schlaegt({ Q1: {}, D13: { verfall: "nein" } }, "K-38")).toBe(false);
  });
});

describe("Prüfung im Ganzen", () => {
  it("Baustein für die Vertragsart gesperrt (Ausbildung, § 12 BBiG)", () => {
    const r = pruefeVertrag(lage({ M2: {} }, { art: "ausbildung" }));
    expect(r.befunde.some((b) => b.regel === "ART")).toBe(true);
    expect(r.gesperrt).toBe(true);
  });
  it("unbekannter Baustein ist gesperrt", () => expect(pruefeVertrag(lage({ X9: {} })).gesperrt).toBe(true));
});
