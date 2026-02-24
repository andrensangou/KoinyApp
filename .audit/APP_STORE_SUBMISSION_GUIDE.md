# 📱 Koiny — App Store Submission Guide

> Dernière mise à jour : 24 février 2026

---

## 1. 📝 Review Notes (à copier dans App Store Connect)

> Ces notes sont destinées au reviewer Apple. Elles doivent être collées dans
> **App Store Connect → App → Version → Review Information → Notes for Reviewer**

```
DEMO MODE:
To test the app without creating an account, tap "Continue without account (Demo Mode)" 
at the bottom of the login screen. The parent PIN for demo mode is: 0000

ABOUT KOINY:
Koiny is a virtual pocket money simulator for families. It does NOT involve real money, 
real banking, or financial transactions. All amounts are 100% virtual and educational.

Children earn virtual coins by completing missions set by their parents 
(e.g., "clean your room → 2€"). They can then save toward goals they define together.

SIGN IN WITH APPLE:
Sign in with Apple is available as the primary login option alongside Google Sign-In 
and email/password authentication.

WIDGET:
The app includes an iOS Widget (WidgetKit) that displays the child's virtual balance 
and savings goal progress. The widget reads data from a shared App Group container.

NOTIFICATIONS:
Local notifications are used to alert parents when a child completes a mission 
or requests a gift. No push notification server is used.

PRIVACY:
- No user tracking or advertising
- Data is stored locally (Capacitor Preferences) and optionally synced to Supabase
- Children's data is always controlled by the parent account
- No third-party analytics SDKs
```

---

## 2. 🌍 App Store Metadata

### 2.1 App Name
```
Koiny - Argent de poche virtuel
```

### 2.2 Subtitle (30 chars max)
```
FR: Missions, épargne & fun
EN: Missions, savings & fun
NL: Missies, sparen & plezier
```

### 2.3 Keywords (100 chars max, separated by commas)
```
FR: argent de poche,enfants,missions,épargne,éducation,famille,récompenses,objectifs,virtuel,tirelire
EN: pocket money,kids,chores,savings,family,rewards,goals,allowance,virtual,piggy bank
NL: zakgeld,kinderen,taken,sparen,familie,beloning,doelen,virtueel,spaarpot
```

### 2.4 Description (FR — Primary)
```
🐷 Koiny — L'argent de poche virtuel qui motive vos enfants !

Koiny transforme les tâches du quotidien en aventures. Vos enfants accomplissent des missions, gagnent de l'argent virtuel et épargnent pour leurs rêves. Le tout dans un environnement sécurisé et 100% virtuel.

🎯 DES MISSIONS QUI MOTIVENT
Créez des défis personnalisés : ranger la chambre, mettre la table, faire ses devoirs... Chaque mission accomplie rapporte des pièces virtuelles. Validez en un tap !

🏆 DES OBJECTIFS D'ÉPARGNE
Vélo, jouet, jeu vidéo… vos enfants définissent leurs objectifs et voient leur progression grandir. Une barre de progression visuelle les motive au quotidien.

👨‍👩‍👧‍👦 MULTI-ENFANTS
Gérez plusieurs profils enfants avec des couleurs et avatars personnalisés. Chaque enfant a son espace, ses missions et ses objectifs.

📊 TABLEAU DE BORD PARENT
Suivez les progrès, l'historique des transactions, gérez les missions et les récompenses. Tout est sous votre contrôle grâce au code PIN parental.

🔒 SÉCURISÉ & PRIVÉ
• Code PIN parental chiffré (PBKDF2)
• Aucun tracking publicitaire
• Données locales + sauvegarde cloud optionnelle
• 100% argent VIRTUEL — Koiny n'est PAS une banque

📱 WIDGET iOS
Consultez le solde de votre enfant directement sur l'écran d'accueil grâce au widget intégré.

🌍 MULTILINGUE
Disponible en Français, English et Nederlands.

⚠️ Koiny est un simulateur éducatif. Aucune transaction financière réelle n'est effectuée.
```

### 2.5 Description (EN)
```
🐷 Koiny — Virtual pocket money that motivates your kids!

Koiny turns everyday chores into adventures. Your children complete missions, earn virtual money, and save toward their dreams. All in a safe, 100% virtual environment.

🎯 MISSIONS THAT MOTIVATE
Create personalized challenges: clean the room, set the table, do homework... Each completed mission earns virtual coins. Approve with a single tap!

🏆 SAVINGS GOALS
Bike, toy, video game… your kids set their goals and watch their progress grow. A visual progress bar keeps them motivated daily.

👨‍👩‍👧‍👦 MULTI-CHILD
Manage multiple child profiles with custom colors and avatars. Each child has their own space, missions, and goals.

📊 PARENT DASHBOARD
Track progress, transaction history, manage missions and rewards. Everything is under your control with the parental PIN code.

🔒 SECURE & PRIVATE
• Encrypted parental PIN (PBKDF2)
• No ad tracking
• Local data + optional cloud backup
• 100% VIRTUAL money — Koiny is NOT a bank

📱 iOS WIDGET
Check your child's balance right from the home screen with the built-in widget.

🌍 MULTILINGUAL
Available in Français, English, and Nederlands.

⚠️ Koiny is an educational simulator. No real financial transactions are made.
```

### 2.6 Description (NL)
```
🐷 Koiny — Virtueel zakgeld dat je kinderen motiveert!

Koiny verandert dagelijkse taken in avonturen. Je kinderen voltooien missies, verdienen virtueel geld en sparen voor hun dromen. Alles in een veilige, 100% virtuele omgeving.

🎯 MISSIES DIE MOTIVEREN
Maak gepersonaliseerde uitdagingen: kamer opruimen, tafel dekken, huiswerk maken... Elke voltooide missie levert virtuele munten op. Goedkeuren met één tik!

🏆 SPAARDOELEN
Fiets, speelgoed, videospel… je kinderen stellen hun doelen en zien hun voortgang groeien. Een visuele voortgangsbalk houdt ze dagelijks gemotiveerd.

👨‍👩‍👧‍👦 MEERDERE KINDEREN
Beheer meerdere kinderprofielen met aangepaste kleuren en avatars. Elk kind heeft zijn eigen ruimte, missies en doelen.

📊 OUDER DASHBOARD
Volg de voortgang, transactiegeschiedenis, beheer missies en beloningen. Alles onder controle dankzij de ouderlijke PIN-code.

🔒 VEILIG & PRIVÉ
• Versleutelde ouderlijke PIN (PBKDF2)
• Geen advertentie-tracking
• Lokale opslag + optionele cloudback-up
• 100% VIRTUEEL geld — Koiny is GEEN bank

📱 iOS WIDGET
Bekijk het saldo van je kind rechtstreeks op het startscherm met de ingebouwde widget.

🌍 MEERTALIG
Beschikbaar in Français, English en Nederlands.

⚠️ Koiny is een educatieve simulator. Er worden geen echte financiële transacties uitgevoerd.
```

---

## 3. 📋 App Store Connect — Configuration

### 3.1 Catégorie
- **Primary**: Education
- **Secondary**: Lifestyle

### 3.2 Age Rating (questionnaire)
Répondre **"None"** à toutes les questions (pas de violence, gambling, contenu mature, etc.)
→ Résultat attendu : **4+**

### 3.3 Privacy Policy URL
⚠️ **OBLIGATOIRE** — Vous devez héberger une page de politique de confidentialité.

Options :
1. Page GitHub Pages (gratuit)
2. Page sur votre site web
3. Notion publique

Contenu minimum requis :
- Quelles données sont collectées (email, données enfants)
- Comment elles sont stockées (local + Supabase)
- Pas de partage avec des tiers
- Droit de suppression
- Contact email

### 3.4 App Privacy (Data Collection)

Dans App Store Connect → App Privacy :

| Type de données | Collecté | Lié à l'identité | Utilisé pour le tracking |
|---|---|---|---|
| Contact Info (Email) | ✅ Oui | ✅ Oui | ❌ Non |
| User Content (enfants) | ✅ Oui | ✅ Oui | ❌ Non |
| Identifiers | ❌ Non | — | — |
| Usage Data | ❌ Non | — | — |
| Diagnostics | ❌ Non | — | — |
| Location | ❌ Non | — | — |
| Financial Info | ❌ Non | — | — |

**Purpose**: "App Functionality"

### 3.5 Pricing
- **Free** (pas d'In-App Purchase pour le moment)

---

## 4. 📸 Screenshots Requirements

### Tailles requises
| Appareil | Résolution | Obligatoire |
|---|---|---|
| iPhone 6.9" (16 Pro Max) | 1320 × 2868 | ✅ Oui |
| iPhone 6.7" (15 Plus) | 1290 × 2796 | ✅ Oui |
| iPhone 6.5" (11 Pro Max) | 1242 × 2688 | Recommandé |
| iPhone 5.5" (8 Plus) | 1242 × 2208 | Si support |
| iPad Pro 12.9" | 2048 × 2732 | Si support iPad |

### Screenshots suggérés (5-10 par langue)
1. **Login/Profil Selection** — "Chaque enfant a son espace"
2. **Child Dashboard** — Solde + animations coins
3. **Missions actives** — "Accomplis des missions, gagne des pièces !"
4. **Objectif d'épargne** — Barre de progression + achat
5. **Parent Dashboard** — Vue d'ensemble
6. **Historique + Graph** — Suivi des transactions
7. **Création de mission** — Interface parent
8. **Widget iOS** — Sur l'écran d'accueil
9. **Mode sombre** — Version dark de l'app
10. **Onboarding** — Première slide

### Astuces
- Utilisez le Simulator (Cmd+Shift+4 dans Simulator pour screenshot)
- Ajoutez du texte promotionnel au-dessus de chaque screenshot
- Consistance visuelle entre tous les screenshots

---

## 5. ✅ Checklist avant soumission

### Compte développeur
- [ ] Apple Developer Program payé (99€/an)
- [ ] Provisioning profile à jour
- [ ] Capability "Sign in with Apple" activée dans Xcode

### Code & Build
- [x] PrivacyInfo.xcprivacy présent
- [x] arm64 dans UIRequiredDeviceCapabilities
- [x] Widget deployment target = 17.0
- [x] MARKETING_VERSION = 1.0.0
- [x] Sign in with Apple code prêt
- [x] Logs production-safe
- [x] security-old.ts supprimé
- [x] aria-labels sur tous les boutons icon
- [x] Touch targets ≥ 44pt
- [ ] Build Archive réussi (Product → Archive)

### App Store Connect
- [ ] App créée dans App Store Connect
- [ ] Metadata rempli (nom, description, keywords) en FR/EN/NL
- [ ] Screenshots uploadés pour toutes les tailles
- [ ] Privacy Policy URL configurée
- [ ] App Privacy questionnaire rempli
- [ ] Review Notes copiées
- [ ] Age Rating questionnaire rempli
- [ ] Pricing configuré (Free)

### App Icon
- [ ] 1024×1024 PNG **sans canal alpha** (pas de transparence)
- [ ] Intégré dans Assets.xcassets/AppIcon
- [ ] Pas de coins arrondis (iOS les ajoute automatiquement)

### Soumission
- [ ] Product → Archive dans Xcode
- [ ] Upload vers App Store Connect (Organizer)
- [ ] Sélectionner le build dans App Store Connect
- [ ] Submit for Review

---

## 6. 🔄 Processus de soumission (étape par étape)

### Étape 1 : Archive
```
Xcode → Product → Archive
```
(Sélectionner "Any iOS Device" comme destination)

### Étape 2 : Upload
```
Window → Organizer → Sélectionner l'archive → Distribute App → App Store Connect
```

### Étape 3 : App Store Connect
1. Connectez-vous à [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Créez une nouvelle app (bouton +)
3. Remplissez toutes les sections avec les données ci-dessus
4. Sélectionnez le build uploadé
5. Submit for Review

### Délai de review
- **Première soumission** : 24-48h en moyenne
- **Updates suivantes** : 24h en moyenne
- **Rejection** : Corrigez et resoumettez (pas de pénalité)

---

## 7. ⚠️ Raisons de rejet courantes à éviter

| Risque | Status | Action |
|---|---|---|
| Pas de Sign in with Apple | ✅ Code prêt | Activer capability après paiement |
| Pas de Privacy Policy | ⚠️ À faire | Créer une page web simple |
| Demo mode pas expliqué | ✅ OK | Review Notes préparées |
| "Not a real bank" disclaimer | ✅ OK | Présent dans l'app et description |
| Metadata en une seule langue | ✅ OK | FR, EN, NL préparés |
| App icon avec transparence | ⚠️ Vérifier | PNG 1024×1024 sans alpha |
| Contenu placeholder | ✅ OK | Pas de placeholder, mode démo complet |
| Crash at review | ⚠️ Tester | Tester sur vrai device avant soumission |
