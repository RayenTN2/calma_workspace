-- Contraintes que Prisma ne sait pas exprimer (US-04, S1-T17).
-- À exécuter une fois la table "reservations" créée.
ALTER TABLE reservations
  ADD CONSTRAINT reservations_end_after_start CHECK (end_at > start_at),
  ADD CONSTRAINT reservations_participants_positive CHECK (participants > 0);
