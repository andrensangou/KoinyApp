-- Tombstones — propagation des suppressions entre appareils.
--
-- Problème : le merge fusionne par union d'ID. Un item présent d'un seul côté est
-- conservé → quand l'appareil A supprime un item (retiré de sa mémoire + du cloud),
-- l'appareil B l'a encore en cache local → le merge le ressuscite → re-sauvé au cloud
-- → réapparaît partout. Le merge ne distingue pas « pas encore synchronisé » de
-- « supprimé ailleurs ».
--
-- Solution : une trace partagée des IDs supprimés (tombstone). À chaque suppression
-- on insère ici ; au chargement on filtre ces IDs du résultat mergé.

CREATE TABLE IF NOT EXISTS deleted_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type  text NOT NULL CHECK (item_type IN ('goal', 'mission', 'child', 'transaction')),
  item_id    text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

-- Lecture rapide des tombstones d'un user.
CREATE INDEX IF NOT EXISTS deleted_items_user_idx ON deleted_items (user_id);

-- RLS : chaque utilisateur ne voit/écrit que ses propres tombstones.
ALTER TABLE deleted_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own deleted_items" ON deleted_items;
CREATE POLICY "own deleted_items" ON deleted_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- GC : une fois que tous les appareils ont resynchronisé, le tombstone n'a plus
-- d'utilité. On purge ceux de plus de 90 jours (cron horaire via pg_cron).
-- À exécuter manuellement une fois si pg_cron est dispo :
--   SELECT cron.schedule('gc-deleted-items', '0 * * * *',
--     $$DELETE FROM deleted_items WHERE deleted_at < now() - interval '90 days'$$);
