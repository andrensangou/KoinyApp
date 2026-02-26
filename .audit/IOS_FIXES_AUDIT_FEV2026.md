# 📱 Audit des Correctifs et Optimisations iOS (Février 2026)

Ce document récapitule l'ensemble des correctifs, optimisations et intégrations natives réalisés spécifiquement pour la version **iOS (Capacitor)** de l'application Koiny au cours des dernières sessions de développement.

---

## 🔒 1. Authentification Biométrique (Face ID / Touch ID)
**Objectif :** Permettre la réinitialisation du PIN Parent de manière sécurisée sans avoir à se reconnecter via Supabase.
- **Intégration du plugin :** Installation et configuration de `@capacitor-community/biometric-auth`.
- **Permissions iOS natives :** Ajout de la clé `NSFaceIDUsageDescription` dans le fichier `Info.plist` du projet Xcode pour justifier l'usage de Face ID auprès d'Apple.
- **Logique applicative :** Création d'un service `biometric.ts` gérant la détection de la disponibilité de la biométrie (Face ID ou Touch ID) et l'exécution de la vérification.
- **Fallback :** Si la biométrie échoue ou n'est pas configurée, le système bascule automatiquement sur la validation par mot de passe du compte.

## 🎨 2. Rétrogradation Tailwind CSS (Correction du Rendu WebKit iOS)
**Objectif :** Résoudre des problèmes d'affichage majeurs (écran PIN glitché, variables CSS non reconnues) spécifiques au moteur WebKit sur iOS 17+.
- **Problème identifié :** Tailwind v4 utilisait massivement la directive CSS `@property` qui n'était pas encore pleinement supportée ou créait des conflits avec notre structure Capacitor sur WebKit iOS.
- **Correctif :** Downgrade maîtrisé vers **Tailwind CSS v3.4**.
- **Modifications :**
  - Réinstallation de `tailwindcss@3`, `postcss`, et `autoprefixer`.
  - Reconfiguration complète de `tailwind.config.js` et `postcss.config.js`.
  - Nettoyage du fichier `index.css` des syntaxes spécifiques à la v4.
- **Résultat :** Rendu visuel 100% fidèle et fluide sur iPhone et iPad.

## 🔗 3. Authentification Google (OAuth & Deep Linking iOS)
**Objectif :** Faire fonctionner la connexion Google native qui restait bloquée après l'ouverture du navigateur.
- **Problème identifié :** L'application iOS ne parvenait pas à intercepter le callback (URL de retour) envoyé par Google après l'authentification.
- **Configuration iOS (Info.plist) :** Ajout du schéma d'URL inversé (`REVERSED_CLIENT_ID`) dans les `CFBundleURLTypes` pour que le système iOS reconnaisse que l'app Koiny doit s'ouvrir suite au login.
- **Code Natif (AppDelegate.swift) :** Modification du code Swift natif pour ajouter la méthode `application(_:open:options:)` chargée de transmettre l'URL interceptée au pont Capacitor (`ApplicationDelegateProxy`).
- **Résultat :** Connexion fluide avec Google en redirigeant correctement l'utilisateur vers l'application Koiny.

## 🔔 4. Notifications Locales et Internationalisation
**Objectif :** Gérer les notifications natives sur iOS (demandes de validation, récompenses) dans la bonne langue.
- **Correctif :** Paramétrage du plugin Local Notifications de Capacitor.
- **i18n :** Les textes poussés au système natif iOS pour l'affichage des bannières de notifications sont désormais dynamiquement traduits (Français/Anglais) avant l'envoi, garantissant une cohérence avec la langue du système de l'utilisateur.
- **Handlers :** Configuration robuste des listeners `localNotificationActionPerformed` pour l'ouverture spécifique de vues lors du tap sur une bannière iOS.

## 📴 5. Gestion Hors-Ligne & Performances (WebProcess)
**Objectif :** Éviter les alertes de surconsommation mémoire ou les crashs silencieux en arrière-plan.
- **Fix Realtime Supabase :** Implémentation d'un mécanisme de "Debounce" et de limitation de fréquence sur les souscriptions WebSockets pour éviter que l'app n'épuise la mémoire du `WKWebView` sous iOS en déclenchant de multiples rechargements.
- **Persistance PIN :** Le PIN parent est désormais stocké nativement de manière sécurisée (`Capacitor Preferences`) plutôt que d'attendre un retour réseau, garantissant un fonctionnement parfait en mode Avion.
- **Bruit de Log (RBS Assertion) :** Identification et validation en tant que "faux positif" inoffensif des multiples erreurs `ProcessAssertion::acquireSync` renvoyées par iOS.

---

**Statut Global iOS :** 🟢 **STABLE**
L'application est actuellement fonctionnelle, sécurisée et ses performances sont optimisées pour le moteur iOS WKWebView. Le pont natif (Deep Linking, Biométrie) est correctement configuré dans Xcode.
