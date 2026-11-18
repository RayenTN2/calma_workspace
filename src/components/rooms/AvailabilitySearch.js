"use client";

import { useState } from "react";

const PURPOSES = [
  { value: "", label: "Any purpose" },
  { value: "PERSONAL_REVISION", label: "Personal revision" },
  { value: "PERSONAL_TASK", label: "Personal task" },
  { value: "MEETING", label: "Meeting" },
  { value: "GROUP_TRAINING", label: "Group training" },
];

// À aligner avec les équipements enregistrés par le gérant (US-03).
const EQUIPMENT = ["Wifi", "Projecteur", "Tableau"];

const ROOM_TYPE_LABELS = {
  INDIVIDUAL: "Individual",
  MEETING: "Meeting",
  TRAINING: "Training",
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export default function AvailabilitySearch() {
  const [form, setForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    participants: "1",
    purpose: "",
    equipment: [],
  });
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleEquipment(name) {
    setForm((current) => ({
      ...current,
      equipment: current.equipment.includes(name)
        ? current.equipment.filter((item) => item !== name)
        : [...current.equipment, name],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setRooms(null);
    setLoading(true);

    const params = new URLSearchParams({
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      participants: form.participants,
    });

    if (form.purpose) {
      params.set("purpose", form.purpose);
    }

    form.equipment.forEach((name) => params.append("equipment", name));

    try {
      const response = await fetch(`/api/rooms/availability?${params}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong.");
        return;
      }

      setRooms(data.rooms);
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Find an available room
      </h1>

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Participants
          <input
            type="number"
            min="1"
            step="1"
            required
            value={form.participants}
            onChange={(e) => update("participants", e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Start time
          <input
            type="time"
            required
            value={form.startTime}
            onChange={(e) => update("startTime", e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          End time
          <input
            type="time"
            required
            value={form.endTime}
            onChange={(e) => update("endTime", e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Purpose
          <select
            value={form.purpose}
            onChange={(e) => update("purpose", e.target.value)}
            className={inputClass}
          >
            {PURPOSES.map((purpose) => (
              <option key={purpose.value} value={purpose.value}>
                {purpose.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-wrap gap-4 text-sm sm:col-span-2">
          <legend className="mb-1">Equipment</legend>
          {EQUIPMENT.map((name) => (
            <label key={name} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.equipment.includes(name)}
                onChange={() => toggleEquipment(name)}
              />
              {name}
            </label>
          ))}
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black sm:col-span-2"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-6 text-red-600">
          {error}
        </p>
      )}

      {rooms && rooms.length === 0 && (
        <p className="mt-6 text-zinc-600 dark:text-zinc-400">
          No room is available for these criteria.
        </p>
      )}

      {rooms && rooms.length > 0 && (
        <ul className="mt-6 grid gap-3">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{room.name}</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {ROOM_TYPE_LABELS[room.roomType] ?? room.roomType} · up to{" "}
                  {room.capacity}
                </span>
              </div>
              {room.equipment.length > 0 && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {room.equipment.join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
