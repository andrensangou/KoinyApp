# CLAUDE.md — Koiny

> Instructions pour Claude Code travaillant sur ce projet.
> Lire aussi `context.md` pour le contexte complet du projet.

## Projet

Koiny est une app mobile iOS d'education financiere pour enfants 6-14 ans. Stack: TypeScript, React 18, Vite 7, Tailwind CSS, Capacitor 8, Supabase, RevenueCat.

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
| `services/storage.ts` | loadData/saveData, cache hybride |
| `services/subscription.ts` | RevenueCat SDK, IAP |
| `services/pinStorage.ts` | Stockage PIN local + sync |
| `services/notifications.ts` | Notifications locales |
| `services/realtime.ts` | Supabase Realtime |
| `services/widgetBridge.ts` | Bridge JS -> iOS Widget |
| `services/logger.ts` | Logger sécurisé avec anonymisation |
| `services/security.ts` | PBKDF2 PIN hashing (100k iterations, SHA-512) |
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
