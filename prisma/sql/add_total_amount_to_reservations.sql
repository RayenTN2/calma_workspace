-- US-08: Tarification et calcul automatique du coût d'une réservation
-- Ajout de la colonne total_amount dans la table reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);
