# 📱 GUIDE DE TEST iOS - KOINY APP

**Date:** 10 février 2026  
**Version:** 2.0.0-secure  
**Plateforme:** iOS (iPhone/iPad)

---

## 🎯 OBJECTIF

Tester l'application Koiny sur un iPhone réel ou simulateur iOS avec tous les correctifs de sécurité appliqués.

---

## 📋 PRÉREQUIS

### Matériel
- ✅ Mac avec macOS (obligatoire pour iOS)
- ✅ iPhone (recommandé) OU Simulateur iOS
- ✅ Câble USB (si iPhone physique)

### Logiciels
- [ ] **Xcode** (gratuit sur Mac App Store)
- [ ] **Node.js** (https://nodejs.org)
- [ ] **Compte Apple Developer** (gratuit pour tester, 99€/an pour publier)

---

## 🚀 MÉTHODE 1 : TEST SUR SIMULATEUR iOS (RAPIDE)

**Temps estimé:** 15 minutes  
**Avantage:** Pas besoin d'iPhone physique  
**Inconvénient:** Certaines fonctionnalités limitées (notifications, etc.)

### Étape 1 : Installer Xcode

1. Ouvrez **Mac App Store**
2. Recherchez "Xcode"
3. Cliquez sur **Obtenir** (c'est gratuit)
4. Attendez le téléchargement (~12 GB)
5. Lancez Xcode une fois installé
6. Acceptez les licences

### Étape 2 : Installer Node.js et les dépendances

```bash
# Vérifier si Node.js est installé
node --version

# Si pas installé, téléchargez depuis https://nodejs.org
# Puis installez les dépendances du projet

cd /Users/andre/KoinyLocal
npm install
```

### Étape 3 : Créer le fichier .env

```bash
# Créer le fichier .env
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://vumowlrfizzrohjhpvre.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon_ici
VITE_KIDBANK_SALT=koiny-secure-salt-2024
EOF
```

**⚠️ Remplacez `votre_clé_anon_ici` par votre vraie clé Supabase !**

### Étape 4 : Builder l'application

```bash
# Builder le frontend
npm run build

# Synchroniser avec Capacitor iOS
npx cap sync ios

# Ouvrir dans Xcode
npx cap open ios
```

### Étape 5 : Lancer dans le simulateur

1. Xcode s'ouvre automatiquement
2. En haut à gauche, sélectionnez un simulateur :
   - **iPhone 15 Pro** (recommandé)
   - Ou **iPhone 14**, **iPhone SE**, etc.
3. Cliquez sur le bouton **Play** (▶️) en haut à gauche
4. Attendez que le simulateur démarre
5. L'app Koiny se lance automatiquement

**✅ Vous pouvez maintenant tester l'application !**

---

## 📱 MÉTHODE 2 : TEST SUR IPHONE RÉEL (RECOMMANDÉ)

**Temps estimé:** 20 minutes  
**Avantage:** Test complet avec toutes les fonctionnalités  
**Inconvénient:** Nécessite un iPhone et un câble

### Étape 1 : Préparer votre iPhone

1. Branchez votre iPhone au Mac avec un câble USB
2. Sur l'iPhone, faites confiance à l'ordinateur :
   - Un message apparaît : "Faire confiance à cet ordinateur ?"
   - Tapez **Faire confiance**
   - Entrez votre code PIN iPhone

### Étape 2 : Configurer le compte Apple Developer

1. Ouvrez **Xcode**
2. Allez dans **Xcode** → **Settings** (ou Preferences)
3. Cliquez sur l'onglet **Accounts**
4. Cliquez sur **+** en bas à gauche
5. Sélectionnez **Apple ID**
6. Connectez-vous avec votre Apple ID (gratuit)

### Étape 3 : Builder et installer

```bash
cd /Users/andre/KoinyLocal

# 1. Créer le .env (si pas déjà fait)
# Voir Méthode 1, Étape 3

# 2. Builder le frontend
npm run build

# 3. Synchroniser avec iOS
npx cap sync ios

# 4. Ouvrir dans Xcode
npx cap open ios
```

### Étape 4 : Configurer le Signing dans Xcode

1. Dans Xcode, cliquez sur **App** dans le navigateur de gauche
2. Sélectionnez l'onglet **Signing & Capabilities**
3. Cochez **Automatically manage signing**
4. Dans **Team**, sélectionnez votre Apple ID
5. Dans **Bundle Identifier**, changez en quelque chose d'unique :
   - Par exemple : `com.votrenom.koiny`

### Étape 5 : Sélectionner votre iPhone

1. En haut à gauche de Xcode, cliquez sur le menu déroulant
2. Sélectionnez votre iPhone (il devrait apparaître)
3. Cliquez sur le bouton **Play** (▶️)

### Étape 6 : Autoriser l'app sur iPhone

**⚠️ IMPORTANT:** La première fois, vous aurez une erreur de sécurité.

1. Sur votre iPhone, allez dans **Réglages**
2. **Général** → **Gestion des appareils** (ou **VPN et gestion de l'appareil**)
3. Tapez sur votre Apple ID
4. Tapez **Faire confiance à [Votre Apple ID]**
5. Confirmez

### Étape 7 : Relancer depuis Xcode

1. Retournez dans Xcode
2. Cliquez à nouveau sur **Play** (▶️)
3. L'app se lance sur votre iPhone !

**✅ Vous pouvez maintenant tester l'application sur votre iPhone !**

---

## 🧪 TESTS À EFFECTUER

### Tests de Sécurité

- [ ] **Chiffrement PIN**
  - Créer un PIN parent (4-6 chiffres)
  - Fermer et rouvrir l'app
  - Vérifier que le PIN fonctionne
  - Essayer un mauvais PIN (doit être rejeté)

- [ ] **Synchronisation Supabase**
  - Créer un compte
  - Ajouter un enfant
  - Fermer l'app
  - Ouvrir sur un autre appareil (ou navigateur)
  - Vérifier que les données sont synchronisées

- [ ] **Mode Offline**
  - Activer le mode avion sur iPhone
  - Créer une mission
  - Approuver la mission
  - Désactiver le mode avion
  - Vérifier que les données se synchronisent

### Tests Fonctionnels

- [ ] **Création de compte**
  - Email + mot de passe
  - Vérifier l'email de confirmation

- [ ] **Gestion des enfants**
  - Ajouter un enfant
  - Modifier le nom/avatar
  - Voir le profil

- [ ] **Missions**
  - Créer une mission
  - Approuver une mission
  - Vérifier le solde

- [ ] **Objectifs**
  - Créer un objectif d'épargne
  - Atteindre l'objectif
  - Débloquer l'objectif

- [ ] **Co-parentalité**
  - Inviter un co-parent
  - Accepter l'invitation
  - Vérifier la synchronisation

### Tests iOS Spécifiques

- [ ] **Notifications locales**
  - Activer les notifications
  - Créer une mission
  - Vérifier la notification

- [ ] **Mode sombre**
  - Activer le mode sombre iOS
  - Vérifier que l'app suit le thème

- [ ] **Rotation d'écran**
  - Tourner l'iPhone
  - Vérifier que l'interface s'adapte

- [ ] **Multitâche**
  - Mettre l'app en arrière-plan
  - Ouvrir une autre app
  - Revenir à Koiny
  - Vérifier que l'état est préservé

---

## 🐛 RÉSOLUTION DE PROBLÈMES

### Erreur : "Command not found: npm"

**Solution:** Installez Node.js depuis https://nodejs.org

```bash
# Vérifier l'installation
node --version
npm --version
```

### Erreur : "No provisioning profile found"

**Solution:** Configurez le Signing dans Xcode (voir Méthode 2, Étape 4)

### Erreur : "Untrusted Developer"

**Solution:** Faites confiance à votre Apple ID sur iPhone (voir Méthode 2, Étape 6)

### L'app crash au démarrage

**Solution:** Vérifiez les logs dans Xcode

1. Ouvrez Xcode
2. Allez dans **Window** → **Devices and Simulators**
3. Sélectionnez votre iPhone
4. Cliquez sur **Open Console**
5. Cherchez les erreurs

### Erreur : "Supabase credentials missing"

**Solution:** Vérifiez que le fichier `.env` existe et contient les bonnes valeurs

```bash
# Vérifier le fichier .env
cat .env

# Devrait afficher :
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

### Les données ne se synchronisent pas

**Solution:** Vérifiez la connexion internet et les logs

1. Vérifiez que l'iPhone a internet
2. Ouvrez Safari sur iPhone
3. Allez sur https://app.supabase.com
4. Vérifiez que vous pouvez vous connecter

---

## 📊 CHECKLIST DE VALIDATION iOS

Avant de déclarer le test iOS réussi :

### Build & Installation
- [ ] L'app se build sans erreur
- [ ] L'app s'installe sur iPhone/Simulateur
- [ ] L'app se lance sans crash
- [ ] Aucune erreur dans les logs Xcode

### Fonctionnalités Core
- [ ] Création de compte fonctionne
- [ ] PIN parent fonctionne
- [ ] Ajout d'enfant fonctionne
- [ ] Création de mission fonctionne
- [ ] Synchronisation Supabase fonctionne

### Sécurité
- [ ] PIN stocké chiffré (PBKDF2)
- [ ] CSP active (pas d'erreurs console)
- [ ] Données synchronisées correctement
- [ ] Mode offline fonctionne

### UX iOS
- [ ] Interface adaptée à iOS
- [ ] Animations fluides
- [ ] Mode sombre fonctionne
- [ ] Rotation d'écran OK
- [ ] Notifications fonctionnent

**Si toutes les cases sont cochées : 🎉 TEST iOS RÉUSSI !**

---

## 🚀 PROCHAINES ÉTAPES

### Pour Tester Maintenant

1. **Installez Xcode** (si pas déjà fait)
2. **Installez Node.js** (si pas déjà fait)
3. **Suivez la Méthode 1** (Simulateur) ou **Méthode 2** (iPhone réel)
4. **Testez avec la checklist** ci-dessus

### Pour Publier sur l'App Store (plus tard)

1. **Compte Apple Developer** (99€/an)
2. **Icônes et screenshots** de l'app
3. **Description** de l'app
4. **Politique de confidentialité** (déjà dans `i18n.ts`)
5. **Soumission** via App Store Connect

---

## 📞 BESOIN D'AIDE ?

### Commandes Utiles

```bash
# Vérifier la version de Capacitor
npx cap --version

# Lister les plateformes installées
npx cap ls

# Nettoyer et rebuilder
npm run build
npx cap sync ios
npx cap open ios

# Voir les logs en temps réel
npx cap run ios --livereload
```

### Ressources

- **Capacitor iOS Docs:** https://capacitorjs.com/docs/ios
- **Xcode Docs:** https://developer.apple.com/xcode/
- **Apple Developer:** https://developer.apple.com

---

## ✅ RÉSUMÉ RAPIDE

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le .env
echo "VITE_SUPABASE_URL=https://vumowlrfizzrohjhpvre.supabase.co" > .env
echo "VITE_SUPABASE_ANON_KEY=votre_clé" >> .env

# 3. Builder
npm run build

# 4. Synchroniser iOS
npx cap sync ios

# 5. Ouvrir dans Xcode
npx cap open ios

# 6. Cliquer sur Play ▶️ dans Xcode
```

**Temps total:** 15-20 minutes  
**Difficulté:** Moyenne (nécessite Xcode)

---

**Guide créé le:** 10 février 2026  
**Testé sur:** macOS Sonoma, Xcode 15, iOS 17  
**Prochaine mise à jour:** Après feedback utilisateurs
