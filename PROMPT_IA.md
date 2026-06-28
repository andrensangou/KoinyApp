# Prompt contexte Koiny — pour assistant IA

Tu travailles sur **Koiny**, une app mobile iOS/Android d'éducation financière pour enfants 6-14 ans. Le fondateur est Andre Nsangou (Belgique). L'app est en production sur l'App Store et en review sur Google Play.

---

## Stack technique

- **Frontend** : TypeScript, React 18, Vite 7, Tailwind CSS
- **Mobile** : Capacitor 8 (iOS + Android WebView)
- **Backend** : Supabase (PostgreSQL + Auth + Edge Functions Deno)
- **Paiements** : RevenueCat (IAP iOS + Android)
- **Push** : Firebase Cloud Messaging (FCM) + APNs
- **Monitoring** : Sentry

---

## Concept produit

- Le parent crée des **missions** (tâches à accomplir) avec une récompense en euros virtuels
- L'enfant complète la mission → le parent valide → le solde de l'enfant est crédité
- L'enfant définit des **objectifs** d'épargne (ex: trottinette 60€) et accumule jusqu'à l'acheter
- **Freemium** : 1 enfant / 2 missions / 1 objectif gratuit — Premium 1,99€/mois ou 16,99€/an
- **Pas de vrai argent** — simulateur pur, aucune licence bancaire requise
- **3 langues** : FR / NL / EN (toujours toutes les 3 pour tout nouveau texte)

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `App.tsx` | Racine : GlobalState, ViewState, tous les handlers métier |
| `components/ParentView.tsx` | Dashboard parent iOS (2500+ lignes, modifier avec précaution) |
| `components/AndroidParentView.tsx` | Dashboard parent Android (Material 3) |
| `components/ChildView.tsx` | Dashboard enfant iOS |
| `components/AndroidChildView.tsx` | Dashboard enfant Android (Material 3) |
| `i18n.ts` | Toutes les traductions FR/NL/EN |
| `types.ts` | Interfaces TypeScript + constantes |
| `services/supabase.ts` | Client Supabase, Auth, CRUD, sync cloud |
| `services/storage.ts` | loadData/saveData, merge local+cloud |
| `services/subscription.ts` | RevenueCat SDK, IAP |
| `services/sounds.ts` | Sons synthétisés Web Audio |
| `services/smartReminder.ts` | Rappel hebdo contextuel selon profil ouvert |
| `services/notifications.ts` | Notifications locales |
| `services/pushService.ts` | Push cross-device FCM |
| `services/pinStorage.ts` | PIN local + sync (PBKDF2 SHA-512) |
| `services/logger.ts` | Logger sécurisé avec anonymisation |
| `hooks/usePlatform.ts` | `isAndroid`, `isIOS`, `isWeb`, `isNative` |
| `hooks/useModal.ts` | Body-lock iOS-compatible pour modals |

---

## Architecture sync

**Principe : Optimistic UI → Local → Cloud async**

- Le state global `data` est mis à jour immédiatement (optimistic)
- `saveData()` persiste localement puis pousse vers Supabase en async
- `loadData()` fusionne cloud + local (`mergeGlobalStates`) avec résolution par récence (`updatedAt`)
- Guards React refs dans `App.tsx` : `isSavingRef`, `isReloadingFromRealtime`, `isDirectSupabaseOperation`, `isInitializing`, `isSyncingFromOnline`
- Reload au retour au premier plan (`visibilitychange` + `appStateChange` Capacitor) + polling 5s si 2 appareils ouverts simultanément

**Pattern opération directe Supabase :**
```typescript
isDirectSupabaseOperation.current = true;
try {
  await supabase.from('table').delete().eq('id', id);
  setData(prev => ({ ...prev, updatedAt: new Date().toISOString(), ... }));
} finally {
  isDirectSupabaseOperation.current = false;
}
```

**Fix critique Android cold start** (`services/supabase.ts`) : `CapacitorStorageAdapter` hybride — lit `localStorage` en priorité (synchrone, sans pont natif), `Preferences` en fallback. Évite le hang de `getSession()` au démarrage Android.

---

## Règles JAMAIS

- Écraser `pin_hash` avec `null` dans Supabase
- Bloquer l'UI en attendant un appel réseau (toujours optimistic)
- Créer enfant/mission sans vérifier l'existence préalable (risque doublons)
- Oublier `isDirectSupabaseOperation.current = true` lors d'opérations DB directes
- Modifier `components/ParentView.tsx` sans précaution (2500+ lignes)
- Utiliser autre chose que `crypto.randomUUID()` pour les nouveaux IDs
- Hardcoder des clés API dans le code (utiliser `.env`)
- Committer `CLAUDE.md` (contient des PII utilisateurs)

## Règles TOUJOURS

- `updatedAt: new Date().toISOString()` à chaque modification du state
- Supporter FR/NL/EN pour tout nouveau texte dans `i18n.ts`
- Passer par `updateChild(childId, updater)` pour modifier un enfant
- `setData(prev => ({ ...prev, updatedAt: ..., ... }))` (immutable update)
- Valider les inputs (longueur, type, NaN check sur parseFloat)
- `npm run build && npx cap sync ios` avant tout test Xcode

---

## iOS vs Android

L'app a **deux implémentations UI séparées** :
- `isAndroid` (depuis `hooks/usePlatform.ts`) détermine quelle vue rendre
- iOS : design glassmorphism, rounded-[2.5rem], backdrop-blur, gradients
- Android : Material 3, rounded-[28px], text buttons, surfaces blanches
- Ne jamais mélanger les deux styles dans un même composant sans `isAndroid` ternaire

---

## Sécurité

- PIN hashé PBKDF2 (100k itérations, SHA-512, salt 128-bit)
- Sessions via Capacitor Preferences (pas localStorage pour les tokens auth)
- Balance plafonnée à `MAX_BALANCE` (100€)
- Logger avec anonymisation automatique (userId, email, token)
- `IS_PRODUCTION` guard sur `simulatePurchase()`

---

## RevenueCat

- Produits : `com.koiny.premium.monthly` (1,99€/mois) et `com.koiny.premium.yearly` (16,99€/an)
- Entitlement ID : **`'Koiny Premium'`** (majuscule + espace importants)
- Clé iOS : `VITE_REVENUECAT_API_KEY` (préfixe `appl_`)
- Clé Android : `VITE_REVENUECAT_API_KEY_ANDROID` (préfixe `goog_`)
- Premium local : `localStorage['koiny_premium_active']`
- Refresh périodique : `visibilitychange` + intervalle 6h

---

## Commandes

```bash
npm run dev                    # Dev web
npm run build                  # Build prod (~24 min sur 8GB RAM)
npx cap sync ios               # Sync vers Xcode
npx cap sync android           # Sync vers Android Studio
cd android && ./gradlew bundleRelease   # AAB release Android
```

⚠️ Build nécessite `NODE_OPTIONS=--max_old_space_size=4096` sur machine 8GB.
⚠️ Fermer Brave + autres apps lourdes avant le build (swap saturé sinon).

---

## État production (11/06/2026)

- **iOS** : version **1.1.1** live sur l'App Store (build 14, soumis le 10/06/2026). Phased release 7 jours actif.
- **Android** : versionCode **13** soumis en production Play Console, en review Google.
- **3 abonnés payants** : Laetitia (mensuel), Martin (annuel), Megan (mensuel, expire 22/06).
- **Branche active** : `feature/smart-notifications` (commit `56818b6`)

---

## Bug connu à corriger (prochaine session)

**Cold start post-update iOS** : au 1er lancement après une mise à jour App Store, `initialize()` affiche l'écran AUTH pendant que la lecture des Preferences Capacitor est async → l'user doit fermer/relancer pour que la session soit restaurée. Fix : garder le splash affiché jusqu'à ce que la lecture Preferences soit complète avant de décider la vue. ~1-2h de dev.

---

## Valeurs produit

Koiny est une **anti-app** : elle est conçue pour être ouverte le **moins possible**. L'objectif est d'enseigner la responsabilité financière aux enfants, pas de créer de l'engagement ou de l'addiction au téléphone. Toute nouvelle feature doit aller dans ce sens.
