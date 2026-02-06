
# 🚀 Koiny : Checklist de Pré-lancement Production

Ce document répertorie les étapes critiques avant l'ouverture du service au public.

## 🔴 PRIORITÉ 1 : SÉCURITÉ & INTÉGRITÉ DES DONNÉES (CRITIQUE)
- [ ] **Supabase RLS (Row Level Security)** : Vérifier que TOUTES les tables (`profiles`, `children`, `missions`, `goals`, `history_entries`) ont des politiques RLS strictes interdisant l'accès aux données d'autres familles.
- [ ] **Secrets & API Keys** : S'assurer que `SUPABASE_ANON_KEY` et `SUPABASE_URL` sont injectées via les variables d'environnement de la plateforme de déploiement (Vercel/Netlify) et non codées en dur pour la prod.
- [ ] **Certificat SSL/TLS** : Forcer la redirection HSTS (HTTPS uniquement) au niveau du registrar ou de l'hébergeur.
- [ ] **Sauvegarde (Backup)** : Activer les "Point-in-Time Recovery" (PITR) sur Supabase pour permettre une restauration à la seconde près en cas de corruption de la base.
- [ ] **Sanitisation Client** : Vérifier que le `MAX_BALANCE` (100€) est bien respecté dans tous les services de mutation.

## 🟠 PRIORITÉ 2 : INFRASTRUCTURE & DISPONIBILITÉ (HAUT)
- [ ] **DNS** : Configurer les enregistrements A/CNAME et vérifier la propagation mondiale.
- [ ] **Optimisation des Assets (CDN)** : 
    - [ ] Remplacer le script Tailwind CDN par une version compilée et minifiée dans le build final.
    - [ ] Vérifier que les imports `esm.sh` utilisent des versions verrouillées (ex: `@18.3.1`) pour éviter les régressions.
- [ ] **Monitoring & Alerting** :
    - [ ] Connecter un service de log d'erreurs (Sentry ou LogSnag).
    - [ ] Configurer une alerte de "Downtime" (ex: UptimeRobot) pointant sur l'URL de santé.
- [ ] **Plan de Rollback** :
    - [ ] Documenter la procédure de retour à la version N-1 sur la plateforme de CI/CD (ex: "Promote Previous Deployment" sur Vercel).
    - [ ] Tester le rollback d'une migration de schéma SQL Supabase.

## 🟡 PRIORITÉ 3 : PERFORMANCE & CONFORMITÉ (MÉDIUM)
- [ ] **Tests de Charge** : Simuler 100 écritures simultanées sur le blob JSON pour vérifier les temps de réponse de la base PostgreSQL.
- [ ] **Cache Stratégie** : Vérifier les headers `Cache-Control` pour les images d'avatars et les fonts Google.
- [ ] **Conformité RGPD** :
    - [ ] Vérifier la présence du lien vers les mentions légales sur la page de Login et de Signup.
    - [ ] Valider que la fonction `deleteAccount` supprime bien l'intégralité des données liées (cascade SQL).

## 🔵 PRIORITÉ 4 : OPÉRATIONS & COMMUNICATION (OPÉRATIONNEL)
- [ ] **Plan de Communication Incident** : Préparer des modèles de messages pour :
    - [ ] Maintenance planifiée.
    - [ ] Incident technique en cours.
    - [ ] Problème de synchronisation cloud.
- [ ] **Documentation Ops** : Mettre à jour `ARCHITECTURE.md` avec les URLs des dashboards de production (Supabase, Hosting, Analytics).
- [ ] **Support** : Vérifier que l'adresse `hello@koiny.app` est active et redirige vers l'équipe de support.

---
*Dernière validation effectuée le : [DATE]*  
*Signé par : [RESPONSABLE TECHNIQUE]*
