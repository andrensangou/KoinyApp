# 💰 Koiny - L'éducation financière simplifiée pour les familles

<div align="center">
  <img src="https://i.imgur.com/vHqB5rX.png" alt="Koiny Logo" width="120" style="border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); margin-bottom: 20px;"/>
  <p><em>Donnez à vos enfants les clés d'une gestion financière responsable par le jeu et l'effort.</em></p>
  
  [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.io/)
  [![RevenueCat](https://img.shields.io/badge/RevenueCat-F55A4E?style=for-the-badge&logo=revenuecat&logoColor=white)](https://revenuecat.com/)
</div>

---

## 📖 Présentation

**Koiny** est une application mobile IOS conçue pour aider les parents à enseigner la valeur de l'argent à leurs enfants. Contrairement aux applications bancaires traditionnelles, Koiny repose sur une approche **éducative et gamifiée** utilisant de l'argent virtuel indexé sur des efforts réels (missions quotidiennes, aide à la maison, réussite scolaire).

### Le Problème
Les enfants d'aujourd'hui ont du mal à visualiser l'argent numérique. Les parents manquent d'outils simples pour structurer l'argent de poche de manière équitable, transparente et motivante.

### La Solution
Une seule application iOS abritant une véritable interface miroir :
- **Un Espace Parent (Dashboard de gestion)**
- **Un Espace Enfant (Interface de jeu et d'épargne)**

Chaque gain dans l'espace enfant est le résultat d'une mission validée par le parent, favorisant ainsi la compréhension de la valeur de l'effort et le développement de l'attrait pour l'épargne (au lieu de la dépense immédiate).

---

## 🌟 Fonctionnalités Clés

### 👨‍👩‍👧‍👦 Pour les Parents (Administrateurs)
- **Tableau de bord de la famille** : Vue d'ensemble des soldes, des historiques et des activités.
- **Gestion des missions** : Création de défis personnalisés (ex: "Ranger sa chambre", "Avoir une bonne note en maths") assortis de récompenses virtuelles.
- **Validation avec Feedback** : Système d'approbation ou de rejet des missions déclarant terminées par l'enfant, avec possibilité de laisser un commentaire lu par l'enfant.
- **Transactions Manuelles** : Ajout de bonus (cadeaux, anniversaires) ou de retraits (achats concrets validés par le parent, amendes/pénalités).
- **Widgets iOS 14+** : Suivi du solde du prmier enfant directement sur l'écran d'accueil de l'iPhone sans ouvrir l'application.
- **Sécurité et Confidentialité** : Accès à l'interface parent stricte protégée par un code PIN.

### 👶 Pour les Enfants (Utilisateurs)
- **Profils gamifiés et colorés** : Choix libre de l'avatar et de la couleur dominante du profil.
- **Le Coffre-fort numérique** : Affichage clair du solde disponible avec des sons et des animations haptiques de pièces à chaque gain.
- **Objectifs d'épargne motivants** : Saisie des envies (ex: "Acheter un jeu vidéo") affichant une barre de progression dynamique en pourcentage au fur et à mesure que la tirelire virtuelle se remplit.
- **Autonomie de la demande** : L'enfant peu solliciter de nouvelles missions au parent grâce aux boutons d'appel (Notifications distantes).

### 💎 Modèle Freemium & Koiny Premium
L'application intègre un système d'abonnement in-app via RevenueCat (StoreKit 2) :
- **Version Gratuite** : Gestion limitée (1 seul enfant, 2 missions actives par enfant, 1 seul objectif d'épargne actif).
- **Koiny Premium (Annuel / Mensuel) avec 14 jours d'essai gratuit** : 
  - Nombre d'enfants illimité
  - Missions et objectifs illimités
  - Statistiques graphiques et bilans (Gains vs Objectifs)
  - Synchronisation Cloud prioritaire et support multi-parents (co-parenting).

---

## 🏗️ Architecture Technique

### Synchronisation Optimistic UI
L'application mise tout sur la vitesse (Zero-Latency) :
1. **Action utilisateur** → Mise à jour immédiate de l'UI React (`setData`).
2. **Sauvegarde locale HDD** → Mise en cache dans `Capacitor Preferences`.
3. **Synchronisation Cloud Silencieuse** → Envoi de la mutation à la base de données PostgreSQL (Supabase) en arrière-plan.
4. Si le mode hors-ligne est détecté, la mutation est re-tentée via une file d'attente à la prochaine connexion.

### Infrastructure Supabase
- **Authentification** : Apple Sign-In natif & Google OAuth.
- **Database (PostgreSQL)** : Schéma relationnel strict (`families`, `profiles`, `children`, `missions`, `goals`, `transactions`).
- **Row Level Security (RLS)** : Isolation totale des données; une famille A ne pourra jamais interroger l'API pour lire la famille B.
- **Realtime DB** : Synchronisation multi-devices par web-sockets pour la co-parentalité.

---

## 🛠️ Stack Technologique (2026)

| Couche | Technologie |
|---|---|
| **Langage & UI** | TypeScript 5.2, React 18, Tailwind CSS 3.4 |
| **Générateur / Bundler** | Vite.js 7.3 |
| **Pont React ↔ iOS** | Capacitor 8.0 (Plugins SwiftUI/Swift 5) |
| **Backend as a Service** | Supabase (PostgreSQL 15, Auth, Realtime) |
| **Monétisation (IAP)** | RevenueCat SDK 12.2 (Purchases Capacitor) |
| **Notifications & Widgets**| Local Notifications, Capacitor-Swift PM, WidgetKit |
| **Monitoring de Crash** | Sentry Capacitor 3.0 |
| **Chartes et Animations** | Recharts 2.12, Canvas-Confetti, Capacitor Haptics |

---

## 🚀 Démarrage pour un Développeur

### 1. Prérequis sur Mac
- [Node.js](https://nodejs.org/) (v18 minimum, v20 recommandée)
- [npm](https://www.npmjs.com/)
- [Xcode 15+](https://developer.apple.com/xcode/) et un iPhone physique (pour tester In-App Purchases Sandbox)

### 2. Cloner et Installer JS
```bash
git clone https://github.com/votre-nom/koiny-app.git
cd koiny-app
npm install --legacy-peer-deps
```

### 3. Variables d'Environnement
Créer le fichier `.env` à la racine :
```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon_publique
```
*(Note: L'API Key publique de RevenueCat est gérée dans le service `subscription.ts`).*

### 4. Build de Développement (Mode Web Local)
Développer les vues React directement dans le navigateur Safari/Chrome sans lancer l'émulateur lourd :
```bash
npm run dev
```

### 5. Build iOS App Store
Transférer la version React vers le projet Xcode contenant la coquille native Swift :
```bash
npm run build
npx cap sync ios
npx cap open ios
```
Appuyez ensuite sur le bouton `[Play]` dans Xcode vers l'appareil connecté.

---

## 🔒 Confidentialité & RGPD

Étant une application destinée (en partie) aux enfants, les règles suivantes sont implémentées en dur dans le code :
*   Aucune donnée personnelle de l'enfant (PII) n'est exigée. Les "comptes enfants" n'ont ni email ni mot de passe; ils existent uniquement en tant qu'alias attachés au compte parent.
*   Conformité RGPD stricte : la procédure `delete_user_data` du Backend supprime le compte UUID en cascade (`ON DELETE CASCADE`), garantissant l'effacement immédiat de toutes les donnes d'une famille des serveurs Supabase lors d'une demande de suppression via les paramètres "Compte".

---

<div align="center">
  <p>Fait avec ❤️ pour simplifier le quotidien des parents.</p>
  <p><em>"L'argent ne pousse pas sur les arbres, il se mérite sur Koiny."</em></p>
</div>
licence **MIT**. Voir `LICENSE` pour plus d'informations.

---

<div align="center">
  <p>Fait avec ❤️ par l'équipe Koiny</p>
  <p><em>"L'argent ne pousse pas sur les arbres, il se mérite sur Koiny."</em></p>
</div>
