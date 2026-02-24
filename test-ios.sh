#!/bin/bash

# 🚀 SCRIPT DE TEST iOS - KOINY APP
# Ce script automatise le processus de build et test sur iOS

set -e  # Arrêter en cas d'erreur

echo "🚀 Koiny iOS Test Script"
echo "======================="
echo ""

# Vérifier que nous sommes sur macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Erreur: Ce script nécessite macOS pour builder iOS"
    exit 1
fi

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    echo "📥 Téléchargez-le depuis: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Vérifier Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "⚠️  Xcode n'est pas installé ou pas dans le PATH"
    echo "📥 Installez Xcode depuis le Mac App Store"
    echo ""
    read -p "Continuer quand même ? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Xcode version: $(xcodebuild -version | head -n 1)"
fi

# Vérifier le fichier .env
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  Le fichier .env n'existe pas"
    echo "📝 Création du fichier .env..."
    echo ""
    
    read -p "Entrez votre SUPABASE_URL (ou appuyez sur Entrée pour utiliser la valeur par défaut): " SUPABASE_URL
    SUPABASE_URL=${SUPABASE_URL:-"https://vumowlrfizzrohjhpvre.supabase.co"}
    
    read -p "Entrez votre SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
    
    if [ -z "$SUPABASE_ANON_KEY" ]; then
        echo "❌ SUPABASE_ANON_KEY est obligatoire"
        exit 1
    fi
    
    cat > .env << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
VITE_KIDBANK_SALT=koiny-secure-salt-2024
EOF
    
    echo "✅ Fichier .env créé"
else
    echo "✅ Fichier .env existe"
fi

echo ""
echo "📦 Installation des dépendances..."
npm install

echo ""
echo "🔨 Build du frontend..."
npm run build

echo ""
echo "📱 Synchronisation avec iOS..."
npx cap sync ios

echo ""
echo "✅ Build terminé avec succès !"
echo ""
echo "🎯 Prochaines étapes:"
echo "1. Ouvrez Xcode avec: npx cap open ios"
echo "2. Sélectionnez un simulateur ou votre iPhone"
echo "3. Cliquez sur le bouton Play ▶️"
echo ""

read -p "Voulez-vous ouvrir Xcode maintenant ? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Ouverture de Xcode..."
    npx cap open ios
fi

echo ""
echo "✅ Script terminé !"
