# KOINY — Context IA (v3.0 · Mars 2026)

> Source de vérité pour tout assistant IA travaillant sur ce projet.

---

## RÈGLES CRITIQUES (lire en premier)

**JAMAIS :**
- Écraser `pin_hash` avec `null` dans Supabase (géré exclusivement par `services/pinStorage.ts`)
- Bloquer l'UI en attendant un appel réseau (toujours optimistic UI d'abord)
- Créer enfant/mission sans vérifier l'existence préalable (risque doublons)
- Oublier `isDirectSupabaseOperation.current = true` lors d'opérations DB directes
- Modifier `ParentView.tsx` sans précaution (2526 lignes, très dense)
- Utiliser autre chose que `crypto.randomUUID()` pour les nouveaux IDs

**TOUJOURS :**
- Mettre à jour `updatedAt: new Date().toISOString()` à chaque modification du state
- Supporter les 3 langues (fr/nl/en) pour tout nouveau texte dans `i18n.ts`
- Passer par `updateChild(childId, updater)` pour modifier un enfant (force immediateSave + updatedAt)
- Utiliser `setData(prev => ({ ...prev, updatedAt: ..., children: ... }))` (immutable update)
- Tester en mode offline (couper réseau)

---

## Stack

| Couche | Techno | Version |
|---|---|---|
| Langage | TypeScript strict | ^5.2 |
| Frontend | React | ^18.3 |
| Build | Vite | ^7.3 |
| Styling | Tailwind CSS | ^3.4 |
| Mobile | Capacitor | ^8.0 |
| Backend | Supabase (PostgreSQL + Auth + Realtime + RLS) | ^2.95 |
| Auth | Google OAuth natif + Apple Sign-In natif | — |
| Crash | Sentry (`@sentry/capacitor` + `@sentry/react`) | ^3.0 |
| Charts | Recharts | ^2.12 |
| Virtualisation | @tanstack/react-virtual | ^3.13 |
| Tests | Vitest | ^4.0 |

```bash
npm run dev        # Dev web
npm run build      # tsc + vite build → dist/
npx cap sync ios   # Sync vers Xcode
npx cap open ios   # Ouvrir Xcode
```

---

## Fichiers Clés

| Fichier | Lignes | Rôle |
|---|---|---|
| `App.tsx` | 1277 | Racine : GlobalState, ViewState, tous les handlers métier |
| `components/ParentView.tsx` | 2526 | Dashboard parent (multi-onglets, très dense) |
| `i18n.ts` | 1104 | Traductions FR/NL/EN |
| `types.ts` | 155 | Interfaces TypeScript + constantes + données démo |
| `services/supabase.ts` | 666 | Client Supabase, Auth, CRUD, `loadFromSupabase`, `saveToSupabase` |
| `services/storage.ts` | 416 | `loadData` / `saveData`, cache hybride Preferences+Supabase |
| `services/security.ts` | — | PIN PBKDF2 100k iter SHA-512, timing-safe compare |
| `services/pinStorage.ts` | — | Stockage PIN local + sync Supabase |
| `services/widgetBridge.ts` | — | Bridge JS → iOS Widget (Preferences → UserDefaults) |
| `services/notifications.ts` | — | Notifications locales Capacitor + Web |
| `services/realtime.ts` | — | Supabase Realtime (`postgres_changes`) |
| `constants/icons.ts` | — | Mapping `icon_id` → classe FontAwesome |

---

## Types TypeScript (depuis `types.ts`)

```typescript
type MissionStatus = 'ACTIVE' | 'PENDING' | 'COMPLETED';
type GoalStatus    = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
type Language      = 'fr' | 'nl' | 'en';
type ParentBadge   = 'NOVICE' | 'MENTOR' | 'EXPERT' | 'FINTECH_GURU';

const MAX_BALANCE = 100; // limite stricte 6-14 ans
const BADGE_THRESHOLDS = { MENTOR: 10, EXPERT: 50, FINTECH_GURU: 200 };

interface Mission {
  id: string; title: string; reward: number; icon: string;
  status: MissionStatus; feedback?: string; createdAt: string;
}
interface Goal {
  id: string; name: string; target: number; icon: string; status?: GoalStatus;
}
interface HistoryEntry {
  id: string; date: string; title: string; amount: number; note?: string;
}
interface ChildProfile {
  id: string; name: string; avatar: string; colorClass: string;
  balance: number; goals: Goal[]; missions: Mission[]; history: HistoryEntry[];
  tutorialSeen: boolean; birthday?: string; lastBirthdayRewardYear?: number;
  giftRequested?: boolean; missionRequested?: boolean;
}
interface GlobalState {
  children: ChildProfile[]; parentTutorialSeen: boolean; language: Language;
  parentPin: string | null; ownerId?: string; soundEnabled: boolean;
  notificationsEnabled?: boolean; lastParentLogin?: string;
  parentBadge?: ParentBadge; totalApprovedMissions?: number;
  lastReminderSent?: string; maxBalance?: number; isPremium?: boolean;
  updatedAt?: string;
}
```

---

## Navigation

```typescript
type ViewState = 'LANDING' | 'AUTH' | 'LOGIN' | 'CHILD' | 'PARENT';

// Flux normal :
// AUTH (Google/Apple/Email) → LOGIN → CHILD (enfant) ou PIN → PARENT
// Mode démo : AUTH → "Essayer sans compte" → LOGIN (données démo)
// Première visite : LANDING → OnboardingView → AUTH
```

---

## Architecture de Synchronisation

**Principe : "Optimistic UI → Local → Cloud async"**

```
Action utilisateur
  → setData(prev => ...) immédiat            ← TOUJOURS d'abord
  → localStorage + Capacitor Preferences
  → saveData(data, ownerId) en arrière-plan  ← non-bloquant
  → Si échec réseau → retry au retour online
```

### Guards dans `App.tsx` (refs React, pas de re-render)

```typescript
isSavingRef.current              // Empêche saves concurrents
isReloadingFromRealtime.current  // Empêche boucle save ↔ realtime
isDirectSupabaseOperation.current // Bloque le save auto pendant opérations directes
isInitializing.current           // Bloque pendant l'init
isSyncingFromOnline.current      // Bloque les notifs pendant sync au retour online
```

Le save auto (`useEffect` sur `data`) est bloqué si l'un de ces guards est `true`.

### Pattern opération directe Supabase (ex: supprimer un enfant)

```typescript
isDirectSupabaseOperation.current = true;
try {
  await supabase.from('children').delete().eq('id', childId);
  setData(prev => ({ ...prev, updatedAt: new Date().toISOString(), children: prev.children.filter(c => c.id !== childId) }));
} finally {
  isDirectSupabaseOperation.current = false;
}
```

### Force sync immédiat

```typescript
setImmediateSave(true); // via useState, déclenche le useEffect de save
// OU via événement DOM :
window.dispatchEvent(new Event('force-cloud-sync'));
```

### Modifier un enfant (méthode recommandée)

```typescript
// updateChild() force immediateSave + updatedAt automatiquement
updateChild(childId, child => ({ ...child, balance: child.balance + amount }));
```

---

## localStorage Keys

| Clé | Valeur |
|---|---|
| `koiny_local_v1` | JSON du GlobalState (cache principal) |
| `koiny_local_v1_backup` | Backup avant merge |
| `koiny_last_view` | Dernière vue (`CHILD`, `PARENT`, etc.) |
| `koiny_last_child_id` | Dernier enfant sélectionné |
| `koiny_language` | `'fr'` / `'nl'` / `'en'` |
| `koiny_premium_active` | `'true'` si premium actif |
| `koiny_notifications_muted` | `'true'` si notifs muettes |
| `koiny_milestone_${childId}_${goalId}` | Dernier milestone notifié (50/75/100) |

---

## i18n

```typescript
// Usage dans n'importe quel fichier :
const t = translations[data.language || 'fr'];
// Exemples :
t.parent.addMissionTitle
t.child.myBalance
t.parent.notifications.push.giftRequestTitle
t.parent.notifications.push.giftRequestBody.replace('{name}', child.name)
```

Structure : `common | auth | legal | login | child | parent`
Sous-sections `parent` : `tabs | account | history | messages | notifications.push | premium | tutorial`

---

## Schéma Supabase

| Table | PK | Relations |
|---|---|---|
| `profiles` | `id` (= auth.uid) | → `families` |
| `families` | `id` UUID | ← `profiles`, ← `children` |
| `children` | `id` UUID | → `user_id`, ← missions, goals, transactions |
| `missions` | `id` UUID | → `child_id`, → `created_by` |
| `goals` | `id` UUID | → `child_id` |
| `transactions` | `id` UUID | → `child_id`, → `created_by` |
| `app_alerts` | `id` | — (alertes système) |

- `loadFromSupabase()` : `.select('*, missions(*), goals(*), transactions(*)')` → `GlobalState`
- `saveToSupabase()` : upsert itératif, remplace IDs temporaires (non-UUID) par UUIDs réels
- IDs temporaires hors-ligne : non-UUID → remplacés au premier sync réussi (mapping retourné par `saveData`)

---

## Règles Métier

| Règle | Détail |
|---|---|
| **Solde max** | `maxBalance` (défaut 100, 0 = illimité). Si dépassé : animation shake + vibration + montant réduit au max possible |
| **Badges parent** | NOVICE → MENTOR (10) → EXPERT (50) → FINTECH_GURU (200) missions approuvées |
| **Mission cycle** | ACTIVE → PENDING (enfant termine) → COMPLETED (parent valide) ou ACTIVE (rejet + feedback) |
| **Goal cycle** | ACTIVE → COMPLETED (achat = débit solde) ou ARCHIVED |
| **Anniversaire** | Bonus +10€ auto (vérifié 1x/an via `lastBirthdayRewardYear`) |
| **Rappels** | Auto-notif si aucune mission active, max 1 fois tous les 3 jours |
| **Co-parentalité** | Invitation par code famille, sync Realtime |
| **Timeout init** | 15s max puis SplashScreen.hide() forcé |

---

## Freemium

| Ressource | Free | Premium |
|---|---|---|
| Enfants | 1 | Illimité |
| Missions actives / enfant | 2 | Illimité |
| Objectifs / enfant | 1 | Illimité |
| Statistiques | ❌ | ✅ |

- `isPremium` dans `GlobalState` + `localStorage.koiny_premium_active`
- StoreKit 2 : `com.koiny.premium.monthly` / `com.koiny.premium.yearly`

---

## RevenueCat & In-App Purchases (IAP)

**Configuration Mars 2026 ✅**

### App Store Connect Credentials
| Paramètre | Valeur |
|---|---|
| **Vendor Number** | `941045566` |
| **Key ID** | `5V95D95F95` |
| **Issuer ID** | `55ea8465-87ee-4762-b46d-32e2ba64c7a2` |
| **Bundle ID** | `com.koiny.app` |
| **API Key Role** | Gestionnaire d'apps |

- Fichier `.p8` uploadé dans RevenueCat ✅
- Credentials validés et synchronisés ✅

### Produits IAP
**Status: Créés et Enregistrés ✅**

```
Groupe: Koiny Premium

1. com.koiny.premium.monthly
   - Durée: 1 mois
   - Prix: 1,99€/mois
   - Disponibilité: Tous les pays
   - Langues: FR / NL / EN
   - Status: ✅ Enregistré dans App Store Connect

2. com.koiny.premium.yearly
   - Durée: 12 mois
   - Prix: 16,99€/an
   - Disponibilité: Tous les pays
   - Langues: FR / NL / EN
   - Status: ✅ Enregistré dans App Store Connect
```

### RevenueCat Setup
**Status: Intégré & Prêt pour Sandbox** ✅

- Dashboard : https://app.revenuecat.com
- Apple Server-to-Server notifications : ✅ Configurées
- Webhook URL : `https://api.revenuecat.com/v1/incoming-webhook`
- **SDK** : `@revenuecat/purchases-capacitor@12.2.4` ✅
- **API Key** : `appl_CdFRyKVUQPCUdodtGAIsnJsEpsT` (dans `services/subscription.ts`)
- **Entitlement ID** : `Koiny Premium` *(Important : inclut la majuscule et l'espace, changé le 14/03)*
- **Offering ID** : `default`
- **Stockage local premium** : Clé `koiny_premium_active` (valeur: `'true'`). Lue au démarrage pour éviter le clignotement de l'UI avant la réponse de RevenueCat.
- **Essai gratuit (Free Trial)** : Géré 100% par Apple (email auto à J-2). Pas de pop-up custom dans l'app pour éviter la surcharge. Retour passif au mode gratuit si annulation.
- **Logique Sandbox (iOS Xcode)** : Fallback implémenté dans `services/subscription.ts` (vérifie `activeSubscriptions` si `entitlements.active` est vide) pour contourner les bugs d'Apple en environnement Sandbox. Le modal indique visuellement quel abonnement est actuellement actif.
- **Complété** ✅:
  1. ✅ Produits App Store Connect liés (monthly + yearly)
  2. ✅ Entitlement "Koiny Premium" synchronisé
  3. ✅ Produits attachés à l'entitlement
  4. ✅ Localisations FR/NL/EN ajoutées dans App Store Connect
  5. ✅ SDK RevenueCat installé et intégré dans le code
  6. ✅ Initialisation automatique au démarrage (App.tsx)
  7. ✅ Login/Logout RevenueCat synchronisé avec l'auth
  8. ✅ Bouton "Restaurer les achats" dans SubscriptionModal
  9. ✅ Offering `default` créé dans RevenueCat avec les packages `$rc_monthly` et `$rc_annual`
  10. ✅ Compte Apple Sandbox configuré pour les tests
  11. ✅ Commentaire du parent visible par l'enfant dans l'historique des transactions (`ChildView.tsx`)
  12. ✅ Fix build Vite : exclusion du dossier `screenshots/` pour éviter le freeze RAM sur `lodash`
  13. ✅ Test du flux d'achat complet avec Sandbox Apple réussi sur appareil iOS
- **À faire** ⚙️:
  - (La configuration de RevenueCat est terminée)

---

## Sécurité

- **PIN** : PBKDF2 100k iter SHA-512, format `"salt_hex:hash_hex"`, timing-safe compare
- **Auth** : Google natif (iOS `165597...eqe2`, Android/web `165597...1as`) + Apple natif + Email
- **Session** : `CapacitorStorageAdapter` (Preferences, pas localStorage WebView volatile)
- **Deep link** : `com.koiny.app://callback` pour PKCE OAuth
- **RLS** : Row Level Security sur toutes les tables
- **RGPD** : Export JSON + RPC `delete_user_data`
- **PII** : Logger anonymise automatiquement en production

---

## iOS Widget

- `KoinyWidget` (WidgetKit) : nom, solde, objectif principal du premier enfant
- Bridge : `services/widgetBridge.ts` → Capacitor Preferences → `AppDelegate` → App Group → UserDefaults
- Sync auto à chaque `saveData` via `updateWidgetData(children, language)`

---

## Patterns de Code

```typescript
// Nouveau ID
const id = crypto.randomUUID();

// Date formatée pour HistoryEntry
const today = new Date();
const date = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

// Icônes : classes FontAwesome 6
// Ex: 'fa-solid fa-broom', 'fa-solid fa-rocket'
// Liste complète dans constants/icons.ts

// Couleurs enfant : Tailwind tokens
// Ex: 'indigo', 'pink', 'emerald', 'amber', 'violet'
// Attention : safelist dynamique dans tailwind.config.js → bg-${colorClass}-500

// Vérifier solde max avant crédit
const currentMax = data.maxBalance === 0 ? Infinity : (data.maxBalance || MAX_BALANCE);
const effectiveReward = Math.min(reward, Math.max(0, currentMax - child.balance));
```

---

## Design & Branding (App Store Screenshots)

### Identité Visuelle
- **Couleur primaire** : `#3730A3` (indigo-700) — fond header, UI enfant
- **Couleur secondaire** : `#60A5FA` (blue-400) — gradient de fond des screenshots
- **Couleur accent** : `#F97316` (orange) — barre de progression, bouton premium
- **Couleur texte clair** : blanc `#FFFFFF`
- **Fond cards** : blanc cassé / gris très clair
- **Police** : Poppins (400–900), bold pour les titres
- **Icônes** : FontAwesome 6 + emojis monnaie (🪙💰)
- **Style visuel** : Coloré, fun, enfantin — fond dégradé bleu→indigo
- **Ton** : Bienveillant, gamifié, familial

### Style des Screenshots Existants (référence)
- Fond : dégradé bleu clair (`#60A5FA`) → indigo (`#3730A3`)
- Titre en haut : Poppins Bold blanc, grande taille
- Sous-titre : Poppins Regular blanc, taille moyenne
- Mockup iPhone centré, légèrement rogné en bas
- UI dans le mockup : fond indigo/violet, cards blanches arrondies

### Screenshots App Store
- **Features à mettre en avant** (dans cet ordre) :
  1. Portefeuille virtuel enfant — solde "Ma Fortune" avec emojis pièces
  2. Missions / tâches gamifiées — liste missions avec récompenses en €
  3. Objectifs d'épargne — barre de progression orange, rêve de l'enfant
  4. Interface parent de contrôle — dashboard multi-enfants, bilan 7 jours
  5. Duo parent/enfant — deux interfaces miroir en une seule app
  6. Slide finale — CTA "Télécharger gratuitement" / freemium
- **Nombre de slides** : 6
- **Langues** : FR (priorité), NL, EN — 3 sets distincts
- **Public cible** : Parents d'enfants 6–14 ans
- **Tailles d'export Apple** :
  - 6.9" → 1320×2868
  - 6.5" → 1284×2778
  - 6.3" → 1206×2622
  - 6.1" → 1125×2436

### Prompt Screenshots (à coller dans l'agent)
```
Lis d'abord CONTEXT.md (section 16) pour les infos de branding et screenshots.
Ne pose pas de questions sur des infos déjà présentes dans ce fichier.

Crée des App Store screenshots pour Koiny en suivant exactement le style
visuel décrit en section 16 (dégradé bleu→indigo, Poppins Bold blanc,
mockup iPhone centré, cards blanches arrondies).

- Style publicité, pas des captures UI brutes
- Stack : Next.js + Tailwind + html-to-image
- Chaque slide vend une seule idée, texte lisible en thumbnail
- Pas deux slides consécutives avec le même layout
- Exporte aux 4 tailles Apple définies en section 16
- Génère 3 sets : FR, NL, EN
```
