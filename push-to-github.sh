#!/bin/bash

# Script pour pousser KoinyLocal sur GitHub
# Usage: bash push-to-github.sh VOTRE-USERNAME

if [ -z "$1" ]; then
  echo "❌ Erreur: Veuillez fournir votre nom d'utilisateur GitHub"
  echo "Usage: bash push-to-github.sh VOTRE-USERNAME"
  exit 1
fi

USERNAME=$1
REPO_URL="https://github.com/$USERNAME/KoinyLocal.git"

echo "🚀 Pushing KoinyLocal to GitHub..."
echo "📍 Repository: $REPO_URL"
echo ""

cd /Users/n/KoinyLocal

# Vérifier que nous sommes dans un repo git
if [ ! -d ".git" ]; then
  echo "❌ Erreur: Pas de repository Git trouvé dans /Users/n/KoinyLocal"
  exit 1
fi

# Vérifier qu'il n'y a pas déjà un remote origin
if git remote | grep -q "origin"; then
  echo "⚠️ Remote 'origin' existe déjà, suppression..."
  git remote remove origin
fi

# Ajouter le remote GitHub
echo "➕ Ajout du remote GitHub..."
git remote add origin "$REPO_URL"

# Pousser sur GitHub
echo "⬆️ Push vers GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Succès ! KoinyLocal est maintenant sur GitHub !"
  echo "🌐 Voir sur : https://github.com/$USERNAME/KoinyLocal"
else
  echo ""
  echo "❌ Erreur lors du push"
  echo "💡 Vérifiez:"
  echo "  - Que le repository existe sur GitHub"
  echo "  - Que vous êtes authentifié (git config --global user.name)"
  echo "  - Votre connexion internet"
fi
