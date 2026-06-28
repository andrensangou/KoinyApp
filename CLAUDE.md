# CLAUDE.md — Koiny

> Instructions pour Claude Code travaillant sur ce projet.
> Lire aussi `context.md` pour le contexte complet du projet.

## ⚠️ Crédit Claude API
**Épuisé le 24/06/2026 (fin de journée)**. Revient le **1/07/2026**.
- Supabase et Google Ads : **NON affectés** (crédits séparés).
- Campagne Google Ads : **CONTINUE** (pas besoin de pause, crédit Claude ≠ Google Ads budget).
- Dev/debug Claude : **PAUSE** jusqu'au 1/07. À reprendre pour fix bugs (sentinel suppression/reconnexion, REST-bypass Android).

## 🔧 Actions du 27/06/2026 — REST-bypass GÉNÉRALISÉ (Android getSession hang) — branche `feature/onboarding-forced`

**Contexte** : suite des tests OnboardingModal sur Huawei STK-L21 (Android 10, pas de Google Play Services). Le hang `getSession()` (~27s) de supabase-js bloquait TOUTES les opérations passant par le client. Les timeouts `Promise.race` du 24/06 évitaient le freeze mais **abandonnaient** l'opération (création enfant ratée, suppression compte ratée, profil non créé). Solution définitive : **bypasser supabase-js partout** via REST brut + token lu en localStorage (synchrone, pas de pont natif → jamais de hang).

**Principe REST-bypass (pattern établi, `services/supabase.ts`)** :
1. `getTokenFromStorage()` : lit `sb-<ref>-auth-token` depuis **localStorage** (synchrone, valide si `expires_at` > now+10s). Pas de `getSession()`.
2. Pour identifier l'user : utiliser `ownerId` du state React (déjà connu après `initialize()`), JAMAIS `getSession()`/`getUser()`.
3. Pour les requêtes DB : `fetch` direct vers `${SUPABASE_URL}/rest/v1/...` avec header `Authorization: Bearer <token>` + `apikey`. Fallback sur supabase-js si pas de token (web).

**Helpers REST créés (`services/supabase.ts`)** :
- `getTokenFromStorage()` : token synchrone depuis localStorage.
- `restInsert(table, payload)` : POST `/rest/v1/<table>` (bypass `.from().insert()`).
- `restRpc(fn, args)` : POST `/rest/v1/rpc/<fn>` (bypass `supabase.rpc()`).
- `loadFromSupabase` : lit déjà en REST quand token dispo (`⚡ [LOAD] Token lu depuis localStorage (bypass getSession)`).

**Fonctions converties en REST** :
- **`handleAddChild`** (`App.tsx`) : `ownerId` au lieu de `getSession()` + `restInsert('children', ...)`. → **plus de freeze sur "Suivant"** dans OnboardingModal.
- **`handlePurchaseGoal`** (`App.tsx`) : `ownerId` + `restInsert('transactions', ...)`.
- **`deleteAccount(knownUserId?)`** (`services/supabase.ts`) : `restRpc('delete_user_data')` + purge directe du token storage + `signOut({scope:'local'})` avec timeout 2s non bloquant (au lieu de `supabase.rpc()` + `supabase.auth.signOut()` qui hangaient). `App.tsx` passe `ownerId` à `deleteAccount`. → **la suppression de compte se déclenche enfin** (avant : user restait sur l'espace parent).
- **`ensureUserProfile(userId, email?)`** (`services/supabase.ts`) : GET puis POST `/rest/v1/profiles` en REST (token), fallback supabase-js. **Bug trouvé** : le `TIMEOUT_DATABASE` (×2 au login) empêchait la création de la ligne `profiles` → un **nouveau compte n'avait PAS de profil** (vérifié : user `d1f176bc` connecté avec enfant "Diams" mais `profiles` vide). Conséquence : pas d'emails de réengagement, analytics funnel cassé, sync langue ratée. (La FK `children.user_id` → `auth.users` donc la création enfant marchait quand même.) Profil `d1f176bc` recréé rétroactivement via service role. **Site d'appel** (`App.tsx`) : `ensureUserProfile(session.user.id, session.user.email)` — l'email n'était JAMAIS transmis avant → tous les profils créés avaient `email: null` + `full_name: "Parent"`.
- **✅ Backfill emails profils (28/06)** : script (admin API `auth/v1/admin/users` → PATCH `profiles`) a rempli les **65 profils** qui avaient `email: null` (sur 83 auth users) + `full_name` récupéré depuis les métadonnées Google quand c'était "Parent". **0 profil sans email restant.** → les emails de réengagement (`notify-inactive-users`, lecture `profiles.email`, filtre `marketing_consent=true`) peuvent enfin cibler les users existants. Reste quelques `full_name="Parent"` (users sans nom dans auth metadata : email signup / Apple Private Relay) — non bloquant.

**Validé sur Huawei STK-L21 (27/06)** :
- Login Google : `⚠️ [GOOGLE] Native sign-in failed, falling back to browser` (normal, pas de Play Services) → `🔗 [DEEP LINK] Ouvert avec: com.koiny.app://callback#access_token=...` → retour deep-link OK → `🧹 Sentinel suppression : cache purgé` (preuve que deleteAccount a marché) → dashboard. Loads en REST ~90-460ms (était hang 27s).
- OnboardingModal : création enfant + mission template OK, sync cloud OK, **plus aucun freeze**.
- Suppression de compte : OK après le fix `restRpc`.
- ⚠️ **UX login Huawei** : l'utilisateur voit un "flash" du navigateur avec l'URL Supabase puis le dashboard (rapide car Google a mémorisé le compte → pas de sélecteur). **Normal et spécifique à ce Huawei** (pas de Play Services → fallback navigateur). Les vrais users Android avec Play Services ont le **sélecteur Google natif** sans flash. Acceptable pour la prod.

**✅ Validé sur iOS (28/06, simulateur iPhone 17 / iOS 26.2, build debug Xcode)** : flux COMPLET testé et OK.
- Login Google : `⚠️ [GOOGLE iOS] "GoogleAuth" plugin is not implemented on ios` → fallback navigateur → `[SceneDelegate] 🔗 Deep link received` → `✅ [DEEP LINK] Session implicite établie` → dashboard. REST-bypass actif (`⚡ [LOAD] Token lu depuis localStorage`, `[LOAD-REST] profiles 465ms / children 222ms`). Aucun `TIMEOUT_DATABASE`, aucun hang.
- **Suppression de compte** (akians237 / `58f7630d`) : OK, base bien vidée (profil + enfant supprimés) → `deleteAccount` REST marche aussi sur iOS.
- **Re-login → OnboardingModal nouveau user** : OK, nouveau compte `015d31c1` créé, profil créé via `ensureUserProfile` REST, PIN créé (`pin_hash` présent).
- ⚠️ Le build iOS testé était compilé AVANT le fix email (`cd1e11e`) → le nouveau profil avait `email: null` (backfillé manuellement). Le prochain build inclura le passage de `session.user.email`.

**⚠️ Build Xcode iOS — XCFrameworks manquants** : si Xcode affiche "There is no XCFramework found at .../DerivedData..." (×N), c'est que le DerivedData a été purgé. Fix : `cd ios/App && xcodebuild -resolvePackageDependencies -project App.xcodeproj -scheme App` (re-télécharge les XCFrameworks SPM : RevenueCat, Firebase, gRPC…), puis dans Xcode Product → Clean Build Folder → Run. **NE JAMAIS** `rm -rf ~/Library/Developer/Xcode/DerivedData/*` sans prévoir cette re-résolution.

**À faire avant prod** : build Android release (AAB versionCode 18) + iOS 1.1.7 build 20 une fois iOS validé. Pousser les commits `feature/onboarding-forced`.

## Projet

Koiny est une app mobile iOS/Android d'education financiere pour enfants 6-14 ans. Stack: TypeScript, React 18, Vite 7, Tailwind CSS, Capacitor 8, Supabase, RevenueCat.

**App Store:** https://apps.apple.com/us/app/koiny-pocket-money-for-kids/id6760566260
**Statut:** **🚀 1.1.7 / vc18 SOUMIS AUX 2 STORES le 28/06/2026** (branche `feature/onboarding-forced`, commit `0534bba`). iOS **1.1.7 build 20** en review Apple (publication auto après approbation, 100% immédiat, note conservée). Android **versionCode 18** en review Google (Production, 100%, déclaration AD_ID faite car Firebase Analytics). Contient : REST-bypass généralisé (fix hang getSession Android), OnboardingModal forcé, fixes suppression compte + création profil, Firebase Analytics Android. Précédent : iOS 1.1.6 build 19 (20/06), Android vc17 live (19/06).

## 📊 Actions du 24/06/2026 — Firebase Analytics + Modal Onboarding forcé + getSession Timeouts

### Firebase Analytics (Android-only) — branche `feature/onboarding-forced`
Objectif : tracker les events post-install pour alimenter les campagnes Google Ads (Smart Bidding).
- **Pourquoi Firebase plutôt que Supabase** : Firebase se connecte nativement à Google Ads (attribution, Smart Bidding). Supabase analytics (`analytics_events`) ne le fait pas — et la table était vide (RLS ou missing call).
- **Plugin** : `@capacitor-firebase/analytics@8.3.0` installé avec `--legacy-peer-deps` (conflit préexistant capacitor-google-auth/capacitor 8).
- **`services/analytics.ts` (créé)** : wrapper `logEvent` Android-only + fire-and-forget (ne bloque jamais l'UI). 3 events : `trackSignUp(method)`, `trackChildCreated(isFirstChild)`, `trackPurchase(productId, value)`.
- **`components/SubscriptionModal.tsx`** : `trackPurchase` après achat réussi (value 16.99 yearly / 1.99 monthly).
- **`App.tsx`** : `trackSignUp('google')` dans `handleLoginSuccess` + `trackChildCreated(isFirstChild)` dans `handleAddChild`.
- **`vite.config.ts`** : alias `firebase/analytics` → `src/firebase-analytics-stub.ts` (no-ops) + `@capacitor-firebase/analytics` exclu de optimizeDeps. Fix erreur runtime "Failed to resolve module specifier firebase/analytics" — le stub empêche le browser de chercher un module externe, Rollup bundlise les no-ops inline. Seul le SDK Android natif via Gradle est utilisé.
- **`src/firebase-analytics-stub.ts` (créé)** : stubs pour `getAnalytics`, `logEvent`, `setAnalyticsCollectionEnabled`, `setConsent`, `setUserId`, `setUserProperties`.
- **`android/app/build.gradle`** : `implementation 'com.google.firebase:firebase-analytics'` sous Firebase BoM 34.0.0.
- **iOS** : NON touché — Firebase Analytics iOS requiert un build séparé (prochaine release).
- **DebugView Firebase** : testé sur Huawei STK-L21 — app lance, DebugView montre des `screen_view` + `user_engagement` natifs. Events custom `sign_up`, `child_created`, `purchase` arrivent en temps réel lors des actions correspondantes.
- **À faire** : lier Firebase Console → Google Ads (Intégrations → Google Ads) pour activer le Smart Bidding sur `child_created`.
- **✅ Association Firebase/GA4 ↔ Google Ads FAITE (28/06)** : via GA4 → Admin → Associations de produits → Associations à Google Ads → compte **Koiny `302-864-5113`**, publicité perso + taggage auto activés. Diffusion des données effective sous 24h.
- **✅ `child_created` marqué ÉVÉNEMENT CLÉ (28/06)** : GA4 → Admin → Affichage des données → Événements → onglet Événements clés → ⭐ sur `child_created` (flux app.koiny.parent). L'event est remonté le soir même (un test sur le Huawei l'a fait apparaître dans "Événements récents"). Tracking confirmé fonctionnel en Temps réel (session_start + user_engagement vus en direct). → conversion auto-dispo dans Google Ads sous ~24h. (Optionnel non fait : étoiler aussi `sign_up`, `purchase`.)
- **⏳ PUIS (~1-2 sem)** : quand `child_created` accumule des conversions (Android only — iOS non tracké, cf. tâche différée) → basculer la campagne en enchères sur conversion + monter budget à ~5€/jour (+20-30%/sem ensuite, tant que CPA premium < ~17€ LTV). PAS avant (Smart Bidding a besoin de ~30 conversions pour apprendre).
- **📋 TÂCHE FUTURE DIFFÉRÉE — Firebase Analytics iOS (NON prioritaire)** : `services/analytics.ts` est bridé `if (!isAndroid) return` → les events custom (`sign_up`/`child_created`/`purchase`) ne partent PAS sur iOS. Le SDK Firebase est lié dans le build iOS (tiré par le plugin au `cap sync`) et collecte des events natifs auto (`first_open`/`screen_view`…) MAIS `FirebaseApp.configure()` n'est pas appelé côté iOS (warning `[FirebaseCore] not yet been configured` dans les logs) → remontée incertaine. **Décision 28/06 : NE PAS le faire pour l'instant.** Raisons : (1) priorité = shipper les fixes Android (login/onboarding) + mesurer Android ; (2) attribution iOS = SKAdNetwork/ATT → gros effort, faible fiabilité ; (3) lean (pas de feature spéculative). **À activer SEULEMENT si on met du budget Google Ads ciblé iOS.** Le SDK non configuré = warning inoffensif, aucun impact sur l'app/soumission.

### Modal Onboarding forcé — branche `feature/onboarding-forced`
Objectif : réduire le drop-off sur le dashboard vide (bouton "+ Ajouter un enfant" insuffisant → 35% drop).
- **`components/OnboardingModal.tsx` (créé, 320 lignes)** : modal 3 étapes forcé qui s'affiche au 1er login si `data.children.length === 0`.
  - **Étape 1** : picker avatar DiceBear (10 seeds lorelei) + picker couleur (7 couleurs) + saisie prénom enfant → `onAddChild`.
  - **Étape 2** : sélection template mission parmi 6 options (rangement chambre, devoirs, etc.) avec montants et icônes, FR/NL/EN → `onAddMission`.
  - **Étape 3** : succès 🎉 + bouton "C'est parti !".
  - Android MD3 : bottom sheet depuis le bas, `rounded: '28px 28px 0 0'`, progress bar linéaire, boutons texte alignés à droite.
  - iOS : modal centré plein écran, `borderRadius: 40`, dots de pagination (3), boutons gradient indigo.
- **`App.tsx`** : `showOnboarding` state + `onboardingChildId` (transmet l'id de l'enfant créé à l'étape 2). `handleAddChild` retourne désormais `Promise<string | undefined>` (au lieu de `void`) pour exposer le `childId`.
- **✅ Builté et testé** sur Huawei STK-L21 (24/06 09:59) — modal s'affiche, création enfant fonctionne (avec fix error handling ci-dessous).

### getSession() Timeouts — iOS + Android (fix hang)
Problème : `getSession()` peut hang ~27s sur Android cold-start ET iOS post-OAuth, causant le freeze du OnboardingModal et autres handlers.
- **Fix** : `Promise.race()` timeout sur TOUS les `getSession()` calls dans `App.tsx` :
  - `handleAddChild` : 5s timeout (création enfant)
  - `handlePurchaseGoal` : 5s timeout (achat objectif)
  - `handleFullSignOut` : 2s timeout (déconnexion)
  - `onAuthStateChange` retry : 3s timeout (reconnexion cold-start)
- **Error handling** : OnboardingModal wrapper autour de `onAddChild` + try-catch → affiche `showAppError` en cas de timeout (empêche modal gelé infini).
- **Résultat** : aucun freeze possible, comportement gracieux sur les deux plateformes.

### 4 commits poussés sur `feature/onboarding-forced` (24/06)
1. `5f5ffa8` — feat(analytics): Firebase Analytics Android (sign_up, child_created, purchase)
2. `456f70d` — feat(onboarding): modal 3 étapes (Android MD3 + iOS)
3. `e24efc3` — docs(claude): update + fix firebase stub + vite alias
4. `d3c5d7d` — fix(onboarding): error handling + timeout getSession()
5. `9cf4a3c` — fix(auth): add timeouts to ALL getSession() calls

## 🔧 Actions du 19/06/2026 — Fix login Google Android + sécurité suppression

### Cause racine trouvée : client OAuth Android mal configuré depuis le 5 mars 2026
Le login Google échouait systématiquement sur Android (retour sur la page login au lieu du dashboard) depuis le **premier build Play Store**. Cause : le client OAuth "Koiny Android" dans Google Cloud Console avait :
- **Package `com.koiny.app`** (bundle iOS) au lieu de **`app.koiny.parent`** (package Android réel)
- **SHA-1 de la clé d'upload** au lieu du **SHA-1 Play App Signing** (Google re-signe l'app)

→ `DEVELOPER_ERROR` sur le natif Google Sign-In → fallback navigateur → navigation post-OAuth fragile → l'user revenait sur la page login (marche seulement après fermer/rouvrir).

**Fix (config Google Cloud, zéro rebuild)** : mis à jour dans Google Cloud Console → API et services → Identifiants → "Koiny Android" :
- Package : `app.koiny.parent`
- SHA-1 Play App Signing : `52:37:C3:B0:5A:E2:AD:CD:33:07:11:AD:C6:E7:82:64:0C:58:4C:13`
- Confirmé fonctionnel sur Samsung Galaxy Tab A8 ET Huawei en ~10 min (sans rebuild)

**Client iOS ("koinyios") : ne pas toucher** — bundle ID `com.koiny.app` est correct pour iOS (pas de SHA-1 requis sur iOS).

### Builds livrés (branche `fix/revenuecat-nav-block`)
- **iOS 1.1.5 build 18** + **Android vc17** : contiennent les fixes code (RevenueCat timeout 8s, setView avant RevenueCat, sentinel suppression, navigation provisoire avant loadData) mais le vrai fix login était la config OAuth.
- Ces fixes code restent utiles comme filets de sécurité mais ne sont plus urgents.

### Fix suppression de compte (cache résiduel)
- `deleteAccount()` (`services/supabase.ts`) : pose un sentinel `koiny_account_deleted` + purge supplémentaire de `koiny_last_view`/`koiny_last_child_id`/`koiny_premium_verified_at`
- `initialize()` (`App.tsx`) : détecte le sentinel au démarrage → purge tout le cache résiduel → saute la restauration optimiste → empêche un ancien PIN gate de "survivre" à une suppression+reconnexion immédiate sur le même appareil

### Références SHA-1 (pour référence future)
- SHA-1 clé d'**upload** (koiny-release.jks) : `38:74:3D:81:B0:37:A0:95:5E:CB:FC:52:AC:14:27:7A:87:C2:E1:E1`
- SHA-1 **Play App Signing** (certificat Google) : `52:37:C3:B0:5A:E2:AD:CD:33:07:11:AD:C6:E7:82:64:0C:58:4C:13`
- SHA-256 Play App Signing : `50:AD:1D:C2:53:11:63:8B:80:FA:1A:3E:02:A5:ED:C6:75:64:79:4A:7C:D3:7D:6A:3A:1A:C1:A7:3D:03:D7:78`

### Fix iOS Google login data load (19-20/06/2026) — branche `fix/ios-google-data-load`
iOS force le fallback navigateur (plugin GoogleAuth natif absent : pas de Package.swift → incompatible SPM Capacitor 8 → "not implemented on ios"). Après le `setSession` depuis le hash OAuth, `getSession()` hang ~27s sur natif (le même hang qu'Android) ET les requêtes `.from()` de supabase-js appellent getSession en interne → le chargement cloud timeout → les enfants/PIN ne s'appliquent pas (écran vide / création PIN).
- **Fix REST-bypass** (`services/supabase.ts`) : `loadFromSupabase(userId, accessToken?)` ET `fetchDeletedIds(userId, accessToken?)` chargent en **fetch REST brut** (Bearer token déjà connu via la session passée à `initialize`) quand le token est fourni → bypass total de l'auth supabase-js qui hang. Token threadé `initialize → loadData(knownUserId, knownAccessToken) → loadFromSupabase/fetchDeletedIds`. Chemin web/normal inchangé.
- **Validé sur iPhone** (logs Xcode) : `⏱️ [LOAD-REST] profiles 246ms / children 257ms (3)`, PIN chargé, widget sync, dashboard direct. getSession marche ensuite (0-1ms).
- **Hérite de `fix/revenuecat-nav-block`** : nav provisoire avant loadData (`App.tsx`, navigue dès qu'une session existe sans attendre loadData), RevenueCat timeout 8s, sentinel suppression.
- **iOS 1.1.6 / build 19** à soumettre. **Android NON bumpé** (vc17 reste) : Google login Android déjà réglé côté serveur (SHA-1 + package OAuth). Message QR rate-limit (`QrScannerModal.tsx`, "patiente ~1 min") committé sur cette branche → partira à la prochaine release Android.
- **Capture logs iOS** : `idevicesyslog -u <UDID>` (via `brew install libimobiledevice`). ⚠️ Les `console.log` JS n'apparaissent QUE sur un build **dev/debug** Xcode (release strippe). Filtrer sur `⏱️ [LOAD`, `🚦`, `🔐 [DEEP LINK]`, `Save blocked`.

**Ancienne stat:** Publiée sur l'App Store (version 1.0.9). Version **1.1.0 build 3** soumise pour review Apple le 22/05/2026 depuis la branche `feature/android-redesign` — inclut push notifications FCM (APNs), fix objectifs Supabase (count exact), fix écran vide Android nouveaux users, fix crash switch profil enfant (goals: []). **Branche `feature/notifications-rgpd` (06/06/2026)** : contient tous les fixes au-dessus + foreground reload multi-appareils, merge data convergent (anti-doublons goals), balance floor, QR login + découvrabilité, push notifications améliorées, RGPD désinscription email. Prête pour le prochain build.
**Android:** Version 1.0 versionCode 11 — AAB release buildé le 30/05/2026, uploadé en Play Console (Tests fermés Alpha). 12 testeurs inscrits depuis 8 jours — accès production débloqué ~6 jours. IAP Android (`com.koiny.premium.monthly` + `com.koiny.premium.yearly`) créés dans Play Console le 08/05/2026, RevenueCat configuré (Valid credentials ✅).
**AndroidParentView:** Dashboard parent Android (`components/AndroidParentView.tsx`) — activé via `isAndroid` dans `App.tsx`. Wirée avec `App.tsx` le 20/05/2026. Voir section "Actions du 20/05/2026 — AndroidParentView" et "Actions du 21/05/2026 — AndroidParentView améliorations" ci-dessous.
**AndroidChildView:** Dashboard enfant Android (`components/AndroidChildView.tsx`) — activé via `isAndroid` dans `App.tsx`. Implémenté le 21/05/2026. Design Material 3, 4 onglets (Home, Missions, Historique, Badges), safe area corrigée, bottom nav fixe, bouton power pour logout.
**Push Notifications (FCM):** Système cross-device opérationnel depuis le 21/05/2026. Firebase projet `koiny-d30a7`. Edge function `send-push` déployée sur Supabase. Table `device_tokens` créée. APNs configuré le 21/05/2026 pour iOS : clé `koiny APNs` (Key ID `7SDAU3PXVL`, Team ID `K828G7C5CB`) uploadée dans Firebase Cloud Messaging. `GoogleService-Info.plist` ajouté dans Xcode (`ios/App/App/`). Capability Push Notifications activée. Push iOS fonctionnel sur appareil physique (pas simulateur). Voir section "Actions du 21/05/2026 — Push Notifications FCM" ci-dessous.

## ⚠️ À FAIRE AVANT PUBLICATION PROD (bloquants — App Store Connect)
Vérifié le 09/06/2026 dans App Store Connect → Accords, taxes et banque (titulaire : Andre Nsangou, Belgique) :
- ✅ **Compte bancaire** : Revolut (4-82), Belgique, EUR, Actif → les versements arriveront.
- ✅ **Formulaires fiscaux** : W-8BEN + Certificate of Foreign Status → Actifs.
- ✅ **Contrat apps payantes** : Actif (13/03/2026 - 12/03/2027). DSA : Active.
- ✅ **DAC7 (Directive coopération administrative, 7e révision) : Actif** (renseigné le 09/06/2026) → bloquant paiements levé.
- 🟡 **Nouveau contrat Apple Developer Program à accepter** par le titulaire → sinon **impossible de soumettre/mettre à jour des apps** (bloque la soumission iOS).
- 💡 **Small Business Program** (commission 15% au lieu de 30%) : vérifier l'inscription (inscription séparée, double quasiment le net). Pas visible sur cette page.

## 🚀 SOUMIS EN REVIEW (11/06/2026) — 1.1.2 / vc14 (branche `fix/post-launch-qr-sync`, commit `9d29de8`)
Les 3 correctifs post-1.1.1 sont **buildés, testés sur appareils, committés+poussés sur GitHub, et SOUMIS aux 2 stores** :
- 🍎 **iOS 1.1.2 (build 15)** → en review **Apple**. Diffusion graduelle 7 jours + publication auto. Notes iOS (5 puces, sans "Réclamer") FR/NL/EN.
- 🤖 **Android versionCode 14** (versionName "1.0") → en review **Google**. Déploiement 100% (peu d'installs). Notes Android (avec "Réclamer") FR/NL/EN.
- Versions bumpées : Android vc13→14 (`build.gradle`), iOS MARKETING_VERSION 1.1.1→1.1.2 + CURRENT_PROJECT_VERSION 5→15 (4 targets). AAB signé : `android/app/build/outputs/bundle/release/app-release.aab` (36 Mo).
- ⚠️ Avertissements Play Console non bloquants : mapping R8 + symboles debug natifs manquants (à ajouter plus tard pour des crashs lisibles).

**À FAIRE quand 1.1.2 est EN PROD (les deux stores) :**
1. **Résoudre** (pas archiver) l'issue Sentry **127283874** (crash deleteAccount). Si elle ne réapparaît pas sur 1.1.2 sous ~1 semaine → fix confirmé.
2. La diffusion graduelle de 1.1.1 sera remplacée par 1.1.2 (rien à faire).
3. Prochaine session dev : fix **cold-start post-update iOS** (seul bug restant documenté — l'user doit fermer/relancer pour se reconnecter après une MAJ).
4. Optionnel : nettoyer le build Xcode dev de l'iPhone → réinstaller depuis l'App Store une fois 1.1.2 live.

## État builds prêts (09/06/2026 — branche `feature/smart-notifications`, commit `56818b6`)
- **Android** : versionCode **13** (était 12), versionName "1.0". AAB release signé buildé → `android/app/build/outputs/bundle/release/app-release.aab` (36 Mo). Keystore `android/app/koiny-release.jks` (config `keystore.properties` → `storeFile=koiny-release.jks`). Prêt à uploader Play Console (Production ou Alpha). Accès production Google Play déjà accordé.
- **iOS** : **1.1.1 build 5** (`MARKETING_VERSION=1.1.1`, `CURRENT_PROJECT_VERSION=5` sur les 4 targets). Assets synchronisés. Prêt pour Xcode → Product → Archive → Distribute App Store Connect.
- Contient tout le travail du jour : fix getSession Android (storage hybride), sons enfant, rappel intelligent, bouton Réclamer Android, filtre CE MOIS/TOUT enfant, **retrait clearHistory** (le solde dérivant de l'historique → effacer était trop fragile). + QR login + notifs RGPD (hérité de delete-sync). ⚠️ Bugs sync multi-appareils connus restants (voir sections plus bas) mais non bloquants pour la prod (touchent le compte de test, pas les vrais users sur la version live).

### 📝 NOUVEAUTÉS / "What's New" à coller dans App Store Connect + Play Console (1.1.1 / vc13)
Release notes orientées utilisateur (3 langues), à coller dans le champ "Nouveautés" à chaque soumission. Cumule tout depuis la version live (iOS 1.0.9).
⚠️ **iOS et Android diffèrent d'une ligne** : la ligne "réclamer l'objectif atteint" est un fix **Android only** (iOS l'avait déjà) → la retirer pour l'App Store, la garder pour Play Console.

#### iOS (App Store Connect) — SANS la ligne "Réclamer (Android)"
**FR :**
```
• Connexion rapide d'un appareil enfant par QR code
• Rappels intelligents pour ne plus oublier de valider les missions
• Nouveaux sons plus doux et adaptés aux enfants
• Filtre « Ce mois / Tout » dans l'historique (parent et enfant)
• Synchronisation multi-appareils plus fiable et corrections de bugs
```

**NL :**
```
• Snel een kindertoestel verbinden via QR-code
• Slimme herinneringen om missies te bevestigen
• Nieuwe, zachtere geluiden voor kinderen
• "Deze maand / Alles"-filter in de geschiedenis (ouder en kind)
• Betrouwbaardere synchronisatie tussen apparaten en bugfixes
```

**EN :**
```
• Quickly connect a child's device with a QR code
• Smart reminders so you never forget to approve missions
• New, gentler sounds designed for kids
• "This month / All" filter in history (parent and child)
• More reliable multi-device sync and bug fixes
```

#### Android (Play Console) — AVEC la ligne "Réclamer"
**FR :**
```
• Connexion rapide d'un appareil enfant par QR code
• Rappels intelligents pour ne plus oublier de valider les missions
• Nouveaux sons plus doux et adaptés aux enfants
• Filtre « Ce mois / Tout » dans l'historique (parent et enfant)
• L'enfant peut réclamer son objectif atteint
• Synchronisation multi-appareils plus fiable et corrections de bugs
```

**NL :**
```
• Snel een kindertoestel verbinden via QR-code
• Slimme herinneringen om missies te bevestigen
• Nieuwe, zachtere geluiden voor kinderen
• "Deze maand / Alles"-filter in de geschiedenis (ouder en kind)
• Kind kan een behaald doel ophalen
• Betrouwbaardere synchronisatie tussen apparaten en bugfixes
```

**EN :**
```
• Quickly connect a child's device with a QR code
• Smart reminders so you never forget to approve missions
• New, gentler sounds designed for kids
• "This month / All" filter in history (parent and child)
• Kids can claim their reached goal
• More reliable multi-device sync and bug fixes
```

## Regles critiques

### Branche `feature/smart-notifications` (09/06/2026) — rappel hebdo contextuel
- Part de `feature/delete-sync` (contient TOUS les fixes sync/delete/history).
- **But** : le rappel hebdo "rolling" (notif locale id 9999, fire 7j après dernière ouverture) avait un texte GÉNÉRIQUE. Désormais **contextuel** selon le dernier profil ouvert (`koiny_last_view`/`koiny_last_child_id`) + état des données.
- **`services/smartReminder.ts` (créé)** : `getContextualReminder(data, fallback)` → `{title, body}` FR/NL/EN. Enfant : pending→"montre ta mission à valider", pas de mission active→"demande-en une", sinon→"termine tes missions". Parent : missions PENDING→"X à valider", objectif atteint→"[enfant] a atteint son objectif", demande en attente→"une demande t'attend", sinon→fallback générique.
- **`App.tsx`** : `scheduleWeeklyReminder` reçoit le message de `getContextualReminder(data, {générique})` au lieu du texte fixe. Le message est calculé au moment du SCHEDULE (app ouverte), reflète le dernier état connu quand la notif fire 7j après.
- **`services/notifications.ts`** : le log "Rolling reminder scheduled" inclut maintenant title/body → permet de vérifier le message choisi dans logcat sans attendre 7j.
- **À tester** : ouvrir en profil enfant sans mission → logcat doit montrer le message "demande une mission" ; ouvrir en parent avec mission PENDING → "X à valider". Build requis.

### ✅ DÉCISION 09/06 — "Effacer l'historique" RETIRÉ (le bon choix)
Après doublements/résurrections/wipes à répétition, décision : **retirer la fonctionnalité** car le solde est DÉRIVÉ de l'historique → effacer l'historique conflit avec préserver le solde, et le contournement "Solde reporté" ne survivait pas à la sync multi-appareils. Le filtre **CE MOIS / TOUT** couvre déjà le besoin de désencombrer.
- `App.tsx` : `handleClearHistory` = **no-op** (plus de carry, plus de delete cloud, plus de tombstones transactions).
- `services/storage.ts` : **`cloudCleared` RETIRÉ** (mergeChildProfile) → union simple, plus de risque de wipe du solde.
- `ParentView.tsx` (2 boutons corbeille iOS) + `AndroidParentView.tsx` (bouton + dialog + state confirmClear) : **retirés**.
- Restent inoffensifs/inutilisés : `recordDeletions` (supabase.ts), `carryTitle` (historyTitle.ts), prop `onClearHistory`. À nettoyer plus tard si besoin.
- **À ajouter ensuite** : filtre CE MOIS/TOUT sur la **vue enfant** (ChildView + AndroidChildView) pour cohérence (aujourd'hui l'enfant voit tout l'historique sans filtre).

### ⏸️ PAUSE 09/06/2026 — bugs sync à reprendre à tête reposée (PROD NON AFFECTÉE)
**Important** : tout est sur branches de dev (`feature/delete-sync`, `feature/smart-notifications`). L'app App Store live n'a RIEN de ça → les vrais clients (Laetitia, Martin, Megan) ne sont pas affectés. Les bugs ci-dessous ne touchent QUE le compte de test sur le code non livré.

**État branches :**
- `feature/delete-sync` : committé+poussé jusqu'à `a9d87dd` (inclut clearHistory + cloudCleared = code FRAGILE).
- `feature/smart-notifications` : branchée sur delete-sync. **Modifs NON committées** (toutes VALIDÉES, sûres car UI/feature, pas sync) : sons synthétisés (`services/sounds.ts`, ChildView, AndroidChildView), bouton Réclamer Android, rappel intelligent (`services/smartReminder.ts`), traduction "Solde reporté" (`services/historyTitle.ts`), fix scroll historique (`VirtualHistoryList` max-h). Sur disque, à committer quand on reprend.

**🐛 BUGS SYNC À CORRIGER (multi-appareils, code committé fragile) :**
1. **clearHistory wipe le solde** (RACE, cause = `cloudCleared` storage.ts:259) : `handleClearHistory` supprime les transactions cloud PUIS réinsère le "Solde reporté". Entre les deux, cloud vide une fraction de seconde → si un reload tombe pile-là, `cloudCleared` (preferCloudScalars && cloud.history.length===0) RESPECTE le [] → efface le solde local → "Solde reporté" perdu, solde 0. Vérifié : Jack2 cloud = 0€, 0 transaction, alors qu'il devait avoir le report. **FIX proposé (non appliqué) : RETIRER `cloudCleared` — les tombstones (`recordDeletions`) suffisent à propager la suppression, et l'union préserve le carry. Le cloudCleared est redondant ET dangereux.**
2. **Mission validée ne crédite pas / bouton valider absent** : créer une mission, l'enfant la complète (→ PENDING), mais le PARENT ne voit PAS le bouton pour valider → l'enfant n'a pas son argent. Et une mission cloud "validated" sans transaction de crédit (vu Jack2 : mission "Sortir les poubelles" validated, 0 transaction). → la complétion PENDING ne propage pas correctement au parent (merge de statut mission entre appareils), OU la validation ne crée pas la transaction de crédit / elle est wipée par clearHistory. À diagnostiquer.
3. **Churn pas totalement éliminé** : logcat iOS montre encore `🔀 Merge` + `🔄 Foreground reload: cloud plus récent` en rafale pendant l'usage actif. Le converge-push conditionnel (`localTs > cloudTs`) a réduit mais pas supprimé. À ré-examiner (autre source de bump updatedAt ?).

**RECOMMANDATION reprise** : ne PAS shipper delete-sync/clearHistory en l'état. Session dédiée sync : (a) retirer cloudCleared, (b) diagnostiquer mission PENDING→parent + crédit validation, (c) finir le churn. Le sync multi-appareils est devenu trop intriqué pour du patch en fin de session. Envisager de **découpler** ce qui est shippable (getSession fix Android, QR, sons, prod Android) de la sync clearHistory fragile.

### 📋 SESSION EN COURS — branche `feature/qr-coldstart-ux` (12-13/06/2026)
Branchée depuis `fix/post-launch-qr-sync` (= code prod 1.1.2). Cible : build **1.1.3 / vc15**.
**✅ 3 fixes CODÉS + COMMITTÉS + POUSSÉS le 13/06** (commit `88dfe23` sur `origin/feature/qr-coldstart-ux`, typecheck OK).
⏸️ **EN ATTENTE volontaire** : ne PAS shipper avant la fin du déploiement graduel iOS de la 1.1.2 (~19/06). Décision du 13/06 : laisser la 1.1.2 finir son rollout, confirmer stable, PUIS bump 1.1.3/vc15 + build release + soumettre. Tester les 3 fixes sur appareils avant de shipper.
- **Bug A — QR scanner figé** : prop `key={qrScannerKey}` sur `<QrScannerModal>` dans `ParentView.tsx` + `AndroidParentView.tsx`, incrémentée par `openQrScanner()` à chaque ouverture → remount complet (fresh `<video>`/getUserMedia) → plus de figeage au 2ème scan.
- **Bug B — Cold-start logout** (`App.tsx`, listener `onAuthStateChange`) : si `INITIAL_SESSION` arrive avec `session=null`, on `await setTimeout 400ms` puis retry `getSession()` une fois avant de conclure à une déconnexion. Le setTimeout défère l'appel hors du callback (pattern Supabase anti-deadlock) + le lock pass-through natif (déjà en place) évite tout blocage. Vrai user déconnecté → null au retry aussi → flux normal.
- **Image Google** (`AuthView.tsx:356`) : SVG inline 4 couleurs au lieu de l'URL `svgrepo.com` externe.
- **À TESTER sur appareils** : (A) connecter 2 enfants par QR d'affilée sans relancer l'app ; (B) cold-start après kill → reste connecté sans 2ème relance ; image Google s'affiche. Puis (C) re-vérifier que demandes/validations enfant remontent bien. Si OK → bump 1.1.3/vc15, build release, soumettre.

#### Plan initial (référence)

**La chaîne de bugs vécue (12/06, reproduite plusieurs fois) :**
1. Scanner le 1er device enfant → OK
2. Scanner le **2ème** device → **scanner figé** (Bug A)
3. Fermer/relancer l'iPhone pour débloquer → **déconnecté** (Bug B)
4. Se reconnecter → pas direct, re-fermer/relancer (Bug B)
5. Enfin connecté → scanner le 2ème device marche
6. Demandes/validations enfant arrivent en retard (Bug C — déjà atténué 1.1.2)
→ A + B se composent et rendent la connexion multi-enfants très pénible.

**Bug A — QR scanner ne se réinitialise pas entre 2 scans (`components/QrScannerModal.tsx`)** 🟢 court/sûr
- Symptôme : 2ème ouverture du scanner = caméra figée. Cause probable : state/refs/stream `getUserMedia` réutilisés sur la même instance (le composant ne fait que toggler `isOpen`, le `state`/`detectedCodeRef`/`rafRef`/`streamRef` de la session précédente peuvent rester sales).
- **Fix** : forcer un remount complet via prop `key`. Dans `ParentView.tsx` (iOS) ET `AndroidParentView.tsx` : `<QrScannerModal key={qrScannerKey} ... />` + `setQrScannerKey(k => k+1)` dans `onClose`. React détruit l'ancienne instance (cleanup stopCamera) et en monte une neuve (fresh getUserMedia). ~5 lignes.
- Vérifier aussi que `stopCamera` libère bien le stream avant tout nouveau `getUserMedia`.

**Bug B — Logout au cold-start post-relancement (`App.tsx` `initialize()`)** 🟡 moyen
- Symptôme : après fermer/relancer l'app, l'user est sur l'écran AUTH (déconnecté) et doit re-relancer pour que la session revienne. Même cause que le "cold start post-update" déjà documenté : `initialize()` affiche AUTH pendant que la lecture session (Preferences/localStorage hybride) est encore async.
- **Fix** : garder le splash screen affiché jusqu'à ce que `getSession()` ait résolu avant de décider AUTH vs PARENT/CHILD. Ne pas router vers AUTH tant que la restauration de session n'a pas eu sa chance. ~1-2h.

**Bug C — Sync demandes/validations** : déjà atténué par le garde-fou `isInitializing` 15s (1.1.2). À RE-VÉRIFIER sur 1.1.2 prod : la validation de Léon est bien arrivée le 12/06, juste retardée par les relances A+B. Si A+B sont réglés, C devrait être transparent. Ne pas re-toucher au merge sauf si un vrai problème persiste après A+B.

**Polish à inclure dans le même build** : image bouton Google cassée — `components/AuthView.tsx:356` charge `https://www.svgrepo.com/show/475656/google-color.svg` (URL EXTERNE) → image cassée si réseau restrictif/svgrepo down. Remplacer par un asset **local** (SVG dans le projet / `public/`). Cosmétique mais visible sur l'écran de login.

**Ordre conseillé pour la session** : (1) Bug A en premier (court, gros impact, testable seul), (2) image Google (trivial), (3) Bug B (le plus de code), (4) re-vérifier C, (5) bump 1.1.3/vc15 + build + soumettre.

### Fix à faire (prochaine session)
- **Cold start post-update iOS** : au 1er lancement après une mise à jour, `initialize()` affiche l'écran AUTH pendant que la lecture des Preferences Capacitor est encore async → l'user doit fermer/relancer pour que la session soit restaurée. Fix : garder le splash screen affiché jusqu'à ce que la lecture Preferences soit complète avant de décider la vue. ~1-2h de dev, peu risqué. À faire sur branche propre, pas en urgence.
- **🔴 QR scanner — reset entre 2 connexions (priorité)** : après avoir connecté un 1er enfant par QR, le scanner caméra (`QrScannerModal`) ne se réinitialise pas correctement → impossible de scanner le 2ème enfant sans **fermer/relancer toute l'app iPhone**. Reproduit le 11/06 (Léon OK, Olivia bloquée) ET le 12/06 (Léon déconnecté/reconnecté, même contournement nécessaire). La gêne est réelle : un parent avec 2 enfants doit killer l'app entre chaque connexion. **Piste de fix** : forcer un remount complet du composant `QrScannerModal` via une prop `key` incrémentée à chaque fermeture (garantit un fresh state + fresh getUserMedia), + vérifier que le stream caméra est bien libéré avant le prochain `getUserMedia`. Dans `ParentView.tsx` (iOS) et `AndroidParentView.tsx` : `<QrScannerModal key={qrScannerKey} ... />` avec `setQrScannerKey(k => k+1)` dans le handler `onClose`. **Priorité haute** — touche directement la feature phare (QR) et est visible pour tout parent multi-enfants.

### Branche `fix/post-launch-qr-sync` (11/06/2026) — correctifs post-1.1.1
Regroupe les bugs découverts après la mise en ligne de la 1.1.1. **Non committé, non buildé.** Tous validés (typecheck OK).

1. **Crash deleteAccount Android** (`services/supabase.ts`) — `GoogleAuth.signOut()` **purement retiré** de `deleteAccount`. Sentry issue 127283874 (`NullPointerException: GoogleSignInClient.signOut() on null`). ⚠️ 1ère tentative (n'appeler que si `provider==='google'`) **INSUFFISANTE** : a re-crashé le 11/06 sur un user provider=google dont le client natif était null (session restaurée du cache au cold start, pas de sign-in Google frais cette session). Le crash natif n'est PAS rattrapable depuis JS, et on ne peut pas prédire si le client est initialisé. Solution finale : retirer l'appel — le compte auth vient d'être effacé par le RPC, donc révoquer Google n'apporte rien (rien où se reconnecter), et `supabase.auth.signOut()` nettoie la session locale. Aucun downside.

2. **QR scanner figé sur "Connexion…"** (`components/QrScannerModal.tsx`) — `handleApprove` a maintenant un `Promise.race` timeout 12s : si `approveQrSession` hang (réseau/edge function/QR expiré), bascule en état 'error' (icône + message + bouton "Réessayer") au lieu de rester gelé indéfiniment. Vu le 11/06 (iPhone figé en scannant le 2ème enfant).

3. **🎯 Guard `isInitializing` coincé → perte de données (LE bug central)** (`App.tsx`) — RACINE des paniques de sync. Dans `initialize()`, `isInitializing.current=true` est tenu pendant les `await` RevenueCat (`initialize`/`loginUser`/`getSubscriptionStatus`, lignes ~228-232). Si RevenueCat **HANG** (fréquent iOS après perturbation de session : cold-start reconnexion + QR), le `finally` ne s'exécute jamais → `isInitializing` reste `true` pour toujours → **tous les saves bloqués** (le save effect retente 8× puis abandonne) → les missions/goals créés restent en mémoire React seulement, **jamais poussés au cloud**, perdus au relancement. **Vérifié le 11/06** : missions iPhone créées le matin absentes du cloud (0 mission ce jour), réapparues après fermer/relancer l'app (guard libéré). **Fix** : garde-fou `setTimeout(15s)` après le `set true` qui force `isInitializing.current=false` quoi qu'il arrive (+ `clearTimeout` dans le finally). 15s < ~29s de la fenêtre de retry du save → la sauvegarde réussit sur un retry tardif au lieu d'être perdue. Affecte surtout les **users existants à la mise à jour** (le cold-start déclenche le hang) ; les nouveaux users (install fraîche, 1 appareil) sont peu exposés.

**À faire** : build Android + iOS (1.1.2 / vc14) avec ces 3 fixes. Tester : créer mission iPhone juste après un cold-start → doit monter au cloud sans relancer.

### 📋 À FAIRE (session future) — Demande d'avis in-app (SKStoreReviewRequest + Google In-App Review)
- Plugin : `capacitor-rate-app` (iOS + Android en 1 appel `RateApp.requestReview()`)
- **Déclencheur à choisir** : "3 missions validées" écarté (63% des enfants n'ont JAMAIS de mission validée — les vrais users encore moins vu que les comptes de test gonflent les stats). Options retenues : **(A) 3ème APP_OPEN** (compteur `koiny_app_open_count` localStorage) ou **(B) J+3 après premier lancement**. À trancher en session.
- À intégrer dans le build **1.1.3** (même branche `feature/qr-coldstart-ux`) une fois le déclencheur validé.
- ⚠️ Apple limite à 3× par an (automatique). Google laisse décider mais recommande modération.

### Polish à faire (cosmétique, sans risque)
- **Scroll historique iOS** : `VirtualHistoryList` (`@tanstack/react-virtual`) garde une grande zone vide qui rebondit quand peu d'items (gros blanc sous la liste, overscroll pas pro). À corriger : adapter la hauteur du conteneur virtualisé au contenu + gérer l'overscroll iOS. Signalé 09/06.

### Sons enfant synthétisés + bouton achat Android (09/06/2026, branche `feature/smart-notifications`)
- **`services/sounds.ts` (créé)** : sons synthétisés Web Audio (oscillateurs, volume 0.18, doux/enfant) remplaçant les anciens MP3 (`/sounds/*.mp3` jugés trop forts/adultes). 5 sons : `gain` (carillon ascendant C5-E5-G5), `goal` (fanfare + sparkle), `purchase` (ta-da doux), `mission` (blip), `penalty` ("oh" descendant doux). Variantes choisies par l'utilisateur via page d'aperçu `~/Desktop/koiny-sons-preview.html`.
- **`components/ChildView.tsx`** : remplace `playSound('/sounds/*.mp3')` par `sounds.*(soundEnabled)`. Nouveau : son `goal` (fanfare) si un gain fait franchir la cible d'un objectif actif (sinon `gain`). `playSound` mort supprimé.
- **`components/AndroidChildView.tsx`** : AVANT = MUET (aucun son). Ajout : son mission à la complétion, effet sur le solde (gain/objectif/pénalité comme iOS), import Haptics.
- ✅ **BUG corrigé — l'enfant ne pouvait pas acheter d'objectif sur Android** : `onPurchaseGoal` était passé mais JAMAIS appelé ; quand l'objectif était atteint (`isReady`), Android n'affichait qu'un texte "🎉 Demande à tes parents" (pas de bouton, contrairement à iOS). Ajout d'un **bouton "Réclamer"** (`handlePurchase` → son achat + `onPurchaseGoal`), prop `onPurchase` passée à `HomeScreen`, clé i18n `claim` (Réclamer/Ophalen/Claim), carte goal en `minHeight` au lieu de `height` fixe.

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

### Actions du 06/06/2026 (session 2) — Audit notifs/widget + RGPD (feature/notifications-rgpd)

**Contexte**: Audit de l'implémentation push + widget, puis corrections. **Branche `feature/notifications-rgpd`** (à partir de `feature/qr-login`, donc inclut le QR). Tout le serveur (edge functions) est **déployé**; le code app nécessite un nouveau build pour prendre effet.

**RGPD — désinscription email fonctionnelle:**
- ✅ **Problème détecté**: les emails de relance (`notify-inactive-users`) avaient un lien `/unsubscribe` **non fonctionnel** → violation RGPD (l'opt-out doit être honoré). Le consentement à l'envoi était déjà respecté (`.eq('marketing_consent', true)`, opt-in explicite séparé dans l'onboarding), mais pas la désinscription.
- ✅ **Fix**: nouvelle edge function `unsubscribe` (`supabase/functions/unsubscribe/index.ts`) — vérifie un lien signé HMAC-SHA256(uid) (clé = `SERVICE_ROLE_KEY`, pas de nouveau secret), passe `marketing_consent = false`, renvoie une page de confirmation FR/NL/EN. **Déployée `--no-verify-jwt`** (lien public depuis email). `notify-inactive-users` injecte désormais le lien signé par user. Testé: mauvaise signature rejetée, bonne signature acceptée.

**Push notifications — améliorations (`services/pushService.ts`, `supabase/functions/send-push/index.ts`, `App.tsx`, `components/ParentView.tsx`, `components/AndroidParentView.tsx`):**
- ✅ **Tap notif → navigation**: ajout d'un listener `pushNotificationActionPerformed` (manquait — seul le local existait). Tap sur push parent (mission terminée/demandée, cadeau) → onglet Demandes; push enfant (nouvelle mission, validée, refusée) → vue enfant. Câblé iOS (ParentView) **et** Android (AndroidParentView via nouvelles props `notificationAction`/`onClearNotificationAction`). Les 3 push parents incluent maintenant `childId` dans `data`.
- ✅ **Nettoyage tokens FCM morts** (`send-push`): sur erreur `UNREGISTERED`/404, suppression du token de `device_tokens` (sinon accumulation de tokens d'apps désinstallées). Token OAuth FCM récupéré 1× par batch au lieu d'1× par envoi.
- ✅ **Bloc APNs iOS** (`send-push`): ajout `apns.payload.aps` (son + badge) — les push iOS arrivaient sans personnalisation.

**Rappel hebdo intelligent (`services/notifications.ts`):**
- ✅ **Avant**: rappel fixe dimanche 10h pour tous → spam des parents actifs. **Après**: rappel "rolling" reprogrammé à `now + 7j` à chaque ouverture d'app. Un parent actif le repousse sans cesse (jamais spammé); un parent inactif est relancé 7j après sa dernière visite.

**Widget iOS — devise dynamique (`services/widgetBridge.ts`, `services/widget.ts`, `App.tsx`, `ios/App/KoinyWidget/KoinyWidget.swift`):**
- ✅ **Fix**: la devise était hardcodée `€` (4 endroits Swift) → un user en £/$ voyait quand même €. `currency` transmis JS → bridge → payload → modèle Swift, avec fallback `€` (rétro-compatible).
- 📋 **Non fait (suivi)**: widget **multi-enfants** affiche toujours `children[0]`. Un vrai sélecteur nécessite un widget configurable (App Intents Swift) — gros chantier natif à part.

**À tester**: tap notif → navigation (2 appareils), désinscription email, widget en devise non-€. Build app requis pour les changements non-serveur.

### Actions du 06/06/2026 (session 3) — Foreground reload + découvrabilité QR (feature/notifications-rgpd)

**Contexte**: Le test du QR login sur 2 appareils a révélé que les données ne se synchronisaient pas (modif sur appareil A invisible sur appareil B). Diagnostic + fix de sync, puis amélioration de la découvrabilité de la connexion QR. Branche `feature/notifications-rgpd` (qui contient déjà tout le QR + les notifs — tout regroupé pour un seul build).

**Diagnostic sync:**
- `services/realtime.ts` existe mais **n'est importé nulle part** → aucune sync temps-réel. (Son filtre `family_id` est de toute façon NULL sur presque toutes les lignes — `user_id` est le vrai lien.)
- `loadData()` (lecture cloud) n'était appelé qu'à 2 endroits : `initialize()` (cold start) et `handleLoginSuccess` (login). **Aucun rechargement au retour au premier plan** → un 2ème appareil ne voyait jamais les changements de l'autre tant qu'il n'était pas killé/relancé.

**Fix — Foreground reload (`App.tsx`):**
- ✅ Nouvel `useEffect` qui rappelle `loadData(ownerId)` sur `visibilitychange` (visible) ET `appStateChange` natif Capacitor (`isActive`). Cross-platform iOS/Android.
- Garde-fous : ne s'applique que si `ownerId` réel (pas demo/local-owner), pas pendant `loading`/AUTH/LANDING, pas de rechargement concurrent (`isForegroundReloadingRef`), pas pendant une écriture (`isSavingRef`/`isDirectSupabaseOperation`/`isInitializing`).
- N'applique le cloud que s'il est **strictement plus récent** que la mémoire (`dataRef` à jour pour comparer `updatedAt` sans closure périmée). `isReloadingFromRealtime.current = true` pendant le `setData` pour bloquer le save-auto déclenché. **Jamais d'écrasement d'une modif locale non sauvegardée.**
- Réutilise la comparaison `updatedAt` déjà testée en prod dans `loadData` → faible risque. (Le realtime "live" reste un chantier futur — risque de boucle d'écrasement, migration `family_id`→`user_id`, config Realtime + RLS Supabase.)
- **Combo avec les push** : la push ramène l'app au premier plan → déclenche le reload. Couvre ~99% des cas réels (le seul non couvert : 2 écrans ouverts et fixés simultanément).

**Découvrabilité QR (combo 1+3):**
- ✅ **`components/QrConnectTip.tsx` (créé)**: astuce contextuelle sur le dashboard parent dès qu'il y a ≥1 enfant (donc juste après la 1ère création). Carte fixe en bas, dismiss permanent (`localStorage 'koiny_qr_tip_dismissed'`). Texte FR/NL/EN avec le prénom de l'enfant. Bouton "Comment faire" → ouvre le guide ; "Plus tard"/× → ferme.
- ✅ **Câblage iOS** (`components/ParentView.tsx`): state `showQrTip`, rendu conditionnel `mainView === 'dashboard' && children > 0`, "Comment faire" → `setShowHelp(true)`.
- ✅ **Câblage Android** (`components/AndroidParentView.tsx`): le `showHelp` étant interne à `ProfileScreen`, ajout du pattern `autoOpenHelp`/`onHelpShown` (comme `autoOpenPinSheet`). Tip "Comment faire" → `setTab('profile')` + `setPendingOpenHelp(true)` → ProfileScreen ouvre le guide.
- ✅ **Guide (`components/HelpModal.tsx`)**: nouvelle étape 8 "Connecter l'appareil de l'enfant" (icône `fa-qrcode`) ajoutée dans les **6 variantes** (FR/NL/EN × objets `t` iOS et `tAndroid`), avec les 3 étapes concrètes (installer + "Connexion par QR code" côté enfant, Profil > Connecter un appareil côté parent).

**Tracking QR (`services/qrAuth.ts`):**
- ✅ 3 events `BUSINESS` (persistés dans `analytics_events`) : `QR_LOGIN_STARTED` (tablette affiche le QR, dans `createQrSession`), `QR_DEVICE_APPROVED` (parent scanne+approuve, dans `approveQrSession`), `QR_LOGIN_SUCCESS` (session ouverte, dans `completeQrLogin`). Permet de suivre le funnel complet.

**Data sync & consistency (`services/storage.ts`, `App.tsx`):**
- ✅ **Merge local + cloud** (`mergeGlobalStates()`): quand **deux appareils** ont des données divergentes, la fonction fusionne par ID (jamais de wholesale replacement). Pour les goals, détection des doublons par signature content-based (titre+montant) pour éviter la réinsertion à chaque sync.
- ✅ **Balance floor** (`Math.max(0, balance)`): le solde de l'enfant ne peut jamais être négatif. Appliqué 2 endroits : `mergeChildProfile()` (balance calculée) et `migrateData()` (balance en cache). Prévient l'affichage d'un solde comme "-1€" dû aux arrondis de calcul.
- ✅ **Widget activeChildId tracking** (`services/widgetBridge.ts`, `App.tsx`): le widget affiche maintenant les stats de l'enfant **actif** (pas toujours `children[0]`). `updateWidgetData()` accepte un paramètre `activeChildId`, passe au widget via le bridge. Mise à jour à 3 endroits dans `App.tsx` (création enfant, switch profil, foreground reload).
- ✅ **Help guide scroll QR** (`components/HelpModal.tsx`): nouvelle prop `scrollToQr?: boolean` qui scrolle vers l'étape 8 (QR) avec `scrollIntoView` 300ms après le render. Câblé depuis `QrConnectTip` → "Comment faire" ouvre le guide et scroll à l'étape QR. iOS (ParentView) + Android (AndroidParentView via `pendingOpenHelp`).

**Build**: `npm run build` + `npx cap sync ios/android` lancés le 06/06/2026 (commit `7185ef2`). Tous ces changements sont du code app (pas serveur) → nécessitent ce build pour prendre effet.

### Actions du 07/06/2026 — Sync multi-appareils robuste (test iPhone parent ↔ Android enfant, `feature/notifications-rgpd`)

**Contexte**: Tests intensifs sur **2 appareils physiques** (iPhone parent + Huawei Android enfant via QR login). Découverte et correction d'une série de bugs de sync cross-device. Le principe directeur : **le merge favorisait toujours le local**, donc toute modif faite sur un appareil était écrasée sur l'autre. Tout le travail ci-dessous est du **code app** (build requis). **Pas encore committé au moment de l'écriture.**

**Sync premier plan — polling 5s (`App.tsx`):**
- ✅ Le foreground reload (visibilitychange/appStateChange) ne couvrait pas le cas « 2 apps ouvertes en même temps » (aucune ne passe en arrière-plan → aucun rechargement). Ajout d'un `setInterval` 5s qui rappelle `reloadFromCloud()` tant que l'app est **visible**. Réutilise tous les garde-fous existants (anti-écrasement, n'applique que si cloud strictement plus récent). → toute donnée arrive sur l'autre appareil en **≤5s** même les 2 apps ouvertes.

**Merge — résolution par récence (LE fix central, `services/storage.ts`):**
- ✅ **Problème racine** : `mergeChildProfile` faisait `...local` + ne surchargeait que quelques champs → tout le reste (flags, couleur, etc.) prenait **toujours** la valeur locale → modif cloud ignorée. Et `name`/`avatar` étaient résolus par un `useLocal` basé sur les **dates d'historique** (qui ne bougent pas quand on édite un nom) → égalité → local gagne.
- ✅ **Fix** : nouveau paramètre `preferCloudScalars` (= `!useLocal` global, basé sur `updatedAt` qui est bumpé à **chaque** sauvegarde) passé depuis `mergeGlobalStates`. Tous les champs éditables résolus par **récence** (l'appareil qui a sauvé en dernier gagne) :
  - **Enfant** : `name`, `avatar`, `colorClass`, `birthday`
  - **Flags de demande** : `giftRequested`, `missionRequested` (enfant → parent : demande visible sur l'autre appareil)
  - **Missions** (même ID) : itération du côté préféré **en dernier** pour qu'il gagne le `set` (avant : cloud gagnait toujours)
  - **Objectifs** (même ID) : idem (avant : local gagnait toujours via le `else-if`)
- ⚠️ **Union préservée** : un item présent d'un seul côté est toujours conservé → **la suppression ne se propage toujours PAS** (c'est l'objet de la branche `feature/delete-sync`, voir plus bas).

**Historique — ordre chronologique identique iPhone/Android (`types.ts`, `services/supabase.ts`, `services/storage.ts`, `App.tsx`):**
- ✅ **Problème** : le champ `date` ne contient que le **jour** (`JJ/MM/AAAA`). Pour des transactions du même jour, le tri par jour donne une égalité → ordre dépendant du cache local → **divergent entre appareils** (iPhone montrait un ordre, Android un autre).
- ✅ **Fix** : ajout `createdAt?: string` (timestamp ISO complet) à `HistoryEntry`. Lu depuis Supabase (`t.created_at`), écrit sur toute nouvelle entrée locale (`new Date().toISOString()` — 4 sites dans `App.tsx`). Le merge trie par `entryTime` (createdAt sinon date) **décroissant**, avec **départage déterministe par `id`** (même ordre sur les 2 appareils). → dernière validation en haut, identique partout. Bonus : les anciennes transactions récupèrent `created_at` de la base.
- ✅ **Vue Android** (`AndroidChildView` HistoryScreen) : suppression du re-tri par date-jour, utilise l'ordre du tableau (= ordre merge) comme iOS.

**Commentaire parent dans l'historique (`services/supabase.ts`, migration SQL):**
- ✅ **Problème** : le `note` (commentaire de validation, ex: "Bravo 🌟") n'était **jamais écrit** (omis dans `mapTransaction`) et relu **toujours `null`** → commentaire perdu à chaque sync.
- ✅ **Fix** : `note: h.note || null` à l'écriture, `note: t.note ?? null` à la lecture. **Migration `20260607_transactions_note.sql`** : `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS note text;` — **appliquée en prod** (SQL Editor). ⚠️ La colonne DOIT exister avant le build sinon tout le sync transactions plante.

**UI parent iOS — demandes ouvrent les sheets directs (`components/ParentView.tsx`):**
- ✅ Bouton "Configurer" (demande cadeau) appelait `startEditChild()` → écran de réglages enfant. Remplacé par l'ouverture **directe** du goal sheet (`setDashGoalSheetOpen(true)`, comme le tap sur notif). Bouton "Créer" (demande mission) : `setShowAddMissionSheet(true)` au lieu de scroller vers un formulaire inline. (iOS garde son archi de sheets inline — pas de nouveau composant modal.)

**UI enfant Android — objectifs carousel (`components/AndroidChildView.tsx`):**
- ✅ Les cartes objectif scrollaient avec aperçu de la suivante + hauteurs inégales. Passées en **carousel snap** (`scrollSnapType: 'x mandatory'`, cartes `width: 100%`, `scrollSnapAlign: center`, hauteur fixe 112) + `onScroll` met à jour les pagination dots. Une carte plein écran par swipe.

**Android App Links (Google Play, `public/.well-known/assetlinks.json` + Hostinger):**
- ✅ Play Console signalait "Liens profonds ne fonctionnent pas / Échec validation domaine". Cause : `assetlinks.json` contenait l'empreinte de la **clé d'upload** au lieu de la **clé de signature Google Play** (Play App Signing re-signe l'app). Fix : remplacé par le SHA-256 Google Play (`50:AD:1D:C2:...`) dans le fichier local **et** sur Hostinger (`public_html/.well-known/assetlinks.json`). Domaine `koiny.app` → "Aucun problème détecté" ✅. **Accès production Google Play accordé** (l'app peut être publiée à tout moment ; reste en Tests fermés Alpha pour l'instant).

**Note machine** : le build a thrashé (~1h28 au lieu de ~24min) car le swap était saturé (7.3/8 GB). **Fermer Brave + Antigravity avant `npm run build`** sur cette machine 8 GB.

**Commits sur `feature/notifications-rgpd`** (testés OK) :
- `a56d161` feat(sync): merge par récence + ordre historique createdAt + sheets parent iOS
- `d99da85` fix(sync): édition montant goal/mission persiste (goals UUID + saveData merge dès que cloud plus récent)

### Actions du 07/06/2026 (suite) — Branche `feature/delete-sync` (tombstones) + DEBUG EN COURS

**État** : branche `feature/delete-sync` créée à partir de `d99da85`. **CLAUDE.md gardé en LOCAL non committé** (contient du PII users — décision : ne pas committer, éventuellement scinder en `CLAUDE.local.md` gitignoré plus tard). Build `bkt0iljef` installé sur les 2 appareils.

**Tombstones implémentés (suppression cross-device) — commit pas encore fait sur delete-sync :**
- ✅ **Migration `supabase/migrations/20260607_deleted_items.sql`** : table `deleted_items` (user_id, item_type goal|mission|child|transaction, item_id, deleted_at, UNIQUE) + RLS (`auth.uid()=user_id`) + GC 90j (cron commenté). **APPLIQUÉE EN PROD** (SQL Editor).
- ✅ **`services/supabase.ts`** : `recordDeletion(userId,type,id)` (insert tombstone + ajoute au cache module immédiat), `fetchDeletedIds(userId)` (lit la table → reconstruit le cache, préserve les suppressions locales), `getDeletedIdsCache()` (sync). Cache module `deletedIdsCache`.
- ✅ **`services/storage.ts`** : `applyTombstones(state)` filtre children/goals/missions/history par le cache. Intégré dans `loadData` (après `fetchDeletedIds`, dans les 3 chemins de retour) ET `saveData` (avant l'upsert cloud).
- ✅ **`App.tsx`** : `recordDeletion(ownerId, 'goal'|'mission'|'child', id)` dans handleDeleteGoal/handleDeleteActiveMission/handleDeleteChild.

**Fixes additionnels (uncommitted sur delete-sync) suite aux tests :**
- ✅ **handleDeleteActiveMission + handleDeleteGoal → OPTIMISTIC** (`App.tsx`) : retrait local D'ABORD, puis tombstone, puis delete cloud best-effort. Avant, le delete réseau passait en 1er ; s'il throwait, le retrait local était sauté → corbeille "inactive" / delete iOS sans effet.
- ✅ **Goals = matching par ID uniquement** (suppression de la dédup par signature `nom:montant`) dans `storage.ts` (mergeChildProfile) ET `supabase.ts` (saveToSupabase goals). Raison : la signature fusionnait des goals distincts et BLOQUAIT l'apparition d'un nouveau goal de même nom+montant. Les goals ont des UUID stables maintenant → l'id suffit.

**⚠️ BUG EN COURS DE DEBUG (bloquant) — création iPhone ne propage pas :**
- Symptôme : une mission "TEST123" créée sur iPhone **n'apparaît PAS dans le cloud** (vérifié par `select ... from missions` → absente). Idem pour un nouveau goal. Force-reload Android ne la fait pas apparaître. → **l'iPhone ne sauvegarde plus rien au cloud.**
- Hypothèse écartée : `applyTombstones` qui filtrerait Jack. La table `deleted_items` ne contient **que 2 tombstones `goal`** (aucun `child`, aucune `mission`) → Jack n'est pas filtré.
- **Prochaine étape** : lire les **logs Xcode** en créant une mission. Chercher `🛑 [APP] Save blocked` (guard bloqué : isSavingRef/isDirectSupabaseOperation/isReloadingFromRealtime/isInitializing/isSyncingFromOnline) ou `[STORAGE] Sync cloud échouée` + erreur. Le save de l'iPhone est soit bloqué par un guard, soit en erreur réseau/RLS.
- Pistes à investiguer si guard bloqué : `handleAddMission` met `isDirectSupabaseOperation.current=true` (ligne ~1182) dans une IIFE async avec finally — vérifier qu'il se libère. Le polling 5s + foreground reload + saveData merge (seuil abaissé `cloudTimestamp > localTimestamp`) interagissent.
- ⚠️ Les **doublons de goals** créés par l'ancien bug Date.now() traînent en base (ids divergents iPhone/Android) → un delete par tombstone ne matche pas cross-device pour ces vieux goals. Tester avec des items FRAIS.

**Non couvert encore** : « Effacer l'historique » (handleClearHistory) ne supprime pas dans Supabase ni ne pose de tombstone → transactions reviennent. À traiter après.

> ✅ **TRAITÉ le 08/06 (session 6)** — `handleClearHistory` (App.tsx) : design **"Solde reporté"** (PAS reset à 0 — l'enfant garde son argent gagné). Efface l'historique détaillé mais le remplace par UNE transaction `{id: carryId, title: "Solde reporté", amount: balance}` qui préserve le solde (le solde est calculé depuis l'historique). 2 bugs critiques corrigés : (1) **même `carryId` local ET cloud** (insert avec id explicite) sinon les deux "Solde reporté" ne se dédupliquent pas au merge → **solde DOUBLE à chaque clear** (12→24→48→72...) ; (2) **tombstones via `recordDeletions(ownerId, 'transaction', oldIds)`** sur toutes les transactions effacées, sinon le cache de l'AUTRE appareil les ressuscite via l'union du merge → re-push cloud → divergence (vu : iPhone 108 / cloud 72 / Android 36 pour le même Jack). `recordDeletions` = nouvelle fn batch dans supabase.ts. `applyTombstones` filtre déjà l'historique par tombstone `transaction` (storage.ts:53).

**À faire au prochain session** : 1) résoudre le bug save iPhone (logs Xcode), 2) committer delete-sync quand stable, 3) tester suppression goal/mission/enfant cross-device avec items frais, 4) historique.

### Actions du 08/06/2026 — Bug save iPhone résolu : boucle reload infinie + saves perdus (`feature/delete-sync`)

**Contexte**: Reprise du bug bloquant « création iPhone ne propage pas ». Tests 2 appareils (iPhone parent + Huawei Android enfant). Diagnostic via logs Xcode + inspection directe du cloud (curl + service role key). **Code app non committé** au moment de l'écriture — nécessite un build. CLAUDE.md toujours gardé en LOCAL non committé (PII).

**Cause racine #1 — boucle de reload infinie (`services/storage.ts`, FIX appliqué) :**
- `mergeGlobalStates()` mintait `updatedAt: new Date().toISOString()` (timestamp neuf) **à chaque merge**. Or `loadData()` merge local+cloud à **chaque** appel. Donc le foreground reload (`App.tsx`) voyait toujours `incomingTs > currentTs` → « cloud plus récent » → reload → re-merge → timestamp encore plus neuf → **boucle infinie** toutes les 5s (polling) + à chaque `appStateChange`.
- Conséquences : (a) `isReloadingFromRealtime` ré-armé en permanence → **save-auto bloqué** (`🛑 Save blocked` en rafale) ; (b) la convergence `saveToSupabase(merged)` de `loadData` (ligne ~119) repoussait un `updatedAt=now()` neuf vers le cloud toutes les 5s → **tempête de feedback** iPhone↔Android.
- **Fix** : le merge conserve le plus récent des deux `updatedAt` au lieu d'en créer un neuf : `updatedAt: (useLocal ? local.updatedAt : cloud.updatedAt) || new Date().toISOString()`. Merger deux états identiques redonne le même timestamp → le reload voit « rien de nouveau » → boucle stoppée. Le chemin `saveData` ré-override avec `now()` (ligne ~402) pour les vraies écritures → écritures intactes.

**Cause racine #2 — saves perdus par abandon (PERTE DE DONNÉES, `App.tsx`, FIX appliqué) :**
- Symptôme : une mission « test123 » créée sur iPhone n'atteignait pas le cloud, **puis disparaissait** de l'iPhone après bascule arrière-plan/avant-plan (jamais supprimée). iPhone14,5 à ~95 MB RAM libre → iOS tue le WebView → au retour, `[INIT]` recharge depuis le cache local → test123 (jamais persisté) est perdu.
- Cause : le save-auto (`useEffect` sur `data`) faisait `return` dès qu'un guard transitoire était actif (`isSavingRef`/`isReloadingFromRealtime`/`isDirectSupabaseOperation`/`isInitializing`). **Aucun retry** → la modif n'était jamais persistée (ni cache local, ni cloud), seulement en mémoire React → perdue au rechargement. Intermittent : Test2 est passé (pas de guard actif), test123 est tombé pendant une fenêtre de reload.
- **Fix** (3 changements `App.tsx`) :
  1. `saveRetryRef` : si bloqué par un guard, **re-tente** le save via `setTimeout(runSave, 600)` au lieu d'abandonner → la modif finit toujours par être persistée quand le guard se libère.
  2. `skipNextSaveRef` : marque les données venant d'être appliquées par le foreground reload → le save-auto les **skip sans retry** (sinon re-push de données cloud → ping-pong de la cause #1 réintroduit). Distinct du retry : seul le reload arme ce flag, donc une vraie modif user n'est jamais skippée à tort.
  3. Le foreground reload arme `skipNextSaveRef.current = true` juste avant son `setData`.

**Diagnostic — log `❌ Error loading from Supabase V2: {}` (`services/supabase.ts`) :**
- Le `{}` n'est PAS une erreur vide : `console.error('...', err)` sérialise un objet `Error` en `{}` dans la console iOS (props non énumérables). Catch amélioré pour logger explicitement `message`/`code`/`details`/`hint`/`status`/`name`/`elapsedMs` → permet de distinguer timeout 8s / 401 auth / PostgrestError / abort réseau au prochain test. (L'erreur était probablement un blip transitoire au cold start : la requête de load mesurée = 0.1s / 26 KB, donc pas un timeout de taille.)

**Vérifs cloud (curl + service role) au 08/06** : 3 enfants (Jack, Léon, Olivia), 12 missions de ce compte, 6 tombstones (2 goal + 4 mission) → `recordDeletion` fonctionne. Test2 (créée iPhone 04:05) **présente** dans le cloud → le save iPhone marche par intermittence (d'où le retry). Android sur le nouveau build voit Test2 → sens cloud→Android OK.

**À tester après build** : créer une mission iPhone → vérifier qu'elle monte au cloud **et** survit à une bascule arrière-plan/avant-plan ; suppression goal/mission/enfant cross-device avec items frais ; plus de rafale `🛑 Save blocked` / `🔄 cloud plus récent` dans les logs (juste « rien de nouveau »).

**Suite (08/06 session 2) — retry borné + timeouts réseau + load robuste :**
- **Logcat Android** (via `adb logcat -d`, tag `Capacitor/Console` ; ⚠️ `timeout` n'existe pas sur ce macOS → utiliser `adb logcat -d` en mode dump, pas `timeout adb logcat`) : le fix retry v1 (non borné) **bouclait à l'infini** sur Android (`🛑 Save blocked — retry programmé` toutes les 600ms sans fin) — un guard restait coincé sur `true` (réseau Huawei flaky → `await` delete sans timeout coince `isDirectSupabaseOperation`, ou load lent coince `isInitializing`).
- ✅ **Retry BORNÉ + backoff** (`App.tsx`) : `saveRetryCountRef`, max 8 essais, backoff 600ms→5s, puis abandon (le prochain changement de `data` ou la convergence `loadData→cloud` rattrape). Le log indique maintenant QUEL guard bloque (`saving`/`reloading`/`directOp`/`initializing`). Reset du compteur sur succès/abandon, cleanup du timer au unmount de l'effet.
- ✅ **Timeouts réseau sur les delete** (`App.tsx`) : helper `raceTimeout(p, 8000)` (accepte les thenables Supabase via `Promise.resolve`). Appliqué à `handleDeleteActiveMission`/`handleDeleteGoal`/`handleDeleteChild` → le guard `isDirectSupabaseOperation` ne reste jamais coincé si le réseau hang (le tombstone garde l'item caché de toute façon).
- ✅ **Load cloud robuste** (`services/supabase.ts`) : bug du **timeout partagé** — un seul `setTimeout(8s)` couvrait les 3 retries de `withRetry` → si la 1ère tentative était lente (refresh token cold start), les retries n'avaient plus de temps → `Error loading V2` systématique. Fix : timeout **créé à chaque tentative** (+ `clearTimeout` via `.finally`). Devrait fiabiliser le cold start des 2 appareils (la cause racine de : Test3 absent sur Android, Test2 qui ressuscite faute de tombstone persisté, demandes mission/goal qui n'arrivent pas).
- 📋 **Vérifs cloud 08/06 (curl)** : Test3 (`7998489a`) **présent** dans le cloud ; Test2 (`c85a7d0d`) toujours présent et **absent de `deleted_items`** → le delete iPhone n'avait pas posé de tombstone persistant (réseau). 6 vieux tombstones (≤03:27). Missions créées avec `crypto.randomUUID()` → pas de divergence d'ID (ligne `supabase.ts:652` garde `m.id` si UUID). ⚠️ Reste un risque : `saveToSupabase` missions ne récupère PAS l'`idMapping` quand `m.id` n'est pas un UUID (contrairement aux goals) → à surveiller pour les vieilles missions legacy.

**🎯 CAUSE RACINE TROUVÉE (08/06 session 3) — navigator.locks deadlock Huawei (`services/supabase.ts`) :**
- **Logcat Android décisif** (build avec log amélioré) : `❌ Error loading from Supabase V2: {"message":"TIMEOUT_LOAD_DATA","elapsedMs":"27008"}` → la requête de chargement **hang 27s** sur le Huawei (3×8s + backoff), alors qu'elle prend **0.1s** depuis le Mac. Le guard `initializing` reste donc bloqué tout ce temps (le retry borné s'arrête bien à 8/8 : `🛑 Save blocked (initializing) — retry abandonné après 8 essais` ✅). Android charge alors le local seul → ne voit jamais les créations iPhone (Test3/Test4), les deletes ne se propagent pas, etc. **Tous les symptômes de sync découlaient de ce hang.**
- **Cause** : supabase-js (`@supabase/auth-js` 2.99.1) sérialise le refresh de token via `navigator.locks` (Web Locks API) quand `persistSession && navigator.locks` existe (`GoTrueClient.js:135`). Sur la WebView du Huawei, ce lock **deadlocke** (cf. l'erreur Capacitor `'Lock broken by another request'` déjà dans les ignoreErrors Sentry) → le refresh de token hang → **toutes** les requêtes auth/DB hang.
- ✅ **Fix** : passer un `lock` **pass-through** (`async (_n,_t,fn) => fn()`) à `createClient({ auth: { lock } })` **sur natif uniquement** (`Capacitor.isNativePlatform()`). En natif il n'y a qu'une WebView → pas de concurrence multi-onglets → le lock natif est inutile. Sur web on garde `navigatorLock` (multi-onglets légitime). Devrait supprimer le hang → load cloud instantané sur Android comme sur le Mac.
- **À tester** : cold start Android → `Error loading V2` doit disparaître, les missions iPhone apparaissent immédiatement ; sync bidirectionnelle + suppressions cross-device avec items frais.
- ⚠️ **Le lock fix N'A PAS suffi** (testé build 09:35, `lastUpdateTime=09:36` confirmé sur le Huawei) : le hang persiste **identique** (`elapsedMs:27009`). Donc la cause n'est pas (que) navigator.locks → c'est le `fetch` réseau ou `getSession` qui hang sur la WebView Huawei. **Build suivant (diagnostic+fix)** : (1) instrumentation timing dans `fetchData` (`⏱️ [LOAD] getSession/profiles/children fait en Xms`) pour localiser le hang ; (2) `fetch` custom avec **AbortController 10s** passé à `createClient({ global: { fetch } })` → une requête bloquée s'abort proprement au lieu de hang → withRetry peut retenter. À lire dans logcat au prochain cold start Android pour savoir si c'est getSession (auth) ou les requêtes DB qui bloquent.

**▶️ REPRISE (après reboot Mac, 08/06 ~10h) — où on en est :**
- **Branche `feature/delete-sync`**, 4 fichiers modifiés NON committés : `App.tsx`, `services/storage.ts`, `services/supabase.ts`, `CLAUDE.md` (CLAUDE.md reste local, PII). Migration `20260607_deleted_items.sql` déjà appliquée en prod.
- **Dernier build = 10:09:46** (synced ios+android), contient TOUS les fixes : merge timestamp-max, retry borné save, timeouts delete (`raceTimeout`), lock pass-through natif, fetch AbortController 10s, instrumentation `⏱️ [LOAD]`. **Pas encore installé/testé** sur appareil.
- **ÉTAT FONCTIONNEL** : iPhone↔cloud OK (création + suppression se propagent au cloud, vérifié curl). Le **Huawei hang 27s au load** (`TIMEOUT_LOAD_DATA`) → ne sync pas. **Hypothèse en cours** : bug spécifique WebView Huawei (pas de Google Mobile Services, stack réseau HMSCore).
- **PROCHAINE ÉTAPE** : tester le nouveau build sur un **Samsung Galaxy S8** (Android 9, WebView Chrome standard) pour isoler si le hang est Huawei-spécifique. Brancher en USB (débogage activé) → `adb devices` → `cd android && ./gradlew installDebug` → cold start → `adb logcat -d | grep "⏱️ \[LOAD\]\|Error loading\|Save blocked"`. ⚠️ `timeout` n'existe pas sur ce macOS → utiliser `adb logcat -d` (dump), pas `timeout adb logcat`.
- Si S8 sync OK → Huawei = cas à part (documenter/traiter à part), committer delete-sync. Si S8 hang aussi → lire l'instrumentation `⏱️ [LOAD]` pour localiser (getSession vs profiles vs children) et corriger.
- **Reste à faire après** : « Effacer historique » (`handleClearHistory`) ne pose pas de tombstone → transactions reviennent ; bug `idMapping` missions non-UUID dans `saveToSupabase`.

**⚠️ CONCLUSION CORRIGÉE (08/06) — PAS Huawei-only : hang getSession au cold start sur TOUT Android :**
- Test sur **Samsung Galaxy Tab A8** (Android 11+, WebView Chrome standard, services Google) via build debug (`adb uninstall app.koiny.parent` requis d'abord — version Play Store signée différemment → `INSTALL_FAILED_UPDATE_INCOMPATIBLE`).
- **1er essai (juste après login)** : `⏱️ [LOAD] getSession fait en 13ms` / profiles 146ms / children 131ms → ~290ms, enfants affichés. **FAUX POSITIF** : la session venait d'être posée en mémoire (login), pas de récupération storage.
- **Cold start (récupération session depuis Preferences)** : `⏱️ [LOAD] début — getSession…` ×3 mais **`getSession fait` JAMAIS** → hang → `Save blocked (initializing)` → timeout. **IDENTIQUE au Huawei.**
- **Donc** : `supabase.auth.getSession()` hang **par intermittence au cold start sur Android** quand il récupère la session persistée (`initializePromise`/`_recoverAndRefresh` qui ne résout pas). Touche Huawei ET Samsung → **bug Android général**, pas un appareil exotique. iOS plus fiable mais a eu le même `Error loading V2` une fois.
- **Conséquence** : tant que `getSession` hang, `isInitializing` reste true (l'await RevenueCat n'est même pas atteint) → saves bloqués → l'appareil charge le cache local seul, ne sauve/sync pas. Au cold start (= chaque ouverture à froid pour un vrai user), Android est cassé par intermittence.
- **FIX À FAIRE (prochaine session)** : contourner `getSession`/`initializePromise` sur natif. Piste : lire l'`access_token` directement depuis Capacitor Preferences (clé `sb-...-auth-token` ou la clé storageKey supabase) et faire les requêtes de load en **REST brut** (`fetch` + header `Authorization: Bearer`), comme les `curl` qui marchent en 0.1s — bypass total du client auth qui hang. À faire pour load ET save (les deux passent par le client supabase-js qui hang sur getSession).
- Le `lock` pass-through + `fetch` AbortController + instrumentation `⏱️ [LOAD]` restent dans le code (inoffensifs, utiles pour la suite).
- Commit `03534b5` (poussé sur `origin/feature/delete-sync`) reste valable : tous ses fixes sont corrects, ils ne traitent juste pas ce hang getSession.

**🔧 FIX du hang getSession (08/06 session 4) — storage hybride localStorage/Preferences (`services/supabase.ts`) :**
- **Trace du code supabase-js** (`@supabase/auth-js` 2.99.1, lecture node_modules) : `getSession()` → `await initializePromise` → `_initialize` → `_recoverAndRefresh()`. Avec un token VALIDE (vérifié : `EXPIRY_MARGIN_MS=90s`, token avait ~36min restantes → pas dans la marge → **aucun refresh réseau**), `_recoverAndRefresh` ne fait QUE des `getItemAsync` = lectures storage. Le lock est pass-through (déjà fixé). → **Le hang est 100% la lecture `Preferences.get` au cold start** (pont JS↔natif Capacitor qui se bloque sous la contention du démarrage Android).
- ✅ **Fix** : `CapacitorStorageAdapter` devient **hybride** — `localStorage` en priorité pour `getItem` (synchrone, dans la WebView, **sans pont natif → jamais de hang**), `Preferences` en fallback durable + write-through sur `setItem`/`removeItem`. La session se lit instantanément → `getSession` ne hang plus → `isInitializing` se libère → save/sync OK.
- Migration douce : les sessions existantes (en Preferences) sont lues via le fallback au 1er cold start puis réamorcées dans localStorage ; tout nouveau login/refresh écrit dans les deux. Pas de perte de session iOS (Preferences reste la source durable).
- **À tester** : cold start Android (Samsung + Huawei) → `⏱️ [LOAD] getSession fait en Xms` doit APPARAÎTRE (rapide) au lieu de hang ; création/suppression/demandes se propagent ; plus de `Save blocked (initializing)` en boucle.
- ✅ **VALIDÉ sur Samsung Galaxy Tab A8** (cold start) : `⏱️ [LOAD] getSession fait en 1-2ms` (était hang ∞), `profiles ~70ms`, `children ~70ms`, `✅ Sync cloud réussi`, `✅ Données sauvegardées localement`. Création + suppression se propagent tablette↔iPhone. **Le fix marche.** (Reste à re-tester le Huawei mais même cause donc devrait passer.)

**🐛 BUG SUIVANT À TRAITER — flags de demande (`giftRequested`/`missionRequested`) perdus sous churn 2-appareils :**
- **Symptôme** : une demande mission/goal **initiée sur Android** (ex: Léon) **atteint le cloud** (`mission_requested=true` vérifié curl) mais ne s'affiche NI sur iPhone NI sur Android. Une demande initiée sur **iPhone** s'affiche partout. Asymétrie exposée seulement maintenant qu'Android sync (avant, getSession hang → Android mort).
- **Cause** : `mergeChildProfile` ([storage.ts:305-306]) résout `giftRequested`/`missionRequested` par **récence du `updatedAt` GLOBAL** (`preferCloudScalars`). Or les 2 appareils syncent en continu (polling 5s + converge-push de `loadData`) → l'`updatedAt` global est bousculé en permanence → un appareil avec un flag périmé (`false`) peut « gagner » le merge si son `updatedAt` global est plus récent (à cause d'un AUTRE changement), écrasant le `true` du cloud.
- **Piste de fix** : (a) sémantique « sticky » pour les flags de demande en attente — si un côté a `true` et que personne ne l'a explicitement remis à `false` plus récemment, garder `true` ; OU (b) timestamp par champ pour ces flags ; OU (c) réduire le churn (le converge-push de `loadData` + le polling 5s créent un va-et-vient qui rend la récence globale non fiable — c'est la cause profonde, à examiner : pourquoi tant de `⚠️ Cloud plus récent (autre appareil), merge avant save` en rafale sur la tablette).
- ⚠️ Le merge touche TOUTE la sync → fix à faire posément, pas en fin de session.

**🔧 FIX du churn + flags (08/06 session 5) — converge-push conditionnel (`services/storage.ts`) :**
- **Cause du churn TROUVÉE** : `saveToSupabase` met `profiles.updated_at` à chaque UPDATE (ligne ~626) ET un **trigger DB force `updated_at=now()`** sur tout UPDATE de `profiles` (vérifié : PATCH à 2020 → relu à now()). Or `loadData` faisait un converge-push `saveToSupabase(merged)` à **chaque** load. Donc : load → push → trigger bumpe updated_at → l'autre appareil voit « cloud plus récent » → reload → push → **ping-pong infini toutes les 5s** (polling). L'app lit `updatedAt` global depuis `profiles.updated_at` (loadFromSupabase ligne ~540) → ce timestamp churné rendait la récence des flags non fiable (un flag périmé `false` gagnait le merge car son updatedAt global était plus récent à cause du churn).
- ✅ **Fix** : le converge-push de `loadData` ne se fait QUE si `localTs > cloudTs` (strict). En régime établi (local == cloud), aucun push → aucun bump → **churn stoppé**. Les vrais changements passent par `saveData` (bump légitime). Une fois le churn éliminé, `updatedAt` reflète le dernier VRAI changement → le merge `preferCloudScalars` prend correctement le `true` du cloud → les demandes Android s'affichent.
- **À tester après build** : sur la tablette, plus de rafale `⚠️ Cloud plus récent (autre appareil)` / `🔀 Merge` en boucle (juste un merge quand un vrai changement arrive) ; demande mission/goal initiée sur Android → s'affiche sur iPhone ET Android. ⚠️ Re-tester avec une demande FRAÎCHE (les caches actuels ont des updatedAt churnés).

### Actions du 06/06/2026 — Connexion par QR code (feature/qr-login)

**Contexte**: Permettre à un parent de connecter un 2ème appareil (ex: tablette de l'enfant) sans saisir ses identifiants, en scannant un QR code depuis son téléphone déjà connecté (façon WhatsApp Web). Cross-platform iOS ↔ Android. **Branche dédiée `feature/qr-login`** (partie de `feature/android-redesign`, code de prod non touché).

**Architecture (flux):**
1. Tablette non connectée → écran de connexion → bouton "Connexion par QR code" → génère un `code` secret, affiche le QR (`koiny-qr:<code>`)
2. Téléphone parent (connecté) → Profil → "Connecter un appareil" → scanne le QR → approuve
3. Edge function génère un OTP magic-link pour le compte du parent, le stocke dans la session
4. Tablette poll → récupère l'OTP → `verifyOtp()` → vraie session Supabase sur le compte du parent

**Fichiers créés:**
- `supabase/migrations/20260606_qr_login_sessions.sql`: table `qr_login_sessions` (code, status `pending|claimed|consumed`, auth_email, auth_token, approved_by, expires_at 5min). RLS verrouillée (`USING false`, service role uniquement). Cron cleanup horaire (pg_cron). **Appliquée en prod le 06/06/2026** via SQL Editor (job cron #2).
- `supabase/functions/qr-auth/index.ts`: edge function Deno, 3 actions — `create` (tablette anon), `approve` (parent authentifié, vérifie le JWT, rejette la clé anon), `poll` (tablette anon, renvoie l'OTP une fois `claimed`, marque `consumed` = usage unique). **Déployée le 06/06/2026.** Secrets: `SERVICE_ROLE_KEY` (existant), `SUPABASE_URL`/`SUPABASE_ANON_KEY` (auto-injectés).
- `services/qrAuth.ts`: client. `createQrSession()`, `pollQrSession()`, `completeQrLogin()` (verifyOtp type `'email'`), `startQrLoginFlow()` (flux tablette avec polling 2s + annulation), `approveQrSession()` (parent), `parseQrPayload()` (préfixe `koiny-qr:`).
- `components/QrLoginModal.tsx`: côté TABLETTE. Génère le QR (`qrcode`), poll, états loading/waiting/success/expired/error, bouton régénérer.
- `components/QrScannerModal.tsx`: côté PARENT. Caméra via `getUserMedia` + décodage `jsQR` (100% web, cross-platform), confirmation avant approbation, états scanning/detected/approving/success/error/no_camera.

**Fichiers modifiés:**
- `components/AuthView.tsx`: bouton "Connexion par QR code" (mode LOGIN) + rendu `QrLoginModal`.
- `components/ParentView.tsx` (iOS) + `components/AndroidParentView.tsx`: row "Connecter un appareil" dans les réglages profil + rendu `QrScannerModal`.
- `ios/App/App/Info.plist`: `NSCameraUsageDescription` ajouté (requis pour la caméra).
- `android/app/src/main/AndroidManifest.xml` (gitignore, local): permission `CAMERA` + `uses-feature camera` (required=false).
- `package.json`: + `qrcode`, `@types/qrcode`, `jsqr`. Install avec `--legacy-peer-deps` (conflit préexistant capacitor-google-auth/capacitor 8).

**Sécurité:**
- Table verrouillée, aucun accès client direct — tout passe par l'edge function (le jeton OTP transite brièvement, jamais exposé via RLS).
- `approve` exige un vrai token utilisateur (la clé anon est rejetée → testé: `not_authenticated`).
- OTP usage unique (GoTrue) + session 5 min + `consumed` après lecture.
- QR préfixé `koiny-qr:` pour ne pas approuver un QR quelconque.

**Tests backend (curl) OK le 06/06:** create→code, poll→pending, approve avec clé anon→rejeté, poll code inexistant→not_found.

**Reste à faire:** test du flux complet sur 2 appareils physiques (caméra ne marche pas sur émulateur), build, puis merge dans la branche de prod si OK. Tip contextuel post-création d'enfant à ajouter (mentionner la connexion QR) — pas dans l'onboarding principal.

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

**RevenueCat Android offerings configurés (30/05/2026):**
- Produits importés depuis Play Console dans RevenueCat (Product catalog → Products → Import)
- Entitlement "Koiny Premium" attaché aux deux produits Android
- Package `$rc_monthly` : ajout de `com.koiny.premium.monthly:monthly-base` (Play Store)
- Package `$rc_annual` : ajout de `com.koiny.premium.yearly:yearly-base` (Play Store)
- SubscriptionModal Android affiche maintenant mensuel (1,99€) + annuel (16,99€) ✅

**License testers Play Console configurés (30/05/2026):**
- Play Console → (compte développeur) → Paramètres → Test de licence
- Liste "Testkoiny" (14 users) cochée et enregistrée → testeurs peuvent tester IAP sans être débités, sans blocage Family

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
- ✅ **RevenueCat Android**: offerings "default" configuré avec produits iOS + Android dans les packages Monthly et Yearly (configuré le 30/05/2026).

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
