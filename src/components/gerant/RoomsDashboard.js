"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Armchair,
  ArrowDownUp,
  Check,
  ChevronDown,
  DoorOpen,
  LoaderCircle,
  LogOut,
  Monitor,
  Pencil,
  Plus,
  Presentation,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  Users,
  Wifi,
  X,
} from "lucide-react";
import styles from "./RoomsDashboard.module.css";

const roomTypeLabels = {
  INDIVIDUAL: "Bureau individuel",
  MEETING: "Salle de réunion",
  TRAINING: "Salle de formation",
  OTHER: "Autre",
};

const roomTypeIcons = {
  INDIVIDUAL: User,
  MEETING: Users,
  TRAINING: Presentation,
};

const emptyForm = { name: "", capacity: "", roomType: "MEETING", customRoomType: "", equipmentIds: [] };

function getErrorMessage(payload, fallback) {
  return payload?.message || fallback;
}

function EquipmentIcon({ name, size = 14 }) {
  return name?.toLocaleLowerCase("fr").includes("wifi")
    ? <Wifi size={size} />
    : <Monitor size={size} />;
}

export default function RoomsDashboard({ user }) {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [activeTab, setActiveTab] = useState("rooms");
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [equipmentFormOpen, setEquipmentFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [equipmentName, setEquipmentName] = useState("");
  const noticeTimerRef = useRef(null);

  function clearNotice() {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = null;
    setNotice("");
  }

  function showNotice(message) {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = setTimeout(() => {
      setNotice("");
      noticeTimerRef.current = null;
    }, 4000);
  }

  const loadDashboard = useCallback(async () => {
    try {
      const [roomsResponse, equipmentResponse] = await Promise.all([
        fetch("/api/gerant/rooms", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/gerant/equipment", { credentials: "same-origin", cache: "no-store" }),
      ]);
      const [roomsPayload, equipmentPayload] = await Promise.all([
        roomsResponse.json(),
        equipmentResponse.json(),
      ]);
      if (!roomsResponse.ok) throw new Error(getErrorMessage(roomsPayload, "Impossible de charger les salles."));
      if (!equipmentResponse.ok) throw new Error(getErrorMessage(equipmentPayload, "Impossible de charger les équipements."));
      setRooms(roomsPayload.rooms || []);
      setEquipment(equipmentPayload.equipment || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Une erreur est survenue pendant le chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load remote state after mount; updates happen when the fetches resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  // Fermer la fenêtre avec Échap
  useEffect(() => {
    if (!formOpen && !equipmentFormOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape" && !saving) {
        setFormOpen(false);
        setEquipmentFormOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formOpen, equipmentFormOpen, saving]);

  const visibleRooms = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    const filtered = rooms.filter((room) => {
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" && room.isActive)
        || (statusFilter === "inactive" && !room.isActive);
      const matchesQuery = !normalizedQuery
        || room.name.toLocaleLowerCase("fr").includes(normalizedQuery)
        || (room.roomType === "OTHER" ? room.customRoomType : roomTypeLabels[room.roomType])?.toLocaleLowerCase("fr").includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "capacity") return b.capacity - a.capacity;
      return a.name.localeCompare(b.name, "fr", { numeric: true });
    });
  }, [rooms, query, statusFilter, sortBy]);

  const visibleEquipment = useMemo(() => {
    const normalizedQuery = equipmentQuery.trim().toLocaleLowerCase("fr");
    return equipment.filter((item) => item.name.toLocaleLowerCase("fr").includes(normalizedQuery));
  }, [equipment, equipmentQuery]);

  const activeCount = rooms.filter((room) => room.isActive).length;
  const totalCapacity = rooms.filter((room) => room.isActive).reduce((sum, room) => sum + room.capacity, 0);

  function openCreateForm() {
    setEditingRoom(null);
    setForm(emptyForm);
    clearNotice();
    setError("");
    setFormOpen(true);
  }

  function openEditForm(room) {
    setEditingRoom(room);
    setForm({
      name: room.name,
      capacity: String(room.capacity),
      roomType: room.roomType,
      customRoomType: room.customRoomType || "",
      equipmentIds: room.equipment.map((entry) => entry.equipmentId),
    });
    clearNotice();
    setError("");
    setFormOpen(true);
  }

  function toggleEquipment(equipmentId) {
    setForm((current) => ({
      ...current,
      equipmentIds: current.equipmentIds.includes(equipmentId)
        ? current.equipmentIds.filter((id) => id !== equipmentId)
        : [...current.equipmentIds, equipmentId],
    }));
  }

  function openCreateEquipmentForm() {
    setEditingEquipment(null);
    setEquipmentName("");
    setError("");
    clearNotice();
    setEquipmentFormOpen(true);
  }

  function openEditEquipmentForm(item) {
    setEditingEquipment(item);
    setEquipmentName(item.name);
    setError("");
    clearNotice();
    setEquipmentFormOpen(true);
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  async function submitRoom(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    clearNotice();
    const isEditing = Boolean(editingRoom);
    const endpoint = isEditing
      ? `/api/gerant/rooms/${editingRoom.id}`
      : "/api/gerant/rooms";
    try {
      const response = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          capacity: Number(form.capacity),
          roomType: form.roomType,
          customRoomType: form.roomType === "OTHER" ? form.customRoomType : null,
          equipmentIds: form.equipmentIds,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, "Impossible d’enregistrer la salle."));
      setFormOpen(false);
      showNotice(isEditing ? "Les modifications ont été enregistrées." : "La salle a été créée.");
      await loadDashboard();
    } catch (saveError) {
      setError(saveError.message || "Impossible d’enregistrer la salle.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateRoom(room) {
    if (!window.confirm(`Désactiver « ${room.name} » ?`)) return;
    setError("");
    clearNotice();
    try {
      const response = await fetch(`/api/gerant/rooms/${room.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, "Impossible de désactiver la salle."));
      showNotice(`« ${room.name} » a été désactivée.`);
      await loadDashboard();
    } catch (deleteError) {
      setError(deleteError.message || "Impossible de désactiver la salle.");
    }
  }

  async function activateRoom(room) {
    setError("");
    clearNotice();
    try {
      const response = await fetch(`/api/gerant/rooms/${room.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, "Impossible de réactiver la salle."));
      showNotice(`« ${room.name} » a été réactivée.`);
      await loadDashboard();
    } catch (activateError) {
      setError(activateError.message || "Impossible de réactiver la salle.");
    }
  }

  async function submitEquipment(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const isEditing = Boolean(editingEquipment);
    try {
      const response = await fetch(isEditing
        ? `/api/gerant/equipment/${editingEquipment.id}`
        : "/api/gerant/equipment", {
        method: isEditing ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: equipmentName }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, "Impossible d’enregistrer l’équipement."));
      setEquipmentFormOpen(false);
      showNotice(isEditing ? "L’équipement a été modifié." : "L’équipement a été ajouté.");
      await loadDashboard();
    } catch (saveError) {
      setError(saveError.message || "Impossible d’enregistrer l’équipement.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEquipment(item) {
    if (!window.confirm(`Supprimer « ${item.name} » du catalogue ?`)) return;
    setError("");
    clearNotice();
    try {
      const response = await fetch(`/api/gerant/equipment/${item.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(payload, "Impossible de supprimer l’équipement."));
      showNotice(`« ${item.name} » a été supprimé.`);
      await loadDashboard();
    } catch (removeError) {
      setError(removeError.message || "Impossible de supprimer l’équipement.");
    }
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>c</span>
          <span>calma<span className={styles.brandLight}>workspace</span></span>
        </Link>
        <div className={styles.workspaceLabel}>ESPACE DE GESTION</div>
        <nav className={styles.nav} aria-label="Navigation principale">
          <a className={`${styles.navLink} ${activeTab === "rooms" ? styles.navActive : ""}`} href="/gerant/salles" aria-current={activeTab === "rooms" ? "page" : undefined} onClick={(event) => { event.preventDefault(); setActiveTab("rooms"); }}>
            <DoorOpen size={18} strokeWidth={1.8} />
            <span>Salles</span>
            <span className={styles.navCount}>{rooms.length}</span>
          </a>
          <a className={`${styles.navLink} ${activeTab === "equipment" ? styles.navActive : ""}`} href="/gerant/salles" aria-current={activeTab === "equipment" ? "page" : undefined} onClick={(event) => { event.preventDefault(); setActiveTab("equipment"); }}>
            <Monitor size={18} strokeWidth={1.8} />
            <span>Équipements</span>
            <span className={styles.navCount}>{equipment.length}</span>
          </a>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.profileCard}>
            <span className={styles.avatar} aria-hidden="true">
              {[user?.firstName, user?.lastName].filter(Boolean).map((part) => part[0]).join("").toLocaleUpperCase("fr") || "C"}
            </span>
            <span className={styles.profileText}>
              <strong>{user?.role === "GERANT" ? "Gérant" : "Compte personnel"}</strong>
              <small>{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Utilisateur"}</small>
            </span>
          </div>
          <button type="button" onClick={logout} className={styles.logoutLink} aria-label="Déconnexion">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>

      <section className={styles.mainArea}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>Espace gérant <span>/</span> <strong>{activeTab === "rooms" ? "Salles" : "Équipements"}</strong></div>
          <div className={styles.topbarRight}><span className={styles.onlineDot} /> Espace sécurisé</div>
        </header>

        <div className={styles.content}>
          <div className={styles.pageHeading}>
            <div>
              <div className={styles.eyebrow}>VOTRE ESPACE, BIEN ORGANISÉ</div>
              <h1>{activeTab === "rooms" ? "Gestion des salles" : "Gestion des équipements"}</h1>
              <p>{activeTab === "rooms" ? "Configurez vos espaces et leurs équipements en quelques instants." : "Gérez le catalogue des équipements disponibles dans vos salles."}</p>
            </div>
            <button type="button" className={styles.primaryButton} onClick={activeTab === "rooms" ? openCreateForm : openCreateEquipmentForm}>
              <Plus size={18} /> {activeTab === "rooms" ? "Nouvelle salle" : "Nouvel équipement"}
            </button>
          </div>

          <div className={styles.statsGrid}>
            <article className={styles.statCard}>
              <span className={`${styles.statIcon} ${styles.iconGreen}`}><DoorOpen size={22} /></span>
              <div><span className={styles.statLabel}>Salles actives</span><strong>{loading ? "—" : activeCount}</strong></div>
              <span className={styles.statFoot}>sur {rooms.length} au total</span>
            </article>
            <article className={styles.statCard}>
              <span className={`${styles.statIcon} ${styles.iconBlue}`}><Users size={22} /></span>
              <div><span className={styles.statLabel}>Capacité disponible</span><strong>{loading ? "—" : totalCapacity}</strong></div>
              <span className={styles.statFoot}>places cumulées</span>
            </article>
            <article className={styles.statCard}>
              <span className={`${styles.statIcon} ${styles.iconGold}`}><Monitor size={22} /></span>
              <div><span className={styles.statLabel}>Équipements</span><strong>{loading ? "—" : equipment.length}</strong></div>
              <span className={styles.statFoot}>référencés</span>
            </article>
          </div>

          {(error || notice) && !formOpen && !equipmentFormOpen && (
            <div className={`${styles.alert} ${error ? styles.alertError : styles.alertSuccess}`} role={error ? "alert" : "status"}>
              <span>{error || notice}</span>
              <button type="button" aria-label="Fermer le message" onClick={() => { setError(""); setNotice(""); }}><X size={16} /></button>
            </div>
          )}

          {activeTab === "rooms" ? <section className={styles.roomsPanel}>
            <div className={styles.panelHeading}>
              <div><h2>Vos espaces</h2><p>Retrouvez et gérez toutes les salles du workspace.</p></div>
              <span className={styles.resultCount}>{visibleRooms.length} résultat{visibleRooms.length > 1 ? "s" : ""}</span>
            </div>
            <div className={styles.toolbar}>
              <label className={styles.searchBox}>
                <Search size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une salle…" aria-label="Rechercher une salle" />
                {query && <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery("")}><X size={15} /></button>}
              </label>
              <label className={`${styles.filterBox} ${styles.toolbarSpacer}`}>
                <SlidersHorizontal size={16} />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrer par statut">
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actives</option>
                  <option value="inactive">Désactivées</option>
                </select>
                <ChevronDown size={15} />
              </label>
              <label className={styles.filterBox}>
                <ArrowDownUp size={16} />
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Trier les salles">
                  <option value="name">Trier par nom</option>
                  <option value="capacity">Trier par capacité</option>
                </select>
                <ChevronDown size={15} />
              </label>
              <button type="button" className={styles.iconButton} onClick={loadDashboard} aria-label="Actualiser la liste" title="Actualiser"><RefreshCw size={17} /></button>
            </div>

            <div className={styles.roomList}>
              {loading ? (
                <div className={styles.loadingState} role="status"><LoaderCircle className={styles.spin} size={23} /> Chargement des salles…</div>
              ) : visibleRooms.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}><Armchair size={26} /></span>
                  <strong>{rooms.length ? "Aucune salle ne correspond" : "Aucune salle pour le moment"}</strong>
                  <p>{rooms.length ? "Essayez de modifier votre recherche ou le filtre." : "Créez votre premier espace pour commencer."}</p>
                  {!rooms.length && <button type="button" className={styles.secondaryButton} onClick={openCreateForm}><Plus size={16} /> Créer une salle</button>}
                </div>
              ) : visibleRooms.map((room) => {
                const TypeIcon = roomTypeIcons[room.roomType] || DoorOpen;
                return (
                  <article className={`${styles.roomRow} ${room.isActive ? "" : styles.roomRowInactive}`} key={room.id}>
                    <div className={styles.roomGlyph}><TypeIcon size={22} strokeWidth={1.7} /></div>
                    <div className={styles.roomInfo}>
                      <div className={styles.roomTitleLine}>
                        <h3>{room.name}</h3>
                        <span className={`${styles.statusBadge} ${room.isActive ? styles.statusActive : styles.statusInactive}`}><i />{room.isActive ? "Active" : "Désactivée"}</span>
                      </div>
                      <div className={styles.roomMeta}>
                        <span className={styles.metaItem}><TypeIcon size={15} /> {room.roomType === "OTHER" ? room.customRoomType : roomTypeLabels[room.roomType] || room.roomType}</span>
                        <span className={styles.metaItem}><Users size={15} /> {room.capacity} place{room.capacity > 1 ? "s" : ""}</span>
                      </div>
                      <div className={styles.chips}>
                        {room.equipment.length
                          ? room.equipment.map((entry) => (
                            <span className={styles.chip} key={entry.equipmentId}>
                              <EquipmentIcon name={entry.equipment.name} size={13} /> {entry.equipment.name}
                            </span>
                          ))
                          : <span className={styles.chipEmpty}>Aucun équipement</span>}
                      </div>
                    </div>
                    <div className={styles.roomActions}>
                      <button type="button" className={styles.actionButton} onClick={() => openEditForm(room)}><Pencil size={15} /> Modifier</button>
                      {room.isActive
                        ? <button type="button" className={styles.deactivateButton} onClick={() => deactivateRoom(room)}><span /> Désactiver</button>
                        : <button type="button" className={styles.actionButton} onClick={() => activateRoom(room)}><Check size={15} /> Réactiver</button>}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className={styles.panelFooter}><span>Capacité et équipements sont mis à jour en temps réel.</span><span><Check size={14} /> Données synchronisées</span></div>
          </section> : <section className={styles.roomsPanel}>
            <div className={styles.panelHeading}>
              <div><h2>Catalogue des équipements</h2><p>Ajoutez ou modifiez les équipements proposés pour vos salles.</p></div>
              <span className={styles.resultCount}>{visibleEquipment.length} résultat{visibleEquipment.length > 1 ? "s" : ""}</span>
            </div>
            <div className={styles.toolbar}>
              <label className={styles.searchBox}>
                <Search size={17} />
                <input value={equipmentQuery} onChange={(event) => setEquipmentQuery(event.target.value)} placeholder="Rechercher un équipement…" aria-label="Rechercher un équipement" />
                {equipmentQuery && <button type="button" aria-label="Effacer la recherche" onClick={() => setEquipmentQuery("")}><X size={15} /></button>}
              </label>
              <button type="button" className={styles.iconButton} onClick={loadDashboard} aria-label="Actualiser la liste" title="Actualiser"><RefreshCw size={17} /></button>
            </div>
            <div className={styles.roomList}>
              {loading ? <div className={styles.loadingState} role="status"><LoaderCircle className={styles.spin} size={23} /> Chargement des équipements…</div>
                : visibleEquipment.length === 0 ? <div className={styles.emptyState}><span className={styles.emptyIcon}><Monitor size={26} /></span><strong>{equipment.length ? "Aucun équipement ne correspond" : "Aucun équipement pour le moment"}</strong><p>{equipment.length ? "Essayez une autre recherche." : "Ajoutez le premier équipement au catalogue."}</p>{!equipment.length && <button type="button" className={styles.secondaryButton} onClick={openCreateEquipmentForm}><Plus size={16} /> Ajouter un équipement</button>}</div>
                  : visibleEquipment.map((item) => <article className={styles.roomRow} key={item.id}>
                    <div className={styles.roomGlyph}><EquipmentIcon name={item.name} size={21} /></div>
                    <div className={styles.roomInfo}><div className={styles.roomTitleLine}><h3>{item.name}</h3></div><div className={styles.roomMeta}><span className={styles.metaItem}>{item._count?.rooms || 0} salle{item._count?.rooms === 1 ? "" : "s"} associée{item._count?.rooms === 1 ? "" : "s"}</span></div></div>
                    <div className={styles.roomActions}><button type="button" className={styles.actionButton} onClick={() => openEditEquipmentForm(item)}><Pencil size={15} /> Modifier</button><button type="button" className={styles.removeEquipmentButton} onClick={() => removeEquipment(item)} title="Impossible si l’équipement est affecté à une salle"><Trash2 size={15} /> Supprimer</button></div>
                  </article>)}
            </div>
            <div className={styles.panelFooter}><span>Un équipement affecté à une salle ne peut pas être supprimé.</span><span><Check size={14} /> Catalogue synchronisé</span></div>
          </section>}
          <footer className={styles.footer}>© 2026 Calma Workspace <span>Un espace de travail qui vous ressemble.</span></footer>
        </div>
      </section>

      {formOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="room-form-title">
            <div className={styles.modalHeader}>
              <div><span className={styles.modalEyebrow}>{editingRoom ? "MISE À JOUR" : "NOUVEL ESPACE"}</span><h2 id="room-form-title">{editingRoom ? "Modifier la salle" : "Créer une salle"}</h2><p>Renseignez les informations de votre espace.</p></div>
              <button type="button" className={styles.closeButton} onClick={() => setFormOpen(false)} aria-label="Fermer" disabled={saving}><X size={19} /></button>
            </div>
            <form onSubmit={submitRoom} className={styles.roomForm}>
              <label className={styles.formField}><span>Nom de la salle <b>*</b></span><input required autoFocus maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex. Atelier des oliviers" /></label>
              <div className={styles.formSplit}>
                <label className={styles.formField}><span>Capacité <b>*</b></span><div className={styles.numberInput}><input required type="number" min="1" step="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} placeholder="8" /><span>places</span></div></label>
                <label className={styles.formField}><span>Type de salle <b>*</b></span><select required value={form.roomType} onChange={(event) => setForm({ ...form, roomType: event.target.value })}><option value="INDIVIDUAL">Bureau individuel</option><option value="MEETING">Salle de réunion</option><option value="TRAINING">Salle de formation</option><option value="OTHER">Autre</option></select></label>
              </div>
              {form.roomType === "OTHER" && <label className={styles.formField}><span>Précisez le type de salle <b>*</b></span><input required maxLength={100} value={form.customRoomType} onChange={(event) => setForm({ ...form, customRoomType: event.target.value })} placeholder="Ex. Salle de coworking" /></label>}
              <fieldset className={styles.equipmentFieldset}>
                <legend>Équipements <small>Facultatif</small></legend>
                {equipment.length === 0 ? <p className={styles.noEquipment}>Aucun équipement n’est encore disponible.</p> : (
                  <div className={styles.equipmentOptions}>{equipment.map((item) => {
                    const checked = form.equipmentIds.includes(item.id);
                    return <label key={item.id} className={`${styles.equipmentOption} ${checked ? styles.equipmentSelected : ""}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleEquipment(item.id)} />
                      <span className={styles.equipmentCheck}>{checked && <Check size={12} />}</span>
                      <span className={styles.equipmentIcon}><EquipmentIcon name={item.name} size={16} /></span>
                      <span>{item.name}</span>
                    </label>;
                  })}</div>
                )}
              </fieldset>
              {error && <div className={styles.formError} role="alert">{error}</div>}
              <div className={styles.formFooter}><button type="button" className={styles.cancelButton} onClick={() => setFormOpen(false)} disabled={saving}>Annuler</button><button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? <LoaderCircle className={styles.spin} size={17} /> : <Check size={17} />}{editingRoom ? "Enregistrer" : "Créer la salle"}</button></div>
            </form>
          </section>
        </div>
      )}

      {equipmentFormOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEquipmentFormOpen(false); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="equipment-form-title">
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalEyebrow}>{editingEquipment ? "MISE À JOUR" : "NOUVEL ÉQUIPEMENT"}</span>
                <h2 id="equipment-form-title">{editingEquipment ? "Modifier l’équipement" : "Ajouter un équipement"}</h2>
                <p>Le nom sera disponible dans le formulaire des salles.</p>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setEquipmentFormOpen(false)} aria-label="Fermer" disabled={saving}><X size={19} /></button>
            </div>
            <form onSubmit={submitEquipment} className={styles.roomForm}>
              <label className={styles.formField}>
                <span>Nom de l’équipement <b>*</b></span>
                <input required autoFocus maxLength={100} value={equipmentName} onChange={(event) => setEquipmentName(event.target.value)} placeholder="Ex. Écran supplémentaire" />
              </label>
              {error && <div className={styles.formError} role="alert">{error}</div>}
              <div className={styles.formFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setEquipmentFormOpen(false)} disabled={saving}>Annuler</button>
                <button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? <LoaderCircle className={styles.spin} size={17} /> : <Check size={17} />}{editingEquipment ? "Enregistrer" : "Ajouter"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
