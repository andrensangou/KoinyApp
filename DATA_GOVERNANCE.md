
# 🛡️ Gouvernance des Données Koiny

## 1. Modèle de Persistance
Koiny utilise une stratégie **Single-Source-of-Truth** basée sur un état global synchronisé.
- **Primaire** : PostgreSQL (Supabase) pour la durabilité.
- **Cache** : LocalStorage pour la réactivité (Offline-First).
- **Format** : JSON structuré avec Checksum d'intégrité.

## 2. Cycle de Vie de la Donnée
- **Collecte** : Uniquement les données pédagogiques (prénoms, objectifs).
- **Rétention** : Les données sont conservées tant que le compte parent est actif.
- **Purge** : L'historique des transactions est limité aux 500 dernières entrées par enfant pour garantir les performances et respecter le quota de stockage navigateur (5MB).

## 3. Conformité RGPD
- **Droit à l'Oubli** : Implémenté via `deleteAccount`. La suppression côté Supabase déclenche une cascade SQL supprimant enfants, missions et historique.
- **Portabilité** : Implémentée via la fonction `exportUserData()`, permettant aux parents de télécharger leur historique complet en JSON.
- **Consentement** : Recueilli explicitement lors de la création du compte.

## 4. Stratégie de Backup
En plus de la réplication native de Supabase, Koiny maintient un **Shadow Backup** dans le `localStorage` (`kidbank_multi_v2_bak`) mis à jour avant chaque écriture de la clé principale. En cas de crash lors d'une sauvegarde, le système peut restaurer la version immédiatement précédente au prochain chargement.
