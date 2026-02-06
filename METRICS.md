
# 📈 Koiny : Stratégie de Monitoring & KPIs

Ce document définit les métriques critiques pour assurer la santé de l'application et la réussite du produit.

## 1. Core Web Vitals (Santé UX)
*   **LCP (Largest Contentful Paint)** : Cible < 2.5s. Surveiller le poids des images DiceBear.
*   **FID (First Input Delay)** : Cible < 100ms. Surveiller le coût du `JSON.parse` au démarrage.
*   **CLS (Cumulative Layout Shift)** : Cible < 0.1. Attention aux bannières de notifications et skeletons.

## 2. Métriques de Stockage & Sync (Fiabilité)
*   **Payload Size** : Suivre la taille du JSON dans LocalStorage. Alerte à 1Mo, Critique à 4Mo.
*   **Sync Latency** : Temps moyen pour `saveRemoteData`. Cible < 1s.
*   **Conflict Rate** : Pourcentage de sessions où les données cloud écrasent les données locales (indicateur de multi-usage simultané).

## 3. KPIs Business (Engagement)
*   **Retention D1/D7** : Pourcentage d'utilisateurs qui reviennent après le premier jour / première semaine.
*   **Mission Velocity** : Temps moyen entre la création d'une mission par le parent et sa complétion par l'enfant.
*   **Savings Completion Rate** : Pourcentage d'objectifs (Goals) créés qui sont réellement atteints.
*   **Birthday Conversion** : Pourcentage de bonus d'anniversaire qui déclenchent une session enfant.

## 4. Alerting (Détection d'Incidents)
*   **Fatal Sync Error** : Déclenchée si `retryCount > 3`.
*   **Supabase RLS Violations** : Monitorer via les logs Supabase les tentatives d'accès non autorisées.
*   **PIN Brute Force** : Trackers les échecs de PIN consécutifs (> 5 échecs).

## 5. Prochaines Étapes Techniques
*   Passer du Single-Blob JSON au mode **Relationnel** (via `migration.ts`) pour réduire le poids des échanges réseau.
*   Implémenter un **Service Worker** pour le mode offline complet et le tracking de la disponibilité (Uptime).
