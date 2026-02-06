# 💰 Koiny Local

**Version locale standalone** de l'application Koiny - Gestion financière ludique pour toute la famille.

## 🌟 Caractéristiques

- ✅ **100% Local** - Fonctionne entièrement hors ligne
- 🔒 **Vie privée** - Toutes les données restent sur votre appareil
- 🚀 **Simple** - Pas de compte, pas de configuration
- 📱 **Responsive** - Fonctionne sur mobile, tablette et desktop
- 🎨 **Mode sombre** - Interface moderne et élégante

## 🚀 Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/VOTRE-USERNAME/KoinyLocal.git
cd KoinyLocal

# 2. Installer les dépendances
npm install

# 3. Lancer en mode développement
npm run dev

# 4. Ouvrir http://localhost:5173
```

## 📦 Build pour production

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`. Vous pouvez ensuite les déployer sur n'importe quel hébergeur statique (Netlify, Vercel, GitHub Pages, etc.).

## 🔧 Différences avec Koiny Cloud

| Fonctionnalité | Koiny Local | Koiny Cloud |
|---|---|---|
| Stockage | localStorage (navigateur) | Supabase (cloud) |
| Connexion | Mode démo + PIN | Google OAuth + PIN |
| Synchronisation | Non | Multi-appareils |
| Co-parentalité | Non | Oui |
| Backup | Export manuel | Automatique |

## 📚 Structure du projet

```
KoinyLocal/
├── App.tsx              # Composant principal
├── components/          # Composants React
├── services/
│   └── storage.ts       # Gestion localStorage
├── i18n.ts             # Traductions (FR, NL, EN)
├── types.ts            # Types TypeScript
└── public/             # Assets statiques
```

## 🛠️ Technologies

- **React 18** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool ultra-rapide
- **Recharts** - Graphiques
- **Canvas Confetti** - Animations

## 📖 Utilisation

1. **Créez un code PIN parent** pour protéger l'accès
2. **Ajoutez des enfants** avec leur prénom et avatar
3. **Définissez des missions** avec récompenses
4. **Suivez l'évolution** du solde et de l'historique
5. **Exportez vos données** (RGPD) si nécessaire

## 🔒 Sécurité & Vie privée

- ✅ Toutes les données restent sur **votre appareil**
- ✅ Pas de tracking, pas d'analytics
- ✅ Code PIN chiffré dans localStorage
- ✅ Export RGPD disponible
- ✅ Open source

## 📄 Licence

MIT License - Libre d'utilisation personnelle et commerciale

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 💡 Support

Pour toute question ou suggestion, ouvrez une issue sur GitHub.

---

**Fait avec ❤️ pour aider les familles à gérer l'argent de poche de manière ludique et éducative**
