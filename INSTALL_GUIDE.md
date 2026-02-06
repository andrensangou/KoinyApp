# 🚀 GUIDE D'INSTALLATION KOINY LOCAL

## ✅ Étapes complétées automatiquement

- [x] Copie des fichiers sources (sans node_modules, ios, dist, supabase)
- [x] Création du services/storage.ts simplifié (100% localStorage)
- [x] Modification du package.json (suppression dépendances Supabase/Capacitor)
- [x] Nouveau README.md
- [x] Configuration locale (config.ts)

## ⚠️ À FAIRE MANUELLEMENT

### 1. Supprimer le fichier Supabase

```bash
cd /Users/n/KoinyLocal
rm services/supabase.ts
```

### 2. Modifier App.tsx

Ouvrez `App.tsx` et effectuez ces changements :

**LIGNE 11** - Supprimer l'import Supabase :
```typescript
// SUPPRIMER CETTE LIGNE :
// import { getSupabase, updatePassword, deleteAccount, ensureUserProfile } from './services/supabase';
```

**LIGNE 121-258** - Simplifier le useEffect d'initialisation :
```typescript
// REMPLACER tout le useEffect par :
useEffect(() => {
  const initialize = async () => {
    try {
      setLoading(true);
      console.log('🔄 [INIT] Chargement local...');
      
      const result = await loadData();
      setData(result.data || INITIAL_DATA);
      
      const hasLocalChildren = result.data?.children?.length > 0;
      setView(hasLocalChildren ? 'LOGIN' : 'LANDING');
    } catch (err) {
      console.error("❌ [INIT] Erreur:", err);
      setCriticalError("Problème de chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  initialize();
}, []);
```

**LIGNE 263-275** - Simplifier la sauvegarde :
```typescript
// REMPLACER le useEffect de sauvegarde par :
useEffect(() => {
  if (!loading && view !== 'AUTH' && view !== 'LANDING' && !criticalError) {
    saveData(data);
  }
}, [data, loading, view, criticalError]);
```

**LIGNE 396** - Simplifier handleFullSignOut :
```typescript
// REMPLACER par :
const handleFullSignOut = () => { 
  setView('LANDING'); 
  setData(INITIAL_DATA);
  setOwnerId(undefined); 
};
```

**LIGNES 496-497** - Supprimer les fonctions Supabase dans ParentView :
```typescript
// SUPPRIMER dans les props de ParentView :
// onUpdatePassword={async (p) => await updatePassword(p)} 
// onDeleteAccount={async () => { await deleteAccount(); setView('LANDING'); }}

// REMPLACER PAR :
onUpdatePassword={async () => {}} // Fonction vide
onDeleteAccount={async () => { setView('LANDING'); }} // Juste reset
```

### 3. Modifier components/AuthView.tsx

Ouvrez `AuthView.tsx` et :

**LIGNES avec signInWithGoogle** - Supprimer le login Google :
```typescript
// SUPPRIMER toutes les références à :
// - signInWithGoogle
// - handleGoogleLogin
// - Tout le bouton "Se connecter avec Google"
```

Gardez uniquement :
- Le mode Démo
- Le champ du code PIN (si présent)

### 4. Créer un .gitignore

```bash
cd /Users/n/KoinyLocal
cat > .gitignore << 'EOF'
# Dependencies
/node_modules

# Production
/dist

# Local
.DS_Store
.env
.env.local
.env.production

# Editor
.vscode
.idea
*.swp
*.swo
*~

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Package manager
package-lock.json
yarn.lock
pnpm-lock.yaml
EOF
```

### 5. Initialiser Git

```bash
cd /Users/n/KoinyLocal
git init
git add .
git commit -m "Initial commit - Koiny Local v2.0.0"
```

### 6. Créer le repo GitHub et pousser

```bash
# Sur GitHub, créez un nouveau repo "KoinyLocal"
# Puis :
git remote add origin https://github.com/VOTRE-USERNAME/KoinyLocal.git
git branch -M main
git push -u origin main
```

### 7. Installer et tester

```bash
npm install
npm run dev
```

Ouvrez http://localhost:5173 et testez l'application !

---

## 📊 Résumé des modifications

| Fichier | Action |
|---------|--------|
| `services/storage.ts` | ✅ Remplacé (100% localStorage) |
| `services/supabase.ts` | ❌ À supprimer |
| `package.json` | ✅ Simplifié |
| `config.ts` | ✅ Configuration locale |
| `App.tsx` | ⚠️ À modifier |
| `components/AuthView.tsx` | ⚠️ À modifier |
| `README.md` | ✅ Nouveau |

---

## 🎉 Une fois terminé

Vous aurez une application Koiny **100% locale** :
- Sans dépendances Supabase
- Sans connexion internet requise
- Stockage localStorage uniquement
- Prête pour un nouveau repo Git

**Bonne chance ! 🚀**
