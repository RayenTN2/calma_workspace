"use client";

import { useState } from "react";
import Link from "next/link";
import { Armchair, CalendarDays, CheckCircle2, Clock3, DoorOpen, LogIn, Monitor, Search, Users } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import styles from "./AvailabilitySearch.module.css";
import {
  BOOKING_MAX_DURATION_MINUTES,
  BOOKING_MIN_DURATION_MINUTES,
} from "@/features/reservations/config";
import {
  validateParticipants,
  validateDuration,
} from "@/features/reservations/validators/reservation.validator";
const PURPOSES = [
  { value: "", label: "Tous les usages" },
  { value: "PERSONAL_REVISION", label: "Révision personnelle" },
  { value: "PERSONAL_TASK", label: "Travail personnel" },
  { value: "MEETING", label: "Réunion" },
  { value: "GROUP_TRAINING", label: "Formation de groupe" },
];

// À aligner avec les équipements enregistrés par le gérant (US-03).
const EQUIPMENT = ["Wifi", "Projecteur", "Tableau"];

const ROOM_TYPE_LABELS = {
  INDIVIDUAL: "Bureau individuel",
  MEETING: "Salle de réunion",
  TRAINING: "Salle de formation",
  OTHER: "Autre",
};

const ERROR_MESSAGES = {
  "Date, start time, end time and participants are required.": "Veuillez renseigner la date, les horaires et le nombre de participants.",
  "Invalid date. Expected format: YYYY-MM-DD.": "La date saisie est invalide.",
  "Invalid time. Expected format: HH:mm.": "L’horaire saisi est invalide.",
  "Invalid date.": "La date saisie est invalide.",
  "End time must be after start time.": "L’heure de fin doit être postérieure à l’heure de début.",
  "Participants must be a positive whole number.": "Le nombre de participants doit être un entier supérieur à zéro.",
  "Invalid reservation purpose.": "L’usage sélectionné n’est pas reconnu.",
  "This room is already booked for the selected time slot.": "Cette salle est déjà réservée pour ce créneau horaire.",
  "You must log in first.": "Connectez-vous pour effectuer cette action.",
  "Internal server error.": "Une erreur est survenue lors de l'opération.",
};

function getDisplayError(message) {
  return ERROR_MESSAGES[message] || message || "L’opération n’a pas pu aboutir. Réessayez dans un instant.";
}

export default function AvailabilitySearch({ user }) {
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
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingRoomId, setBookingRoomId] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

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
    setSuccess("");
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
        setError(getDisplayError(data.message));
        return;
      }

      setRooms(data.rooms);
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.");
    } finally {
      setLoading(false);
    }
  }

    async function handleBookRoom(room) {
    setError("");
    setSuccess("");
    setFieldErrors({});

    // Validation côté client (S2-T14)
    const pCheck = validateParticipants(Number(form.participants), room.capacity);
    if (!pCheck.valid) {
      setFieldErrors({ participants: pCheck.message });
      return;
    }

    const start = new Date(`${form.date}T${form.startTime}:00`);
    const end = new Date(`${form.date}T${form.endTime}:00`);
    const dCheck = validateDuration(start, end);
    if (!dCheck.valid) {
      setFieldErrors({ timeSlot: dCheck.message });
      return;
    }

    setBookingRoomId(room.id);
    setSelectedRoom(room);

    const bookingPurpose =
      form.purpose ||
      (room.roomType === "MEETING"
        ? "MEETING"
        : room.roomType === "TRAINING"
        ? "GROUP_TRAINING"
        : "PERSONAL_REVISION");

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: room.id,
          purpose: bookingPurpose,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          participants: form.participants,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "CONFLICT" || response.status === 409) {
          setError("Ce créneau vient d’être réservé par quelqu’un d’autre. Choisissez un autre horaire.");
        } else if (data.error === "VALIDATION" || response.status === 400) {
          setError(getDisplayError(data.message));
        } else {
          setError(getDisplayError(data.message));
        }
        return;
      }

      const purposeLabel =
        PURPOSES.find((p) => p.value === bookingPurpose)?.label || bookingPurpose;
      setSuccess(
        `Salle « ${room.name} » réservée avec succès pour le ${form.date} de ${form.startTime} à ${form.endTime} (${purposeLabel}) ! Le créneau est bloqué.`
      );
      setRooms((current) => current.filter((r) => r.id !== room.id));
    } catch {
      setError("Impossibl de joindre le serveur pour réserver la salle.");
    } finally {
      setBookingRoomId(null);
    }
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/" aria-label="Calma Workspace, accueil">
          <span className={styles.brandMark}>c</span>
          <span>calma<span className={styles.brandLight}>workspace</span></span>
        </Link>
        <div className={styles.workspaceLabel}>ESPACE DE GESTION</div>
        <nav className={styles.nav} aria-label="Navigation principale">
          <Link className={`${styles.navLink} ${styles.navActive}`} href="/rooms" aria-current="page">
            <DoorOpen size={18} strokeWidth={1.8} />
            <span>Rechercher une salle</span>
          </Link>
          <Link className={styles.navLink} href="/reservations">
            <CalendarDays size={18} strokeWidth={1.8} />
            <span>Mes réservations</span>
          </Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.profileCard}>
            <span className={styles.avatar} aria-hidden="true">
              {[user?.firstName, user?.lastName].filter(Boolean).map((part) => part[0]).join("").toLocaleUpperCase("fr") || "C"}
            </span>
            <span className={styles.profileText}>
              <strong>{user?.role === "GERANT" ? "Gérant" : "Compte personnel"}</strong>
              <small>{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Visiteur"}</small>
            </span>
          </div>
          {user ? (
            <LogoutButton className={styles.logoutLink} />
          ) : (
            <Link href="/login?next=/rooms" className={styles.logoutLink}><LogIn size={16} /> Se connecter</Link>
          )}
        </div>
      </aside>

      <section className={styles.mainArea}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>Espace personnel <span>/</span> <strong>Recherche de salle</strong></div>
          <div className={styles.topbarRight}><span className={styles.onlineDot} /> Espaces disponibles</div>
        </header>

        <div className={styles.content}>
        <section className={styles.pageHeading}>
          <div>
            <p className={styles.eyebrow}>VOTRE ESPACE, AU BON MOMENT</p>
            <h1>Rechercher une salle</h1>
            <p className={styles.pageLead}>
              Trouvez un espace adapté à votre date, votre groupe et vos besoins.
            </p>
          </div>
          <div className={styles.headingIcon} aria-hidden="true">
            <Armchair size={28} strokeWidth={1.8} />
          </div>
        </section>

        <section className={styles.searchCard} aria-labelledby="criteria-title">
          <div className={styles.cardHeading}>
            <div>
              <span className={styles.sectionEyebrow}>DISPONIBILITÉS</span>
              <h2 id="criteria-title">Vos critères de recherche</h2>
              <p>Indiquez le créneau et les caractéristiques de la salle souhaitée.</p>
            </div>
            <span className={styles.cardIcon} aria-hidden="true">
              <Search size={19} />
            </span>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}><CalendarDays size={16} /> Date souhaitée</span>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  className={styles.control}
                />
              </label>

               <label className={styles.field}>
                <span className={styles.fieldLabel}><Users size={16} /> Participants</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.participants}
                  onChange={(e) => update("participants", e.target.value)}
                  className={styles.control}
                />
                {selectedRoom && (
                  <small className={styles.fieldHint}>
                    Capacité max : {selectedRoom.capacity} personnes
                  </small>
                )}
                {fieldErrors.participants && (
                  <small className={styles.fieldError}>{fieldErrors.participants}</small>
                )}
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}><Clock3 size={16} /> Heure de début</span>
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => update("startTime", e.target.value)}
                  className={styles.control}
                />
              </label>

                            <label className={styles.field}>
                <span className={styles.fieldLabel}><Clock3 size={16} /> Heure de fin</span>
                <input
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => update("endTime", e.target.value)}
                  className={styles.control}
                />
                <small className={styles.fieldHint}>
                  Durée max : {BOOKING_MAX_DURATION_MINUTES / 60} h
                  {" · "}
                  Durée min : {BOOKING_MIN_DURATION_MINUTES} min
                </small>
                {fieldErrors.timeSlot && (
                  <small className={styles.fieldError}>{fieldErrors.timeSlot}</small>
                )}
              </label>

              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Usage de la salle</span>
                <select
                  value={form.purpose}
                  onChange={(e) => update("purpose", e.target.value)}
                  className={styles.control}
                >
                  {PURPOSES.map((purpose) => (
                    <option key={purpose.value} value={purpose.value}>
                      {purpose.label}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className={`${styles.equipmentFieldset} ${styles.fieldFull}`}>
                <legend><Monitor size={16} /> Équipements souhaités</legend>
                <div className={styles.equipmentOptions}>
                  {EQUIPMENT.map((name) => (
                    <label key={name} className={styles.equipmentOption}>
                      <input
                        type="checkbox"
                        checked={form.equipment.includes(name)}
                        onChange={() => toggleEquipment(name)}
                      />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className={styles.formActions}>
              <p>Les résultats tiennent compte de la capacité et des réservations.</p>
              <button type="submit" disabled={loading} className={styles.submitButton}>
                <Search size={17} />
                {loading ? "Recherche en cours…" : "Rechercher les salles"}
              </button>
            </div>
          </form>
        </section>

        {error && <p role="alert" className={styles.errorMessage}>{error}</p>}
        {success && (
          <p role="status" className={styles.bookingSuccess}>
            <CheckCircle2 size={18} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 8 }} />
            {success}
          </p>
        )}

        {rooms && (
          <section className={styles.resultsCard} aria-live="polite" aria-labelledby="results-title">
            <div className={styles.resultsHeading}>
              <div>
                <span className={styles.sectionEyebrow}>RÉSULTATS</span>
                <h2 id="results-title">Salles disponibles</h2>
              </div>
              <span className={styles.resultCount}>
                {rooms.length} {rooms.length > 1 ? "résultats" : "résultat"}
              </span>
            </div>

            {rooms.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon} aria-hidden="true"><Armchair size={22} /></span>
                <p>Aucune salle ne correspond à ces critères.</p>
                <span>Essayez un autre créneau ou réduisez le nombre de participants.</span>
              </div>
            ) : (
              <ul className={styles.roomList}>
                {rooms.map((room) => (
                  <li key={room.id} className={styles.roomCard}>
                    <span className={styles.roomIcon} aria-hidden="true"><Armchair size={22} /></span>
                    <div className={styles.roomInfo}>
                      <h3>{room.name}</h3>
                      <p>{ROOM_TYPE_LABELS[room.roomType] ?? "Salle"}</p>
                      {room.equipment.length > 0 && (
                        <div className={styles.roomEquipment}>
                          {room.equipment.map((item) => <span key={item}>{item}</span>)}
                        </div>
                      )}
                    </div>
                    <span className={styles.capacityBadge}>
                      <Users size={15} /> Jusqu’à {room.capacity} places
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBookRoom(room)}
                      disabled={bookingRoomId === room.id}
                      className={styles.bookButton}
                    >
                      {bookingRoomId === room.id ? "Réservation…" : "Réserver"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        </div>
      </section>
    </main>
  );
}
