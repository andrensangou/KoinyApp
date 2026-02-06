# Mise en place de la navigation par onglets

Nous avons réorganisé l'interface Parent pour utiliser une navigation par onglets en bas de l'écran, remplaçant le défilement unique.

## Changements effectués

1.  **Nouveau composant `BottomNavigation`** : CRÉÉ dans `components/BottomNavigation.tsx`. Il gère les onglets :
    *   **Dashboard** : Vue d'ensemble, solde, objectifs.
    *   **Historique** : Liste des transactions et graphiques.
    *   **Demandes** : Validations en attente (Missions, Cadeaux).
    *   **Profil** : Paramètres de famille, co-parents, compte (anciennement dans une modale).

2.  **Mise à jour de `ParentView.tsx`** :
    *   Intégration de la `BottomNavigation`.
    *   Ajout d'un état `mainView` pour gérer l'onglet actif.
    *   Conditionnement de l'affichage des sections (Dashboard, Requests, History, Profile) selon l'onglet actif.
    *   Remplacement de la modale "Settings" par l'onglet "Profil".
    *   Configuration du bouton central "+" pour rediriger vers le formulaire d'ajout de mission dans l'onglet Dashboard.

## Fonctionnalités

*   **Navigation fluide** : Basculez instantanément entre les vues sans scroller.
*   **Indicateurs** : Badge de notification sur l'onglet "Demandes" si des actions sont requises.
*   **Accès rapide** : Le bouton "+" permet d'ajouter une mission rapidement.
*   **Design** : Barre de navigation flottante style "Glassmorphism" adaptée au thème sombre/clair.

## Prochaines étapes suggérées

*   Extraire les vues (`ParentDashboard`, `ParentHistory`, etc.) dans des fichiers séparés pour alléger `ParentView.tsx`.
*   Ajouter des animations de transition entre les onglets.
