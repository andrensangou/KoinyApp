# 🧪 Plan de Test - Correctifs Session 10/02/2026

## ✅ Correctifs Appliqués

### 1. Suppression du PIN Local à la Déconnexion
**Fichier :** `App.tsx` → `handleFullSignOut`

**Comportement Attendu :**
- Quand vous vous déconnectez complètement, le PIN local est supprimé
- À la prochaine connexion, vous devrez créer un nouveau PIN

### 2. Redirection Automatique Après Scan QR Code
**Fichier :** `App.tsx` → Gestionnaire de deeplink

**Comportement Attendu :**
- Après avoir scanné un QR code, si des enfants existent, vous êtes redirigé vers la vue PARENT
- Vous voyez immédiatement les enfants de la famille

### 3. Debounce Realtime (Déjà Appliqué)
**Fichier :** `App.tsx` → `useEffect` Realtime

**Comportement Attendu :**
- Les logs montrent beaucoup moins de `🔔 [REALTIME] Change detected`
- Vous voyez des `⏭️ [REALTIME] Reload skipped (too soon)`

---

## 🧪 Tests à Effectuer

### Test 1 : Cycle Complet de Déconnexion/Reconnexion (5 min)

#### Étape 1 : Préparation
1. Assurez-vous d'être connecté en tant que co-parent
2. Créez un PIN (ex: `1234`)
3. Vérifiez que vous voyez les enfants

#### Étape 2 : Déconnexion
1. Allez dans Paramètres → Déconnexion
2. **Vérifiez les logs Xcode :**
   ```
   ✅ [APP] PIN local supprimé lors de la déconnexion
   ```

#### Étape 3 : Reconnexion
1. Reconnectez-vous avec le même compte
2. **Attendu :** Vous devez voir l'écran de création de PIN
3. **Attendu :** L'ancien PIN `1234` ne fonctionne plus
4. Créez un nouveau PIN (ex: `5678`)
5. **Attendu :** Vous voyez les enfants

**Résultat :** ✅ / ❌

---

### Test 2 : Scan QR Code (5 min)

#### Étape 1 : Préparation
1. Créez un QR code depuis le compte parent principal
2. Déconnectez-vous du compte co-parent

#### Étape 2 : Scan
1. Scannez le QR code
2. Connectez-vous avec le compte co-parent

#### Étape 3 : Vérification
1. **Vérifiez les logs Xcode :**
   ```
   🔄 [DEEPLINK] Déjà connecté, rechargement des données famille...
   ✅ [DEEPLINK] Données famille chargées immédiatement
   👶 [DEEPLINK] Nombre d'enfants: X
   🎯 [DEEPLINK] Redirection vers PARENT
   ```
2. **Attendu :** Vous êtes redirigé automatiquement vers la vue PARENT
3. **Attendu :** Vous voyez les enfants immédiatement

**Résultat :** ✅ / ❌

---

### Test 3 : Boucle Realtime (2 min)

#### Étape 1 : Observation
1. Ouvrez la console Xcode
2. Filtrez par `REALTIME`
3. Observez les logs pendant 30 secondes

#### Étape 2 : Vérification
1. **Attendu :** Vous voyez des `⏭️ [REALTIME] Reload skipped (too soon)`
2. **Attendu :** Pas plus de 1 reload toutes les 2 secondes
3. **Attendu :** Pas de boucle infinie

**Résultat :** ✅ / ❌

---

### Test 4 : Création de Mission en Co-Parent (3 min)

#### Étape 1 : Connexion
1. Connectez-vous en tant que co-parent
2. Entrez votre PIN

#### Étape 2 : Création
1. Créez une nouvelle mission pour un enfant
2. Attendez 2 secondes

#### Étape 3 : Vérification
1. **Vérifiez les logs Xcode :**
   ```
   🔔 [REALTIME] Change detected, reloading data...
   ✅ [REALTIME] Data reloaded and migrated successfully
   ```
2. **Attendu :** La mission apparaît immédiatement
3. **Attendu :** Pas de boucle infinie de reloads

**Résultat :** ✅ / ❌

---

## 📊 Checklist Finale

- [ ] **Test 1 :** PIN supprimé à la déconnexion
- [ ] **Test 2 :** Redirection automatique après QR code
- [ ] **Test 3 :** Pas de boucle Realtime
- [ ] **Test 4 :** Synchronisation co-parent fonctionne

---

## 🐛 Bugs Connus (Non Bloquants)

### 1. Flash du Formulaire PIN ⚡
**Impact :** UX (cosmétique)  
**Priorité :** Moyenne  
**Solution :** Ajouter un état de chargement

### 2. Erreurs en Mode Avion 📴
**Impact :** Logs verbeux  
**Priorité :** Basse  
**Solution :** Détecter le mode offline

### 3. Warnings Auto Layout (iOS) 🟡
**Impact :** Cosmétique  
**Priorité :** Très Basse  
**Solution :** Ignorer (bug iOS/UIKit)

---

## 📝 Logs Importants à Surveiller

### ✅ Logs de Succès
```
✅ [APP] PIN sauvegardé localement pour: [user_id]
✅ [APP] PIN local supprimé lors de la déconnexion
✅ [PIN_STORAGE] PIN chargé localement pour: [user_id]
✅ [PARENT VIEW] PIN local chargé pour: [user_id]
✅ [DEEPLINK] Données famille chargées immédiatement
🎯 [DEEPLINK] Redirection vers PARENT
⏭️ [REALTIME] Reload skipped (too soon)
```

### ❌ Logs d'Erreur à Surveiller
```
❌ [APP] Erreur sauvegarde PIN local: ...
❌ [APP] Erreur suppression PIN local: ...
❌ [PIN_STORAGE] Erreur sauvegarde PIN: ...
❌ [PARENT VIEW] Erreur chargement PIN local: ...
```

---

## 🚀 Après les Tests

Si tous les tests passent :
1. ✅ Commit des changements
2. ✅ Mise à jour du changelog
3. ✅ Préparation du déploiement TestFlight

Si des tests échouent :
1. ❌ Noter les erreurs
2. ❌ Copier les logs
3. ❌ Demander de l'aide

---

**Date :** 2026-02-10  
**Version :** 2.0.2  
**Testeur :** André
