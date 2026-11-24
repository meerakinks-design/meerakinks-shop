-- Nom et prénom regroupés dans un seul champ « fullName » (formulaire de commande : « Nom complet »).
-- Les fiches clients existantes sont conservées : fullName = prénom, espace, nom.
-- Les reçus déjà enregistrés (colonne JSON) ne sont pas modifiés : le code relit leur ancien format.

ALTER TABLE "Customer" ADD COLUMN "fullName" TEXT;

UPDATE "Customer" SET "fullName" = TRIM(CONCAT("firstName", ' ', "lastName"));

ALTER TABLE "Customer" ALTER COLUMN "fullName" SET NOT NULL;

ALTER TABLE "Customer" DROP COLUMN "firstName";
ALTER TABLE "Customer" DROP COLUMN "lastName";
