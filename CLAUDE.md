# CLAUDE.md — Koiny

> Instructions pour Claude Code travaillant sur ce projet.
> Lire aussi `context.md` pour le contexte complet du projet.

## Projet

Koiny est une app mobile iOS/Android d'education financiere pour enfants 6-14 ans. Stack: TypeScript, React 18, Vite 7, Tailwind CSS, Capacitor 8, Supabase, RevenueCat.

**App Store:** https://apps.apple.com/us/app/koiny-pocket-money-for-kids/id6760566260
**Statut:** Publiée sur l'App Store (version 1.0.6). Version 1.0.7 build 1 prête à archiver depuis la branche `redesign` (01/05/2026) — inclut fix widget SceneDelegate + widget dynamique. Train 1.0.6 fermé par Apple (déjà approuvé). Android en cours de finalisation.

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
| `services/notifications.ts` | Notifications locales |
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
- Clé API dans `.env` (VITE_REVENUECAT_API_KEY)

**Stockage local premium:**
- localStorage key: `'koiny_premium_active'` (valeur: `'true'` ou absent)
- Toujours lu par `migrateData(cloudData)` dans `services/storage.ts`

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
- Build: `cd android && ./gradlew assembleDebug` (~14s)
- Sync: `npx cap sync android`

**Contrat "Apps payantes":**
- Statut: "Actif" (signé le 16/03/2026)
- Produits IAP: Disponibles (com.koiny.premium.monthly, com.koiny.premium.yearly)
- RevenueCat: Récupère les produits correctement

**Sentry — Issues connues:**
- WatchdogTermination (RAM) — iOS tue l'app pour mémoire excessive, à investiguer
- HTTP 406 sur `app_alerts` — table créée (19/03), devrait être résolu
- Requêtes profiles Supabase redondantes (3-4x par init)

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
