-- Ajoute la colonne `note` à la table transactions.
-- Permet de persister le commentaire du parent lors de la validation d'une mission
-- (ex: "Bravo, super travail ! 🌟") afin qu'il soit visible dans l'historique de
-- l'enfant sur tous les appareils.
--
-- Avant ce fix : le `note` n'était jamais écrit (omis dans mapTransaction) et
-- toujours relu comme `null` → le commentaire disparaissait à chaque sync.
--
-- Idempotent : ne fait rien si la colonne existe déjà.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS note text;
