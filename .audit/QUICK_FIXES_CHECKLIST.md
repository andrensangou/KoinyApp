# ⚡ CORRECTIFS URGENTS - KOINY APP
## Checklist des 7 Vulnérabilités Critiques

**Date:** 10 février 2026  
**Deadline:** Avant mise en production  
**Temps estimé:** 3-4 jours

---

## 🔴 CRITIQUE #1 : Chiffrement PIN (P0)

### Fichier: `services/security.ts`

**❌ Code actuel (VULNÉRABLE):**
```typescript
export const encryptAtRest = (text: string | null): string | null => {
  const key = getDeviceKey();
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = (text.charCodeAt(i) + key.charCodeAt(i % key.length)) % 65535;
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // Simple Base64
};
```

**✅ Code à implémenter:**
```typescript
import { pbkdf2Sync, randomBytes } from 'crypto';

export const hashPin = (pin: string): string => {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPin = (pin: string, storedHash: string): boolean => {
  const [salt, hash] = storedHash.split(':');
  const pinHash = pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
  return hash === pinHash;
};
```

**📝 Modifications nécessaires:**
- [ ] Remplacer `encryptAtRest` par `hashPin`
- [ ] Remplacer `decryptAtRest` par `verifyPin`
- [ ] Mettre à jour `ParentView.tsx` (vérification PIN)
- [ ] Migration des PINs existants

**⏱️ Temps:** 3 heures  
**🎯 Priorité:** P0 (BLOQUANT)

---

## 🔴 CRITIQUE #2 : Suppression Fallbacks API (P0)

### Fichier: `config.ts`

**❌ Code actuel:**
```typescript
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://vumowlrfizzrohjhpvre.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGci...";
```

**✅ Code à implémenter:**
```typescript
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation au démarrage
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('❌ FATAL: Supabase credentials missing. Check .env file.');
}

if (!SUPABASE_URL.startsWith('https://') || !SUPABASE_URL.includes('.supabase.co')) {
  throw new Error('❌ FATAL: Invalid Supabase URL format');
}
```

**📝 Modifications nécessaires:**
- [ ] Supprimer les valeurs en dur
- [ ] Créer `.env.example` avec placeholders
- [ ] Documenter dans `README.md`
- [ ] Tester avec variables manquantes

**⏱️ Temps:** 30 minutes  
**🎯 Priorité:** P0 (BLOQUANT)

---

## 🔴 CRITIQUE #3 : Logger avec Niveaux (P0)

### Nouveau fichier: `services/logger.ts`

**✅ Code à créer:**
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

const LOG_LEVEL = import.meta.env.PROD ? LogLevel.WARN : LogLevel.DEBUG;

const anonymizeId = (id: string): string => {
  if (!id || id.length < 8) return '***';
  return `***${id.slice(-4)}`;
};

export const logger = {
  debug: (message: string, data?: any) => {
    if (LOG_LEVEL <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  
  info: (message: string) => {
    if (LOG_LEVEL <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`);
    }
  },
  
  warn: (message: string, error?: any) => {
    if (LOG_LEVEL <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, error);
    }
  },
  
  error: (message: string, error: any) => {
    console.error(`[ERROR] ${message}`, error);
    // TODO: Envoyer à Sentry en production
  },
  
  // Helper pour anonymiser les IDs
  anonymize: anonymizeId
};
```

**📝 Modifications nécessaires:**
- [ ] Créer `services/logger.ts`
- [ ] Remplacer tous les `console.log` par `logger.debug`
- [ ] Remplacer tous les `console.error` par `logger.error`
- [ ] Anonymiser les User IDs : `logger.debug('Load data', { userId: logger.anonymize(userId) })`

**Fichiers à modifier (151 occurrences):**
- `services/supabase.ts` (40 occurrences)
- `services/storage.ts` (8 occurrences)
- `services/realtime.ts` (12 occurrences)
- `services/monitoring.ts` (3 occurrences)
- Autres...

**⏱️ Temps:** 4 heures  
**🎯 Priorité:** P0 (BLOQUANT)

---

## 🔴 CRITIQUE #4 : Content Security Policy (P0)

### Fichier: `index.html`

**❌ Code actuel:**
```html
<!-- Ligne 36 -->
<script src="https://cdn.tailwindcss.com"></script>
```

**✅ Étape 1 - Installer Tailwind localement:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**✅ Étape 2 - Créer `tailwind.config.js`:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Copier la config de index.html lignes 64-130
    },
  },
  plugins: [],
}
```

**✅ Étape 3 - Créer `src/index.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Copier les styles custom de index.html lignes 134-190 */
```

**✅ Étape 4 - Ajouter CSP dans `index.html`:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;
  font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

**📝 Modifications nécessaires:**
- [ ] Installer Tailwind localement
- [ ] Créer `tailwind.config.js`
- [ ] Créer `src/index.css`
- [ ] Supprimer CDN Tailwind de `index.html`
- [ ] Ajouter CSP header
- [ ] Tester le build

**⏱️ Temps:** 2 heures  
**🎯 Priorité:** P0 (BLOQUANT)

---

## 🔴 CRITIQUE #5 : Politique DELETE RLS (P0)

### Fichier: `fix_rls_complete.sql`

**❌ Code actuel (MANQUANT):**
```sql
-- Pas de politique DELETE sur profiles
```

**✅ Code à ajouter:**
```sql
-- Ajouter après la ligne 97
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE USING (auth.uid() = id);

-- Vérifier les cascades
ALTER TABLE children 
  DROP CONSTRAINT IF EXISTS children_parent_id_fkey,
  ADD CONSTRAINT children_parent_id_fkey 
    FOREIGN KEY (parent_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
```

**📝 Modifications nécessaires:**
- [ ] Ajouter politique DELETE
- [ ] Vérifier les contraintes CASCADE
- [ ] Tester la suppression de compte
- [ ] Documenter dans `DATA_GOVERNANCE.md`

**⏱️ Temps:** 1 heure  
**🎯 Priorité:** P0 (BLOQUANT)

---

## 🔴 CRITIQUE #6 : Gestion Conflits Sync (P0)

### Fichier: `services/storage.ts`

**✅ Code à ajouter:**
```typescript
// Nouvelle fonction de merge
function mergeGlobalStates(local: GlobalState, cloud: GlobalState): GlobalState {
  console.log('⚠️ Merge de conflits en cours...');
  
  // 1. Merge des enfants (par ID)
  const allChildrenIds = new Set([
    ...local.children.map(c => c.id),
    ...cloud.children.map(c => c.id)
  ]);
  
  const mergedChildren = Array.from(allChildrenIds).map(childId => {
    const localChild = local.children.find(c => c.id === childId);
    const cloudChild = cloud.children.find(c => c.id === childId);
    
    // Si seulement local ou cloud, retourner celui qui existe
    if (!localChild) return cloudChild!;
    if (!cloudChild) return localChild;
    
    // Merge intelligent : comparer les timestamps
    const localLastUpdate = Math.max(
      ...localChild.history.map(h => new Date(h.date).getTime()),
      0
    );
    const cloudLastUpdate = Math.max(
      ...cloudChild.history.map(h => new Date(h.date).getTime()),
      0
    );
    
    // Prendre le plus récent
    return localLastUpdate > cloudLastUpdate ? localChild : cloudChild;
  });
  
  return {
    ...local,
    children: mergedChildren,
    updatedAt: new Date().toISOString()
  };
}

// Modifier saveData
export const saveData = async (data: GlobalState, ownerId?: string) => {
  // 1. Charger version cloud
  if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
    const cloudData = await loadFromSupabase(ownerId);
    
    if (cloudData) {
      const localTimestamp = new Date(data.updatedAt || 0).getTime();
      const cloudTimestamp = new Date(cloudData.updatedAt || 0).getTime();
      
      // 2. Détecter conflit
      if (cloudTimestamp > localTimestamp) {
        console.warn('⚠️ Conflit détecté, merge automatique');
        data = mergeGlobalStates(data, cloudData);
      }
    }
  }
  
  // 3. Sauvegarde normale
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  await saveToSupabase(ownerId, data);
};
```

**📝 Modifications nécessaires:**
- [ ] Ajouter fonction `mergeGlobalStates`
- [ ] Modifier `saveData` pour détecter conflits
- [ ] Ajouter tests de merge
- [ ] Documenter le comportement

**⏱️ Temps:** 4 heures  
**🎯 Priorité:** P0 (BLOQUANT)

---

## 🔴 CRITIQUE #7 : Gestion Quota localStorage (P0)

### Fichier: `services/storage.ts`

**✅ Code à ajouter:**
```typescript
// Fonction de purge automatique
function purgeOldHistory(data: GlobalState, maxEntriesPerChild: number = 300): GlobalState {
  return {
    ...data,
    children: data.children.map(child => ({
      ...child,
      history: child.history
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, maxEntriesPerChild)
    }))
  };
}

// Modifier saveData
export const saveData = async (data: GlobalState, ownerId?: string) => {
  let dataToSave = { ...data, updatedAt: new Date().toISOString() };
  const jsonString = JSON.stringify(dataToSave);
  const sizeKB = new Blob([jsonString]).size / 1024;
  
  // 1. Vérifier la taille
  if (sizeKB > 4000) { // 4MB = seuil d'alerte (80% de 5MB)
    console.warn(`⚠️ Données volumineuses: ${sizeKB.toFixed(0)}KB, purge automatique`);
    dataToSave = purgeOldHistory(dataToSave, 300);
  }
  
  // 2. Sauvegarde avec gestion d'erreur
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      console.error('❌ Quota localStorage dépassé, purge d\'urgence');
      
      // Purge agressive
      dataToSave = purgeOldHistory(dataToSave, 100);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        alert('⚠️ Historique ancien supprimé pour libérer de l\'espace');
      } catch (e2) {
        throw new Error('Impossible de sauvegarder les données. Contactez le support.');
      }
    } else {
      throw e;
    }
  }
  
  // 3. Sync cloud
  if (ownerId && ownerId !== 'local-owner' && ownerId !== 'demo') {
    await saveToSupabase(ownerId, dataToSave);
  }
  
  return {};
};
```

**📝 Modifications nécessaires:**
- [ ] Ajouter fonction `purgeOldHistory`
- [ ] Modifier `saveData` avec try/catch
- [ ] Ajouter alerte utilisateur
- [ ] Tester avec quota dépassé

**⏱️ Temps:** 2 heures  
**🎯 Priorité:** P0 (BLOQUANT)

---

## 📋 CHECKLIST GLOBALE

### Jour 1 (8h)
- [ ] ✅ CRITIQUE #1 : Chiffrement PIN (3h)
- [ ] ✅ CRITIQUE #2 : Suppression fallbacks API (0.5h)
- [ ] ✅ CRITIQUE #3 : Logger avec niveaux (4h)
- [ ] ✅ CRITIQUE #4 : CSP + Tailwind local (2h) - Début

### Jour 2 (8h)
- [ ] ✅ CRITIQUE #4 : CSP + Tailwind local (suite - 2h)
- [ ] ✅ CRITIQUE #6 : Gestion conflits sync (4h)
- [ ] ✅ CRITIQUE #7 : Gestion quota localStorage (2h)

### Jour 3 (8h)
- [ ] ✅ CRITIQUE #5 : Politique DELETE RLS (1h)
- [ ] ✅ Tests de régression (4h)
- [ ] ✅ Documentation (2h)
- [ ] ✅ Revue de code (1h)

### Jour 4 (4h)
- [ ] ✅ Tests de sécurité (OWASP)
- [ ] ✅ Validation finale
- [ ] ✅ Préparation déploiement

---

## 🧪 TESTS DE VALIDATION

### Tests Sécurité

```bash
# 1. Vérifier qu'aucune clé API n'est en dur
grep -r "eyJhbGci" --exclude-dir=node_modules .
# Résultat attendu : Aucun match

# 2. Vérifier qu'aucun console.log ne contient de PII
grep -r "console.log.*userId" --exclude-dir=node_modules .
# Résultat attendu : Aucun match

# 3. Audit npm
npm audit
# Résultat attendu : 0 vulnérabilités critiques

# 4. Build de production
npm run build
# Résultat attendu : Succès sans erreurs
```

### Tests Fonctionnels

- [ ] Création de compte
- [ ] Connexion/Déconnexion
- [ ] Création PIN parent
- [ ] Réinitialisation PIN (avec mot de passe)
- [ ] Ajout enfant
- [ ] Ajout mission
- [ ] Synchronisation multi-appareils
- [ ] Suppression de compte (vérifier localStorage vide)
- [ ] Export RGPD

---

## 📞 SUPPORT

En cas de blocage :
1. Consulter le rapport complet : `.audit/SECURITY_AUDIT_REPORT.md`
2. Vérifier la documentation Supabase RLS
3. Tester en environnement de développement d'abord

**Deadline:** Avant mise en production  
**Temps total estimé:** 3-4 jours  
**Priorité:** 🔴 CRITIQUE
