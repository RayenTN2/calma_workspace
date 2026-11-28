/** @jest-environment node */

import {
  resolveTypology,
  calculateDuration,
  calculateReservationCost,
  formatAmount,
  enrichReservationWithCost,
} from "./pricing.service";
import {
  ROOM_TYPOLOGY,
  PRICING_MODES,
  PRICING_RATES,
} from "../pricing.config";

describe("Pricing Service (US-08)", () => {
  describe("resolveTypology", () => {
    test("identifies INDIVIDUAL room type", () => {
      expect(resolveTypology({ roomType: "INDIVIDUAL" })).toBe(ROOM_TYPOLOGY.INDIVIDUAL);
      expect(resolveTypology({ room: { roomType: "INDIVIDUAL" } })).toBe(ROOM_TYPOLOGY.INDIVIDUAL);
    });

    test("identifies GROUP room types (MEETING, TRAINING, OTHER)", () => {
      expect(resolveTypology({ roomType: "MEETING" })).toBe(ROOM_TYPOLOGY.GROUP);
      expect(resolveTypology({ roomType: "TRAINING" })).toBe(ROOM_TYPOLOGY.GROUP);
      expect(resolveTypology({ room: { roomType: "MEETING" } })).toBe(ROOM_TYPOLOGY.GROUP);
    });

    test("resolves typology based on reservation purpose when roomType is missing", () => {
      expect(resolveTypology({ purpose: "PERSONAL_REVISION" })).toBe(ROOM_TYPOLOGY.INDIVIDUAL);
      expect(resolveTypology({ purpose: "PERSONAL_TASK" })).toBe(ROOM_TYPOLOGY.INDIVIDUAL);
      expect(resolveTypology({ purpose: "MEETING" })).toBe(ROOM_TYPOLOGY.GROUP);
      expect(resolveTypology({ purpose: "GROUP_TRAINING" })).toBe(ROOM_TYPOLOGY.GROUP);
    });

    test("resolves typology based on participants or capacity", () => {
      expect(resolveTypology({ participants: 1 })).toBe(ROOM_TYPOLOGY.INDIVIDUAL);
      expect(resolveTypology({ participants: 4 })).toBe(ROOM_TYPOLOGY.GROUP);
      expect(resolveTypology({ room: { capacity: 1 } })).toBe(ROOM_TYPOLOGY.INDIVIDUAL);
      expect(resolveTypology({ room: { capacity: 6 } })).toBe(ROOM_TYPOLOGY.GROUP);
    });
  });

  describe("calculateDuration", () => {
    test("calculates exact hours and minutes", () => {
      const start = new Date("2026-11-25T10:00:00Z");
      const end = new Date("2026-11-25T12:00:00Z");
      const result = calculateDuration(start, end);

      expect(result.durationMinutes).toBe(120);
      expect(result.durationHours).toBe(2);
    });

    test("handles fractional hours (e.g. 90 minutes = 1.5 hours)", () => {
      const start = new Date("2026-11-25T10:00:00Z");
      const end = new Date("2026-11-25T11:30:00Z");
      const result = calculateDuration(start, end);

      expect(result.durationMinutes).toBe(90);
      expect(result.durationHours).toBe(1.5);
    });

    test("throws an error if end is before or equal to start", () => {
      const start = new Date("2026-11-25T10:00:00Z");
      const end = new Date("2026-11-25T10:00:00Z");

      expect(() => calculateDuration(start, end)).toThrow(
        "L'heure de fin doit être postérieure à l'heure de début."
      );
    });

    test("throws an error if dates are invalid", () => {
      expect(() => calculateDuration("invalid", "invalid")).toThrow(
        "Dates invalides pour le calcul de la durée."
      );
    });
  });

  describe("calculateReservationCost", () => {
    const start = new Date("2026-11-25T10:00:00Z");
    const end2h = new Date("2026-11-25T12:00:00Z");
    const end1h30 = new Date("2026-11-25T11:30:00Z");
    const end6h = new Date("2026-11-25T16:00:00Z");

    test("calculates hourly cost for an individual room (2h * 10 DT = 20 DT)", () => {
      const cost = calculateReservationCost({
        roomType: "INDIVIDUAL",
        startAt: start,
        endAt: end2h,
      });

      expect(cost.typology).toBe(ROOM_TYPOLOGY.INDIVIDUAL);
      expect(cost.rateType).toBe(PRICING_MODES.HOURLY);
      expect(cost.hourlyRate).toBe(PRICING_RATES.INDIVIDUAL.hourlyRate);
      expect(cost.durationHours).toBe(2);
      expect(cost.amount).toBe(20.0);
      expect(cost.formattedAmount).toBe("20.00 DT");
    });

    test("calculates hourly cost for a group room (2h * 25 DT = 50 DT)", () => {
      const cost = calculateReservationCost({
        roomType: "MEETING",
        startAt: start,
        endAt: end2h,
      });

      expect(cost.typology).toBe(ROOM_TYPOLOGY.GROUP);
      expect(cost.rateType).toBe(PRICING_MODES.HOURLY);
      expect(cost.hourlyRate).toBe(PRICING_RATES.GROUP.hourlyRate);
      expect(cost.durationHours).toBe(2);
      expect(cost.amount).toBe(50.0);
      expect(cost.formattedAmount).toBe("50.00 DT");
    });

    test("calculates proportional cost for partial hours (1.5h * 10 DT = 15 DT)", () => {
      const cost = calculateReservationCost({
        roomType: "INDIVIDUAL",
        startAt: start,
        endAt: end1h30,
      });

      expect(cost.durationHours).toBe(1.5);
      expect(cost.amount).toBe(15.0);
      expect(cost.formattedAmount).toBe("15.00 DT");
    });

    test("applies daily rate when explicitly requested (pricingMode = DAILY)", () => {
      const cost = calculateReservationCost({
        roomType: "INDIVIDUAL",
        startAt: start,
        endAt: end2h,
        pricingMode: PRICING_MODES.DAILY,
      });

      expect(cost.rateType).toBe(PRICING_MODES.DAILY);
      expect(cost.amount).toBe(PRICING_RATES.INDIVIDUAL.dailyRate);
      expect(cost.formattedAmount).toBe("50.00 DT");
      expect(cost.unit).toBe("jour");
    });

    test("automatically applies daily rate cap in AUTO mode when duration exceeds threshold (6h)", () => {
      const cost = calculateReservationCost({
        roomType: "INDIVIDUAL",
        startAt: start,
        endAt: end6h, // 6h would be 60 DT hourly, but daily cap is 50 DT
      });

      expect(cost.rateType).toBe(PRICING_MODES.DAILY);
      expect(cost.amount).toBe(PRICING_RATES.INDIVIDUAL.dailyRate);
      expect(cost.formattedAmount).toBe("50.00 DT");
    });

    test("supports custom rates provided on room", () => {
      const room = {
        name: "Studio Premium",
        roomType: "INDIVIDUAL",
        hourlyRate: 15,
        dailyRate: 75,
      };

      const cost = calculateReservationCost({
        room,
        startAt: start,
        endAt: end2h,
      });

      expect(cost.hourlyRate).toBe(15);
      expect(cost.amount).toBe(30.0);
      expect(cost.formattedAmount).toBe("30.00 DT");
    });
  });

  describe("formatAmount", () => {
    test("formats numbers with 2 decimals and currency", () => {
      expect(formatAmount(25)).toBe("25.00 DT");
      expect(formatAmount(14.5)).toBe("14.50 DT");
      expect(formatAmount(10, "TND")).toBe("10.00 TND");
    });
  });

  describe("enrichReservationWithCost", () => {
    test("enriches a reservation object with computed cost and formatted amount", () => {
      const reservation = {
        id: "res-123",
        startAt: new Date("2026-11-25T10:00:00Z"),
        endAt: new Date("2026-11-25T12:00:00Z"),
        room: { roomType: "MEETING", capacity: 8 },
        purpose: "MEETING",
        participants: 5,
      };

      const enriched = enrichReservationWithCost(reservation);

      expect(enriched.totalAmount).toBe(50.0);
      expect(enriched.formattedTotalAmount).toBe("50.00 DT");
      expect(enriched.cost).toBeDefined();
      expect(enriched.cost.amount).toBe(50.0);
      expect(enriched.cost.rateType).toBe("HOURLY");
    });
  });
});
