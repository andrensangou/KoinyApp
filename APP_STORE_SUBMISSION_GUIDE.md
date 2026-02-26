# 🚀 Guide de Soumission iOS : Koiny vers l'App Store

Ce guide regroupe **toutes vos instructions étape par étape** pour compiler l'application, l'envoyer à Apple, ainsi que les **textes marketing** et les **Notes à l'attention du Reviewer** (Evaluateur Apple).

---

## ÉTAPE 1 : La Compilation sur Xcode (Le "Build")

L'application est 100% stable dans sa coquille Capacitor. C'est le moment d'empaqueter tout ça sur Xcode.

1. Allez dans le dossier racine de Koiny sur votre Mac et **Ouvrez Xcode** :
   *Double-cliquez sur `ios/App/App.xcworkspace` (le fichier d'espace de travail blanc, pas le projet bleu).*
2. **Choisissez la Cible** : 
   Tout en haut de Xcode, au milieu, cliquez sur la cible (là où se trouve d'habitude le nom d'un simulateur iPhone), descendez tout en bas de la liste et choisissez **"Any iOS Device (arm64)"**.
3. **Prouvez votre identité (Signing)** :
   * Cliquez sur le projet bleu **"App"** dans le panneau de gauche.
   * Allez dans l'onglet **"Signing & Capabilities"**.
   * Cochez **"Automatically manage signing"**.
   * Dans l'équipe ("Team"), choisissez votre compte de développeur Apple (votre Prénom/Nom ou le nom de votre entreprise).
4. **Archivez le Projet** :
   * Dans la barre de menu Apple tout en haut de l'écran, cliquez sur **Product** > **Archive**.
   * Laissez l'ordinateur tourner (cela peut prendre de 1 à 3 minutes).
5. **Distribution** :
   * Une fois terminé, une nouvelle fenêtre s'ouvre : l'"Organizer".
   * Cliquez sur le gros bouton bleu à droite : **"Distribute App"**.
   * Choisissez **"App Store Connect"** ou **"TestFlight & App Store"**.
   * Laissez Upload (envoyer). 

🎉 *Dans environ 15 minutes, l'application apparaîtra "En traitement" sur la plateforme web App Store Connect au chaud.*

---

## ÉTAPE 2 : Textes Marketing (App Store Connect)

Sur le site web [App Store Connect](https://appstoreconnect.apple.com), vous allez créer la fiche de votre application. Voici les textes optimisés à copier/coller.

### Nom, Sous-titre et Mots clés

**Nom de l'app (30 caractères max) :** 
Koiny - L'Argent de Poche

**Sous-titre (30 caractères max) :** 
Missions, règles et épargne

**Mots-clés (100 caractères max séparés par des virgules) :** 
Koiny,argent,poche,famille,récompense,tâche,virtuel,finance,éducation,enfant,parent,épargne,budget

### Description

Plongez vos enfants dans la gestion d’un budget virtuel et éduquez-les à l’argent responsable avec Koiny ! L’application pensée par des parents pour des parents qui transforme la routine familiale en missions ludiques.

Concrètement, comment ça marche ?
1️⃣ Créez des profils pour vos enfants.
2️⃣ Définissez ensemble des missions (Ranger sa chambre, sortir le chien...).
3️⃣ Vos enfants accomplissent les défis et gagnent leur Koiny (votre monnaie virtuelle familiale).
4️⃣ Ils épargnent pour acheter ce dont ils rêvent dans la vraie vie.

FINIES LES NÉGOCIATIONS INFINIES :
Les enfants peuvent également faire une "Demande active" de cadeaux ou solliciter une nouvelle mission s'ils souhaitent augmenter leur épargne virtuelle.

SÉCURITÉ ET ISOLEMENT : 
• Koiny n'est PAS une banque. Aucune carte bleue ni numéro de compte requis. Tout se base sur de la monnaie de jeu indexée par les devoirs du foyer. 
• Koiny est protégé par un système de code PIN réservé aux parents et la compatibilité Face ID.
• Synchronisation temps réel avec votre Co-parent (Maman / Papa).

Éduquer à la récompense financière sans tabou, sécurisée et ludique. Bienvenue chez Koiny.

---

## ÉTAPE 3 : "App Review Information" (TRÈS IMPORTANT 🚨)

C'est ici que 90% des refus App Store ont lieu. L'évaluateur (un humain américain ou européen assis dans un bureau chez Apple) doit tester l'application. Vous DEVEZ lui laisser des instructions précises dans la case **"Notes additionnelles" (Review Notes)**. 

⚠️ Ne traduisez pas ce texte, **copiez-collez ce bloc en Anglais** dans App Store Connect (ils lisent en anglais).

```text
Hello Apple Review Team,

Thank you for reviewing Koiny.

1. VIRTUAL MONEY EXPLANATION
Please note that Koiny is purely an EDUCATIONAL family simulator. No real money or real banking transactions are processed. The amounts shown are virtual scores representing pocket money, solely manually awarded by the Parents to their Children for doing household chores (missions). There is no financial or banking system behind it.

2. DEMO ACCOUNT & TESTING INSTRUCTIONS
To review the full experience of Koiny without providing personal emails, you can easily use our Offline Demo Mode:

- Launch the app
- Click on "Démarrer en mode hors-ligne" (Start offline mode) at the very bottom right of the login screen.
- You will be asked to create a Parent PIN code (e.g. 1234)
- Then create a testing child profile (e.g. Name: Johnny).
- You are now inside the App. 

3. TESTING PARENT vs CHILD INTERFACES
- You can switch between "Child View" (the game) and "Parent View" (the dashboard) using the floating Avatar button on the top right.
- Whenever you enter the Parent Dashboard, it will prompt you for the PIN code you created during onboarding (e.g. 1234), or ask for Face ID/Touch ID if available.

4. NATIVE FEATURES IMPLEMENTED
- We fully support "Sign In with Apple" in the real online authentication flow.
- We support Dynamic Type, VoiceOver accessibility roles.
- We support device Haptic feedbacks on user interactions.

If you have any questions, please let us know. Have a wonderful day!
```

---

## Prochaines Étapes
1. Compilez sur Xcode.
2. Remplissez la fiche produit sur iTunes Connect.
3. Ajoutez des jolis Screenshots dans les bonnes résolutions demandées.
4. Cliquez sur "Soumettre à validation" et sabrez le champagne ! 🍾
