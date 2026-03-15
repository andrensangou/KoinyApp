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

**SubscriptionModal UX:**
- Affiche abonnement actif avec badge vert "Actif"
- Bouton désactivé visuellement pour abonnement actuel
- Badge "💰 Économies 30%" pour plan annuel
- Bouton "Gérer mon abonnement" → ouvre Apple subscriptions management
- getSubscriptionStatus() retourne `productId` pour matching

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

### Points à surveiller
- **Premium spoofable:** localStorage `koiny_premium_active` modifiable côté client
  - Mitigation: Vérifier RLS Supabase + refresh RevenueCat périodique
- **Clés API:** Doivent être dans `.env`, JAMAIS hardcodées
- **Input validation:** Toujours valider longueur + isNaN sur parseFloat
- **Console logs:** Utiliser `services/logger.ts` pour données sensibles
- **RLS Supabase:** Vérifier que toutes les tables ont des policies activées

## TestFlight

**Workflow de déploiement:**
1. `npm run build` (~24 min)
2. `npx cap sync ios`
3. Xcode: Product > Archive
4. Organizer: Distribute App > App Store Connect
5. App Store Connect: TestFlight > Créer groupe externe > Soumettre pour review

**Notes:**
- Les abonnements en TestFlight sont en mode Sandbox (gratuit pour testeurs)
- Review Apple pour tests externes: 24-48h
- Build 1.0.0 (1) uploadé le 15/03/2026

## Build exclusions

`tsconfig.json` et `vite.config.ts` excluent: `screenshots/`, `.agent/`, `.agents/`, `.claude/`, `docs/`, `ios/`
Ces dossiers ne font pas partie du build et ne doivent pas etre inclus.
