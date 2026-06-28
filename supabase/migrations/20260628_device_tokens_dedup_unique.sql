-- Fix accumulation device_tokens (28/06/2026)
-- Cause : la contrainte UNIQUE(user_id,platform,mode,child_id) était inopérante
-- car en Postgres NULL != NULL → les lignes mode='parent' (child_id NULL) ne
-- déclenchaient jamais le ON CONFLICT de l'upsert → insert à chaque appel.
-- Vérifié : 749 lignes (android,parent,NULL) pour un seul user, 8 tokens distincts.

-- 1. Dédup : garder la ligne la plus récente par (user_id, platform, mode, child_id),
--    en traitant NULL child_id comme une valeur (COALESCE). Tiebreak déterministe par id.
DELETE FROM device_tokens
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY user_id, platform, mode, COALESCE(child_id::text, '')
      ORDER BY updated_at DESC, id DESC
    ) AS rn
    FROM device_tokens
  ) t WHERE t.rn > 1
);

-- 2. Index unique avec NULLS NOT DISTINCT (Postgres 15+) → traite les NULL comme égaux,
--    ce qui fait enfin marcher l'upsert onConflict='user_id,platform,mode,child_id'.
CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_user_platform_mode_child_uniq
  ON device_tokens (user_id, platform, mode, child_id) NULLS NOT DISTINCT;
