# Changelog — Koiny

Toutes les modifications notables de l'app Koiny sont documentées ici.

---

## [1.0.7] — Mai 2026

### Nouveau
- **Widget iOS dynamique** — le widget change de couleur et affiche un message contextuel selon l'état de l'enfant : amber 🔔 (missions en attente), vert 🎉 (argent gagné aujourd'hui), rouge 😴 (inactivité 3+ jours)

### Corrections
- Fix widget : données correctement copiées dans l'App Group via JSON brut (widget ne montrait plus 0.00€)
- Fix import `WidgetKit` manquant dans `SceneDelegate`
- Fix widget couleurs vert/rouge jamais affichées — comparaison de dates corrigée (`DD/MM/YYYY` vs ISO) dans `widgetBridge.ts`
- Fix double-tap requis pour valider une mission — guard `isConfirmingRef` ajouté dans `ParentView.tsx`
- Fix double-tap requis sur dépôt/retrait — guard `isSubmittingTransactionRef` ajouté dans `ParentView.tsx`
- Fix solde non sauvegardé après dépôt/retrait — fuite du guard `isDirectSupabaseOperation` corrigée dans `handleManualTransaction` (App.tsx)
- Fix missions créées par le parent n'apparaissant pas sur le profil enfant — fuite du guard dans `handleAddMission` (App.tsx) bloquait toutes les sauvegardes suivantes
- Fix demandes de mission de l'enfant disparaissant immédiatement — même cause (guard jamais libéré)
- Fix alerte pénalité réapparaissant à chaque navigation — `acknowledgedPenaltyId` persisté dans `localStorage` au lieu du state React local (ChildView.tsx)
- Fix premier tap manqué sur les modals iOS — `backdrop-blur` retiré des backdrops de modals approval et transaction (conflit avec `useModal` body-lock `position:fixed`)

---

## [1.0.6] — Mai 2026

### Nouveau
- **Widget iOS dynamique** — le widget change de couleur et affiche un message contextuel selon l'état de l'enfant : amber 🔔 (missions en attente), vert 🎉 (argent gagné aujourd'hui), rouge 😴 (inactivité 3+ jours)
- **Cadeau d'anniversaire automatique** — l'enfant reçoit 5 € le jour de son anniversaire, avec notification au parent (anti double-crédit par année)
- **Guide de démarrage** — 4ème slide d'onboarding "Prêt en 3 étapes" pour guider les nouveaux parents
- **Analytics funnel** — tracking complet install → activation (AUTH_SCREEN_VIEWED, AUTH_PROVIDER_TAPPED, AUTH_SUCCESS, ONBOARDING_COMPLETED, CHILD_CREATED) persisté dans Supabase

### Corrections
- Fix widget : données correctement copiées dans l'App Group (widget ne montrait plus 0.00€)
- Fix NaN sur le prix mensuel équivalent du plan annuel dans la modal d'abonnement
- Fix persistance de la date de naissance (écrasée à null à chaque sync Supabase)

### Infrastructure
- Migration Supabase : colonnes `birth_date` et `last_birthday_reward_year` dans `children`
- Migration Supabase : table `analytics_events` avec RLS (INSERT only pour authenticated)

---

## [1.0.5] — Avril 2026

### Nouveau
- **Redesign iOS complet** — nouveau dashboard parent avec balance card consolidée (solde + gains/dépenses/amendes hebdo + boutons dépôt/retrait)
- **Onglet Historique iOS** — sélecteur d'avatars enfants, badges montants, liste style carte iOS avec icônes colorées par type
- **Onglet Demandes iOS** — pills enfants colorés, badge rouge missions en attente
- **Onglet Profil iOS** — page unique avec sections FAMILY et SETTINGS (8 paramètres inline)
- **Sélecteur de devise** — 23 devises disponibles (EUR, USD, GBP, CHF, CAD, AUD, SGD, HKD, NZD, JPY, INR, etc.)
- **Email re-engagement no_children J+2** — email ciblé pour les parents sans enfant créé
- **Colonne `language` dans profiles** — emails de re-engagement dans la langue du profil
- **FAB intelligent** — le bouton + central ouvre la création d'enfant si aucun enfant existant

### Corrections
- Masquage de la couronne Premium sur dashboard vide (évite paywall avant 1er enfant)
- Limites de saisie sur tous les champs numériques (montants missions, transactions)
- Balance cap dynamique respectant `data.maxBalance` au lieu de la constante

---

## [1.0.4] — Avril 2026

### Nouveau
- **Redesign iOS Login** — top band indigo, child cards MD3, bouton bas de page
- **Redesign iOS PaywallModal** — dark premium UI, cartes enfants avec rings gradient
- **Thème sombre adaptatif** — dashboard enfant iOS dark/light selon l'heure ou le système
- **Goal sheet** — feuille dédiée pour la progression des objectifs d'épargne
- **Notifications cadeaux** — tap sur notification ouvre directement la feuille objectif

### Corrections
- Fix z-index bouton fermeture paywall
- Fix traductions manquantes (badge PENDING, titre login, sections FAMILLE/PARAMÈTRES)
- Fix scroll historique
- Fix clipping avatar sélecteur enfants

---

## [1.0.3] — Avril 2026

### Nouveau
- **Android Material Design 3 complet** — ChildView, ParentView, tous les modals, ConfirmDialog, HelpModal, LegalModal, SubscriptionModal adaptés MD3
- **AndroidTopBar** — barre de navigation native Android, transparente sur hero, blanche après scroll
- **Jauge objectif dynamique** — couleur change selon progression (rouge/orange/vert/or)
- **Emails de re-engagement automatisés** — J+7 (tu nous manques), J+30 (missions en attente), J+90 (compte désactivé dans 30j) via Supabase Edge Functions + Resend, 3 langues

### Corrections
- Fix demo data bleed — mode démo ne persiste plus dans localStorage
- Fix premium state reset au logout
- Fix PIN flash "Code erroné" — machine d'état `pinState` + clearTimeout

---

## [1.0.2] — Mars/Avril 2026

### Nouveau
- **Suppression mode démo** — remplacé par message "Service indisponible" si Supabase non configuré
- **Redesign iOS History** — header sticky, filtre liste/graphique fixe pendant scroll
- **Sélecteur enfants scroll** — snap horizontal, auto-scroll vers enfant actif pour 3+ enfants

### Corrections
- Fix déconnexion — navigation optimiste vers AUTH avant appels réseau
- Fix `useModal` hook — body lock iOS-compatible pour tous les modals
- Fix logs anonymisés dans `pinStorage.ts`
- Fix PIN hashé PBKDF2 à la création (était stocké en clair avant)
- Fix `deleteAccount` — révocation Google + reset state complet

### Sécurité
- Clé RevenueCat déplacée dans `.env`
- `simulatePurchase()` bloqué en production
- Validation inputs : `isNaN`, montants max, longueur max
- Refresh premium périodique : `visibilitychange` + intervalle 6h

---

## [1.0.1] — Mars 2026

### Nouveau
- **Abonnements RevenueCat** — intégration complète avec fallback Xcode Sandbox, retry auto, spinner achat, anti double-clic
- **Offline mode** — banneau rouge + achats désactivés, détection Capacitor Network plugin
- **Lien "Gérer mon abonnement"** — ouvre la gestion Apple directement
- **Supabase RLS** renforcé — policies simplifiées, fonctions avec `search_path` sécurisé
- **RPC `delete_user_data`** — suppression complète en cascade (transactions → missions → goals → children → profiles → auth)

### Corrections
- Fix deep link OAuth — `emailRedirectTo` utilise `com.koiny.app://callback` sur native
- Fix Google Sign In — `GoogleAuth.initialize()` appelé une seule fois
- Fix Sentry dSYM — `DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym"` sur target Release

---

## [1.0.0] — Mars 2026

### Lancement initial App Store

- Dashboard parent multi-onglets (Missions, Historique, Demandes, Profil)
- Dashboard enfant avec solde, objectifs d'épargne, missions
- Système de missions avec validation parent en un tap
- Objectifs d'épargne avec barre de progression visuelle
- Amendes comportementales (conséquences calmes en remplacement des punitions)
- Widget iOS natif — solde de l'enfant sur l'écran d'accueil
- PIN parental sécurisé (PBKDF2, 100k itérations, SHA-512) + Face ID
- Multi-enfants (1 gratuit, illimité en Premium)
- 3 langues : Français, Néerlandais, Anglais
- Authentification Google Sign-In + Apple Sign-In + email
- Sync cloud Supabase + mode offline
- Freemium : 1,99 €/mois ou 16,99 €/an (14 jours d'essai gratuit)
- Conformité RGPD — aucune pub, aucune donnée vendue
