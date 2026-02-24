# 🏦 Koiny - Documentation d'Architecture (BMAD)

**Application d'éducation financière gamifiée pour familles**  
**Version :** 2.0 (Relational Schema & Realtime Sync)  
**Rôle du document :** Source de vérité technique pour le cycle de vie du produit.

---

## 📊 B - BUSINESS (Métier)

### 1. Problème Résolu
Koiny répond au besoin des parents de structurer l'éducation budgétaire de leurs enfants. En transformant les tâches quotidiennes en "missions" rémunérées en argent virtuel, l'application enseigne la corrélation entre effort et gain, tout en introduisant les concepts d'épargne (objectifs) et de gestion de solde.

### 2. Piliers Stratégiques
- **Zero Real Money** : Aucun lien bancaire réel. L'application est un simulateur pur, éliminant tout risque financier.
- **Transparence & Confiance** : Pas de revente de données. Stockage sécurisé sur Supabase avec isolation stricte des données par famille (RLS).
- **Gamification Cognitive** : Utilisation de feedbacks visuels (confettis, animations de solde) et sonores pour renforcer les comportements positifs.

---

## 🗄️ M - MODEL (Données)

### 1. Stratégie de Stockage (V2)
L'architecture a évolué d'un Single-Blob JSON vers un **Schéma Relationnel Normalisé** sur Supabase (PostgreSQL) pour permettre une synchronisation granulaire et des performances accrues.

| Table | Rôle |
|---|---|
| `families` | Unité structurelle regroupant parents et enfants. |
| `profiles` | Utilisateurs authentifiés (Parents/Co-parents). |
| `children` | Profils des enfants avec thèmes et balances. |
| `missions` | Défis créés avec états de cycle de vie (available, pending, validated, rejected). |
| `goals` | Objectifs d'épargne avec progression. |
| `transactions` | Registre immuable de tous les flux financiers. |

### 2. Local-First & Optimistic UI
- **Cache local** : Utilisation du `LocalStorage` pour un affichage instantané au démarrage.
- **Updates optimistes** : L'UI se met à jour immédiatement, les synchronisations cloud (`saveToSupabase`) sont effectuées en arrière-plan avec un système de débounce pour économiser la bande passante.

---

## 🔌 A - API & SYNCHRONISATION

### 1. Synchronisation Temps Réel (Supabase Realtime)
L'application écoute les changements sur la table `profiles` (via le `family_id`) pour déclencher des rechargements automatiques sur tous les appareils de la famille lors d'une modification effectuée par un autre membre.

### 2. Gestion des Conflits
- **IsSaving Flag** : Empêche les sauvegardes concurrentes.
- **ID Mapping** : Lors de la création d'objets (enfants, missions, goals) hors-ligne ou avant sync, des IDs temporaires sont utilisés puis remplacés par des UUIDs réels lors de la première synchronisation réussie, évitant ainsi les doublons.

---

## 🎨 D - DESIGN & MOBILE (UI/UX)

### 1. Intégration Native iOS (Capacitor)
- **Foreground Notifications** : Implémentation personnalisée dans `AppDelegate.swift` pour permettre l'affichage des bannières même quand l'app est active.
- **Deep Linking** : Support des schémas `com.koiny.app://` pour la gestion des callbacks OAuth et des invitations de famille.

### 2. Design System
- **Tailwind CSS** : Utilisation de tokens de couleurs dynamiques permettant à chaque enfant d'avoir son propre environnement visuel.
- **Mobile-First** : Navigation par onglets (Bottom Tabs) optimisée pour l'usage à une main sur smartphone.

### 3. Accessibilité & i18n
- Centralisation des textes dans `i18n.ts` supportant le Français et l'Anglais.
- Détection automatique de la langue locale de l'appareil.

---
*Dernière mise à jour : Février 2026 - Focus : Schéma Relationnel & Performance Native.*
