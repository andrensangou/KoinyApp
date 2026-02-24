# 🔄 GUIDE DE DÉPLOIEMENT - KOINY APP

**Date:** 10 février 2026  
**Version:** 2.0.0-secure

---

## 📋 CHECKLIST DE DÉPLOIEMENT

### ✅ Étape 1 : Supabase (Base de données)

**Temps estimé:** 5 minutes

#### 1.1 Exécuter le SQL de migration

1. Allez sur https://app.supabase.com
2. Connectez-vous à votre compte
3. Sélectionnez votre projet Koiny
4. Dans le menu de gauche, cliquez sur **SQL Editor**
5. Cliquez sur **New query**
6. Copiez le contenu de `.audit/supabase_migration.sql`
7. Collez dans l'éditeur
8. Cliquez sur **Run** (ou Ctrl+Enter)

**Résultat attendu:**
```
✅ Success. No rows returned
```

#### 1.2 Vérifier les politiques RLS

Dans le même SQL Editor, exécutez :

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';
```

**Résultat attendu:**
```
policyname                          | cmd
------------------------------------|--------
Users can read own profile          | SELECT
Users can update own profile        | UPDATE
Users can insert own profile        | INSERT
Users can delete own profile        | DELETE  ← NOUVELLE
```

✅ **Étape 1 terminée !** Supabase est à jour.

---

### ✅ Étape 2 : Application Frontend (Vercel/Netlify)

**Temps estimé:** 10 minutes

#### 2.1 Créer le fichier .env

**IMPORTANT:** Ne commitez JAMAIS ce fichier dans Git !

Créez un fichier `.env` à la racine du projet :

```bash
# .env (NE PAS COMMITER)
VITE_SUPABASE_URL=https://vumowlrfizzrohjhpvre.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_KIDBANK_SALT=votre-salt-personnalisé
```

**Où trouver ces valeurs ?**

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Cliquez sur **Settings** (⚙️) dans le menu
4. Cliquez sur **API**
5. Copiez :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

#### 2.2 Tester localement (si npm disponible)

```bash
# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev

# Ouvrir http://localhost:5173
```

**Tests à effectuer :**
- [ ] L'application se charge sans erreur
- [ ] Vous pouvez créer un compte
- [ ] Vous pouvez créer un PIN parent
- [ ] Vous pouvez ajouter un enfant
- [ ] La synchronisation fonctionne

#### 2.3 Déployer sur Vercel/Netlify

##### Option A : Vercel

1. Allez sur https://vercel.com
2. Connectez votre repository GitHub
3. Cliquez sur **Import Project**
4. Sélectionnez votre repo Koiny
5. Dans **Environment Variables**, ajoutez :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_KIDBANK_SALT`
6. Cliquez sur **Deploy**

##### Option B : Netlify

1. Allez sur https://netlify.com
2. Cliquez sur **Add new site** → **Import an existing project**
3. Connectez votre repository GitHub
4. Dans **Build settings** :
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Dans **Environment variables**, ajoutez :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_KIDBANK_SALT`
6. Cliquez sur **Deploy site**

✅ **Étape 2 terminée !** L'application est déployée.

---

### ✅ Étape 3 : Tests de Validation

**Temps estimé:** 30 minutes

#### 3.1 Tests de Sécurité

- [ ] **PIN sécurisé**
  - Créer un nouveau PIN
  - Vérifier qu'il est stocké chiffré (inspecter localStorage)
  - Vérifier qu'il fonctionne

- [ ] **Clés API**
  - Vérifier que l'app ne démarre pas sans .env
  - Vérifier les messages d'erreur

- [ ] **CSP**
  - Ouvrir la console (F12)
  - Vérifier qu'il n'y a pas d'erreurs CSP
  - Vérifier que Tailwind fonctionne

#### 3.2 Tests Fonctionnels

- [ ] Créer un compte
- [ ] Créer un PIN parent (4-6 chiffres)
- [ ] Ajouter un enfant
- [ ] Créer une mission
- [ ] Approuver la mission
- [ ] Vérifier le solde
- [ ] Créer un objectif
- [ ] Tester la synchronisation (2 appareils)
- [ ] Exporter les données (RGPD)
- [ ] Supprimer le compte

#### 3.3 Tests de Régression

- [ ] Mode offline fonctionne
- [ ] Mode co-parentalité fonctionne
- [ ] Notifications fonctionnent
- [ ] Animations fonctionnent
- [ ] Mode sombre fonctionne

✅ **Étape 3 terminée !** L'application est validée.

---

## 🎯 RÉCAPITULATIF

### Ce Qui a Changé

| Composant | Avant | Après |
|-----------|-------|-------|
| **Supabase** | Politique DELETE manquante | ✅ Politique complète |
| **Frontend** | 7 vulnérabilités critiques | ✅ Toutes corrigées |
| **Score** | 62/100 🔴 | 80/100 🟢 |

### Fichiers à Déployer

```
Frontend (Vercel/Netlify):
├── services/security.ts      ← Nouveau (PBKDF2)
├── services/logger.ts        ← Nouveau
├── services/storage.ts       ← Modifié (conflits + quota)
├── config.ts                 ← Modifié (validation)
├── index.html                ← Modifié (CSP)
└── .env                      ← À créer (NE PAS COMMITER)

Supabase (SQL Editor):
└── .audit/supabase_migration.sql  ← À exécuter une fois
```

---

## ⚠️ IMPORTANT

### À Faire AVANT le Déploiement

1. ✅ Exécuter le SQL dans Supabase
2. ✅ Créer le fichier .env
3. ✅ Tester localement
4. ✅ Vérifier que .env est dans .gitignore

### À NE PAS Faire

1. ❌ Ne JAMAIS commiter le fichier .env
2. ❌ Ne JAMAIS exposer vos clés API
3. ❌ Ne JAMAIS déployer sans tester

---

## 🆘 EN CAS DE PROBLÈME

### Erreur : "Supabase credentials missing"

**Cause:** Le fichier .env n'existe pas ou est mal configuré  
**Solution:** Créez le fichier .env avec les bonnes valeurs

### Erreur : "Invalid Supabase URL format"

**Cause:** L'URL Supabase est incorrecte  
**Solution:** Vérifiez que l'URL commence par `https://` et contient `.supabase.co`

### Erreur CSP dans la console

**Cause:** Une ressource est bloquée par la CSP  
**Solution:** Vérifiez que la ressource est dans la whitelist de `index.html` ligne 14-24

### L'application ne se charge pas

**Cause:** Erreur JavaScript  
**Solution:** 
1. Ouvrez la console (F12)
2. Regardez les erreurs
3. Vérifiez que toutes les dépendances sont installées

---

## 📞 SUPPORT

### Documentation

- **Audit complet:** `.audit/SECURITY_AUDIT_REPORT.md`
- **Checklist:** `.audit/QUICK_FIXES_CHECKLIST.md`
- **Implémentation:** `.audit/IMPLEMENTATION_COMPLETE.md`

### Ressources Externes

- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev/guide/
- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com/

---

## ✅ VALIDATION FINALE

Avant de déclarer le déploiement terminé, vérifiez :

- [ ] SQL exécuté dans Supabase
- [ ] 4 politiques RLS sur `profiles` (SELECT, INSERT, UPDATE, DELETE)
- [ ] .env créé et configuré
- [ ] .env dans .gitignore
- [ ] Application déployée sur Vercel/Netlify
- [ ] Variables d'environnement configurées
- [ ] Tests de sécurité passés
- [ ] Tests fonctionnels passés
- [ ] Aucune erreur dans la console

**Si toutes les cases sont cochées : 🎉 DÉPLOIEMENT RÉUSSI !**

---

**Guide créé le:** 10 février 2026  
**Version:** 2.0.0-secure  
**Prochaine mise à jour:** Après feedback utilisateurs
