import { validateAvailabilityQuery } from "./availability.validator";

const valid = {
  date: "2026-11-20",
  startTime: "10:00",
  endTime: "12:00",
  participants: "4",
};

describe("validateAvailabilityQuery, saisies valides", () => {
  test("accepte les paramètres obligatoires", () => {
    const { error, value } = validateAvailabilityQuery(valid);

    expect(error).toBeNull();
    expect(value.participants).toBe(4);
    expect(value.purpose).toBeNull();
    expect(value.equipment).toEqual([]);
    expect(value.end.getTime() - value.start.getTime()).toBe(2 * 3600 * 1000);
  });

  test("interprète les heures dans le fuseau du centre (UTC+1)", () => {
    const { value } = validateAvailabilityQuery(valid);

    expect(value.start.toISOString()).toBe("2026-11-20T09:00:00.000Z");
  });

  test("accepte chaque objet de réservation", () => {
    for (const purpose of [
      "PERSONAL_REVISION",
      "PERSONAL_TASK",
      "MEETING",
      "GROUP_TRAINING",
    ]) {
      expect(validateAvailabilityQuery({ ...valid, purpose }).error).toBeNull();
    }
  });

  test("accepte des équipements sous forme de liste ou de texte séparé par des virgules", () => {
    expect(
      validateAvailabilityQuery({ ...valid, equipment: ["Wifi", "Projecteur"] })
        .value.equipment
    ).toEqual(["Wifi", "Projecteur"]);

    expect(
      validateAvailabilityQuery({ ...valid, equipment: "Wifi, Tableau" }).value
        .equipment
    ).toEqual(["Wifi", "Tableau"]);
  });

  test("accepte un seul participant", () => {
    expect(
      validateAvailabilityQuery({ ...valid, participants: "1" }).error
    ).toBeNull();
  });
});

describe("validateAvailabilityQuery, saisies invalides", () => {
  test.each(["date", "startTime", "endTime", "participants"])(
    "rejette si %s est manquant",
    (field) => {
      const query = { ...valid };
      delete query[field];

      expect(validateAvailabilityQuery(query).error).not.toBeNull();
    }
  );

  test("rejette une requête vide ou absente", () => {
    expect(validateAvailabilityQuery({}).error).not.toBeNull();
    expect(validateAvailabilityQuery(undefined).error).not.toBeNull();
  });

  test("rejette une heure de fin antérieure au début", () => {
    const { error } = validateAvailabilityQuery({
      ...valid,
      startTime: "12:00",
      endTime: "10:00",
    });

    expect(error).toMatch(/after start/i);
  });

  test("rejette une heure de fin égale au début", () => {
    expect(
      validateAvailabilityQuery({ ...valid, endTime: "10:00" }).error
    ).not.toBeNull();
  });

  test.each(["0", "-2", "1.5", "abc", ""])(
    "rejette un nombre de participants invalide (%p)",
    (participants) => {
      expect(
        validateAvailabilityQuery({ ...valid, participants }).error
      ).not.toBeNull();
    }
  );

  test.each(["20-11-2026", "2026-13-01", "2026-02-30", "demain"])(
    "rejette une date invalide (%p)",
    (date) => {
      expect(validateAvailabilityQuery({ ...valid, date }).error).not.toBeNull();
    }
  );

  test.each(["25:00", "10:60", "9:00", "10h"])(
    "rejette une heure invalide (%p)",
    (startTime) => {
      expect(
        validateAvailabilityQuery({ ...valid, startTime }).error
      ).not.toBeNull();
    }
  );

  test("rejette un objet de réservation inconnu", () => {
    expect(
      validateAvailabilityQuery({ ...valid, purpose: "PARTY" }).error
    ).not.toBeNull();
  });
});
