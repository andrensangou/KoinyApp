# Synchronisation en Temps Réel - Koiny App

## 🎯 Objectif

Permettre aux deux parents de voir instantanément les modifications apportées par l'autre parent sur le profil de l'enfant (cagnotte, missions, objectifs, historique).

## ✅ Ce qui a été implémenté

### 1. Activation de Realtime dans Supabase

Les tables suivantes ont été configurées pour la réplication en temps réel :
- `children` ✅
- `missions` ✅
- `goals` ✅
- `history_entries` ✅

### 2. Service de Synchronisation Realtime

**Fichier créé** : `services/realtime.ts`

Ce service gère :
- Les abonnements aux changements de données
- La gestion des canaux Realtime par famille
- Le nettoyage automatique des abonnements

**Fonctionnalités** :
- `subscribe(familyId, tableName, callback)` : S'abonner à une table spécifique
- `subscribeToFamily(familyId, callback)` : S'abonner à toutes les tables d'une famille
- `unsubscribeAll()` : Se désabonner de tous les canaux

### 3. Intégration dans App.tsx

**Modifications apportées** :
- Import du service Realtime
- Ajout d'un `useEffect` qui :
  - S'active uniquement pour les familles partagées (`isSharedFamily = true`)
  - S'abonne aux changements sur toutes les tables
  - Recharge automatiquement les données quand un changement est détecté
  - Se nettoie automatiquement au démontage du composant
- Nettoyage des abonnements lors de la déconnexion (`handleFullSignOut`)

## 🔄 Comment ça fonctionne

1. **Parent A** modifie la cagnotte de l'enfant (ex: +5€)
2. **Supabase** détecte le changement dans la table `children`
3. **Realtime** envoie une notification à tous les clients abonnés
4. **Parent B** reçoit la notification
5. **App** recharge automatiquement les données depuis Supabase
6. **Parent B** voit instantanément la nouvelle cagnotte (14€ → 19€)

## 📱 Test

Pour tester la synchronisation en temps réel :

1. **Déployez l'app sur les deux iPhones** :
   - Ouvrez Xcode
   - Clean Build Folder (Cmd+Shift+K)
   - Run (Cmd+R) sur chaque iPhone

2. **Connectez-vous** :
   - Parent A : Propriétaire de la famille
   - Parent B : Co-parent (via QR code)

3. **Testez** :
   - Parent A : Ajoutez de l'argent à la cagnotte
   - Parent B : Devrait voir la mise à jour instantanément (sans recharger l'app)

## 🐛 Logs à surveiller

Dans la console Xcode, vous verrez :
- `🔔 [REALTIME] Subscribing to...` : Abonnement aux changements
- `🔔 [REALTIME] Change detected...` : Changement détecté
- `✅ [REALTIME] Data reloaded successfully` : Données rechargées
- `🔕 [REALTIME] Unsubscribing from...` : Désabonnement

## ⚡ Performance

- Les abonnements sont créés uniquement pour les familles partagées
- Les données ne sont rechargées que quand un changement réel est détecté
- Les abonnements sont automatiquement nettoyés pour éviter les fuites mémoire

## 🔒 Sécurité

- Les RLS policies de Supabase s'appliquent toujours
- Un co-parent ne peut voir que les données auxquelles il a accès
- Les changements sont filtrés par `parent_id` pour éviter de recevoir des notifications d'autres familles
