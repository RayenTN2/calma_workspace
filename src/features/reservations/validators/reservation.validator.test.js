/** @jest-environment node */

const {
  validateCreateReservation,
} = require("./reservation.validator");

describe("validateCreateReservation", () => {
  const validUUID = "11111111-1111-4111-8111-111111111111";

  test("validates with date, startTime, and endTime", () => {
    const { error, value } = validateCreateReservation({
      roomId: validUUID,
      purpose: "PERSONAL_REVISION",
      participants: 2,
      date: "2026-11-25",
      startTime: "14:00",
      endTime: "16:00",
    });

    expect(error).toBeNull();
    expect(value).toMatchObject({
      roomId: validUUID,
      purpose: "PERSONAL_REVISION",
      participants: 2,
    });
    expect(value.startAt).toBeInstanceOf(Date);
    expect(value.endAt).toBeInstanceOf(Date);
    expect(value.endAt.getTime()).toBeGreaterThan(value.startAt.getTime());
  });

  test("validates with startAt and endAt ISO strings", () => {
    const startAt = "2026-11-25T14:00:00.000Z";
    const endAt = "2026-11-25T16:00:00.000Z";

    const { error, value } = validateCreateReservation({
      roomId: validUUID,
      purpose: "MEETING",
      participants: "4",
      startAt,
      endAt,
    });

    expect(error).toBeNull();
    expect(value.participants).toBe(4);
    expect(value.purpose).toBe("MEETING");
    expect(value.startAt.toISOString()).toBe(startAt);
    expect(value.endAt.toISOString()).toBe(endAt);
  });

  test("rejects non-object payload", () => {
    expect(validateCreateReservation(null).error).toBe(
      "Reservation payload must be an object."
    );
    expect(validateCreateReservation("not an object").error).toBe(
      "Reservation payload must be an object."
    );
    expect(validateCreateReservation([]).error).toBe(
      "Reservation payload must be an object."
    );
  });

  test("rejects invalid room ID", () => {
    expect(
      validateCreateReservation({
        roomId: "not-a-uuid",
        purpose: "MEETING",
        participants: 2,
        date: "2026-11-25",
        startTime: "14:00",
        endTime: "15:00",
      }).error
    ).toBe("A valid room ID (UUID) is required.");
  });

  test("rejects invalid purpose", () => {
    expect(
      validateCreateReservation({
        roomId: validUUID,
        purpose: "PARTY",
        participants: 2,
        date: "2026-11-25",
        startTime: "14:00",
        endTime: "15:00",
      }).error
    ).toMatch(/Invalid reservation purpose/);
  });

  test.each([0, -1, "abc", null, undefined])(
    "rejects invalid participants: %s",
    (participants) => {
      expect(
        validateCreateReservation({
          roomId: validUUID,
          purpose: "MEETING",
          participants,
          date: "2026-11-25",
          startTime: "14:00",
          endTime: "15:00",
        }).error
      ).toBe("Participants must be a positive whole number.");
    }
  );

  test("rejects end time before or equal to start time", () => {
    expect(
      validateCreateReservation({
        roomId: validUUID,
        purpose: "MEETING",
        participants: 2,
        date: "2026-11-25",
        startTime: "15:00",
        endTime: "14:00",
      }).error
    ).toBe("End time must be after start time.");

    expect(
      validateCreateReservation({
        roomId: validUUID,
        purpose: "MEETING",
        participants: 2,
        date: "2026-11-25",
        startTime: "15:00",
        endTime: "15:00",
      }).error
    ).toBe("End time must be after start time.");
  });

  test("rejects invalid date (e.g. Feb 30)", () => {
    expect(
      validateCreateReservation({
        roomId: validUUID,
        purpose: "MEETING",
        participants: 2,
        date: "2026-02-30",
        startTime: "14:00",
        endTime: "15:00",
      }).error
    ).toBe("Invalid date. Expected format: YYYY-MM-DD.");
  });

  test("rejects missing time slot", () => {
    expect(
      validateCreateReservation({
        roomId: validUUID,
        purpose: "MEETING",
        participants: 2,
      }).error
    ).toBe(
      "Time slot is required: provide either (date, startTime, endTime) or (startAt, endAt)."
    );
  });
});
