# CLAUDE.md — Koiny

> Instructions pour Claude Code travaillant sur ce projet.
> Lire aussi `context.md` pour le contexte complet du projet.

## Projet

Koiny est une app mobile iOS/Android d'education financiere pour enfants 6-14 ans. Stack: TypeScript, React 18, Vite 7, Tailwind CSS, Capacitor 8, Supabase, RevenueCat.

**App Store:** https://apps.apple.com/us/app/koiny-pocket-money-for-kids/id6760566260
**Statut:** Publiée sur l'App Store (version 1.0.9). Version **1.1.0 build 3** soumise pour review Apple le 22/05/2026 depuis la branche `feature/android-redesign` — inclut push notifications FCM (APNs), fix objectifs Supabase (count exact), fix écran vide Android nouveaux users, fix crash switch profil enfant (goals: []).
**Android:** Version 1.0 versionCode 11 — AAB release buildé le 30/05/2026, uploadé en Play Console (Tests fermés Alpha). 12 testeurs inscrits depuis 8 jours — accès production débloqué ~6 jours. IAP Android (`com.koiny.premium.monthly` + `com.koiny.premium.yearly`) créés dans Play Console le 08/05/2026, RevenueCat configuré (Valid credentials ✅).
**AndroidParentView:** Dashboard parent Android (`components/AndroidParentView.tsx`) — activé via `isAndroid` dans `App.tsx`. Wirée avec `App.tsx` le 20/05/2026. Voir section "Actions du 20/05/2026 — AndroidParentView" et "Actions du 21/05/2026 — AndroidParentView améliorations" ci-dessous.
**AndroidChildView:** Dashboard enfant Android (`components/AndroidChildView.tsx`) — activé via `isAndroid` dans `App.tsx`. Implémenté le 21/05/2026. Design Material 3, 4 onglets (Home, Missions, Historique, Badges), safe area corrigée, bottom nav fixe, bouton power pour logout.
**Push Notifications (FCM):** Système cross-device opérationnel depuis le 21/05/2026. Firebase projet `koiny-d30a7`. Edge function `send-push` déployée sur Supabase. Table `device_tokens` créée. APNs configuré le 21/05/2026 pour iOS : clé `koiny APNs` (Key ID `7SDAU3PXVL`, Team ID `K828G7C5CB`) uploadée dans Firebase Cloud Messaging. `GoogleService-Info.plist` ajouté dans Xcode (`ios/App/App/`). Capability Push Notifications activée. Push iOS fonctionnel sur appareil physique (pas simulateur). Voir section "Actions du 21/05/2026 — Push Notifications FCM" ci-dessous.

## Regles critiques

### JAMAIS
- Ecraser `pin_hash` avec `null` dans Supabase (gere par `services/pinStorage.ts`)
- Bloquer l'UI en attendant un appel reseau (toujours optimistic UI d'abord)
- Creer enfant/mission sans verifier l'existence prealable (risque doublons)
- Oublier `isDirectSupabaseOperation.current = true` lors d'operations DB directes
- Utiliser autre chose que `crypto.randomUUID()` pour les nouveaux IDs
- Modifier `components/ParentView.tsx` (2500+ lignes) sans precaution
- Hardcoder des clés API ou secrets dans le code source (utiliser `.env`)

### TOUJOURS
- `updatedAt: new Date().toISOString()` a chaque modification du state
- Supporter les 3 langues (fr/nl/en) pour tout nouveau texte dans `i18n.ts`
- Passer par `updateChild(childId, updater)` pour modifier un enfant
- Utiliser `setData(prev => ({ ...prev, updatedAt: ..., ... }))` (immutable update)
- Tester en mode offline
- Valider les inputs (longueur, type, NaN check sur parseFloat)
- Utiliser le logger sécurisé (`services/logger.ts`) au lieu de `console.log` pour les données sensibles
- Faire `npm run build && npx cap sync ios` après chaque modification avant test Xcode

## Commandes

```bash
npm run dev          # Dev web (localhost)
npm run build        # tsc + vite build -> dist/
npx cap sync ios     # Sync vers Xcode
npx cap open ios     # Ouvrir Xcode
```

Note: le build necessite `NODE_OPTIONS=--max_old_space_size=4096` sur machine 8GB RAM.
Build prend ~24 minutes sur cette machine.

## Fichiers cles

| Fichier | Role |
|---|---|
| `App.tsx` | Racine: GlobalState, ViewState, handlers metier |
| `components/ParentView.tsx` | Dashboard parent (multi-onglets, tres dense) |
| `components/SubscriptionModal.tsx` | Modal abonnement premium |
| `i18n.ts` | Traductions FR/NL/EN |
| `types.ts` | Interfaces TypeScript + constantes |
| `services/supabase.ts` | Client Supabase, Auth, CRUD |
| `services/storage.ts` | loadData/saveData, cache hybride (+ `persistentStorage`) |
| `services/subscription.ts` | RevenueCat SDK, IAP |
| `services/pinStorage.ts` | Stockage PIN local + sync |
| `services/notifications.ts` | Notifications locales (same device) |
| `services/pushService.ts` | Push notifications cross-device via FCM |
| `services/realtime.ts` | Supabase Realtime |
| `services/widgetBridge.ts` | Bridge JS -> iOS Widget |
| `services/logger.ts` | Logger sécurisé avec anonymisation |
| `services/security.ts` | PBKDF2 PIN hashing (100k iterations, SHA-512) |
| `hooks/usePlatform.ts` | Détection plateforme: `isAndroid`, `isIOS`, `isWeb`, `isNative` |
| `hooks/useModal.ts` | Hook centralisé body-lock pour modals (iOS-compatible) |
| `config.ts` | Validation des credentials au startup |

## Architecture sync

Principe: "Optimistic UI -> Local -> Cloud async"

Guards dans App.tsx (refs React):
- `isSavingRef` / `isReloadingFromRealtime` / `isDirectSupabaseOperation` / `isInitializing` / `isSyncingFromOnline`
- Le save auto est bloque si l'un de ces guards est `true`

Pattern operation directe Supabase:
```typescript
isDirectSupabaseOperation.current = true;
try {
  await supabase.from('table').delete().eq('id', id);
  setData(prev => ({ ...prev, updatedAt: new Date().toISOString(), ... }));
} finally {
  isDirectSupabaseOperation.current = false;
}
```

## i18n

```typescript
const t = translations[data.language || 'fr'];
// Structure: common | auth | legal | login | child | parent
// Sous-sections parent: tabs | account | history | messages | notifications.push | premium | tutorial
```

## Freemium

| Ressource | Free | Premium |
|---|---|---|
| Enfants | 1 | Illimite |
| Missions actives / enfant | 2 | Illimite |
| Objectifs / enfant | 1 | Illimite |
| Statistiques | Non | Oui |

### RevenueCat Integration

**Produits & Entitlement:**
- Produits: `com.koiny.premium.monthly` (1,99€/mois) et `com.koiny.premium.yearly` (16,99€/an)
- Entitlement ID dans RevenueCat: **`'Koiny Premium'`** (maj/espace importants)
- Clé API iOS dans `.env` (`VITE_REVENUECAT_API_KEY` — préfixe `appl_`)
- Clé API Android dans `.env` (`VITE_REVENUECAT_API_KEY_ANDROID` — préfixe `goog_`)
- `subscription.ts` choisit la bonne clé selon `Capacitor.getPlatform()`

**Stockage local premium:**
- localStorage key: `'koiny_premium_active'` (valeur: `'true'` ou absent)
- localStorage key: `'koiny_premium_verified_at'` (timestamp ms de la dernière vérification RevenueCat réussie)
- Toujours lu par `migrateData(cloudData)` dans `services/storage.ts`
- Si RevenueCat échoue au démarrage ET `koiny_premium_verified_at` > 7 jours → premium révoqué automatiquement (`App.tsx`)

**Fallback Xcode Sandbox:**
1. `purchaseSubscription()`: check `activeSubscriptions` si entitlements.active vide
2. `getSubscriptionStatus()`: retourne aussi `productId` du fallback pour UI
3. `restorePurchases()`: même fallback pattern que purchase

**État du premium (App.tsx):**
- Lire `koiny_premium_active` au démarrage avant setData() pour éviter flash couronne
- Utiliser `setData(prev => ...)` NOT mutation pour isPremium
- Inclure `updatedAt` dans handleSetPremium pour persister en Supabase
- Refresh périodique: `visibilitychange` + intervalle 6h pour détecter annulations

**SubscriptionModal UX:**
- Affiche abonnement actif avec badge vert "Actif"
- Bouton désactivé visuellement pour abonnement actuel
- Badge "💰 Économies 30%" pour plan annuel
- Bouton "Gérer mon abonnement" → ouvre Apple subscriptions management
- getSubscriptionStatus() retourne `productId` pour matching
- Retry auto (3x3s) si produits vides + bouton "Réessayer"
- Spinner sur le bouton cliqué pendant achat, double-clic impossible
- Message d'erreur rouge si achat échoue

**subscription.ts — waitForInit:**
- `initPromise` permet aux méthodes d'attendre l'init RevenueCat (max 10s)
- `getProducts()`, `purchaseSubscription()`, `getSubscriptionStatus()`, `restorePurchases()` attendent l'init
- Sur native, plus de produits mockés — soit on attend l'init, soit liste vide
- Mocks uniquement en mode web (!isNative) ou dev (!IS_PRODUCTION) si init échoue

**Supabase:**
- Ne sauvegarde PAS `isPremium` directement
- Dérivé de localStorage ou RevenueCat à chaque startup

**Offline Mode:**
- Modal reste ouvert en offline (voir les plans), mais achats disabled
- `isOfflineMode` passé depuis ParentView.tsx → SubscriptionModal.tsx
- Banneau rouge + boutons grisés (opacity-60, cursor-not-allowed)
- Détection: Capacitor Network plugin + events 'online'/'offline' + navigator.onLine

## Sécurité

### Points forts
- PIN hashé PBKDF2 (100k itérations, SHA-512, salt aléatoire 128-bit)
- Comparaison timing-safe pour les PIN
- HTTPS forcé pour Supabase (validé dans config.ts)
- Logger avec anonymisation automatique (userId, email, token)
- Balance plafonnée à MAX_BALANCE (100€)
- Session via Capacitor Preferences (pas localStorage pour les tokens)

### Corrections appliquées (15-16/03/2026)
- ✅ Clé RevenueCat déplacée dans `.env` (via `config.ts`)
- ✅ `simulatePurchase()` bloqué en production (`IS_PRODUCTION` guard)
- ✅ Validation inputs: `isNaN`, montants max (100€ missions, 1000€ transactions), longueur max (100/200 chars)
- ✅ `console.log` remplacé par `logger` dans `services/subscription.ts`
- ✅ Refresh premium périodique: `visibilitychange` (retour premier plan) + intervalle 6h → détecte annulations
- ✅ Fix: `waitForInit()` — produits ne chargeaient pas car modal ouvert avant init RevenueCat
- ✅ Fix: SubscriptionModal retry auto + bouton "Réessayer" + spinner achat + anti double-clic

### Corrections appliquées (01/05/2026 — widget dynamique, fix SceneDelegate, nettoyage Supabase)
**Contexte**: Widget iOS affichait 0.00€ pour tous les utilisateurs. Diagnostic + fix + amélioration visuelle Duolingo-style + nettoyage des comptes fantômes Supabase.
- ✅ **Widget dynamique** (`ios/App/KoinyWidget/KoinyWidget.swift` + `services/widgetBridge.ts`): widget change de couleur selon l'état de l'enfant — amber 🔔 (missions en attente), vert 🎉 (argent gagné aujourd'hui), rouge 😴 (inactivité 3+ jours), indigo par défaut. Messages contextuels en FR/NL/EN. Nouveaux champs dans le payload: `pendingMissionsCount`, `lastMissionApprovedDate`, `todayEarned`.
- ✅ **Bug widget 0.00€** (`ios/App/App/SceneDelegate.swift`): `syncWidgetData()` décodait le JSON en `Payload` (5 champs seulement) puis ré-encodait — les nouveaux champs étaient perdus ET le pont App Group ne fonctionnait pas correctement. Fix: copie du JSON brut directement depuis `UserDefaults.standard["CapacitorStorage.koiny_widget_data"]` vers l'App Group sans re-encodage. Import `WidgetKit` manquant ajouté.
- ✅ **Nettoyage comptes fantômes Supabase**: 11 comptes `auth.users` sans profil ni enfant supprimés via Admin API. Base passe de 23 → 12 comptes. Stats de conversion réelles: 6 actifs / 12 = 50% (vs 26% avec fantômes). 3 comptes de test (`steevex35`, `steevesobiang`) conservés.
- ✅ **CHANGELOG.md créé**: historique complet 1.0.0 → 1.0.6 documenté dans `CHANGELOG.md`.
- ✅ **Bump versions**: 1.0.6 (1→4) rejeté — train 1.0.6 fermé par Apple car déjà approuvé (erreurs 90062/90186). Migration vers **1.0.7 build 1**.
- 📝 **Supabase stats au 01/05/2026**: 12 comptes auth, 9 profils, 6 avec enfants. Drop-off principal: entre AUTH_SUCCESS et CHILD_CREATED (33%). Apple Private Relay emails (`@privaterelay.appleid.com`) ne reçoivent les emails que si `koiny.app` est enregistré dans Apple Private Relay (App Store Connect → App Information).

### Corrections appliquées (02/05/2026 — UX fixes: double-tap, balance, missions, widget couleurs, alerte pénalité)
**Contexte**: Tests en situation réelle ont révélé plusieurs bugs bloquants liés à une fuite du guard `isDirectSupabaseOperation` dans App.tsx et des problèmes d'interaction iOS.
- ✅ **Fuite guard `isDirectSupabaseOperation` — fix systémique** (`App.tsx`): tous les handlers Supabase directs utilisaient `setTimeout` au lieu d'un bloc `finally` → le guard restait bloqué 2s (ou indéfiniment dans `handleAddMission` qui n'avait pas de `finally` du tout). Pattern corrigé partout: `finally { isDirectSupabaseOperation.current = false; setData(prev => ({ ...prev, updatedAt: new Date().toISOString() })); }`. Handlers corrigés: `handleApprove`, `handleManualTransaction`, `handleAddMission`, `handleDeleteActiveMission`, `handleDeleteGoal`, `handleDeleteChild`, `handleAddChild`, `handlePurchaseGoal`.
- ✅ **Missions créées par le parent n'apparaissant pas sur le profil enfant** (`App.tsx:handleAddMission`): guard défini hors de l'IIFE async sans `finally` → jamais libéré → toutes les sauvegardes suivantes bloquées. Fix: `finally` avec clear + `setData({updatedAt})` dans l'IIFE.
- ✅ **Demandes de mission de l'enfant disparaissant immédiatement** — même cause que ci-dessus. Le `saveData` bloqué annulait les demandes créées localement au rechargement Supabase.
- ✅ **Solde non sauvegardé après dépôt/retrait** (`App.tsx:handleManualTransaction`): `setTimeout 2s` libérait le guard mais rien ne re-déclenchait le `saveData` useEffect. Fix: libération immédiate + `setData({updatedAt})` dans `finally`.
- ✅ **Double-tap requis sur validation de mission** (`components/ParentView.tsx`): `isConfirmingRef = useRef(false)` + guard dans `confirmAction()` + reset après 500ms. Prévient les doubles envois.
- ✅ **Double-tap requis sur dépôt/retrait** (`components/ParentView.tsx`): `isSubmittingTransactionRef = useRef(false)` + guard dans `handleTransactionSubmit()`.
- ✅ **Widget couleurs vert/rouge jamais affichées** (`services/widgetBridge.ts`): `todayEarned` comparait `"01/05/2026"` (DD/MM/YYYY) contre `"2026-05-01"` (ISO) → toujours 0. Fix: `todayDateStr` en format `DD/MM/YYYY` pour le filtre; `parseHistoryDate()` utilisée pour `lastMissionApprovedDate` → `.toISOString()` pour Swift.
- ✅ **Alerte pénalité réapparaissant à chaque navigation** (`components/ChildView.tsx`): `acknowledgedPenaltyId` était un state React local → reset à chaque remount de ChildView. Fix: initialisé depuis `localStorage.getItem(\`koiny_ack_penalty_\${data.id}\`)` + `localStorage.setItem(...)` dans les deux boutons de fermeture.
- ✅ **Premier tap manqué sur modals iOS** (`components/ParentView.tsx`): `backdrop-blur-md/sm` sur les backdrops `position:fixed` combiné au `position:fixed` du body-lock `useModal` décale les coordonnées tactiles dans WKWebView. Fix: `backdrop-blur` supprimé des backdrops des modals approval et transaction.

### Actions du 20/05/2026 (session 2) — AndroidParentView intégration complète

**Contexte**: Intégration du dashboard parent Android (`AndroidParentView.tsx`) dans `App.tsx` via `isAndroid` conditionnel. Corrections bugs React Rules of Hooks + ajout fonctionnalités manquantes par rapport au dashboard iOS.

**Fichiers modifiés:**
- `App.tsx`: import `AndroidParentView` + `isAndroid`, split du render `view === 'PARENT'` en Android (`<AndroidParentView>`) et iOS (`<ParentView>`). Props ajoutées: `onDeleteMission`, `onAddChild`, `onClearHistory`.
- `components/AndroidParentView.tsx`: corrections et nouvelles fonctionnalités (voir ci-dessous).

**Corrections bugs:**
- ✅ **React Rules of Hooks — fix critique** (`AndroidParentView.tsx`): tous les hooks (`useState` pour `tab`, `childId`, `showAddMission`, `showTransaction`, `reviewMission`, `toast`, `toastTimer`; `useCallback` pour `showToast`, `handleAddMission`, `handleTransaction`, `handleApprove`, `handleReject`, `handleOpenReview`; `useEffect` sync childId) étaient déclarés **après** le `if (!isAuthenticated) return` → violation flagrante des Rules of Hooks → crash au runtime. Tous déplacés avant la conditional return.
- ✅ **PIN gate sécurité** (`AndroidParentView.tsx`): `AndroidParentView` n'avait pas de vérification PIN contrairement à `ParentView.tsx`. Ajout d'un PIN gate complet (state machine `idle|validating|error|success`, PBKDF2 via `verifyPin`, keypad 3×4, dots animés, auto-auth si aucun PIN configuré).
- ✅ **`t.parent.wrongPin` inexistant** → remplacé par `t.parent.incorrectCode` (clé correcte dans `i18n.ts`).

**Nouvelles fonctionnalités:**
- ✅ **Bouton supprimer mission** (dashboard, missions actives): bouton corbeille rouge sur chaque carte de mission active → appelle `onDeleteMission(childId, missionId)`.
- ✅ **Bouton Ajouter enfant** (profil, section "Mes Enfants"): bouton "+ AJOUTER" ouvre `AddChildSheet` (bottom sheet avec champs prénom, picker avatar DiceBear × 10 seeds, picker couleur × 7). Appelle `onAddChild({ name, colorClass, avatar })` async.
- ✅ **Bouton Effacer historique** (profil, card enfant): bouton "Effacer" par enfant → dialog de confirmation inline → appelle `onClearHistory(childId)`.
- ✅ **Pré-sélection action dans ReviewSheet**: quand le parent tape "APPROUVER" depuis l'onglet Demandes, la feuille s'ouvre avec "approve" pré-sélectionné (vert). Idem "REFUSER" → "reject" pré-sélectionné (rouge). Prop `defaultAction?: 'approve' | 'reject'` ajoutée à `ReviewSheet` + `handleOpenReview`.
- ✅ **Prix premium corrects**: bannière premium affiche `1,99€/mois · 16,99€/an · Économies 30%` (FR), idem NL/EN.
- ✅ **Safe area corrigé**: hero gradient avec `paddingTop: 'calc(env(safe-area-inset-top) + 60px)'`, overlay greeting avec `height: 'calc(56px + env(safe-area-inset-top))'`, TopBar avec `paddingTop: 'env(safe-area-inset-top)'`, BottomNav avec `paddingBottom: 'env(safe-area-inset-bottom)'`.
- ✅ **Tous les boutons settings fonctionnels**: Notifications → toast info, Langue → cycle fr→nl→en, Code PIN → toast info (configuration iOS uniquement), Aide → `mailto:hello@koiny.app`, Déconnexion → `onSignOut`.

**Props interface `AndroidParentViewProps`:**
```typescript
onDeleteMission: (childId: string, missionId: string) => void;
onAddChild: (childData: { name: string; colorClass: string; avatar: string }) => Promise<void>;
onClearHistory: (childId: string) => void;
```

**À tester sur émulateur Android:**
1. Login → dashboard parent Android s'affiche (pas l'ancien iOS)
2. PIN gate si PIN configuré, bypass si aucun PIN
3. Missions actives → bouton corbeille → mission supprimée
4. Onglet Demandes → "APPROUVER" → sheet s'ouvre avec bouton vert pré-sélectionné
5. Onglet Demandes → "REFUSER" → sheet s'ouvre avec bouton rouge pré-sélectionné
6. Onglet Profil → "AJOUTER" → AddChildSheet → créer un enfant
7. Onglet Profil → "Effacer" sur un enfant → confirmation → historique vide
8. Onglet Profil → Langue → cycle FR/NL/EN

### Corrections appliquées (20/05/2026 — Android auth fixes, favicon landing, versionCode 4)

- ✅ **Bouton Apple masqué sur Android** (`components/AuthView.tsx`): bouton "Continue with Apple" enveloppé dans `{!isAndroid && ...}` — n'apparaît plus sur Android.
- ✅ **Google Sign-In Android fallback corrigé** (`services/supabase.ts`): quand le native Google Auth échoue sur Android, le fallback utilisait `window.location.origin` comme `redirectTo` → renvoyait vers la landing page. Fix: fallback utilise `Browser.open` avec `redirectTo: 'com.koiny.app://callback'` + `skipBrowserRedirect: true`, comme iOS.
- ✅ **versionCode Android 4** (`android/app/build.gradle`): bumped 3 → 4. AAB release buildé et prêt à uploader en Play Console.
- ✅ **Favicon landing page** (`public/landing-preview/index.html`): `<link rel="icon" type="image/png" href="favicon.png" />` ajouté dans `<head>`. Fichier `favicon.png` était déjà présent sur Hostinger.

### Actions du 30/05/2026 — Fix création enfant Android + fix texte Google Play

**Contexte**: Bug bloquant signalé par testeur Android — impossible de créer un enfant. Fix du texte "App Store" affiché sur Android dans SubscriptionModal.

**Fichiers modifiés:**
- `App.tsx`: fix `handleAddChild` + `handlePurchaseGoal`
- `components/SubscriptionModal.tsx`: fix footerNote Android

**Corrections:**
- ✅ **Fix "Vous n'êtes pas connecté" à la création d'enfant** (`App.tsx:handleAddChild`): `supabase.auth.getUser()` (appel réseau) retournait `null` sur certains appareils Android si la session n'était pas encore restaurée → erreur "Vous n'êtes pas connecté" malgré un user authentifié. Fix: remplacé par `supabase.auth.getSession()` (cache local, instantané). Même fix appliqué à `handlePurchaseGoal`.
- ✅ **Fix texte "App Store" sur Android** (`components/SubscriptionModal.tsx`): footerNote affichait "facturé via votre compte App Store" sur Android. Fix: conditionnel `isAndroid` → "facturé via votre compte Google Play" (FR/NL/EN).

**Android versionCode 10 → 11:**
- versionCode 10 : fix getSession (buildé + uploadé ce matin)
- versionCode 11 : fix texte Google Play SubscriptionModal (buildé le 30/05/2026)

### Actions du 26/05/2026 — Fix PIN gate bypass + fix handleSetPin hang

**Contexte**: Corrections des bugs du flux "Code oublié ?" introduits la veille + build versionCode 9.

**Fichiers modifiés:**
- `components/AndroidParentView.tsx`: fix bypass immédiat PIN gate + fix spinner "Enregistrement..." bloqué
- `App.tsx`: fix `handleSetPin` bloquant sur appels réseau

**Fichiers modifiés (suite):**
- `components/AndroidParentView.tsx`: fix timeout "Envoi..." bloqué + fix race condition localPin + placeholder ReviewSheet traduit

**Corrections:**
- ✅ **Fix bypass immédiat PIN gate** (`AndroidParentView.tsx`): `pinWasResetRef.current = true` était set dans `handleForgotPin` après `signInWithOtp`. Or `signInWithOtp` sur un user déjà authentifié déclenche `TOKEN_REFRESHED` dans `onAuthStateChange` → bypass se déclenchait immédiatement sans que l'utilisateur clique le lien. Fix: dans `onAuthStateChange`, le bypass (`pinWasResetRef.current`) n'est vérifié QUE sur `event === 'SIGNED_IN'` (deep link), jamais sur `TOKEN_REFRESHED` (signInWithOtp).
- ✅ **Fix spinner "Enregistrement..." bloqué** (`App.tsx:handleSetPin`): `handleSetPin` awaitait `supabase.auth.getUser()` + `saveParentPinLocally()`. Sur appareil réel après magic link, ces appels réseau pouvaient rester bloqués → `setSaving(false)` jamais appelé. Fix: appels réseau convertis en fire-and-forget. `handleSetPin` résout immédiatement après `hashPin` + `setData`.
- ✅ **Fix race condition localPin** (`AndroidParentView.tsx`): après `onSetPin`, `initialize()` (appelé 2s après le deep link) pouvait écraser `data.parentPin` avec l'ancienne valeur Supabase avant que `saveParentPinLocally` fire-and-forget ait terminé. Fix: wrapper de `onSetPin` dans ProfileScreen qui recharge `localPin` depuis Preferences 400ms après la sauvegarde.
- ✅ **Fix "Envoi..." bloqué indéfiniment** (`AndroidParentView.tsx:handleForgotPin`): `signInWithOtp` pouvait ne jamais répondre (rate limit, réseau émulateur) → `pinResetState` restait sur `'sending'` pour toujours. Fix: `Promise.race` avec timeout 10s → passe en `'error'` si pas de réponse.
- ✅ **Placeholder ReviewSheet traduit** (`AndroidParentView.tsx`): placeholder textarea `"Bravo, super travail ! 🌟"` hardcodé en FR. Fix: `language === 'fr' ? ... : language === 'nl' ? 'Goed gedaan, super werk! 🌟' : 'Great job, well done! 🌟'`.

**Android versionCode 9:**
- `android/app/build.gradle`: versionCode 8 → 9 (local uniquement — `android/` gitignore)
- AAB release buildé le 26/05/2026, uploadé en Play Console (Tests fermés Alpha)

### Actions du 25/05/2026 — Forgot PIN Android + versionCode 7

**Contexte**: Ajout du flux "Code oublié ?" dans le PIN gate Android + fix du bypass post-magic-link + build release versionCode 7.

**Fichiers modifiés:**
- `components/AndroidParentView.tsx`: flux "Code oublié ?" complet + fix bypass PIN gate après magic link

**Nouvelles fonctionnalités:**
- ✅ **Flux "Code oublié ?" (`AndroidParentView.tsx`)**: bouton "Code oublié ?" sous le clavier PIN → `handleForgotPin` : efface `pin_hash` en Supabase + supprime le PIN local (`deleteParentPinLocally`) + envoie un magic link OTP (`signInWithOtp`) → écran de confirmation "Lien envoyé !".
- ✅ **Fix bypass PIN gate après magic link** (`AndroidParentView.tsx`): ajout d'un listener `supabase.auth.onAuthStateChange` dans le `useEffect` initial. Quand l'event `SIGNED_IN` ou `TOKEN_REFRESHED` est reçu (deep link `com.koiny.app://callback` traité), re-vérifie `pin_hash` en Supabase — si null → `setIsAuthenticated(true)` directement sans remount. Fonctionne sur vrai appareil Android (pas émulateur — deep link s'ouvre dans Chrome sur émulateur).
- ✅ **PIN loading refactorisé**: extraction de `checkPin(userId)` réutilisée par le load initial ET le listener `onAuthStateChange`.

**Android versionCode 7:**
- `android/app/build.gradle`: versionCode 6 → 7 (local uniquement — `android/` gitignore)
- AAB release buildé le 25/05/2026 : `android/app/build/outputs/bundle/release/app-release.aab` (36 Mo)
- À uploader en Play Console (Tests fermés Alpha)

### Actions du 22/05/2026 — Fixes Android + iOS 1.1.0 soumission App Store

**Contexte**: Corrections de bugs Android détectés en test + soumission iOS 1.1.0 (build 3) pour review Apple.

**Fixes Android (`App.tsx`, `components/AndroidParentView.tsx`):**
- ✅ **Fix suppression objectif désync Supabase** (`App.tsx:handleDeleteGoal`): RLS Supabase retourne `{error: null}` silencieusement si l'utilisateur n'est pas authentifié — objectif supprimé localement mais restait en base. Fix: ajout `count: 'exact'` sur le DELETE + vérification `if (count === 0) throw`. Pattern à appliquer sur tout DELETE Supabase critique.
- ✅ **Fix écran blanc nouveaux users Android** (`components/AndroidParentView.tsx`): `DashboardScreen` retournait `null` quand `childId=''` (aucun enfant). Fix: état `showAddChildEmpty` + carte d'accueil avec icône famille, texte de bienvenue, bouton "+ Ajouter un enfant" → `AddChildSheet`. S'affiche quand `tab === 'dashboard' && data.children.length === 0`.
- ✅ **Fix crash switch profil enfant** (`App.tsx:handleAddChild`): `goals: []` manquant dans l'initialisation du nouvel enfant → `AndroidChildView` crashait sur `data.goals.filter()`. Fix: ajout de `goals: []` dans le payload du nouvel enfant.
- ✅ **Fix Sentry AbortError** (`services/monitoring.ts`): erreur Capacitor Web Locks `'Lock broken by another request'` ajoutée à `ignoreErrors`.
- ✅ **GoogleService-Info.plist retiré du tracking git** (`.gitignore`): GitHub Secret Scanning avait détecté la clé Firebase. Fichier supprimé de l'historique git via `filter-branch`. À placer manuellement dans `ios/App/App/` après clone.

**iOS:**
- ✅ **Version 1.1.0 build 3 soumise pour review Apple** (22/05/2026): version 1.0.9.1 invalide (4 composantes refusées par Apple) → renommée 1.1.0. Build 3 contient `aps-environment: production` (push notifications APNs). Testé sur TestFlight avant soumission.
- ✅ **Android versionCode 6** (`android/app/build.gradle`, local uniquement — `android/` gitignore): AAB release buildé, à uploader en Play Console.

**Divers:**
- ✅ **RevenueCat lifetime premium** accordé à `nsjdre@gmail.com` (compte dev) — expire 2226.
- ✅ **`REVENUECAT_SECRET_KEY`** ajouté dans `.env` (clé V1 `sk_xx...` pour les grants promotionnels).

### Actions du 21/05/2026 (session 4) — AndroidChildView bouton objectif + fixes TypeScript

**Contexte**: Ajout du bouton "Demander un objectif" manquant dans le dashboard enfant Android, et correction d'erreurs TypeScript résiduelles dans AndroidParentView.

**Fichiers modifiés:**
- `components/AndroidChildView.tsx`: bouton demande d'objectif dans `HomeScreen` + nouvelles clés i18n + `handleRequestGift` callback.
- `components/AndroidParentView.tsx`: corrections TypeScript (`ccc.border` → `ccc.light`, `ccc.main` → `ccc.bg`, `FREE_CHILDREN_LIMIT` inliné à `1` dans `ProfileScreen`).

**Bouton demande d'objectif (`AndroidChildView.tsx`):**
- `HomeScreen` accepte désormais `onRequestGift?: () => void` en prop (passé depuis le main component via `handleRequestGift`).
- Quand `activeGoals.length === 0`: carte vide avec icône bullseye + texte `noGoals` + bouton full-width "🎁 Demander un objectif" → `onRequestGift()`.
- Quand `activeGoals.length > 0`: pill "+ Demander un objectif" dans le header de section (via `SecLabel right=` prop) → même callback.
- Nouvelles clés i18n dans `TKeys` + `T` (fr/nl/en): `askGoal`, `noGoals`, `goalSent`.
- `handleRequestGift` dans le main component: appelle `onRequestGift?.()` + affiche snack `goalSent`.

**Corrections TypeScript (`AndroidParentView.tsx`):**
- `RequestsScreen` mission request cards: `ccc.border` n'existe pas dans `COLOR_PAL` → remplacé par `ccc.light`. `ccc.main` → `ccc.bg`.
- `ProfileScreen` bouton ajouter enfant: `FREE_CHILDREN_LIMIT` était défini dans le main component → inaccessible. Remplacé par valeur littérale `1`.

### Actions du 21/05/2026 (session 3) — Push Notifications FCM + AndroidChildView

**Contexte**: Implémentation du dashboard enfant Android et du système de push notifications cross-device (parent iOS ↔ enfant Android).

**Fichiers créés:**
- `components/AndroidChildView.tsx` (~1500 lignes): Dashboard enfant Android Material 3 complet. 4 onglets: Home (solde, objectif principal, missions actives, historique récent), Missions (liste complète avec feedback parent), Historique, Badges. Power button en haut à droite pour logout. Safe area: `paddingTop: 'env(safe-area-inset-top)'` sur TopBar, bottom nav `position: fixed` avec `height: 'calc(62px + env(safe-area-inset-bottom))'`. `entry.note` affiché dans Historique (commentaire parent sur approbation), `m.feedback` affiché dans Missions (commentaire parent sur refus).
- `services/pushService.ts`: Service FCM complet. `registerPushToken()`, `sendPushNewMission()`, `sendPushMissionComplete()`, `sendPushMissionApproved()`, `sendPushMissionRejected()`, `sendPushMissionRequested()`, `sendPushGiftRequested()`, `unregisterPushToken()`. Fire-and-forget.
- `supabase/functions/send-push/index.ts`: Edge function Deno FCM v1 API. JWT signing via `crypto.subtle`, échange OAuth2. Secrets: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

**Fichiers modifiés:**
- `App.tsx`: Rendu conditionnel `isAndroid` pour `AndroidChildView`. Wiring complet push: `registerPushToken` (parent au login + enfant à la sélection), `sendPushMissionApproved/Rejected/Complete/Requested/GiftRequested/NewMission`, `unregisterPushToken` au logout.
- `android/app/build.gradle`: Firebase BoM `34.0.0` + `firebase-messaging`.
- `index.css`: 11 animations `@keyframes kcv-*` pour AndroidChildView.

**Infrastructure Firebase:**
- Projet: `koiny-d30a7` (Forfait Spark), app `com.koiny.app`
- `google-services.json` dans `android/app/`
- Secrets Supabase: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` configurés
- Edge function `send-push` déployée
- Table `device_tokens` créée avec RLS: `UNIQUE(user_id, platform, mode, child_id)`

**Flux de notifications:**

| Action | Destinataire |
|---|---|
| Parent crée/valide/refuse mission | Enfant (son appareil) |
| Enfant termine mission | Parent (son appareil) |
| Enfant demande mission ou cadeau | Parent (son appareil) |

**Principe**: même compte Supabase → `device_tokens` stocke un token par `(platform, mode, child_id)`. Parent iOS + enfant Android = 2 tokens, même `user_id`.

### Actions du 21/05/2026 (session 2) — AndroidParentView fixes filtrage + âge

**Contexte**: Corrections suite aux tests sur émulateur.

**Fichiers modifiés:**
- `components/AndroidParentView.tsx`: filtrage RequestsScreen + badge âge

**Corrections:**
- ✅ **Filtrage RequestsScreen par enfant sélectionné**: `RequestsScreen` accepte désormais `selectedChildId`. Quand un enfant est sélectionné dans la TopBar (onglet Demandes, uniquement si plusieurs enfants), la liste filtre pour n'afficher que ses demandes en attente. Si aucun enfant sélectionné ou enfant unique → toutes les demandes affichées.
- ✅ **Badge âge dans MES ENFANTS**: badge coloré `X ans/jaar/yrs` affiché à côté du prénom si `c.birthday` est renseigné. L'âge se calcule depuis `birthday` (format ISO `YYYY-MM-DD`). S'affiche uniquement si 0 ≤ âge ≤ 18. Si pas de date de naissance → aucun badge (à renseigner via le bouton crayon).

**Pattern filtrage RequestsScreen:**
```typescript
const allItems = data.children.flatMap(c => c.missions.filter(m => m.status === 'PENDING').map(...));
const items = selectedChildId ? allItems.filter(i => i.childId === selectedChildId) : allItems;
// selectedChildId passé depuis le render: data.children.length > 1 ? childId : undefined
```

### Actions du 21/05/2026 — AndroidParentView améliorations UX

**Contexte**: Suite de développement du dashboard parent Android. Aucune modification iOS — `components/ParentView.tsx` et les composants iOS restent intacts.

**Fichiers modifiés:**
- `components/AndroidParentView.tsx`: toutes les modifications ci-dessous
- `App.tsx`: ajout des props `onDeleteAccount`, `onSetMaxBalance` sur `<AndroidParentView>`

**UX / couleurs:**
- ✅ **Couleurs dynamiques dans TopBar** (onglets Historique + Demandes): les pills de sélection d'enfant utilisent maintenant `kGetColor(c.colorClass)` — fond, bordure et texte selon la couleur choisie de l'enfant (plus de indigo fixe).
- ✅ **Couleurs dynamiques dans RequestsScreen**: badge nom de l'enfant sur chaque carte de demande utilise la couleur propre de l'enfant.
- ✅ **Pills masquées sur l'onglet Profil**: `TopBar` n'affiche plus les sélecteurs d'enfants sur l'onglet Profil (tab === 'profile') — seul le titre "Profil" reste.

**Dashboard (DashboardScreen):**
- ✅ **Greeting supprimé**: overlay "BONJOUR / Espace Parents" retiré du hero — seul le bouton power reste en haut à droite.
- ✅ **Jauge de solde supprimée**: barre de progression + "X% du plafond" + "Plafond: Xe" retirés de la balance card.
- ✅ **Objectifs éditables**: bouton crayon sur chaque carte objectif → ouvre `AddGoalSheet` en mode édition (`prefill` + `editMode`) → appelle `onEditChild(childId, { goals: goals.map(...) })`.
- ✅ **Jauge objectif colorée**: fond de la barre change selon progression — rouge (0–33%), orange (34–66%), couleur de l'enfant (67–99%), vert (100%). Prop `cc` (couleur enfant) utilisée.

**Profil (ProfileScreen):**
- ✅ **Icône "Espace Parent" supprimée**: la carte gradient indigo n'affiche plus l'icône seedling — juste le texte "Espace Parent".
- ✅ **Bannière Premium cliquable**: ouvre `SubscriptionModal` (via `showSubscriptionModal` state) — ne déclenche PAS `onSetPremium(true)` directement.
- ✅ **Bouton "Supprimer mon compte"**: bouton outline rouge en bas de page → dialog de confirmation avec icône ⚠️ + texte irréversible → appelle `onDeleteAccount()`.
- ✅ **Row "Guide utilisateur"**: ouvre `HelpModal` (layout bottom sheet MD3 Android, contenu spécifique Android via objet `tAndroid` dans `HelpModal.tsx`).
- ✅ **Row "Contacter le support"**: ouvre `mailto:hello@koiny.app`.
- ✅ **Row "Limite du portefeuille"**: affiche la limite actuelle (ex: "100€" ou "Illimitée"), dialog de saisie numérique 0–1000€ → appelle `onSetMaxBalance(val)`.

**HelpModal.tsx — contenu Android:**
- Objet `tAndroid` séparé avec 7 étapes spécifiques Android: Navigation (4 onglets), Sécurité (PIN, pas Face ID), Gérer les enfants (crayon Profil), Objectifs, Missions, Changer de profil (bouton ⏻), Limite du portefeuille.
- FR/NL/EN mis à jour.

**Notification cloche:**
- Bannière de cloche en dashboard → `onClick` navigue vers l'onglet Demandes (`onGoToRequests` prop).

**Props ajoutées à `AndroidParentViewProps`:**
```typescript
onDeleteAccount?: () => Promise<void>;
onSetMaxBalance?: (limit: number) => void;
```

**Co-parenting — état actuel:**
- Pas de fonctionnalité UI de co-parenting implémentée. Les références dans `pinStorage.ts` sont des commentaires sur la sync PIN.
- Deux parents peuvent partager les mêmes identifiants (email + mdp) depuis deux appareils — la sync Supabase maintient les données à jour.
- Une vraie implémentation (invitation email, comptes séparés liés par `family_id`) est envisageable mais non planifiée.

**Biométrie Android — état actuel:**
- Le service `services/biometric.ts` utilise un plugin natif custom `KoinyBiometric` (iOS uniquement via `BiometricPlugin.swift`).
- Android nécessite un `BiometricPlugin.kt` + enregistrement dans `MainActivity.kt` (~50 lignes Kotlin).
- Non implémenté car nécessite un appareil physique Android pour tester (ne fonctionne pas sur émulateur).
- À faire quand un appareil physique est disponible.

**iOS non touché:**
- `components/ParentView.tsx`, `components/ChildView.tsx`, `components/HelpModal.tsx` (layout) — inchangés.
- `App.tsx`: seules les props de `<AndroidParentView>` ont été ajoutées, le bloc `<ParentView>` (iOS) est intact.

### Actions du 15/05/2026 — Fix premium stale, landing page redesign, build 1.0.7 build 5

**Contexte**: Détection d'un bug où un utilisateur ayant eu le premium puis résilié conservait l'accès si RevenueCat échouait au démarrage. Landing page redesignée depuis un bundle Claude Design.

- ✅ **Fix premium stale** (`App.tsx`): ajout de `koiny_premium_verified_at` (timestamp localStorage). Dans le `catch` du init RevenueCat : si la dernière vérification réussie date de plus de 7 jours → révocation automatique du premium. Dans `refreshPremiumStatus` : mise à jour du timestamp à chaque vérification réussie. Tolérance 7 jours pour le mode offline.
- ✅ **Landing page redesignée** (`public/landing-preview/index.html`): nouveau design depuis bundle Claude Design — gradient indigo, mockup iPhone CSS, 9 sections (hero, pain points, features, how it works, trust, pricing, final CTA, footer). Logo PNG + sélecteur FR/NL/EN + screenshot réel réintégrés depuis l'ancien design.
- ✅ **Build 1.0.7 build 5**: `npm run build` + `npx cap sync ios` effectués le 15/05/2026. Prêt à archiver depuis Xcode (Product → Archive). CURRENT_PROJECT_VERSION à incrémenter à 5 dans Xcode avant archive.
- 📊 **Stats au 15/05/2026**: 29 auth users. 2 nouveaux le 14/05 (allalichakib4@gmail.com + Apple Relay). Allali actif : enfant Chakib, 5 transactions, 1 objectif (Trottinette Xiaomi), 0 mission. Android : 0/12 testeurs Alpha inscrits.
- 📊 **Analytics funnel**: 6 users AUTH_SUCCESS → 6 ONBOARDING_COMPLETED (100%) → 7 CHILD_CREATED. 3 MISSION_APPROVED trackés. APP_OPEN en baisse après pic du 11/05.
- ⚠️ **RevenueCat Android**: offerings "default" configuré mais packages vides — produits IAP à créer dans Play Console après passage en production (12 testeurs × 14 jours).

### Actions du 10/05/2026 — Android build v2, polyfill UUID, engagement Megan
**Contexte**: Premier build Android soumis en Tests fermés (Alpha). Fix crash Android 11. Engagement de l'utilisatrice la plus active.
- ✅ **Polyfill `crypto.randomUUID`** (`index.tsx`): crash sur Android 11 / WebView anciens (`crypto.randomUUID is not a function` — 3 users OnePlus 8 Pro). Polyfill ajouté en tête de `index.tsx` utilisant `crypto.getRandomValues()` (disponible même sur vieux WebView). Pattern UUID v4 RFC 4122 conforme.
- ✅ **Android versionCode 2** (`android/app/build.gradle`): versionCode 1 → 2 pour uploader le nouveau AAB en remplacement du premier.
- ✅ **AAB signé uploadé** en Tests fermés Alpha sur Play Console (10/05/2026) — en cours d'examen Google.
- ✅ **Service account RevenueCat** (`revenuecat@koiny-485111.iam.gserviceaccount.com`): créé dans Google Cloud projet `koiny-485111`, Google Play Android Developer API activée, JSON key générée et uploadée dans RevenueCat. "Credentials need attention" persiste — propagation en attente (se résout à la publication ou après validation Play Console).
- ✅ **Clé Resend renouvelée**: [révoquée — ne jamais commiter de clés API].
- 📊 **Stats au 10/05/2026**: 22 auth users. User la plus active: **Megan** (`meganscutt@live.co.uk`) — 15 missions créées, revient quotidiennement. Trial 14 jours actif jusqu'au 22/05/2026 (RevenueCat ID: `5c9bb440...`).
- 📧 **Emails envoyés à Megan**: (1) explication flow parent/enfant + comment valider les missions; (2) tip interrupteur power pour sortir du profil enfant.
- ⏳ **Tests fermés**: nécessite 12 testeurs × 14 jours — actuellement 0 enrollés. Ajouter testers via Play Console > Tests fermés > Canal Alpha > Gérer testeurs.
- ⏳ **Produits IAP Android**: à créer dans Play Console (`com.koiny.premium.monthly` + `com.koiny.premium.yearly`) après validation de l'app.

### Actions du 07/05/2026 — RevenueCat Android + Play Store
- ✅ **RevenueCat Android configuré** (`services/subscription.ts`, `config.ts`, `.env`): app "Koiny (Play Store)" créée dans RevenueCat avec package `com.koiny.app`. Clé Android `goog_xxx` ajoutée dans `.env` (`VITE_REVENUECAT_API_KEY_ANDROID`). `subscription.ts` utilise désormais la bonne clé selon la plateforme (`Capacitor.getPlatform() === 'android'`).
- 📋 **À faire (Play Console validé)**: créer produits IAP `com.koiny.premium.monthly` + `com.koiny.premium.yearly` dans Play Console, uploader le service account JSON dans RevenueCat.
- 🖼️ **Screenshots Play Store prêts**: 7 screenshots × 3 langues (FR/EN/NL) générés via Rubixscript avec Samsung S24, gradient indigo foncé, captions bold blanches.
- ⏳ **Play Console validation identité en cours** (compte "Koiny Studio", soumis le 07/05/2026) — bouton "Créer une application" grisé jusqu'à approbation Google (1-3 jours ouvrables).

### Actions du 05/05/2026 — suivi users, edge function fix, grants premium
**Contexte**: Audit complet des nouveaux utilisateurs, correction de la fonction de re-engagement, et offre premium ciblée.
- 📊 **Stats au 05/05/2026**: 18 auth users, 14 profils, 10 avec enfants. Taux d'activation: 71% (vs 50% le 01/05). 4 nouveaux inscrits en 4 jours avec 80% de conversion.
- ✅ **Fix `notify-inactive-users` — fenêtre glissante** (`supabase/functions/notify-inactive-users/index.ts`): la fonction utilisait une fenêtre de 1 jour exacte (`cutoffStart`/`cutoffEnd`) → users manqués si la cron ratait un jour. Fix: suppression de `cutoffStart`, utilisation de `< J-N` seulement. L'anti-doublon `email_logs` gère les renvois.
- ✅ **Fix `notify-inactive-users` — filtre no_children** : `const { count }` retournait `null` en cas d'erreur → `(null ?? 0) > 0` = false → emails `no_children` envoyés à des parents qui avaient des enfants. Fix: `if (countErr || count === null || count > 0) continue`.
- ✅ **Clé Resend mise à jour** dans Supabase secrets (`RESEND_API_KEY`) — ancienne clé expirée.
- 🎁 **Grants premium RevenueCat** (via API V1 secret key): Premium 7 jours accordé à Jack, Lance, Elise, Hanne, Leyla (users actifs). Révoqué pour Chase, Vic, Mohamed, Esrom, Kayleigh (inactifs). Expire le 12/05/2026.
- 📧 **Emails "cadeau premium" envoyés** via Resend: parent de Hanne (`ineheyvaert@hotmail.com`, NL) + parent de Leyla (`leleche993@icloud.com`, FR).
- 🔑 **Clés RevenueCat**: V1 secret key utilisée pour les grants (`sk_xx...`). V2 incompatible avec l'endpoint `/v1/subscribers/{id}/entitlements/{id}/promotional`. Pour futurs grants: utiliser V1 uniquement.

### Corrections appliquées (29-30/04/2026 — birthday persistence, analytics funnel, branch reconcile)
**Contexte**: Test de la version 1.0.5 build 6 a révélé que la date de naissance se "désactivait" après quelques secondes. Diagnostic + fix + ajout d'un système de tracking funnel pour mesurer la conversion install → activation (Apple Search Ads s'arrête à l'install).
- ✅ **Bug birthday persistence** (`services/supabase.ts:418`): la lecture forçait `birthday: null` à chaque sync depuis Supabase → la date locale était écrasée à chaque reload. Cause racine: la colonne `birth_date` n'existait pas dans `children`. Fix: ajout colonne + lecture `c.birth_date` + écriture `birth_date: child.birthday` dans `childPayload`.
- ✅ **Crédit anniversaire automatique** (`App.tsx`): nouveau `useEffect` qui s'exécute au mount + `visibilitychange`. Pour chaque enfant dont `birthday` (mois/jour) match aujourd'hui ET `lastBirthdayRewardYear !== currentYear`: crédite 5€ (plafonné par `maxBalance`), entrée historique "Cadeau d'anniversaire", notification parent localisée (`t.child.happyBirthday`), maj `lastBirthdayRewardYear` (anti double-crédit).
- ✅ **Migration Supabase**: `ALTER TABLE children ADD COLUMN birth_date date, last_birthday_reward_year integer;` exécutée en prod.
- ✅ **Analytics funnel** (`services/monitoring.ts`): `BUSINESS` events désormais persistés dans `analytics_events` Supabase (fire-and-forget, ne bloque jamais l'UI). Session ID dans `sessionStorage`. Events instrumentés: `AUTH_SCREEN_VIEWED`, `AUTH_MODE_CHANGED`, `AUTH_PROVIDER_TAPPED` (Google/Apple), `AUTH_SUCCESS` (avec `isFirstSession`), `ONBOARDING_COMPLETED`, `CHILD_CREATED` (avec `isFirstChild`).
- ✅ **Migration Supabase**: table `analytics_events` (id uuid PK, event_name, user_id FK profiles, session_id, metadata jsonb, created_at). RLS: anon/authenticated INSERT only, SELECT service_role only.
- ✅ **Bump versions**: 1.0.4 (5) → 1.0.5 (7) → 1.0.6 (1). Apple a rejeté 1.0.5 (7) avec erreur 90062/90186 — train 1.0.5 fermé pour nouvelles soumissions car déjà approuvé. Migration vers train 1.0.6.
- ⚠️ **Régression `redesign` détectée — leçon apprise**: avant chaque archive, faire `git log main ^redesign` pour identifier les commits manquants. Régressions trouvées et fixées sur `redesign` lors de l'audit:
  - 4e slide onboarding "Prêt en 3 étapes" manquant (cherry-pick `0da2bcf`)
  - Bug NaN prix annuel `SubscriptionModal.tsx:387` (cherry-pick manuel du fix de `b077319`)
  - LandingView 1:1 koiny.app + iPad `"1,2"` non portés (mais LandingView est web-only donc pas critique pour iOS)
- 📝 **Branches en sync**: `main` et `redesign` ont toutes les deux birthday + analytics + 1.0.6 + 4e slide + fix NaN. Build iOS depuis `redesign`.

### Corrections appliquées (23/04/2026 — iOS History, Requests, Profile redesign)
**Contexte**: Suite du redesign iOS (branche `redesign`). Dashboard déjà fait. Scope: iOS uniquement (`!isAndroid`), Android MD3 intact.
- ✅ **History tab iOS** (`components/ParentView.tsx`): sélecteur d'avatars enfants (multi-enfants, outline accent couleur), badge total montant (vert/rouge), liste dans carte blanche `rounded-[18px]`. `VirtualHistoryList` reécrit avec prop `isIOS` + `curr` — items style carte iOS (icône colorée par type: ⭐ Mission, 🎁 Cadeau, ⚠️ Amende, 🛍️ Achat), label type bold, sous-titre titre+note+date, montant à droite.
- ✅ **Requests tab iOS** (`components/ParentView.tsx`): header "Demandes" + sous-titre count pending, sélecteur pills enfants colorés (accent couleur enfant, badge rouge pending count).
- ✅ **Profile tab iOS** (`components/ParentView.tsx`): layout page unique — carte gradient indigo "Parent Space" + badge, section FAMILY (rows enfants avatar+solde+emojis goals+chevron, bouton Ajouter), section SETTINGS (8 rows: Notifs toggle, Son toggle, Langue click-to-cycle, Devise select inline, Wallet Limit prompt, PIN & Sécurité, Koiny Premium, Aide, Contact Support), bouton SIGN OUT rouge, Supprimer compte, Lien légal. Formulaire enfant (edit) accessible depuis les rows FAMILY avec bouton Retour.
- ✅ **Android profile inchangé**: layout segmenté FAMILY/ACCOUNT préservé tel quel derrière `isAndroid` ternaire.
- ✅ **Sécurité**: token Supabase CLI (`sbp_a2c8ce...`) exposé dans `.claude/settings.json` → révoqué automatiquement par Supabase (GitHub Secret Scanning). Fichier retiré du tracking git, `.claude/` ajouté au `.gitignore`.
- 📝 **Branche**: redesign iOS sur la branche `redesign`. Depuis 30/04, `main` et `redesign` sont synchronisées sur les fixes de production (birthday, analytics, 1.0.6) — toujours faire `git log main ^redesign` avant archive.

### Corrections appliquées (22/04/2026 — iOS Parent Dashboard facelift)
**Contexte**: Import du bundle de design Claude Design (`docs/design-parent-dashboard/`) — prototype hi-fi iOS du parent dashboard. Scope: iOS uniquement (`!isAndroid`), Android MD3 intact.
- ✅ **iOS Balance Card consolidée** (`components/ParentView.tsx` ~1635): avatar + nom + âge en header, pill `BALANCE` top-right, gros montant, grille 3 colonnes `EARNED / SPENT / FINES` (weekly summary), puis boutons Dépôt/Retrait full-width côte-à-côte. Goal progress bar conservée sous un divider. Remplace l'ancien layout (montant + boutons empilés à droite).
- ✅ **iOS Weekly Hero dégraissée** (`components/ParentView.tsx` ~1493): stats retirées du hero supérieur puisqu'elles sont maintenant dans la Balance Card. Le `heroRef` reste présent (requis par la logique de scroll du child selector) mais avec un pt-24 pb-4 minimaliste (uniquement backdrop indigo + blobs déco).
- ✅ **Mission cards iOS accent coloré**: bordure gauche 3px color accent enfant sur les missions ACTIVE (style inline — `border-l-{color}` n'est pas dans le safelist Tailwind), bordure gauche orange-500 sur les missions PENDING. Android MD3 inchangé.
- 📝 **i18n inline** (patterns CLAUDE.md respectés): nouveaux labels Gains/Verdiend/Earned, Dépenses/Uitgaven/Spent, Amendes/Boetes/Fines, Dépôt/Storting/Deposit, Retrait/Opname/Withdraw, `X ans` / `X jaar` / `X yrs old`.

### Corrections appliquées (21/04/2026)
**Contexte**: Diagnostic Supabase — 19 profils `parent` au total, dont 8 n'ont jamais créé d'enfant. Conversion par provider: Google 83% (5/6), Apple 50% (6/12). Apple Sign-In convertit 33 pts de moins que Google — flow post-signup pas assez directif. 3/8 drop-offs utilisent Apple Private Relay → emails re-engagement filtrés. Tous les drop-offs ont `full_name = "Parent"` (default jamais modifié) et 7/8 ne sont jamais revenus après le signup.
- ✅ **FAB intelligent** (`components/ParentView.tsx:3224-3233`): le bouton `+` central de la `BottomNavigation` appelle `startAddChild()` quand `data.children.length === 0` au lieu de scroller vers `missionFormRef` (qui n'existe pas sans enfant). Avant: tap sur `+` → rien de visible → friction pour user frais.
- ✅ **Crown Premium masquée sur empty state** (`components/ParentView.tsx:1272` + `components/AndroidTopBar.tsx:34`): le bouton doré "Premium" est caché tant que `data.children.length === 0` — évite de prioriser un paywall avant même que le parent ait créé son 1er enfant. Nouveau prop `hasChildren` passé à `AndroidTopBar`. Variable locale `showPremiumCrown = !isPremium && hasChildren` remplace les 2 conditions `!isPremium` dans `AndroidTopBar`.
- 📊 **Note requête SQL Supabase**: la query saved "Liste des parents sans enfants" utilisait `c.profile_id = p.id` — mauvaise colonne. La bonne est `c.user_id = p.id`. La colonne `children.profile_id` est toujours `NULL` (vestige migration). `children.user_id` est le seul lien vivant, `children.family_id` n'est utilisé que sur 2/13 lignes.
- ✅ **Email re-engagement `no_children` à J+2** (`supabase/functions/notify-inactive-users/index.ts`): nouveau type d'email ciblé sur les parents sans enfant — "Plus qu'une étape, crée le profil de ton enfant". Filtré via `children.user_id` count = 0. En FR/NL/EN. Bug dead code supprimé (ancien `inactive_email_sent` qui n'existe pas dans `profiles`). Déployé sur Supabase.
- ✅ **Colonne `language` dans `profiles`** (Supabase prod): `ALTER TABLE profiles ADD COLUMN language text DEFAULT 'fr' CHECK (language IN ('fr', 'nl', 'en'))`. Permet aux emails de re-engagement d'utiliser la langue du profil.
- ✅ **Sync langue → Supabase** (`App.tsx`): `setLanguage()` persiste la langue dans `profiles` via Supabase fire-and-forget. `initialize()` synce aussi la langue effective au login (pour les profils existants).

### Corrections appliquées (11/04/2026)
- ✅ **Limites de saisie des montants**: `onChange` bloque la frappe au-delà du max sur tous les champs numériques (reward mission, edit reward, transaction — iOS + Android). Le `max` HTML ne suffit pas, il faut valider dans `onChange`.
- ✅ **Devise dans LoginView**: `curr = data.currency || '€'` utilisé dans les balances et aria-labels (plus d'€ hardcodé).
- ✅ **Label Récompense sans devise**: `formAmountLabel` en FR/NL/EN retiré du `(€)` hardcodé dans `i18n.ts`.
- ✅ **Champ numérique limite cagnottes**: `isNumeric: true` dans promptConfig → clavier numérique, sans œil — corrigé dans les 3 branches (Android MD3, iOS standalone, iOS inline).
- ✅ **Balance cap dynamique** (`App.tsx`): Respect de `data.maxBalance` au lieu de la constante `MAX_BALANCE` lors des crédits de balance.
- ✅ **Build**: Vite cache supprimé (`node_modules/.vite` + `dist`) avant rebuild pour éviter que l'ancien bundle soit conservé.

### Corrections appliquées (02/04/2026)
- ✅ **Sélecteur de devise**: `currency` ajouté dans `GlobalState` + `INITIAL_DATA`. Constante `CURRENCIES` (23 devises: EUR, USD, GBP, CHF, CAD, AUD, SGD, HKD, NZD, JPY, INR, TRY, KRW, BRL, SEK, NOK, DKK, PLN, ZAR, MAD, AED, HUF, CZK). Dropdown dans settings Profil. `curr` propagé partout dans ParentView + ChildView. Handler `setCurrency()` dans App.tsx.
- ✅ **Suppression mode démo**: Bouton "Lancer le Mode Démo" et lien "Continuer sans compte" supprimés de AuthView.tsx. `getDemoData` import retiré. Message "Service indisponible" affiché si Supabase non configuré.
- ✅ **Re-engagement emails (Supabase Edge Function)**: `supabase/functions/notify-inactive-users/index.ts` déployée. Emails FR/NL/EN à 7j (tu nous manques), 30j (missions en attente), 90j (compte désactivé dans 30j). Table `email_logs` créée (anti-doublons). Cron pg_cron 08h00 UTC quotidien. Secrets: `RESEND_API_KEY` + `SERVICE_ROLE_KEY` configurés dans Supabase.
- ✅ **tsconfig.json**: dossier `supabase/` exclu du build TypeScript (code Deno incompatible avec le compilateur Node).
- ✅ **iOS version 1.0.2 build 3**: `MARKETING_VERSION` passé de 1.0.1 → 1.0.2 et `CURRENT_PROJECT_VERSION` de 2 → 3 dans `project.pbxproj`. Soumis pour review Apple Store. Compte test review: `akians237@gmail.com` / `KoinyReview2024` / PIN: 0000.
- ✅ **iOS version 1.0.3 build 4**: `MARKETING_VERSION` → 1.0.3, `CURRENT_PROJECT_VERSION` → 4. Soumis pour review Apple le 11/04/2026.
- ✅ **App Store Connect**: Nouveautés saisies en FR/NL/EN. Connexion requise cochée avec compte test.

### Corrections appliquées (31/03/2026 — session 3)
- ✅ **Android MD3 — ParentView.tsx top bar**: `AndroidTopBar` intégré en remplacement de la nav iOS (conditionnel `isAndroid`). Overscroll roof iOS désactivé sur Android. `isScrolled` state ajouté (scroll listener existant étendu) — top bar transparente sur hero indigo, blanche après scroll.
- ✅ **Android MD3 — ParentView.tsx balance card**: Jauge d'objectif dynamique — couleur change selon progression: rouge (0–39%), orange (40–74%), vert (75–99%), or (100%). Hauteur portée à `h-2.5`.
- ✅ **Android MD3 — SubscriptionModal.tsx**: Handle bar MD3 (`w-10 h-1 bg-slate-300 rounded-full`) ajouté en haut du sheet, Android uniquement.
- ✅ **Android — suppression FAB ParentView**: Le bouton `+` flottant (`AndroidFAB`) retiré du dashboard parent — le FAB de la bottom nav (`BottomNavigation`) suffit.

### Corrections appliquées (30/03/2026 — session 2)
- ✅ **Android MD3 — ChildView.tsx**: Adaptation complète du dashboard enfant. Hero: `bg-indigo-600` plat (pas de gradient, pas de stardust SVG, pas de backdrop-blur), sentence case labels, surface blanche `rounded-t-3xl`. Alerte pénalité: carte tonal `rounded-2xl`. Historique: bottom sheet MD3 (`fixed inset-0`, `rounded-t-[28px]`, handle bar, backdrop dismiss). Objectifs: cartes `rounded-2xl` avec barre orange simple. Missions: liste `rounded-2xl` avec chips tonal status (indigo pending, emerald actif). iOS: code préservé dans `else` branches.

### Corrections appliquées (30/03/2026)
- ✅ **Demo data bleed fix (App.tsx)**: Mode démo ne persiste plus dans localStorage/Capacitor Preferences. `saveData()` bloqué quand `ownerId === 'demo'`. Au `SIGNED_OUT`, nettoyage complet: `koiny_local_v1`, `koiny_last_view`, `koiny_last_child_id`, `koiny_premium_active` (localStorage + `persistentStorage.remove`).
- ✅ **Premium state reset (App.tsx)**: Si RevenueCat retourne `isSubscribed: false`, `isPremium` est explicitement remis à `false` et `koiny_premium_active` supprimé du localStorage. Empêche le stale premium d'un ancien utilisateur.
- ✅ **Android MD3 — modals ParentView.tsx**: Variantes Android pour les modals inline (offline, edit mission, transactions, approve/reject, prompt/alert, biometric choice). Pattern: `isAndroid ? (version MD3) : (version iOS)`.
- ✅ **Android MD3 — ConfirmDialog.tsx**: Dialog `rounded-[28px]`, icône en cercle, titre left-aligned, text buttons right-aligned.
- ✅ **Android MD3 — HelpModal.tsx + LegalModal.tsx**: Bottom sheet avec handle bar, surface claire, bouton indigo full-width.
- ✅ **Android MD3 — OnboardingView.tsx**: Import `isAndroid` re-ajouté.
- ✅ **Build number iOS**: Incrémenté `CURRENT_PROJECT_VERSION` de 1 → 2 dans `project.pbxproj` (4 targets: App Debug/Release, Widget Debug/Release).
- ✅ **Android Gradle JDK**: `gradleJvm` fixé sur `jbr-21` dans `android/.idea/gradle.xml`.

### Corrections appliquées (20/03/2026 — session 3)
- ✅ **`services/pinStorage.ts` — anonymisation logs**: `console.log(userId)` remplacé par `logger.debug(logger.anonymize(userId))` — userId ne s'affiche plus en clair dans les logs Xcode
- ✅ **`handleFullSignOut` — réactivité bouton**: navigation vers `AUTH` immédiate (optimistic) avant les appels réseau. `getUser()` (réseau) remplacé par `getSession()` (cache local). Supprime le besoin de double-clic
- ✅ **`handleFullSignOut` — vue correcte**: navigue vers `AUTH` (page de connexion) au lieu de `LANDING` (page marketing)

### Corrections appliquées (20/03/2026 — session 2)
- ✅ **`hooks/useModal.ts` créé**: hook centralisé iOS-compatible — `position: fixed` + `top: -${scrollY}px` + `width: 100%` sur le body (simple `overflow: hidden` insuffisant sur iOS quand le clavier apparaît). Sauvegarde et restaure la position de scroll. Compteur global pour les modals imbriqués (pas de déverrouillage prématuré).
- ✅ **ConfirmDialog.tsx**: `useModal(isOpen)` ajouté AVANT le `if (!isOpen) return null` (respect Rules of Hooks)
- ✅ **HelpModal.tsx**: idem — `useModal(isOpen)` avant early return
- ✅ **SubscriptionModal.tsx**: `useModal(isOpen)` + backdrop click (tap en dehors du sheet → ferme le modal)
- ✅ **ParentView.tsx**: `useModal(_anyInlineModalOpen)` couvrant tous les modals inline (offline, editingMission, transactionType, selectedMissionId, promptConfig, biometricChoice)

### Corrections appliquées (21/03/2026)
- ✅ **PIN flash "Code erroné" — fix définitif**: machine d'état `pinState: 'idle'|'validating'|'error'|'success'` + `pinErrorTimeoutRef` (useRef) avec `clearTimeout()` à chaque nouveau digit. Race condition éliminée : le timeout de l'ancienne tentative incorrecte ne peut plus déclencher `'error'` après que `verifyPin()` a retourné `true`. Avant: deux booleans `isPinWrong + isPinValidating` indépendants — le timeout se déclenchait pendant `isPinValidating=true`, puis quand `setPinValidating(false)` rendait, `isPinWrong` était encore `true` → flash. Désormais: `clearTimeout` dès le 1er chiffre suivant.
- ✅ **Xcode dSYM Sentry**: `DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym"` ajouté sur la target App Release (pas seulement projet), Run Script Build Phase `65D4B2E1` copie `Sentry.framework.dSYM` dans `$DWARF_DSYM_FOLDER_PATH` lors de l'Archive. Élimine le warning App Store Connect "The archive did not include a dSYM for Sentry.framework".
- ✅ **Déconnexion — navigation optimiste**: `handleFullSignOut` utilise `getSession()` (cache local) au lieu de `getUser()` (réseau) + `setView('AUTH')` immédiat avant les appels async.
- ✅ **pinStorage.ts — logs anonymisés**: tous les `console.log(userId)` remplacés par `logger.debug(logger.anonymize(userId))`.

### Corrections appliquées (20/03/2026)
- ✅ **PIN hashé à la création**: `handleSetPin` dans App.tsx appelle `hashPin()` (PBKDF2) avant tout stockage — avant: PIN "1234" stocké en clair dans state, Preferences et `pin_hash` Supabase
- ✅ **deleteAccount() — révocation Google**: `GoogleAuth.signOut()` appelé avant `supabase.auth.signOut()` → empêche reconnexion silencieuse via token Google encore actif
- ✅ **deleteAccount() — reset state complet**: `onDeleteAccount` efface `koiny_last_view`, `koiny_last_child_id`, appelle `setData(INITIAL_DATA)` + `setOwnerId(undefined)` immédiatement (sans attendre event `SIGNED_OUT`)
- ✅ **initialize() — routing compte frais**: si session valide mais 0 enfants → `setView('PARENT')` directement (skip LOGIN) → élimine le double-tap après suppression + reconnexion
- ✅ **Onglet Historique — header sticky**: filtre bar (vue liste/graphique + CE MOIS/TOUT + corbeille) maintenant `sticky z-10` avec `top: calc(max(60px, env(safe-area-inset-top)) + 52px)` → reste fixe pendant scroll
- ✅ **Sélecteur enfants — 3+ enfants**: `snap-x snap-mandatory`, `pr-20` (évite overlap bouton power), `min-w-[120px]` par pill, gradient indicateur droit, auto-scroll vers enfant actif (`childSelectorScrollRef` + useEffect)

### Corrections appliquées (19/03/2026)
- ✅ **Supabase RLS `profiles`**: RLS activée, policies redondantes supprimées (garder "Simple Access" uniquement)
- ✅ **Supabase fonctions search_path**: `SET search_path = public` ajouté sur 5 fonctions (`remove_co_parent`, `update_child_balance`, `update_updated_at_column`, `check_goal_achievement`, `calculate_child_total`)
- ✅ **`delete_user_data` RPC créée**: supprime transactions → missions → goals → children → profiles → auth.users (SECURITY DEFINER). Avant: fonction inexistante → compte non supprimé → reconnexion possible après "suppression"
- ✅ **`deleteAccount()`**: propagation de l'erreur + nettoyage `localStorage.removeItem('koiny_premium_active')`
- ✅ **Google Sign In perf**: `googleAuthInitialized` flag module-level → `GoogleAuth.initialize()` appelé une seule fois au lieu de chaque sign-in
- ✅ **Email redirect deep link**: `emailRedirectTo` utilise `com.koiny.app://callback` sur native au lieu de `window.location.origin`
- ✅ **Supabase URL Configuration**: Site URL → `https://koiny.app/`, Redirect URLs → `com.koiny.app://callback` + `com.koiny.app://**`

### Points à surveiller
- **Premium spoofable:** localStorage `koiny_premium_active` modifiable côté client
  - Mitigation: refresh RevenueCat périodique (6h + foreground) détecte annulations
- **Clés API:** Doivent être dans `.env`, JAMAIS hardcodées
- **Input validation:** Toujours valider longueur + isNaN sur parseFloat
- **Console logs:** Utiliser `services/logger.ts` pour données sensibles
- **SMTP Supabase:** Service intégré Supabase non adapté à la production — configurer Resend avant launch public
- **PIN reset pour users OAuth (Apple/Google):** Utilise encore `signInWithPassword` dans ParentView.tsx → à migrer vers OTP email quand Resend est configuré

## Remotion (vidéos promo)

Projet: `/Users/andre/Desktop/koiny-promo`

**Prérequis:** Node 20 requis (Node 24 bloque le démarrage silencieusement)

```bash
cd ~/Desktop/koiny-promo
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm run dev
# Ouvrir http://localhost:3000 (ou 3001 si 3000 occupé)
```

**Notes:**
- Premier démarrage après `rm -rf node_modules/.cache` : lent (recompile le bundle webpack)
- Premier démarrage sur machine vierge : télécharge Chrome Headless Shell (~90 Mo) silencieusement
- Le studio affiche `Building...` pendant la compilation — c'est normal, patienter
- Node 20 installé via `brew install node@20` (coexiste avec Node 24 pour Koiny)

## TestFlight

**Workflow de déploiement:**
1. `npm run build` (~24 min)
2. `npx cap sync ios`
3. Xcode: Product > Archive
4. Organizer: Distribute App > App Store Connect
5. App Store Connect: TestFlight > Créer groupe externe > Soumettre pour review

**Notes:**
- Les abonnements en TestFlight sont en mode Sandbox (gratuit pour testeurs, durées accélérées)
- Review Apple pour tests externes: 24-48h
- Xcode incrémente automatiquement le build number à chaque archive
- Builds: (1) 15/03, (2) 15/03, (3) 16/03, (4+) 16/03 après contrat signé
- Build actuel: **version 1.0.3, build 4** (11/04/2026 — limites saisie, devise, champ numérique cagnotte)

**Android:**
- Gradle JDK: `jbr-21` (configuré dans `android/.idea/gradle.xml`)
- Build debug: `cd android && ./gradlew assembleDebug` (~14s)
- Build release AAB: `cd android && ./gradlew bundleRelease` (~2 min)
- Sync: `npx cap sync android`
- versionCode actuel: **2** (versionName "1.0") — soumis en Tests fermés Alpha le 10/05/2026
- Keystore: `android/koiny-release.jks`, alias `koiny`, props dans `android/keystore.properties`
- Package: `app.koiny.parent`

**Play Console — Tests fermés (Alpha):**
- Statut: en cours d'examen (soumis 10/05/2026)
- Nécessite 12 testeurs × 14 jours pour débloquer la production
- Ajouter testeurs via: Tests fermés > Canal Alpha > Testeurs > Gérer les testeurs

**RevenueCat Android:**
- App "Koiny (Play Store)" créée dans RevenueCat, package `com.koiny.app`
- Service account: `revenuecat@koiny-485111.iam.gserviceaccount.com` (projet GCP `koiny-485111`)
- Google Play Android Developer API activée dans GCP
- JSON uploadé dans RevenueCat > Android app > Service credentials
- Statut: "Credentials need attention" — propagation en cours, se résoudra à la publication
- Produits IAP à créer dans Play Console: `com.koiny.premium.monthly` + `com.koiny.premium.yearly`

**Contrat "Apps payantes":**
- Statut: "Actif" (signé le 16/03/2026)
- Produits IAP: Disponibles (com.koiny.premium.monthly, com.koiny.premium.yearly)
- RevenueCat: Récupère les produits correctement

**Sentry — Issues connues:**
- WatchdogTermination (RAM) — iOS tue l'app pour mémoire excessive, à investiguer
- HTTP 406 sur `app_alerts` — table créée (19/03), devrait être résolu
- Requêtes profiles Supabase redondantes (3-4x par init)
- `crypto.randomUUID is not a function` sur Android 11 (OnePlus 8 Pro) — **fixé** (polyfill dans `index.tsx`)

**Migration possible:**
- Sentry → Firebase Crashlytics (gratuit illimité, simple à intégrer)

## UI/UX Design Guidelines

### Ombres (Shadows)
- **Pattern correct:** `shadow-md shadow-{color}-500/{opacity}` (ex: `shadow-md shadow-indigo-500/25`)
- **JAMAIS:** `shadow-lg shadow-{color}-200` → crée des halos blancs/pastel trop visibles
- **JAMAIS:** `bg-white/70` + `shadow-lg` sur des boutons flottants → halo blanc

### Bordures
- Sur fond coloré/gradient: **pas de** `border border-white/10` sur les boutons (crée des bordures blanches visibles)
- Sur fond clair: `border border-slate-100 dark:border-slate-800` est ok

### Scroll
- **JAMAIS** imbriquer deux `overflow-y-auto` → scroll chaîné imprévisible
- Conteneur externe: `overflow-hidden`, seul le conteneur interne scrolle

### iOS Safe Area & Overscroll
- `.sticky-safe-top` dans `index.css`: `top: max(60px, env(safe-area-inset-top)) !important` — pour les éléments sticky sous la nav
- **Overscroll roof**: div fixe `z-[60]` avec `height: env(safe-area-inset-top)` absorbe le bounce iOS en haut:
  ```tsx
  <div className={`fixed top-0 left-0 right-0 z-[60] pointer-events-none ${mainView === 'dashboard' ? 'bg-indigo-700 dark:bg-slate-900' : 'bg-white dark:bg-slate-950'}`} style={{ height: 'env(safe-area-inset-top)' }} />
  ```
- Mettre **en premier** dans le return (avant la nav), z-index au-dessus de tout

### Hero Visibility / Child Selector Slide
- Utiliser `scroll` listener + `getBoundingClientRect()` (PAS IntersectionObserver — threshold trop imprécis):
  ```tsx
  useEffect(() => {
    if (mainView !== 'dashboard') { setIsHeroVisible(true); return; }
    const handleScroll = () => {
      if (!heroRef.current) return;
      setIsHeroVisible(heroRef.current.getBoundingClientRect().bottom > 110);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mainView]);
  ```
- Child selector slide: `!isHeroVisible && !data.isPremium ? 'pl-20' : 'pl-6'` — évite l'overlap avec la couronne (64px wide incl. padding)

### ChildView (vue enfant) — Règles spécifiques
- **JAMAIS** `backdrop-blur-xl` sur des boutons superposés à un gradient coloré → crée un halo blanc/glassmorphism
- **Boutons sur fond gradient**: `bg-white/20` (pas `bg-white/10`, trop transparent)
- **Conteneurs de sections**: `bg-white dark:bg-slate-800` (PAS `bg-slate-50` → crée des "gaps" gris entre sections)
- **Ombres cartes stats**: `shadow-md shadow-emerald-500/25` (PAS `shadow-lg shadow-emerald-100`)
- **Bouton "Choisir un cadeau"**: style basé sur `data.colorClass` de l'enfant, pas une couleur hardcodée

### Textes i18n inline
- Pour les textes courts non réutilisables (ex: labels settings), utiliser le pattern inline:
  `{language === 'fr' ? 'Texte FR' : language === 'nl' ? 'Tekst NL' : 'Text EN'}`
- Pour les textes réutilisables, ajouter dans `i18n.ts`

### Contact Support
- Email: `hello@koiny.app`
- Bouton "Contacter le support" dans ParentView.tsx > Settings > Account (avant "Se déconnecter")

## Splash Screen

- Géré par `@capacitor/splash-screen` (Capacitor, PAS React Native)
- Config dans `capacitor.config.ts`: backgroundColor `#3730A3`, spinner blanc, 3s
- Image: `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png`
- Pour modifier: remplacer le PNG + `npx cap sync ios`

## Simulator iOS — Screenshots App Store

Pour bloquer l'heure à 9:41 et batterie full dans le Simulator:
```bash
UDID=$(xcrun simctl list devices booted | grep -oE '\([A-F0-9\-]+\)' | tr -d '()' | head -1) && \
xcrun simctl status_bar $UDID override --time 09:41 --batteryState charged --batteryLevel 100
```

## Build exclusions

`tsconfig.json` et `vite.config.ts` excluent: `screenshots/`, `.agent/`, `.agents/`, `.claude/`, `docs/`, `ios/`
Ces dossiers ne font pas partie du build et ne doivent pas etre inclus.

## Android — Adaptation MD3

**Pattern pour modals adaptatifs iOS/Android:**
```tsx
import { isAndroid } from '../hooks/usePlatform';

// Dans le JSX:
{isAndroid ? (
  // Version Material Design 3: rounded-[28px], text buttons alignés à droite,
  // inputs avec border simple (rounded-xl), icônes dans cercles colorés
  <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl">
    <div className="flex justify-end gap-2 px-6 pb-6">
      <button className="text-sm font-medium text-slate-600 px-4 py-2.5 rounded-full">Cancel</button>
      <button className="text-sm font-medium text-indigo-600 px-4 py-2.5 rounded-full">Confirm</button>
    </div>
  </div>
) : (
  // Version iOS: rounded-[2.5rem], boutons plein width, backdrop-blur,
  // gradients headers, uppercase tracking-widest labels
  <div className="bg-white/90 rounded-[2.5rem] shadow-2xl">
    ...
  </div>
)}
```

**Composants Android créés (non traqués):**
- `components/AndroidBottomNav.tsx`
- `components/AndroidFAB.tsx`
- `components/AndroidInput.tsx`
- `components/AndroidListItem.tsx`
- `components/AndroidSwitch.tsx`
- `components/AndroidTopBar.tsx`

**Composants adaptés avec variantes `isAndroid` (✅ = terminé, ⏳ = reste):**
| Composant | Statut | Ce qui a été adapté |
|---|---|---|
| `components/ChildView.tsx` | ✅ | Hero, penalty alert, history bottom sheet, goal cards, mission list |
| `components/ConfirmDialog.tsx` | ✅ | Dialog MD3 complet |
| `components/HelpModal.tsx` | ✅ | Bottom sheet avec handle bar |
| `components/LegalModal.tsx` | ✅ | Bottom sheet avec handle bar |
| `components/OnboardingView.tsx` | ✅ | Import isAndroid |
| `components/ParentView.tsx` | ✅ (modals) | Offline, edit mission, transactions, approve/reject, prompt/alert, biometric |
| `components/SubscriptionModal.tsx` | ✅ | Handle bar MD3 |
| `components/ParentView.tsx` | ✅ (nav + hero) | AndroidTopBar, isScrolled, jauge dynamique, overscroll roof iOS-only |
| `components/LoginView.tsx` | ✅ | Top band indigo, child cards MD3, bottom button |
| `components/BottomNavigation.tsx` | ✅ | MD3NavButton pill indicator, FAB rounded-2xl |

**`hooks/usePlatform.ts`:**
```typescript
import { Capacitor } from '@capacitor/core';
const platform = Capacitor.getPlatform();
export const isAndroid = platform === 'android';
export const isIOS = platform === 'ios';
export const isWeb = platform === 'web';
export const isNative = Capacitor.isNativePlatform();
```
