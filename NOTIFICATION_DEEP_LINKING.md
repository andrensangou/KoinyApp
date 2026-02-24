# Deep Linking depuis les Notifications - Koiny App

## 🎯 Objectif

Permettre au parent de cliquer sur une notification et être automatiquement redirigé vers l'écran approprié pour valider une mission ou répondre à une demande.

## ✅ Ce qui a été implémenté

### 1. Ajout de données (payload) aux notifications

**Fichier modifié** : `services/notifications.ts`

Les notifications incluent maintenant :
- `childId` : L'ID de l'enfant concerné
- `type` : Le type de notification (MISSION_COMPLETED, CHILD_REQUEST_GIFT, etc.)
- `missionId` : L'ID de la mission (pour les missions terminées)

**Exemple de payload** :
```typescript
{
  childId: "abc123",
  type: "MISSION_COMPLETED",
  missionId: "mission456"
}
```

### 2. Écoute des clics sur notifications

**Fichier modifié** : `App.tsx`

Un listener a été ajouté pour détecter quand le parent clique sur une notification :
- Écoute l'événement `localNotificationActionPerformed`
- Extrait les données de la notification
- Redirige vers l'écran approprié

### 3. Redirection automatique

Quand le parent clique sur une notification :

**Mission terminée** :
- ✅ Ouvre l'app
- ✅ Navigue vers ParentView
- ✅ Le parent voit les missions en attente de validation

**Demande de cadeau** :
- ✅ Ouvre l'app
- ✅ Navigue vers ParentView
- ✅ Le parent peut voir la demande de l'enfant

**Demande de mission** :
- ✅ Ouvre l'app
- ✅ Navigue vers ParentView
- ✅ **Sélectionne automatiquement l'enfant concerné**
- ✅ **Scroll automatiquement vers le formulaire de création de mission**
- ✅ Le parent peut créer une nouvelle mission directement

## 🔄 Flux utilisateur

### Avant ❌
1. Enfant termine une mission
2. Parent reçoit une notification : "Jqck a terminé une mission"
3. Parent clique sur la notification
4. **Rien ne se passe** → Parent doit naviguer manuellement

### Après ✅
1. Enfant termine une mission
2. Parent reçoit une notification : "Jqck a terminé une mission. À vous de valider !"
3. Parent clique sur la notification
4. **L'app s'ouvre automatiquement** sur ParentView
5. Parent voit directement les missions en attente
6. Parent peut valider/rejeter en un clic

## 📱 Test

Pour tester le deep linking :

### Test 1 : Mission terminée

1. **Déployez l'app** depuis Xcode (Cmd+R)
2. **Connectez-vous** :
   - iPhone 1 : En tant qu'enfant (Jqck)
   - iPhone 2 : En tant que parent
3. **Sur iPhone 1 (Enfant)** :
   - Allez dans "Mes Missions"
   - Terminez une mission (cliquez sur ✓)
4. **Sur iPhone 2 (Parent)** :
   - Attendez la notification (1-2 secondes)
   - **Cliquez sur la notification**
   - L'app devrait s'ouvrir directement sur ParentView ! 🎉

### Test 2 : Demande de mission (NOUVEAU ✨)

1. **Sur iPhone 1 (Enfant)** :
   - Allez dans "Mes Missions"
   - Cliquez sur le bouton "Demander une mission" (icône 🎯)
2. **Sur iPhone 2 (Parent)** :
   - Attendez la notification "Jqck aimerait un nouveau défi"
   - **Cliquez sur la notification**
   - L'app s'ouvre sur ParentView
   - **L'enfant Jqck est automatiquement sélectionné**
   - **Le formulaire de création de mission est visible** (scroll automatique)
   - Le parent peut créer une mission directement ! 🎉

## 🐛 Logs à surveiller

Dans la console Xcode :
- `🔔 [NOTIFICATION] Clicked:` : Notification cliquée
- `🔔 [NOTIFICATION] Redirecting to parent view for child:` : Redirection en cours
- Les données de la notification (childId, type, missionId)

## 🔧 Modifications techniques

### Fichiers modifiés :

1. **services/notifications.ts** :
   - Ajout du paramètre `data` à la méthode `send()`
   - Mise à jour de `notifyMissionComplete()` pour inclure `childId` et `missionId`
   - Mise à jour de `notifyChildRequest()` pour inclure `childId` et `type`

2. **App.tsx** :
   - Import de `LocalNotifications`
   - Ajout du listener `localNotificationActionPerformed`
   - Mise à jour des appels aux méthodes de notification avec les nouveaux paramètres
   - Logique de redirection basée sur le type de notification

## 🚀 Prochaines améliorations possibles

- Ouvrir directement l'onglet "Missions" dans ParentView
- Scroller automatiquement vers la mission concernée
- Afficher un highlight sur la mission à valider
- Ajouter des actions rapides (Valider/Rejeter) directement depuis la notification
