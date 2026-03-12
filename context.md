# 🏦 KOINY — Context IA

> **Ce fichier est la source de vérité pour tout assistant IA travaillant sur ce projet.**
> Dernière mise à jour : Mars 2026 · Version 2.0.0

---

## 1. Vision Produit

**Koiny** est une application mobile iOS (+ web) d'**éducation financière gamifiée pour familles**. Elle permet aux parents de transformer des tâches quotidiennes en « missions » rémunérées en **argent 100 % virtuel**, enseignant aux enfants (6-14 ans) la corrélation effort / gain et les bases de l'épargne.

### Principes Fondamentaux
- **Zero Real Money** : Aucun lien bancaire. Simulateur pur, zéro risque financier.
- **Local-First / Offline-Friendly** : L'UI se met à jour instantanément (optimistic updates), le cloud sync est non-bloquant.
- **Privacy-First** : Pas de revente de données, RGPD-ready, isolation stricte par famille (RLS Supabase).
- **Gamification Cognitive** : Confettis, animations de solde, retours haptiques, badges parent.

### Modèle Économique
- **Freemium** : Gratuit limité (1 enfant, 2 missions, 1 objectif) + **Premium** (1,99€/mois ou 16,99€/an) = enfants illimités, missions illimitées, stats.
- In-App Purchase via StoreKit 2 (préparé, pas encore actif avec RevenueCat).

---

## 2. Stack Technique

| Couche | Technologie | Version |
|---|---|---|
| **Langage** | TypeScript (strict) | ^5.2 |
| **Frontend** | React | ^18.3 |
| **Build** | Vite | ^7.3 |
| **Styling** | Tailwind CSS | ^3.4 |
| **Font** | Poppins (Google Fonts) | — |
| **Icônes** | FontAwesome 6 (CDN) | 6.4 |
| **Mobile Runtime** | Capacitor | ^8.0 |
| **Backend / DB** | Supabase (PostgreSQL, Auth, Realtime, RLS) | ^2.95 |
| **Auth** | Google OAuth (natif SDK iOS+Android) + Apple Sign-In (natif ASAuth) | — |
| **Crash Reporting** | Sentry (`@sentry/capacitor` + `@sentry/react`) | ^3.0 / 10.40 |
| **Charts** | Recharts | ^2.12 |
| **Virtualisation** | @tanstack/react-virtual | ^3.13 |
| **Animations** | canvas-confetti + Tailwind keyframes custom | — |
| **Tests** | Vitest | ^4.0 |

### Commandes Principales
```bash
npm run dev        # Serveur Vite (dev web)
npm run build      # tsc && vite build → dist/
npx cap sync ios   # Sync build web vers projet Xcode
npx cap open ios   # Ouvrir dans Xcode
```

### Variables d'Environnement (`.env`)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx   # optionnel
VITE_KIDBANK_SALT=koiny-local-salt-2024      # fallback existant
VITE_IS_LOCAL=true                           # optionnel, mode debug
```

---

## 3. Architecture des Fichiers

```
KoinyLocal/
├── App.tsx                    # 🧠 Composant racine (~1170 lignes)
│                              #    - State global (GlobalState)
│                              #    - Routing (ViewState enum)
│                              #    - Toute la logique métier (handlers)
│                              #    - Sync Supabase (optimistic + background)
│                              #    - Deep linking OAuth, notifs, offline
├── index.tsx                  # Point d'entrée React + Service Worker
├── index.html                 # HTML avec CSP stricte, dark mode, PWA meta
├── index.css                  # Styles de base
├── types.ts                   # 📦 Interfaces TypeScript centrales
├── config.ts                  # Config (Supabase URL/Key, validation)
├── i18n.ts                    # 🌐 Traductions FR/NL/EN (~1063 lignes)
│
├── components/                # 🎨 Composants UI
│   ├── AuthView.tsx           # Écran connexion (Google/Apple/Email)
│   ├── OnboardingView.tsx     # Onboarding première ouverture
│   ├── LoginView.tsx          # Sélection profil enfant + accès parent
│   ├── ChildView.tsx          # Interface enfant (balance, missions, goals)
│   ├── ParentView.tsx         # 📊 Dashboard parent (~150KB, le plus gros)
│   │                          #    - Multi-onglets (Enfants, Dashboard, Historique, etc.)
│   │                          #    - Gestion missions, transactions, goals
│   │                          #    - Co-parentalité, invitations, PIN
│   │                          #    - Réglages, premium, export RGPD
│   ├── LandingView.tsx        # Landing page marketing
│   ├── SubscriptionModal.tsx  # Modal premium/abonnement
│   ├── ConfirmDialog.tsx      # Dialog de confirmation réutilisable
│   ├── AlertBanner.tsx        # Bannière alertes système
│   ├── BottomNavigation.tsx   # Navigation tabs mobile
│   ├── ErrorBoundary.tsx      # Error boundary React
│   ├── HelpModal.tsx          # Guide utilisateur in-app
│   ├── HistoryChart.tsx       # Graphique Recharts
│   ├── LegalModal.tsx         # Modal mentions légales
│   ├── OfflineIndicator.tsx   # Indicateur mode hors-ligne
│   ├── TutorialOverlay.tsx    # Overlay tutoriel interactif
│   └── VirtualHistoryList.tsx # Liste virtualisée (react-virtual)
│
├── services/                  # ⚙️ Couche Services
│   ├── supabase.ts            # Client Supabase, Auth (Google/Apple), CRUD V2
│   │                          #   - loadFromSupabase() : schéma relationnel → GlobalState
│   │                          #   - saveToSupabase() : GlobalState → tables relationnelles
│   │                          #   - withRetry() : retry exponentiel réseau
│   │                          #   - signInWithGoogle/Apple : natif SDK + fallback browser
│   ├── storage.ts             # Persistance hybride (Preferences + Supabase)
│   │                          #   - persistentStorage : wrapper Capacitor Preferences
│   │                          #   - loadData() : cache local → cloud → merge → GlobalState
│   │                          #   - saveData() : local d'abord, puis cloud async
│   │                          #   - Gestion conflits avec merge intelligent
│   │                          #   - Purge auto historique > 300 entrées
│   │                          #   - Export RGPD (JSON download)
│   ├── security.ts            # PIN : PBKDF2 100k iterations, SHA-512, timing-safe compare
│   ├── pinStorage.ts          # Stockage PIN local/appareil (Capacitor Preferences + sync Supabase)
│   ├── biometric.ts           # Face ID / Touch ID (plugin natif custom KoinyBiometric)
│   ├── notifications.ts       # Notifications locales (Capacitor + Web fallback)
│   │                          #   - Channels iOS/Android, regroupement par type
│   │                          #   - Deep linking sur click → ParentView
│   ├── realtime.ts            # Supabase Realtime (postgres_changes sur tables famille)
│   ├── monitoring.ts          # Sentry init + Web Vitals (LCP, FID, CLS)
│   ├── subscription.ts        # In-App Purchase (StoreKit 2 préparé, mode test)
│   ├── alertService.ts        # Alertes système (fetch depuis table `app_alerts` + cache)
│   ├── migration.ts           # Migration JSON legacy → schéma relationnel
│   ├── logger.ts              # Logger structuré avec anonymisation auto des PII
│   ├── widgetBridge.ts        # Bridge JS → iOS Widget (via Capacitor Preferences → UserDefaults)
│   ├── widget.ts              # Wrapper widgetBridge (back-compat)
│   └── ai.ts                  # Service IA désactivé (avatars = DiceBear uniquement)
│
├── constants/
│   └── icons.ts               # Mapping icon_id → classe FontAwesome
│
├── ios/App/                   # 🍎 Projet Xcode natif
│   ├── App/                   # Target principal (AppDelegate, BiometricPlugin, etc.)
│   ├── KoinyWidget/           # Widget iOS (affiche balance enfant)
│   ├── App.xcodeproj/         # Config Xcode
│   └── CapApp-SPM/            # Swift Package Manager (dépendances Capacitor)
│
├── public/                    # Assets statiques
│   ├── mascot.png             # Mascotte Koiny
│   ├── sounds/                # Effets sonores (coins.mp3, etc.)
│   ├── sw.js                  # Service Worker (PWA + notifications)
│   └── manifest.json          # Web App Manifest
│
├── assets/                    # Splash screens, icônes
├── docs/                      # Documentation technique (audits, guides, rapports)
├── .audit/                    # Audit de sécurité
└── dist/                      # Build de production
```

---

## 4. Modèle de Données

### 4.1 State Global (React)
Le state **entier de l'application** est un objet `GlobalState` dans `App.tsx` :

```typescript
interface GlobalState {
  children: ChildProfile[];       // Liste des profils enfants
  parentTutorialSeen: boolean;
  language: 'fr' | 'nl' | 'en';  // Tri-lingue
  parentPin: string | null;       // Hash PBKDF2 "salt:hash"
  ownerId?: string;               // User ID Supabase
  soundEnabled: boolean;
  notificationsEnabled?: boolean;
  parentBadge?: 'NOVICE' | 'MENTOR' | 'EXPERT' | 'FINTECH_GURU';
  totalApprovedMissions?: number;
  isPremium?: boolean;
  maxBalance?: number;            // Limite solde (défaut: 100€, 0 = illimité)
  updatedAt?: string;             // ISO timestamp pour sync
}
```

```typescript
interface ChildProfile {
  id: string;                     // UUID (Supabase) ou temp ID (offline)
  name: string;
  avatar: string;                 // DiceBear seed
  colorClass: string;             // Tailwind color token (indigo, pink, etc.)
  balance: number;
  goals: Goal[];
  missions: Mission[];
  history: HistoryEntry[];
  tutorialSeen: boolean;
  birthday?: string;
  giftRequested?: boolean;        // Enfant demande un cadeau
  missionRequested?: boolean;     // Enfant demande une mission
}
```

### 4.2 Schéma Supabase (PostgreSQL)

| Table | Clé Primaire | Relations | Rôle |
|---|---|---|---|
| `profiles` | `id` (= auth.uid) | → `families` | Parent/co-parent, PIN hash, rôle |
| `families` | `id` (UUID) | ← `profiles`, ← `children` | Unité familiale, code invitation |
| `children` | `id` (UUID) | → `user_id` (profiles), ← missions, goals, transactions | Profil enfant |
| `missions` | `id` (UUID) | → `child_id`, → `created_by` | Tâches avec cycle de vie |
| `goals` | `id` (UUID) | → `child_id` | Objectifs d'épargne |
| `transactions` | `id` (UUID) | → `child_id`, → `created_by` | Registre immuable des flux |
| `app_alerts` | `id` | — | Alertes système (maintenance, etc.) |

### 4.3 Mapping GlobalState ↔ Supabase
- `loadFromSupabase()` dans `services/supabase.ts` : requête relationnelle avec `.select('*, missions(*), goals(*), transactions(*)')` puis mapping vers `GlobalState`.
- `saveToSupabase()` : itère les `children[]`, upsert missions/goals, insert/upsert transactions. Gère les IDs temporaires (non-UUID) en les remplaçant par des UUID réels.

---

## 5. Flux de Navigation

```
ViewState = 'LANDING' | 'AUTH' | 'LOGIN' | 'CHILD' | 'PARENT'
```

```
Première visite :
  LANDING → OnboardingView → AUTH (AuthView)

Utilisateur existant (cache) :
  → Restauration depuis localStorage (dernière vue + child_id) → CHILD ou PARENT

Flux normal :
  AUTH (Google/Apple/Email) → LOGIN (sélection profil)
    ├── Clic enfant → CHILD (ChildView)
    └── Clic parent → PIN → PARENT (ParentView)

Mode démo :
  AUTH → "Essayer sans compte" → LOGIN avec données démo
```

### Persistance de la Vue
- `localStorage.koiny_last_view` : dernière vue active
- `localStorage.koiny_last_child_id` : dernier enfant sélectionné
- Au démarrage : restauration instantanée depuis le cache (pas de flash/loading)

---

## 6. Architecture de Synchronisation

### Principe : "Local d'abord, Cloud en arrière-plan"

```
1. Action utilisateur (ex: approuver mission)
   ↓
2. Update React State immédiat (optimistic UI)
   ↓
3. Sauvegarde locale (Capacitor Preferences + localStorage)
   ↓
4. Sync Supabase en arrière-plan (non-bloquant)
   ↓
5. Si échec réseau → données déjà sauvées localement → retry au retour online
```

### Mécanismes Clés
- **Debounce** : Les sauvegardes cloud sont regroupées (useEffect sur `data`)
- **Guard `isSaving`** : Empêche les saves concurrents
- **Guard `isReloadingFromRealtime`** : Empêche les boucles save ↔ realtime
- **Guard `isDirectSupabaseOperation`** : Pour les opérations qui écrivent directement en DB (add child, delete, purchase goal) sans passer par le save auto
- **`immediateSave`** : Force un sync immédiat (ex: retour online)
- **Merge de conflits** : Comparaison des timestamps `updatedAt` local vs cloud, merge intelligent des historiques/missions/goals en cas de divergence
- **ID Mapping** : Les objets créés offline ont des IDs temporaires (non-UUID) → remplacés par des UUID réels au premier sync réussi

### Realtime (Supabase)
- Écoute les changement sur `children`, `missions`, `goals`, `transactions` via `postgres_changes`
- Filtre par `family_id` pour n'écouter que sa propre famille
- Retry automatique en cas de timeout

---

## 7. Sécurité

### PIN Parent
- **Hachage** : PBKDF2 avec 100 000 itérations, SHA-512, salt aléatoire 128 bits
- **Format stocké** : `"salt_hex:hash_hex"` 
- **Comparaison** : timing-safe (protection contre les attaques par timing)
- **Stockage** : local sur chaque appareil (Capacitor Preferences) + sync Supabase pour backup/co-parenting

### Biométrie
- Plugin natif custom `KoinyBiometric` (Swift, dans le target App)
- Face ID / Touch ID pour réinitialiser le PIN ou déverrouiller l'accès parent
- Fallback mot de passe toujours disponible

### Auth
- **Google** : SDK natif (`@codetrix-studio/capacitor-google-auth`) sur iOS/Android, OAuth web en fallback
- **Apple** : `@capacitor-community/apple-sign-in` (natif ASAuthorizationController), OAuth web en fallback
- **Session** : Persistée via `CapacitorStorageAdapter` (Preferences au lieu de localStorage volatile du WebView)
- **Deep Linking** : `com.koiny.app://callback` pour PKCE + implicit flow
- **CSP** : Content Security Policy stricte dans `index.html`

### Données
- **RLS** : Row Level Security sur toutes les tables Supabase
- **Logger sécurisé** : Anonymisation automatique des PII (userId, email, pin) en production
- **RGPD** : Export JSON, suppression complète via RPC `delete_user_data`
- **Logs supprimés en production** : `config.ts` → `log()` ne sort rien en `PROD`

---

## 8. Internationalisation (i18n)

- **3 langues** : Français (FR), Néerlandais (NL), Anglais (EN)
- Fichier unique `i18n.ts` (~1063 lignes) exportant `translations`
- Détection auto de la langue du navigateur au premier lancement
- Persistance dans `localStorage.koiny_language`
- Structure hiérarchique : `common`, `auth`, `legal`, `login`, `child`, `parent` (avec sous-sections `tabs`, `account`, `history`, `messages`, `notifications.push`, `premium`, `tutorial`, etc.)

### Usage
```typescript
const t = translations[data.language || 'fr'];
// => t.parent.addMissionTitle, t.child.myBalance, etc.
```

---

## 9. Fonctionnalités Premium (Freemium)

### Limites Free
| Ressource | Limite Free | Premium |
|---|---|---|
| Enfants | 1 | Illimité |
| Missions actives / enfant | 2 | Illimité |
| Objectifs / enfant | 1 | Illimité |
| Statistiques | ❌ | ✅ |

### Gestion
- `isPremium` dans `GlobalState`
- Vérifié via `localStorage.koiny_premium_active`
- `SubscriptionModal.tsx` pour l'UI
- `services/subscription.ts` pour la logique StoreKit 2 (mode test uniquement pour l'instant)
- Product IDs : `com.koiny.premium.monthly`, `com.koiny.premium.yearly`

---

## 10. Notifications

### Types
| Type | ID Stable | Description |
|---|---|---|
| `GIFT` | 1001 | Enfant demande un cadeau |
| `MISSION` | 1002 | Enfant demande une mission |
| `MISSION_COMPLETE` | 1003 | Enfant a terminé une mission |
| `PARENT_REMINDER` | auto-inc | Rappel si aucune mission active (tous les 3 jours) |

### Implémentation
- iOS/Android : `@capacitor/local-notifications` avec channel `koiny-gains` (son custom `coins.mp3`)
- Web : `Notification` API + Service Worker
- Deep linking sur clic : navigue vers `ParentView` avec `notificationAction`
- Mute toggle : `localStorage.koiny_notifications_muted`

---

## 11. iOS Widget

- **KoinyWidget** : Widget WidgetKit affichant le nom, solde et objectif principal du premier enfant
- **Bridge** : `widgetBridge.ts` écrit dans `Capacitor Preferences` → `AppDelegate` lit `UserDefaults.standard` et copie vers l'App Group partagé
- Sync automatique à chaque changement de données

---

## 12. Conventions de Code

### Patterns
- **Un seul composant racine** (`App.tsx`) gère tout le state et les handlers → passés en props aux vues
- **Services singleton** : `notifications`, `monitoring`, `realtimeService`, `subscriptionService`, `widgetService`
- **Pas de state manager externe** (ni Redux, ni Zustand) : tout est dans `useState` + `useCallback` dans `App.tsx`
- **Opérations Supabase "directes"** : Pour les CUD critiques (create child, delete, purchase), on écrit directement en Supabase PUIS on update le state local → `isDirectSupabaseOperation.current = true` pendant ces opérations pour bloquer le save auto

### Style
- **Tailwind CSS** avec safelist dynamique pour les couleurs enfant (`bg-${colorClass}-500`)
- **Dark mode** : `dark:` variants, détecté via `prefers-color-scheme`
- **Animations custom** définies dans `tailwind.config.js` : fadeInUp, scaleIn, pop, balancePop, shake, overflowPulse, slideUp, slideDown, onboarding*
- **Font** : Poppins (400-900)
- **Icônes** : FontAwesome 6 (classes `fa-solid fa-xxx`)

### Nommage
- Composants : PascalCase (`ParentView.tsx`)
- Services : camelCase (`storage.ts`)
- Handlers : `handle` + Action (`handleApprove`, `handleManualTransaction`)
- Constantes : UPPER_SNAKE (`MAX_BALANCE`, `BADGE_THRESHOLDS`)

---

## 13. Configuration Capacitor

```typescript
// capacitor.config.ts
appId: 'com.koiny.app'
appName: 'Koiny'
webDir: 'dist'
```

- **Splash Screen** : 3s, fond `#3730A3` (indigo), spinner blanc
- **Google Auth** : Client IDs séparés iOS (`165597...eqe2`) et web/Android (`165597...1as`)
- **Scheme** : `capacitor://localhost`

---

## 14. Règles Métier Importantes

| Règle | Détail |
|---|---|
| **Solde max** | Défaut 100€, configurable (0 = illimité). Overflow → animation shake + vibration + montant réduit |
| **Badges parent** | NOVICE → MENTOR (10 missions) → EXPERT (50) → FINTECH_GURU (200) |
| **Missions** | Cycle : ACTIVE → PENDING (enfant termine) → COMPLETED (parent valide) ou ACTIVE (parent rejette avec feedback) |
| **Goals** | Cycle : ACTIVE → COMPLETED (achat = retrait du solde) ou ARCHIVED |
| **Anniversaire** | Bonus automatique de 10€ (vérifié une fois par an via `lastBirthdayRewardYear`) |
| **Rappels** | Auto-notification tous les 3 jours si un enfant n'a aucune mission active |
| **Co-parentalité** | Invitation par code famille, sync temps réel via Realtime |
| **Timeout global** | Si le chargement dépasse 15s → force la fin du loading |

---

## 15. Points d'Attention pour le Développement

> **⚠️ Ne JAMAIS :**
> - Écraser `pin_hash` avec `null` dans Supabase (géré séparément par `pinStorage.ts`)
> - Bloquer l'UI en attendant un appel réseau (toujours local-first)
> - Créer des doublons d'enfants/missions (vérifier l'existence par nom ou UUID avant insert)
> - Oublier le guard `isDirectSupabaseOperation` lors d'opérations DB directes
> - Modifier `ParentView.tsx` sans précaution (150KB, composant très dense)

> **✅ Toujours :**
> - Mettre à jour `updatedAt` à chaque modification du state
> - Supporter les 3 langues (fr/nl/en) pour tout nouveau texte
> - Tester en mode offline (couper le réseau et vérifier que tout fonctionne)
> - Utiliser `crypto.randomUUID()` pour les nouveaux IDs
> - Passer par `updateChild()` pour les modifications d'enfant (force immediateSave + updatedAt)
