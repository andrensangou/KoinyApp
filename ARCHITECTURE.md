
# 🏦 Koiny - Documentation d'Architecture BMAD

**Application d'éducation financière gamifiée pour familles**  
**Version :** 1.2 (UI Refactor & Security)  
**Rôle du document :** Source de vérité produit et technique pour les intervenants (PM, Dev, QA).

---

## 📊 B - BUSINESS (Métier)

### 1. Problème Résolu
Les parents manquent d'outils structurés pour enseigner la gestion budgétaire. Les méthodes physiques (tirelire) manquent de suivi historique, et les outils bancaires adultes sont trop complexes. Koiny comble ce fossé par la gamification.

### 2. Piliers Stratégiques (Nouveau v1.1)
- **100% Argent Virtuel** : Suppression de toute friction ou peur liée à une liaison bancaire réelle. Koiny est un simulateur éducatif.
- **Confiance Totale** : Transparence sur la vie privée. Aucune revente de données, stockage sécurisé en Europe (RGPD).
- **Gamification Positive** : L'effort est récompensé par des visuels (confettis, badges) et non seulement par un chiffre.

### 3. Utilisateurs Cibles
- **Parents (Admins)** : Gèrent les budgets, créent les missions, valident les preuves d'exécution.
- **Enfants (Users)** : Utilisent l'interface pour suivre leur solde, marquer leurs tâches et visualiser leur progression.
- **Co-parents (Guests)** : Partagent l'autorité parentale via une synchronisation temps réel.

---

## 🗄️ M - MODEL (Données)

### 1. Stratégie de Stockage (Architectural Decision)
Koiny utilise une architecture **Single-Blob JSON**. Tout l'état de la famille est regroupé dans un objet JSON unique stocké dans Supabase.
- **Cohérence** : Les mutations sont atomiques.
- **Local-First** : Persistance immédiate dans `LocalStorage`, synchronisation cloud asynchrone (Debounce 2000ms).

### 2. Système i18n & Légal
La couche `i18n.ts` ne sert pas qu'à la traduction, elle centralise désormais la **politique de confidentialité** et les **conditions d'utilisation**. Cela garantit que les mentions légales sont toujours à jour dans la langue de l'utilisateur sans duplication de code.

---

## 🔌 A - API (Endpoints & Sync)

### 1. Contrats Supabase
- **Table `user_data`** : Stocke le `GlobalState`.
- **Table `family_links`** : Gère les accès partagés via email (Co-parenting).

### 2. Global Event Bus (Nouveau v1.1)
Pour éviter de passer des fonctions de callback à travers 10 niveaux de composants (Prop Drilling), Koiny utilise un bus d'événements natif :
- **Déclencheur** : `window.dispatchEvent(new CustomEvent('openLegalModal'))`
- **Récepteur** : Le composant `LegalModal` écoute cet événement globalement.
- **Avantage** : N'importe quel bouton (Landing, Auth, Settings) peut ouvrir les mentions légales sans lien direct.

---

## 🎨 D - DESIGN (UI/UX)

### 1. Store-Readiness (PWA)
L'application est configurée pour être transformée en application native :
- **Manifeste Web** (`manifest.json`) : Icônes maskables, couleurs de thème, orientation portrait forcée.
- **Meta Tags iOS** : Support du mode `standalone` pour masquer la barre d'adresse Safari.

### 2. Design System
- **Framework** : Tailwind CSS avec configuration de couleurs dynamiques.
- **Psychologie des couleurs** : Indigo (Sérieux/Confiance), Emerald (Gains/Succès), Rose/Amber (Attention/Mise en garde).
- **Animations** : Utilisation de `keyframes` Tailwind pour les montées de solde et les apparitions de modales.

### 3. Audio & Feedback
Le système audio est piloté par un flag `soundEnabled` dans l'état global, permettant une expérience immersive (bruit de pièces) ou silencieuse selon le choix des parents.

### 4. Navigation & Layout (Mise à jour v1.2)
- **Tab-Based Navigation** : Remplacement du scroll unique par une `BottomNavigation` (Dashboard, Historique, Demandes, Profil) pour une meilleure ergonomie mobile.
- **En-têtes Contextuels** : 
    - *Dashboard* : En-tête immersif avec résumé hebdomadaire (Icône Graphique).
    - *Vues Détails* : En-tête compact et sticky pour maximiser l'espace de contenu.
- **Cartes "Flattened"** : Design épuré pour l'historique et les demandes, maximisant la lisibilité et la zone de clic ("thumb-friendly").

### 5. Sécurité (Mise à jour v1.2)
- **PIN Reset Sécurisé** : La réinitialisation du code PIN parent nécessite désormais impérativement la saisie du mot de passe du compte principal.
- **Validation** : Protection contre les modifications non autorisées par un enfant ayant accès au téléphone déverrouillé.

---
*Dernière mise à jour : Mars 2024 - Focus : Confiance & Store Publication.*
