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

### TOUJOURS
- `updatedAt: new Date().toISOString()` a chaque modification du state
- Supporter les 3 langues (fr/nl/en) pour tout nouveau texte dans `i18n.ts`
- Passer par `updateChild(childId, updater)` pour modifier un enfant
- Utiliser `setData(prev => ({ ...prev, updatedAt: ..., ... }))` (immutable update)
- Tester en mode offline

## Commandes

```bash
npm run dev          # Dev web (localhost)
npm run build        # tsc + vite build -> dist/
npx cap sync ios     # Sync vers Xcode
npx cap open ios     # Ouvrir Xcode
```

Note: le build necessite `NODE_OPTIONS=--max_old_space_size=4096` sur machine 8GB RAM.

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

**Stockage local premium:**
- localStorage key: `'koiny_premium_active'` (valeur: `'true'` ou absent)
- Toujours lu par `migrateData(cloudData)` dans `services/storage.ts`

**Points importants (implémentation 15/03/2026):**

**Entitlement ID (14/03):**
- Changé de `'premium'` à `'Koiny Premium'` (maj/espace CRITIQUES)
- Tous les checks RevenueCat utilisent cet ID exact

**Fallback Xcode Sandbox (15/03):**
1. `purchaseSubscription()`: check `activeSubscriptions` si entitlements.active vide
2. `getSubscriptionStatus()`: retourne aussi `productId` du fallback pour UI
3. `restorePurchases()`: même fallback pattern que purchase

**État du premium (App.tsx):**
- Line 129-131: Lire `koiny_premium_active` au démarrage avant setData() pour éviter flash couronne
- Line 186: Utiliser `setData(prev => ...)` NOT mutation pour isPremium
- Line 1166: Inclure `updatedAt` dans handleSetPremium pour persister en Supabase

**SubscriptionModal UX (15/03):**
- Affiche abonnement actif avec badge vert "Actif"
- Bouton désactivé visuellement pour abonnement actuel (cursor-default, pas de hover)
- Badge "💰 Économies 30%" pour plan annuel
- getSubscriptionStatus() retourne `productId` pour matching

**Supabase:**
- Ne sauvegarde PAS `isPremium` directement
- Dérivé de localStorage ou RevenueCat à chaque startup

**Offline Mode (15/03 - IMPLEMENTED):**
- **Comportement:** Modal d'abonnement reste ouvert en offline (voir les plans), mais achats disabled
- **Implémentation:**
  - `isOfflineMode` passé depuis ParentView.tsx → SubscriptionModal.tsx
  - Affiche banneau rouge: "Vous êtes hors ligne. Les achats sont désactivés."
  - Tous les boutons d'achat grisés (opacity-60, cursor-not-allowed)
  - Bouton "Restaurer mes achats" aussi désactivé en offline
  - Traductions: FR/NL/EN
- **Détection offline (App.tsx):**
  - Event listeners: 'online' et 'offline'
  - Polling: vérifie `navigator.onLine` toutes les 3s (capture mode avion iOS, etc.)
  - setIsOfflineMode mis à jour dynamiquement
- **Code:**
  - SubscriptionModal.tsx lines 168-178 (banner), 190 (isDisabled), 196-199 (styling)
  - App.tsx lines 62-90 (detection + polling)

## Build exclusions

`tsconfig.json` et `vite.config.ts` excluent: `screenshots/`, `.agent/`, `.agents/`, `.claude/`, `docs/`, `ios/`
Ces dossiers ne font pas partie du build et ne doivent pas etre inclus.
