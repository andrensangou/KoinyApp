
# 🧪 Koiny : Stratégie de Test Store-Ready

Pour garantir une expérience zéro-défaut sur les App Stores, voici les tests indispensables.

## 1. Tests Unitaires (Logique Métier)
*Cible : services/ et helpers de App.tsx*
- **Calcul des soldes** : Vérifier que `balance + reward` ne dépasse jamais `MAX_BALANCE`.
- **Sanitisation** : Vérifier que les montants négatifs saisis par erreur sont gérés.
- **Sécurité** : Vérifier que `encryptAtRest` produit une valeur différente pour deux appareils différents.

## 2. Tests d'Intégration (Supabase & Sync)
- **Mode Hors-ligne** : Couper le réseau, faire une transaction, réactiver le réseau -> Vérifier la sync.
- **Conflit de Timestamps** : Modifier la donnée sur deux onglets, vérifier que la plus récente gagne.
- **Auth Flow** : Vérifier que la suppression de compte nettoie bien les tables `profiles` et `children` (via RLS/Triggers).

## 3. Tests E2E (Expérience Utilisateur)
*Outils suggérés : Playwright ou Cypress*
- **Parcours "First Time"** : Landing -> Auth -> Création Enfant -> Définition PIN.
- **Parcours "Payday"** : Enfant finit mission -> Parent reçoit notif -> Parent paye -> Solde enfant mis à jour.
- **Parcours "Sécurité"** : Essayer d'accéder à `/parent` sans PIN ou avec PIN erroné.

## 4. Tests de Performance & Charge
- **Stress Test JSON** : Injecter 1000 entrées d'historique et mesurer le temps de freeze de l'UI au chargement.
- **Réseau dégradé** : Simuler une connexion 3G instable pendant une sauvegarde.

## 5. Checklist QA App Store
- [ ] L'application ne crash pas au démarrage sans réseau.
- [ ] Le bouton "Supprimer mon compte" est fonctionnel (Obligation Apple).
- [ ] Les mentions légales sont accessibles sans login.
