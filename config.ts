// Configuration locale - Aucune dépendance externe

export const APP_NAME = "Koiny";
export const VERSION = "2.0.0";
export const IS_LOCAL = import.meta.env.VITE_IS_LOCAL === "true" || false;

// ✅ SÉCURISÉ: Pas de fallbacks pour les clés API
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation au démarrage
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        '❌ FATAL: Supabase credentials missing.\n' +
        'Please create a .env file with:\n' +
        '  VITE_SUPABASE_URL=your_supabase_url\n' +
        '  VITE_SUPABASE_ANON_KEY=your_anon_key\n' +
        'See .env.example for reference.'
    );
}

// Validation du format
if (!SUPABASE_URL.startsWith('https://') || !SUPABASE_URL.includes('.supabase.co')) {
    throw new Error('❌ FATAL: Invalid Supabase URL format');
}

if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
    throw new Error('❌ FATAL: Invalid Supabase ANON_KEY format (should be a JWT)');
}

// Salt pour le chiffrement local (peut avoir un fallback car non critique)
export const KIDBANK_SALT = import.meta.env.VITE_KIDBANK_SALT || "koiny-local-salt-2024";
