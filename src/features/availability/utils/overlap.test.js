import { hasOverlap } from "./overlap";

const at = (time) => new Date(`2026-11-20T${time}:00.000Z`);
const range = (start, end) => ({ start: at(start), end: at(end) });

describe("hasOverlap, sans temps de battement", () => {
  const existing = range("10:00", "11:00");

  test("chevauchement partiel au début", () => {
    expect(hasOverlap(existing, range("09:30", "10:30"))).toBe(true);
  });

  test("chevauchement partiel à la fin", () => {
    expect(hasOverlap(existing, range("10:30", "11:30"))).toBe(true);
  });

  test("créneau demandé contenu dans l'existant", () => {
    expect(hasOverlap(existing, range("10:15", "10:45"))).toBe(true);
  });

  test("créneau demandé qui englobe l'existant", () => {
    expect(hasOverlap(existing, range("09:00", "12:00"))).toBe(true);
  });

  test("créneau identique", () => {
    expect(hasOverlap(existing, range("10:00", "11:00"))).toBe(true);
  });

  test("créneau qui commence exactement à la fin de l'existant : pas de conflit", () => {
    expect(hasOverlap(existing, range("11:00", "12:00"))).toBe(false);
  });

  test("créneau qui finit exactement au début de l'existant : pas de conflit", () => {
    expect(hasOverlap(existing, range("09:00", "10:00"))).toBe(false);
  });

  test("créneaux séparés", () => {
    expect(hasOverlap(existing, range("14:00", "15:00"))).toBe(false);
  });
});

describe("hasOverlap, avec temps de battement de 15 minutes", () => {
  const existing = range("10:00", "11:00");

  test("10 minutes après la fin : conflit", () => {
    expect(hasOverlap(existing, range("11:10", "12:00"), 15)).toBe(true);
  });

  test("exactement 15 minutes après la fin : accepté", () => {
    expect(hasOverlap(existing, range("11:15", "12:00"), 15)).toBe(false);
  });

  test("20 minutes après la fin : accepté", () => {
    expect(hasOverlap(existing, range("11:20", "12:00"), 15)).toBe(false);
  });

  test("le battement s'applique aussi avant l'existant", () => {
    expect(hasOverlap(existing, range("08:00", "09:50"), 15)).toBe(true);
    expect(hasOverlap(existing, range("08:00", "09:45"), 15)).toBe(false);
  });
});

describe("hasOverlap, saisies invalides", () => {
  const valid = range("10:00", "11:00");

  test("fin avant le début", () => {
    expect(() => hasOverlap(valid, range("12:00", "11:00"))).toThrow();
  });

  test("fin égale au début", () => {
    expect(() => hasOverlap(valid, range("11:00", "11:00"))).toThrow();
  });

  test("date invalide", () => {
    expect(() =>
      hasOverlap(valid, { start: "pas une date", end: at("12:00") })
    ).toThrow();
  });

  test("temps de battement négatif", () => {
    expect(() => hasOverlap(valid, range("12:00", "13:00"), -5)).toThrow();
  });
});
