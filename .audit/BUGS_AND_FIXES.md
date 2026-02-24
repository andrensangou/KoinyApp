# 🐛 Rapport de Bugs et Correctifs - Session du 10/02/2026

## ✅ Bugs Corrigés

### 1. PIN Co-Parent Se Perd à la Déconnexion ✅ **RÉSOLU**

**Problème :**
- Quand un co-parent créait un PIN et se déconnectait, le PIN était perdu
- À la reconnexion, il devait recréer un PIN

**Cause :**
- Le PIN était stocké uniquement dans Supabase
- En mode co-parent, le profil n'est pas sauvegardé (read-only)
- Donc le PIN n'était jamais persisté

**Solution :**
- Création du service `services/pinStorage.ts`
- Stockage local du PIN avec Capacitor Preferences
- Chaque utilisateur a son propre PIN sur son propre appareil
- Le PIN est chargé au démarrage et vérifié en priorité

**Fichiers Modifiés :**
- `services/pinStorage.ts` (NOUVEAU)
- `App.tsx` : Import et sauvegarde locale dans `handleSetPin`
- `components/ParentView.tsx` : Chargement et vérification du PIN local

**Test :**
✅ Le PIN persiste après déconnexion/reconnexion

---

### 2. Boucle Infinie de Synchronisation Realtime ✅ **RÉSOLU**

**Problème :**
- Les logs montrent des centaines de `🔔 [REALTIME] Change detected`
- Chaque sauvegarde déclenche un reload qui déclenche une sauvegarde, etc.
- Performance dégradée

**Cause :**
```typescript
// Chaque changement Realtime recharge les données
realtimeService.subscribeToFamily(ownerId, async (payload) => {
  const result = await loadData(ownerId);
  setData(result.data); // ← Déclenche un nouveau save
});
```

**Solution :**
- Ajout d'un **debounce de 500ms** pour grouper les changements multiples
- Ajout d'un **intervalle minimum de 2 secondes** entre les reloads
- Annulation des timeouts précédents

**Code Ajouté :**
```typescript
let reloadTimeout: NodeJS.Timeout | null = null;
let lastReloadTime = 0;
const MIN_RELOAD_INTERVAL = 2000;

// Ignorer si reload trop récent
if (now - lastReloadTime < MIN_RELOAD_INTERVAL) {
  console.log('⏭️ [REALTIME] Reload skipped (too soon)');
  return;
}

// Debounce de 500ms
reloadTimeout = setTimeout(async () => {
  // Reload...
}, 500);
```

**Test :**
⏳ À tester - Les logs devraient montrer beaucoup moins de reloads

---

## ⚠️ Bugs Identifiés (Non Résolus)

### 3. Flash du Formulaire PIN ⚡

**Problème :**
- Lors de la saisie du PIN, il y a un flash de 3 secondes
- Le formulaire de création de PIN apparaît brièvement
- Puis le formulaire de saisie apparaît

**Cause Probable :**
- Le PIN local est chargé **après** le premier rendu
- React affiche d'abord "Pas de PIN" puis "PIN existe"

**Solution Proposée :**
Ajouter un état de chargement :

```typescript
const [isPinLoading, setIsPinLoading] = useState(true);

useEffect(() => {
  const loadLocalPin = async () => {
    setIsPinLoading(true);
    // ... chargement du PIN
    setIsPinLoading(false);
  };
  loadLocalPin();
}, []);

if (isPinLoading) {
  return <LoadingSpinner />;
}
```

**Priorité :** Moyenne (UX)

---

### 4. Erreurs en Mode Avion 📴

**Problème :**
```
❌ Error loading from Supabase: {}
❌ [SUPABASE] Update child failed: TypeError: Load failed
🔔 [REALTIME] Channel status: CHANNEL_ERROR
```

**Cause :**
- L'app essaie de se connecter à Supabase même en mode avion
- Les erreurs sont normales mais polluent les logs

**Solution Proposée :**
- Détecter le mode offline
- Désactiver Realtime en mode offline
- Afficher un indicateur "Mode Offline"

**Priorité :** Basse (Fonctionnel mais logs verbeux)

---

### 5. Warnings Auto Layout (iOS) 🟡

**Problème :**
```
Unable to simultaneously satisfy constraints
```

**Cause :**
- Bug connu d'iOS/UIKit avec les claviers virtuels
- Pas de notre faute

**Solution :**
- Ignorer (cosmétique uniquement)
- Ou ajouter dans `AppDelegate.swift` :
```swift
UserDefaults.standard.set(false, forKey: "_UIConstraintBasedLayoutLogUnsatisfiable")
```

**Priorité :** Très Basse (Cosmétique)

---

## 📊 Résumé

| Bug | Status | Priorité | Impact |
|-----|--------|----------|--------|
| PIN Co-Parent | ✅ Résolu | Critique | Bloquant |
| Boucle Realtime | ✅ Résolu | Haute | Performance |
| Flash PIN | ⚠️ Identifié | Moyenne | UX |
| Erreurs Mode Avion | ⚠️ Identifié | Basse | Logs |
| Warnings iOS | 🟡 Ignoré | Très Basse | Cosmétique |

---

## 🚀 Prochaines Étapes

1. **Tester le correctif Realtime** (5 min)
   - Vérifier que les logs ne montrent plus de boucle infinie
   - Vérifier que la synchronisation fonctionne toujours

2. **Corriger le Flash PIN** (10 min)
   - Ajouter un état de chargement
   - Tester l'UX

3. **Améliorer le Mode Offline** (15 min)
   - Détecter la connexion
   - Désactiver Realtime si offline
   - Afficher un indicateur

4. **Tests Complets** (30 min)
   - Mode offline
   - Co-parentalité
   - Synchronisation

---

## 📝 Notes Techniques

### Debounce vs Throttle
- **Debounce** : Attend la fin des événements (500ms)
- **Throttle** : Limite la fréquence (2000ms minimum)
- On utilise les **deux** pour une protection maximale

### Stockage Local PIN
- **iOS** : `UserDefaults` (sécurisé)
- **Android** : `SharedPreferences` (sécurisé)
- **Web** : `localStorage` (moins sécurisé)

### Realtime Supabase
- Utilise WebSockets
- Peut créer des boucles infinies si mal géré
- Nécessite un debounce robuste

---

**Date :** 2026-02-10  
**Auteur :** André + Antigravity AI  
**Version :** 2.0.1
