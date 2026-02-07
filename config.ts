// Configuration locale - Aucune dépendance externe

export const APP_NAME = "Koiny";
export const VERSION = "2.0.0";
export const IS_LOCAL = import.meta.env.VITE_IS_LOCAL === "true" || false;

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://vumowlrfizzrohjhpvre.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1m93bHJmaXp6cm9oamhwdnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTQxMzMsImV4cCI6MjA4NTk3MDEzM30.7YyxRw7hDcnWnDGo0Y2YzKZmenB7ElMYDVU_IUYG8fo";

// Salt pour le chiffrement local
export const KIDBANK_SALT = import.meta.env.VITE_KIDBANK_SALT || "koiny-local-salt-2024";
