"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Armchair,
  CalendarDays,
  Clock,
  DoorOpen,
  LogIn,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import Brand from "@/components/Brand";
import styles from "./UserReservations.module.css";

const PURPOSE_LABELS = {
  PERSONAL_REVISION: "Révision personnelle",
  PERSONAL_TASK: "Travail personnel",
  MEETING: "Réunion",
  GROUP_TRAINING: "Formation de groupe",
};

const STATUS_CONFIG = {
  PENDING_PAYMENT: {
    label: "En attente de paiement",
    className: styles.statusPending,
  },
  CONFIRMED: {
    label: "Confirmée",
    className: styles.statusConfirmed,
  },
  CANCELLED: {
    label: "Annulée",
    className: styles.statusCancelled,
  },
};

export default function UserReservations({ user }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/reservations");
        const data = await response.json();
        if (response.ok) {
          setReservations(data.reservations || []);
        } else {
          setError(data.message === "Internal server error." ? "Une erreur est survenue lors de l’opération." : data.message || "Impossible de charger les réservations.");
        }
      } catch {
        setError("Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handleCancel(id) {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette réservation ? Le créneau sera immédiatement libéré.")) {
      return;
    }

    setCancellingId(id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message === "Internal server error." ? "Une erreur est survenue lors de l’opération." : data.message || "Impossible d’annuler la réservation.");
        return;
      }

      setNotice("Réservation annulée avec succès. Le créneau a été libéré.");
      setReservations((current) =>
        current.map((res) =>
          res.id === id ? { ...res, status: "CANCELLED" } : res
        )
      );
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.");
    } finally {
      setCancellingId(null);
    }
  }

  function formatSlot(startAt, endAt) {
    const start = new Date(startAt);
    const end = new Date(endAt);

    const dateStr = start.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Tunis",
    });

    const startStr = start.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Tunis",
    });

    const endStr = end.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Tunis",
    });

    return { dateStr, timeStr: `${startStr} - ${endStr}` };
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Brand />
        <div className={styles.workspaceLabel}>ESPACE DE GESTION</div>
        <nav className={styles.nav} aria-label="Navigation principale">
          <Link className={styles.navLink} href="/rooms">
            <DoorOpen size={18} strokeWidth={1.8} />
            <span>Rechercher une salle</span>
          </Link>
          <Link className={`${styles.navLink} ${styles.navActive}`} href="/reservations" aria-current="page">
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
            <Link href="/login?next=/reservations" className={styles.logoutLink}><LogIn size={16} /> Se connecter</Link>
          )}
        </div>
      </aside>

      <section className={styles.mainArea}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>Espace personnel <span>/</span> <strong>Mes réservations</strong></div>
        </header>

        <div className={styles.content}>
          <section className={styles.pageHeading}>
            <div>
              <p className={styles.eyebrow}>VOS ACTIVITÉS PROGRAMMÉES</p>
              <h1>Mes réservations</h1>
              <p className={styles.pageLead}>
                Consultez vos créneaux bloqués et gérez vos réservations de salles.
              </p>
            </div>
            <div className={styles.headingIcon} aria-hidden="true">
              <CalendarDays size={26} strokeWidth={1.8} />
            </div>
          </section>

          {notice && (
            <p role="status" className={styles.alertSuccess}>
              <CheckCircle2 size={18} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 8 }} />
              {notice}
            </p>
          )}

          {error && (
            <p role="alert" className={styles.alertError}>
              <AlertCircle size={18} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 8 }} />
              {error}
            </p>
          )}

          <section className={styles.card} aria-labelledby="reservations-title">
            <div className={styles.cardHeader}>
              <h2 id="reservations-title">Historique & créneaux réservés</h2>
              <span className={styles.countBadge}>
                {reservations.length} {reservations.length > 1 ? "réservations" : "réservation"}
              </span>
            </div>

            {loading ? (
              <div className={styles.emptyState}>
                <p>Chargement de vos réservations…</p>
              </div>
            ) : reservations.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon} aria-hidden="true">
                  <Armchair size={24} />
                </span>
                <p>Vous n’avez aucune réservation pour le moment.</p>
                <span>Trouvez une salle disponible et bloquez votre premier créneau.</span>
                <Link href="/rooms" className={styles.searchLink}>
                  <Search size={16} />
                  Rechercher une salle
                </Link>
              </div>
            ) : (
              <ul className={styles.reservationList}>
                {reservations.map((res) => {
                  const { dateStr, timeStr } = formatSlot(res.startAt, res.endAt);
                  const statusInfo = STATUS_CONFIG[res.status] || {
                    label: res.status,
                    className: "",
                  };

                  return (
                    <li key={res.id} className={styles.reservationItem}>
                      <div className={styles.itemLeft}>
                        <div className={styles.itemIcon} aria-hidden="true">
                          <Armchair size={22} />
                        </div>
                        <div className={styles.itemDetails}>
                          <h3>{res.room?.name || "Salle"}</h3>
                          <div className={styles.itemMeta}>
                            <span className={styles.metaItem}>
                              <strong>{PURPOSE_LABELS[res.purpose] || res.purpose}</strong>
                            </span>
                            <span>•</span>
                            <span className={styles.metaItem}>
                              <CalendarDays size={14} />
                              {dateStr}
                            </span>
                            <span>•</span>
                            <span className={styles.metaItem}>
                              <Clock size={14} />
                              {timeStr}
                            </span>
                            <span>•</span>
                            <span className={styles.metaItem}>
                              <Users size={14} />
                              {res.participants} pers.
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.itemRight}>
                        <span className={`${styles.statusBadge} ${statusInfo.className}`}>
                          {res.status === "CONFIRMED" && <CheckCircle2 size={14} />}
                          {res.status === "CANCELLED" && <XCircle size={14} />}
                          {res.status === "PENDING_PAYMENT" && <Clock size={14} />}
                          {statusInfo.label}
                        </span>

                        {res.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => handleCancel(res.id)}
                            disabled={cancellingId === res.id}
                            className={styles.cancelButton}
                          >
                            {cancellingId === res.id ? "Annulation…" : "Annuler"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
