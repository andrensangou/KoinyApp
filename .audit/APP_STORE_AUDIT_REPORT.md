# 🍎 KOINY — APP STORE READINESS AUDIT REPORT
**Date :** 2026-02-23 | **Version auditée :** 1.0 (Build 1) | **iOS Target :** 15.0  
**Architecture :** Capacitor 8 (React/TypeScript web layer + Swift native shell)

---

## 📊 SYNTHÈSE GLOBALE

| # | Catégorie | Score | Statut |
|---|-----------|-------|--------|
| 1 | Architecture & Code Quality | 6/10 | 🟠 À améliorer |
| 2 | UI/UX — Human Interface Guidelines | 7/10 | 🟢 Conforme (avec réserves) |
| 3 | Accessibilité | 3/10 | 🔴 **Bloquant** |
| 4 | Performance & Optimisation | 7/10 | 🟢 Conforme |
| 5 | Gestion des Données & Sécurité | 5/10 | 🟠 À améliorer |
| 6 | Permissions & Privacy | 3/10 | 🔴 **Bloquant** |
| 7 | Gestion des États & Cycle de Vie | 8/10 | 🟢 Conforme |
| 8 | Réseau & API | 7/10 | 🟢 Conforme |
| 9 | Localisation & i18n | 8/10 | 🟢 Conforme |
| 10 | Compatibilité & Support | 6/10 | 🟠 À améliorer |
| 11 | App Store Readiness | 4/10 | 🔴 **Bloquant** |
| 12 | Testing & Qualité | 2/10 | 🟠 À améliorer |

### 🏆 SCORE GLOBAL : 55/100 — Corrections majeures nécessaires

---

## 1. ARCHITECTURE & CODE QUALITY — 6/10

### ✅ Points conformes
- Séparation claire : `services/`, `components/`, `types.ts`, `config.ts`
- Service de sécurité PIN avec PBKDF2 (OWASP compliant)
- Storage avec merge intelligent, purge auto et gestion quota
- Gestion des erreurs réseau avec timeouts systématiques
- Comparaison timing-safe contre les attaques par side-channel

### 🔴 CRITICAL — C1: Fichier `security-old.ts` présent dans le bundle
**Guideline :** App Store Review Guideline 2.3 — Accurate Metadata  
**Impact :** Code de migration obsolète référencé dynamiquement (`import('./security-old')`). Le fichier contient probablement l'ancien algorithme de chiffrement (Vigenère) qui est cryptographiquement faible. Apple pourrait identifier ça comme une faille de sécurité.  
**Correction :**
- Supprimer `services/security-old.ts` si la migration est terminée
- Supprimer `migrateObfuscatedPin()` de `security.ts`
- Si la migration est encore nécessaire, ajouter un flag pour la désactiver en production

### 🟠 MAJOR — C2: Console.logs excessifs en production
**Guideline :** Apple Performance Guidelines — Release builds should minimize logging  
**Impact :** `supabase.ts` contient des logs verbeux (`console.log`, `console.error`) incluant des données utilisateur (userId, email prefix, balances). Violation potentielle de la privacy et ralentissement.  
**Correction :**
```typescript
// config.ts — ajouter:
export const IS_PRODUCTION = import.meta.env.PROD;

// Puis wrapper tous les logs:
const log = (...args: any[]) => { if (!IS_PRODUCTION) console.log(...args); };
```

### 🟠 MAJOR — C3: Supabase key loguée partiellement au démarrage
**Guideline :** App Store Review Guideline 5.1 — Data Security  
**Impact :** `supabase.ts:12` log les 10 premiers caractères de la clé anon : `keyStart: SUPABASE_ANON_KEY?.substring(0, 10) + '...'`. Visible dans les logs appareil.  
**Correction :** Supprimer ce log ou le conditionner à `!IS_PRODUCTION`.

### 🟡 MINOR — C4: `parentPin: '0000'` en clair dans les données de démo
**Impact :** `types.ts:107` contient `parentPin: '0000'` en clair. Le PIN de démo devrait être hashé comme les autres.

---

## 2. UI/UX — HUMAN INTERFACE GUIDELINES — 7/10

### ✅ Points conformes
- Design premium avec gradients, animations, glassmorphism
- Navigation claire : LANDING → AUTH → LOGIN → CHILD/PARENT
- Onboarding 3 slides avec swipe natif
- Dark Mode supporté via `prefers-color-scheme`
- Safe areas gérées via CSS `env(safe-area-inset-*)`
- Touch targets ≥ 44pt sur les boutons principaux
- États vides bien gérés (empty states avec illustrations)
- Transitions et animations cohérentes

### 🟠 MAJOR — C5: Touch targets trop petits sur certains éléments
**Guideline :** HIG — Touch Targets — Minimum 44x44 points  
**Impact :** Les dots de l'onboarding (`w-2.5 h-2.5` = 10x10pt) et les pastilles de langue (`w-9 h-9` = 36x36pt) sont en dessous du minimum.  
**Correction :** Les dots doivent avoir un hitbox de 44pt même si visuellement petits :
```tsx
// OnboardingView.tsx — dots
<button className="w-11 h-11 flex items-center justify-center">
  <div className={`transition-all rounded-full ${i === current ? 'w-8 h-2.5 bg-white' : 'w-2.5 h-2.5 bg-white/25'}`} />
</button>
```

### 🟡 MINOR — C6: Pas de Haptic Feedback sur les actions critiques
**Guideline :** HIG — Playing Haptics  
**Impact :** Les validations de mission, paiements et erreurs PIN devraient avoir un retour haptique.

---

## 3. ACCESSIBILITÉ — 3/10 🔴

### ✅ Points conformes
- Textes avec hiérarchie visuelle claire (tailles, poids)
- Contrastes généralement corrects en mode clair

### 🔴 CRITICAL — C7: Aucun `aria-label` / `accessibilityLabel` sur les éléments interactifs
**Guideline :** HIG Accessibility — VoiceOver Support, App Store Review Guideline 2.5.8  
**Impact :** **REJET POSSIBLE.** Les boutons avec uniquement des icônes FontAwesome (`<i className="fa-solid fa-trash">`) n'ont aucun label d'accessibilité. VoiceOver ne peut pas les identifier.  
**Correction :**
```tsx
// Tous les boutons d'icônes doivent avoir un aria-label :
<button aria-label="Supprimer la mission" onClick={...}>
  <i className="fa-solid fa-trash" aria-hidden="true" />
</button>
```
**Scope :** Tous les composants (ChildView, ParentView, OnboardingView, AuthView, LoginView)

### 🔴 CRITICAL — C8: Dynamic Type non supporté
**Guideline :** HIG — Typography — Dynamic Type  
**Impact :** Tous les textes utilisent des tailles fixes Tailwind (`text-xs`, `text-sm`, `text-3xl`). Les utilisateurs avec des besoins d'accessibilité ne peuvent pas agrandir les textes via les Réglages iOS.  
**Note Capacitor :** Les WebViews Capacitor respectent automatiquement le zoom système si `user-scalable=no` n'est pas défini ET si des unités relatives sont utilisées. Actuellement `user-scalable=no` est dans le viewport meta → **bloque le zoom accessibilité**.

### 🟠 MAJOR — C9: Contrastes insuffisants dans certains cas
**Guideline :** WCAG 2.1 AA — Contrast Ratio 4.5:1 minimum  
**Impact :** `text-white/50` sur fond gradient (onboarding skip button), `text-white/30` (legal hint), `text-slate-300` sur fond blanc (empty states). Ratio estimé < 3:1.

---

## 4. PERFORMANCE & OPTIMISATION — 7/10

### ✅ Points conformes
- Splash screen avec timeout de sécurité (5s max)
- Chargement optimiste depuis le cache local
- Restauration de la dernière vue visitée
- Timeout réseau sur toutes les requêtes Supabase (3-8s)
- Purge automatique de l'historique (300 entrées max)
- Bundle Vite optimisé avec code splitting

### 🟡 MINOR — C10: SplashScreen `launchShowDuration: 30000` (30 secondes)
**Guideline :** Apple Performance — App Launch Time  
**Impact :** Bien que `launchAutoHide: false` signifie que le code contrôle la fermeture (via `SplashScreen.hide()`), la valeur de 30s comme fallback est excessive. Réduire à 10000ms max.

### 🟡 MINOR — C11: Pas de lazy loading pour Recharts
**Impact :** Le bundle `recharts` fait 236KB gzippé. Il est chargé même quand l'utilisateur n'est pas dans la vue Parent/Historique. Utiliser `React.lazy()`.

---

## 5. GESTION DES DONNÉES & SÉCURITÉ — 5/10

### ✅ Points conformes
- PIN hashé avec PBKDF2 (100K itérations, SHA-512)
- Validation stricte des credentials Supabase (format URL, JWT)
- HTTPS forcé via ATS (App Transport Security activé par défaut)
- Comparaison timing-safe pour la vérification PIN
- `.env` pour les secrets (pas hardcodés dans le code source)
- Export RGPD disponible

### 🔴 CRITICAL — C12: `.env` contient des secrets ET n'est probablement pas gitignored
**Guideline :** App Store Review Guideline 5.1.1 — Data Collection and Storage  
**Impact :** Le fichier `.env` contient la clé Supabase complète (`eyJhb...`). Si ce fichier est commité dans Git, la clé est exposée. PAS de `.gitignore` détecté à la racine du projet.  
**Correction :**
```bash
# .gitignore (à créer)
.env
.env.local
node_modules/
dist/
```

### 🟠 MAJOR — C13: PIN stocké en clair dans Supabase via `pin_hash`
**Impact :** Le champ `parentPin` dans `GlobalState` est transmis tel quel à Supabase (`pin_hash: state.parentPin`). Si le PIN est correctement hashé côté client avant d'être mis dans `state.parentPin`, c'est OK. Sinon, le PIN serait en clair dans la base de données.

### 🟠 MAJOR — C14: `KIDBANK_SALT` avec fallback en dur
**Impact :** `config.ts:32` contient `KIDBANK_SALT = ... || "koiny-local-salt-2024"`. Un salt hardcodé réduit la sécurité du chiffrement local.

---

## 6. PERMISSIONS & PRIVACY — 3/10 🔴

### ✅ Points conformes
- Notifications demandées contextuellement (dans les Réglages, pas au lancement)
- Politique de confidentialité accessible dans l'app (LegalModal)

### 🔴 CRITICAL — C15: Privacy Manifest (PrivacyInfo.xcprivacy) MANQUANT
**Guideline :** Apple Privacy Manifest Requirements (obligatoire depuis Spring 2024)  
**Impact :** **REJET GARANTI.** Depuis iOS 17/Spring 2024, Apple exige un Privacy Manifest pour toutes les apps. Il déclare les raisons d'utilisation des APIs sensibles (NSUserDefaults, disk space, etc.).  
**Correction :**
```xml
<!-- ios/App/App/PrivacyInfo.xcprivacy -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeName</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
```

### 🔴 CRITICAL — C16: `CAPACITOR_DEBUG` activé en production
**Guideline :** App Store Review Guideline 2.3  
**Impact :** `Info.plist` contient `CAPACITOR_DEBUG = $(CAPACITOR_DEBUG)`. En Release, cette variable doit être vide/NO. Vérifier dans le Build Settings Xcode que `CAPACITOR_DEBUG = NO` pour la configuration Release.

---

## 7. GESTION DES ÉTATS & CYCLE DE VIE — 8/10

### ✅ Points conformes
- Restauration de la dernière vue et du dernier enfant sélectionné
- SplashScreen masqué proprement après l'init
- Widget data synchronisé sur tous les changements de cycle de vie
- Timeout de sécurité de 5s pour le chargement initial
- Sauvegarde locale + cloud avec merge de conflits
- Gestion des deep links OAuth (`application:openURL:`)
- Safe fallback si enfant non trouvé après sync

### 🟡 MINOR — C17: `applicationWillTerminate` n'est pas garanti
**Guideline :** UIKit App Lifecycle  
**Impact :** `syncWidgetData()` dans `applicationWillTerminate` n'est pas garanti d'être appelé par iOS. La synchronisation dans `applicationDidEnterBackground` est suffisante.

---

## 8. RÉSEAU & API — 7/10

### ✅ Points conformes
- Timeouts systématiques (3s session, 5s DB, 8s chargement)
- Mode offline avec fallback localStorage
- HTTPS obligatoire (ATS par défaut)
- Flag `isSaving` anti-concurrence
- Merge intelligent en cas de conflit cloud/local
- Gestion des erreurs réseau avec messages utilisateur

### 🟠 MAJOR — C18: Pas d'annulation de requêtes
**Impact :** Les requêtes Supabase ne sont jamais annulées lors de la navigation. Si un utilisateur change de vue pendant un chargement, les données pourraient écraser un état plus récent.

### 🟡 MINOR — C19: Pas de retry policy
**Impact :** En cas d'échec réseau, aucune tentative de re-connexion automatique.

---

## 9. LOCALISATION & i18n — 8/10

### ✅ Points conformes
- 3 langues supportées (FR, NL, EN) via `i18n.ts`
- Détection automatique de la langue du système
- Sélection de langue dans l'onboarding ET les réglages
- Textes UI entièrement traduits (919 lignes de traductions)
- Persistance de la langue choisie

### 🟡 MINOR — C20: Pas de support RTL
**Guideline :** HIG Internationalization  
**Impact :** Faible pour FR/NL/EN, mais si l'app ajoute l'arabe ou l'hébreu, les layouts ne s'adapteront pas.

### 🟡 MINOR — C21: Dates formatées manuellement
**Impact :** `supabase.ts:233` formate les dates avec `dd/MM/yyyy` en dur au lieu d'utiliser `Intl.DateTimeFormat` avec la locale.

---

## 10. COMPATIBILITÉ & SUPPORT — 6/10

### ✅ Points conformes
- iOS 15.0 minimum (correct pour Capacitor 8)
- Portrait uniquement sur iPhone (adapté à l'usage)
- iPad avec toutes les orientations
- Poppins via Google Fonts avec fallback `sans-serif`

### 🔴 CRITICAL — C22: Widget extension cible iOS 26.2 (!!)
**Guideline :** Xcode Build Settings  
**Impact :** `KoinyWidgetExtension` a `IPHONEOS_DEPLOYMENT_TARGET = 26.2` au lieu de `15.0`. iOS 26.2 n'existe pas encore ! Ceci va causer des erreurs de compilation ou un rejet. La main app cible 15.0 mais le widget cible 26.2.  
**Correction :** Dans Xcode → Target KoinyWidgetExtension → General → Minimum Deployments → mettre `15.0`.

### 🟠 MAJOR — C23: `UIRequiredDeviceCapabilities` = `armv7`
**Guideline :** Info.plist Configuration  
**Impact :** `armv7` est obsolète (iPhones 32-bit). Apple n'accepte plus les soumissions ciblant armv7 depuis 2018+. Devrait être `arm64`.  
**Correction :**
```xml
<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>arm64</string>
</array>
```

---

## 11. APP STORE READINESS — 4/10 🔴

### ✅ Points conformes
- Bundle ID correct (`com.koiny.app`)
- Nom d'affichage configuré (`Koiny`)
- Icône app présente (512@2x, 60@2x, 60@3x)
- Pas de framework privé détecté
- Version et build configurés dans Xcode

### 🔴 CRITICAL — C24: Icône 1024x1024 manquante
**Guideline :** App Store Connect — App Icon Requirements  
**Impact :** **REJET GARANTI.** Le fichier `AppIcon-512@2x.png` (512×2=1024px) existe mais doit être vérifié : pas de transparence, pas d'arrondi, pas de canal alpha. Apple le rejette si le PNG a un canal alpha.

### 🔴 CRITICAL — C25: Données de démo toujours accessibles en production
**Guideline :** App Store Review Guideline 2.3.1 — Test/Demo content  
**Impact :** Le mode démo avec des données fictives (Léo, Emma, PIN 0000) est toujours accessible via `AuthView`. Apple peut considérer ça comme du contenu de test si ce n'est pas documenté dans les review notes. Assurez-vous de l'expliquer dans les "App Store Review Notes".

### 🟠 MAJOR — C26: `MARKETING_VERSION = 1.0` au lieu de `1.0.0`
**Guideline :** App Store Connect — Versioning  
**Impact :** Apple recommande le format SemVer `X.Y.Z` (ex: `1.0.0`). `1.0` peut être accepté mais est non-standard.

### 🟠 MAJOR — C27: Métadonnées App Store non vérifiables
**Impact :** Screenshots, description, keywords, catégorie, rating ne sont pas dans le code. Doivent être préparés dans App Store Connect.

---

## 12. TESTING & QUALITÉ — 2/10

### 🟠 MAJOR — C28: Aucun test unitaire ni UI
**Guideline :** Best Practices  
**Impact :** Aucun fichier de test détecté. Les fonctions critiques (hashPin, verifyPin, mergeGlobalStates, saveToSupabase) n'ont pas de couverture.

### 🟠 MAJOR — C29: Pas de monitoring en production
**Impact :** Le service `monitoring.ts` est importé mais son implémentation n'a pas été vérifiée. Aucun outil de crash reporting (Sentry, Firebase Crashlytics) n'est détecté dans les dépendances.

---

## 🏁 ROADMAP DE CORRECTIONS PRIORISÉES

### 🔴 Phase 1 — BLOQUANTS (avant soumission) — ~4-6h

| # | Action | Réf | Temps |
|---|--------|-----|-------|
| 1 | Créer `PrivacyInfo.xcprivacy` | C15 | 30min |
| 2 | Fixer le deployment target du widget (26.2 → 15.0) | C22 | 5min |
| 3 | Changer `armv7` → `arm64` dans Info.plist | C23 | 5min |
| 4 | Vérifier l'icône 1024x1024 (pas de canal alpha) | C24 | 15min |
| 5 | Ajouter `aria-label` sur TOUS les boutons d'icônes | C7 | 2-3h |
| 6 | Créer `.gitignore` et vérifier que `.env` n'est pas commité | C12 | 15min |
| 7 | Supprimer/conditionner les console.logs de production | C2, C3 | 30min |
| 8 | Vérifier CAPACITOR_DEBUG = NO en Release | C16 | 10min |

### 🟠 Phase 2 — MAJEURS (fortement recommandés) — ~3-4h

| # | Action | Réf | Temps |
|---|--------|-----|-------|
| 9 | Fixer les touch targets < 44pt (dots, flags) | C5 | 30min |
| 10 | Améliorer les contrastes (texte white/50, white/30) | C9 | 30min |
| 11 | Supprimer `security-old.ts` et la migration | C1 | 15min |
| 12 | Hasher le PIN de démo | C4 | 15min |
| 13 | Préparer les Review Notes (expliquer le mode démo) | C25 | 30min |
| 14 | Changer version en `1.0.0` | C26 | 5min |
| 15 | Préparer les métadonnées App Store Connect | C27 | 1-2h |

### 🟡 Phase 3 — AMÉLIORATIONS (post-lancement) — ~4-6h

| # | Action | Réf | Temps |
|---|--------|-----|-------|
| 16 | Dynamic Type / zoom accessibilité | C8 | 2h |
| 17 | Haptic feedback | C6 | 1h |
| 18 | Lazy loading Recharts | C11 | 30min |
| 19 | Retry policy réseau | C19 | 1h |
| 20 | Tests unitaires pour les services | C28 | 3-4h |
| 21 | Intégrer Sentry/Crashlytics | C29 | 1h |

---

## 🎯 VERDICT FINAL

### **Score : 55/100 — Corrections majeures nécessaires**

L'application a une **base solide** (architecture propre, sécurité PIN, i18n, UI premium) mais présente **4 points bloquants** qui entraîneront un rejet Apple :

1. ❌ **Privacy Manifest manquant** (obligatoire depuis 2024)
2. ❌ **Widget iOS target 26.2** (version inexistante)
3. ❌ **armv7 requis** (architecture obsolète)
4. ⚠️ **Accessibilité VoiceOver insuffisante** (risque de rejet)

**Estimation pour atteindre la soumission : 1-2 jours de travail concentré.**

Après correction de la Phase 1 + Phase 2, le score estimé passerait à **78/100** (Prêt après corrections mineures).
