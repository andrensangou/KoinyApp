# Guide de Diagnostic : Synchronisation Co-Parent

## 🎯 Objectif

Diagnostiquer pourquoi les données ne sont pas synchronisées entre le parent propriétaire et le co-parent.

## 📊 Symptômes Observés

D'après les captures d'écran :

1. **iPhone 1 (Parent)** : Jqck avec "1 MON RÊVE" + badge (1)
2. **iPhone 2 (Co-parent)** : Jqck avec "0 MON RÊVE" (pas de badge)
3. **iPhone 1** : "Demande une mission à tes parents !" avec badge (1)
4. **iPhone 2** : "Aucune demande en attente. Tout est à jour !"

## 🔍 Étapes de Diagnostic

### Étape 1 : Vérifier Supabase Realtime

1. **Aller sur Supabase Dashboard** :
   - https://supabase.com/dashboard
   - Sélectionner le projet Koiny

2. **Vérifier les Publications Realtime** :
   - Database → Publications
   - Chercher `supabase_realtime`
   - Vérifier que ces tables sont incluses :
     - ✅ `children`
     - ✅ `missions`
     - ✅ `goals`
     - ✅ `history_entries`

3. **Si les tables ne sont pas là** :
   - Aller dans Database → SQL Editor
   - Copier/coller le contenu de `enable_realtime.sql`
   - Exécuter les commandes une par une

### Étape 2 : Collecter les Logs du Co-Parent

1. **Ouvrir Xcode**
2. **Déployer l'app sur l'iPhone du co-parent**
3. **Ouvrir la console** (Cmd+Shift+Y)
4. **Chercher ces logs** :

```
🔍 [STORAGE] Co-parent detected, loading family: ...
🔍 [STORAGE] isSharedFamily: true/false
🔍 [DEBUG] Realtime check: { ownerId: ..., isSharedFamily: ..., view: ... }
🔔 [REALTIME] Setting up real-time sync for family: ...
```

### Étape 3 : Analyser les Logs

#### Cas 1 : `isSharedFamily: false`

**Problème** : Le co-parent n'est pas détecté comme tel.

**Solution** :
1. Vérifier que le co-parent a bien accepté l'invitation
2. Vérifier dans Supabase → Database → `co_parents` :
   - Il doit y avoir une ligne avec :
     - `parent_id` = ID du parent propriétaire
     - `email` = Email du co-parent

**Si la ligne n'existe pas** :
- Le co-parent doit rescanner le QR code
- Ou vérifier que `acceptInvitation()` a bien été appelé

#### Cas 2 : `⚠️ [REALTIME] NOT activating`

**Problème** : Le Realtime ne s'active pas.

**Raisons possibles** :
- `isSharedFamily = false` → Voir Cas 1
- `view = 'AUTH'` ou `'LANDING'` → Attendre que l'app soit sur ParentView
- `ownerId = undefined` → Problème de chargement des données

#### Cas 3 : Realtime activé mais pas d'événements

**Logs attendus** :
```
🔔 [REALTIME] Subscribing to abc123:children
🔔 [REALTIME] Channel abc123:children status: SUBSCRIBED
```

**Si absent** :
- Vérifier que Supabase Realtime est activé (Étape 1)
- Vérifier la connexion internet
- Redémarrer l'app

#### Cas 4 : Événements reçus mais UI non mise à jour

**Logs attendus** :
```
🔔 [REALTIME] Change detected on children: ...
🔔 [REALTIME] Change detected, reloading data...
✅ [REALTIME] Data reloaded successfully
```

**Si absent** :
- Le callback Realtime ne se déclenche pas
- Vérifier les filtres RLS dans Supabase

### Étape 4 : Test Manuel

1. **Parent propriétaire** :
   - Ajouter +1€ à l'enfant
   - Attendre 2-3 secondes

2. **Co-parent** :
   - Regarder la console Xcode
   - Chercher : `🔔 [REALTIME] Change detected`
   - Vérifier si le solde se met à jour

3. **Si rien ne se passe** :
   - Tirer vers le bas pour rafraîchir (pull-to-refresh)
   - Si ça fonctionne → Le problème est le Realtime
   - Si ça ne fonctionne pas → Le problème est le chargement des données

### Étape 5 : Vérifier les Politiques RLS

Les politiques RLS doivent permettre aux co-parents de lire les données :

```sql
-- Vérifier les politiques sur la table children
SELECT * FROM pg_policies WHERE tablename = 'children';
```

**Politique attendue pour SELECT** :
```sql
CREATE POLICY "Co-parents can view children"
ON children FOR SELECT
USING (
  parent_id = auth.uid() 
  OR 
  parent_id IN (
    SELECT parent_id FROM co_parents WHERE email = auth.email()
  )
);
```

## 🔧 Solutions Rapides

### Solution 1 : Forcer la Reconnexion

1. **Co-parent** : Fermer complètement l'app (swipe up)
2. **Rouvrir l'app**
3. **Se reconnecter**
4. **Vérifier les logs**

### Solution 2 : Rescanner le QR Code

1. **Parent propriétaire** : Aller dans Profil → Co-Parents → Afficher QR
2. **Co-parent** : Scanner à nouveau le QR code
3. **Vérifier que la ligne apparaît dans `co_parents`**

### Solution 3 : Activer Realtime Manuellement

Dans Supabase SQL Editor :

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE children;
ALTER PUBLICATION supabase_realtime ADD TABLE missions;
ALTER PUBLICATION supabase_realtime ADD TABLE goals;
ALTER PUBLICATION supabase_realtime ADD TABLE history_entries;
```

### Solution 4 : Vérifier les RLS

Dans Supabase SQL Editor, exécuter `fix_rls_complete.sql` ou `fix_rls_coparent.sql`.

## 📝 Checklist Finale

- [ ] Supabase Realtime activé pour les 4 tables
- [ ] `co_parents` contient une ligne pour le co-parent
- [ ] Logs montrent `isSharedFamily: true`
- [ ] Logs montrent `🔔 [REALTIME] Setting up real-time sync`
- [ ] Logs montrent `Channel ... status: SUBSCRIBED`
- [ ] Modifications du parent déclenchent des événements Realtime
- [ ] UI du co-parent se met à jour automatiquement

## 🎯 Prochaine Action

**Déployez l'app depuis Xcode et collectez les logs du co-parent.**

Cherchez spécifiquement :
1. `🔍 [STORAGE] isSharedFamily: ...`
2. `🔍 [DEBUG] Realtime check: ...`
3. `🔔 [REALTIME] Setting up real-time sync`

Partagez ces logs pour un diagnostic précis !
