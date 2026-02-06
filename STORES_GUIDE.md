
# 🚀 Guide de Publication sur les App Stores

Pour mettre **Koiny** sur l'App Store (iOS) et le Play Store (Android), suivez ces étapes.

## 1. Pré-requis
*   **Hébergement :** Votre application doit être déployée sur une URL publique (ex: `https://koiny.app` via Vercel ou Netlify).
*   **Comptes Développeurs :**
    *   **Apple :** $99/an (Apple Developer Program).
    *   **Google :** $25 (frais uniques pour Google Play Console).

## 2. Générer les paquets (La méthode facile)
La méthode la plus simple est d'utiliser **[PWABuilder.com](https://www.pwabuilder.com/)** (créé par Microsoft).

1.  Entrez l'URL de votre application sur PWABuilder.
2.  Le site va vérifier votre `manifest.json` (que nous venons de créer).
3.  Cliquez sur **"Package for Stores"**.
4.  **Pour Android :** Téléchargez le fichier `.aab`.
5.  **Pour iOS :** Suivez les instructions pour générer le projet Xcode ou le paquet `.ipa`.

## 3. Éléments requis pour la soumission
Les stores demandent des informations spécifiques lors de l'envoi :
*   **Captures d'écran :** Vous aurez besoin de captures de l'app sur iPhone 13 Pro Max et iPad Pro.
*   **Politique de Confidentialité :** Utilisez l'URL de votre application. Les stores vérifient si une section "Privacy" est accessible (le bouton en bas de la landing page Koiny suffit).
*   **Description :** Copiez celle du `README.md` ou du `manifest.json`.

## 4. Conseils pour l'approbation Apple
Apple est strict. Pour être sûr d'être accepté :
1.  **Utilisez un compte de test :** Donnez-leur un email/mot de passe parent et un code PIN pour qu'ils puissent tester l'intérieur de l'app.
2.  **Fonctionnalités "natives" :** Koiny utilise déjà des vibrations et des animations fluides, ce qu'Apple apprécie.
3.  **Pas de mention "Béta" :** Assurez-vous que l'app a l'air terminée.

---
*Koiny est optimisée comme une "Web-First" app, ce qui signifie qu'elle fonctionnera parfaitement une fois enveloppée pour les stores.*
