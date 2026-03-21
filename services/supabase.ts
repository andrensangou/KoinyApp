import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SUPABASE_URL, SUPABASE_ANON_KEY, log } from '../config';
import { GoalStatus } from '../types';
import { ICON_MAP } from '../constants/icons';
import { Preferences } from '@capacitor/preferences';

/**
 * Stockage natif persistant pour Supabase Auth (survit aux fermetures d'app)
 * Utilise @capacitor/preferences au lieu du localStorage du WebView
 */
const CapacitorStorageAdapter = {
    async getItem(key: string): Promise<string | null> {
        const { value } = await Preferences.get({ key });
        return value;
    },
    async setItem(key: string, value: string): Promise<void> {
        await Preferences.set({ key, value });
    },
    async removeItem(key: string): Promise<void> {
        await Preferences.remove({ key });
    },
};

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !Capacitor.isNativePlatform(),
        ...(Capacitor.isNativePlatform() && { storage: CapacitorStorageAdapter }),
    }
});

// Flag pour éviter les sauvegardes concurrentes
let isSaving = false;

/**
 * Executes a Promise with an exponential backoff retry strategy.
 */
export const withRetry = async <T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            log(`⏳ [NETWORK] Tentative ${i + 1}/${retries} échouée. Retrait dans ${delay * Math.pow(2, i)}ms...`);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
};

export const getSupabase = () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_')) {
        console.warn('⚠️ [SUPABASE] Client non configuré ou clés invalides');
    }
    return supabase;
};

/**
 * Sign in with Google OAuth
 */
let googleAuthInitialized = false;

export const signInWithGoogle = async () => {
    try {
        const isNative = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

        // Android : Utiliser le plugin natif Google Auth (SDK natif)
        if (isNative && platform === 'android') {
            try {
                const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
                if (!googleAuthInitialized) {
                    await GoogleAuth.initialize({
                        clientId: '165597226617-2uhqfl4khjnfdi41jd84uv8j6tmka1as.apps.googleusercontent.com',
                        scopes: ['profile', 'email'],
                        grantOfflineAccess: true,
                    });
                    googleAuthInitialized = true;
                }
                const googleUser = await GoogleAuth.signIn();

                if (!googleUser.authentication.idToken) {
                    throw new Error('No ID token received from Google');
                }

                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: googleUser.authentication.idToken,
                });

                if (error) throw error;
                return { data, error: null };
            } catch (nativeError: any) {
                console.warn('⚠️ [GOOGLE] Native sign-in failed, falling back to browser:', nativeError.message);
                // Fallback to browser if native fails
            }
        }

        // iOS : Utiliser le SDK natif Google Sign-In (pas de browser, pas de WebProcess freeze)
        if (isNative && platform === 'ios') {
            try {
                const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
                if (!googleAuthInitialized) {
                    await GoogleAuth.initialize({
                        clientId: '165597226617-d32lvds9bq8vpvglc6kh9c90s817eqe2.apps.googleusercontent.com',
                        scopes: ['profile', 'email'],
                        grantOfflineAccess: true,
                    });
                    googleAuthInitialized = true;
                }
                const googleUser = await GoogleAuth.signIn();

                if (!googleUser.authentication.idToken) {
                    throw new Error('No ID token received from Google');
                }

                console.log('🍎 [GOOGLE iOS] Native sign-in OK, exchanging token...');
                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: googleUser.authentication.idToken,
                });

                if (error) throw error;
                console.log('✅ [GOOGLE iOS] Session Supabase créée pour:', data.user?.email);
                return { data, error: null };
            } catch (nativeError: any) {
                console.warn('⚠️ [GOOGLE iOS] Native sign-in failed, falling back to browser:', nativeError.message);
                // Fallback OAuth browser si le natif échoue
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: 'com.koiny.app://callback', skipBrowserRedirect: true },
                });
                if (error) throw error;
                if (data?.url) {
                    await Browser.open({ url: data.url });
                }
                return { data, error: null };
            }
        } else {
            // Web classique
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            return { data, error: null };
        }
    } catch (error: any) {
        console.error('Error signing in with Google:', error.message);
        return { data: null, error };
    }
};

/**
 * Sign in with Apple (Native iOS + Web fallback)
 * Uses native ASAuthorizationController on iOS for best UX
 * Falls back to Supabase OAuth on web
 */
export const signInWithApple = async () => {
    try {
        const isNative = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform();

        if (isNative && platform === 'ios') {
            try {
                // Native iOS: Use the Apple Sign-In Capacitor plugin
                const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');

                console.log('🍎 [APPLE] Attempting native Sign in with Apple...');

                // Generate raw nonce and SHA256 hash for Apple
                const rawNonce = crypto.randomUUID();
                const encoder = new TextEncoder();
                const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawNonce));
                const hashedNonce = Array.from(new Uint8Array(hashBuffer))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');

                console.log('🍎 [APPLE] Nonce generated, hashed for Apple');

                const result = await SignInWithApple.authorize({
                    clientId: 'com.koiny.app',
                    redirectURI: 'com.koiny.app://callback',
                    scopes: 'email name',
                    state: crypto.randomUUID(),
                    nonce: hashedNonce, // Apple gets the SHA256 hash
                });

                console.log('🍎 [APPLE] Response:', result);

                if (!result?.response?.identityToken) {
                    throw new Error('No identity token received from Apple');
                }

                console.log('🍎 [APPLE] Identity token received, exchanging with Supabase...');

                // Exchange Apple's identity token with Supabase
                // Supabase gets the RAW nonce (it will hash it internally to verify)
                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'apple',
                    token: result.response.identityToken,
                    nonce: rawNonce, // Supabase gets the raw nonce
                });

                if (error) {
                    console.error('❌ [APPLE] Supabase token exchange failed:', error);
                    throw error;
                }

                console.log('✅ [APPLE] Sign-In successful for:', data.user?.email);
                return { data, error: null };
            } catch (nativeError: any) {
                console.error('❌ [APPLE Native] Error:', nativeError.message);
                console.log('⚠️ [APPLE] Falling back to OAuth browser...');

                // Fallback to OAuth browser
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'apple',
                    options: {
                        redirectTo: 'com.koiny.app://callback',
                        skipBrowserRedirect: true,
                    },
                });

                if (error) throw error;
                if (data?.url) {
                    await Browser.open({ url: data.url });
                }
                return { data, error: null };
            }
        } else {
            // Web: Use Supabase OAuth redirect
            console.log('🍎 [APPLE Web] Initiating OAuth flow...');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'apple',
                options: {
                    redirectTo: window.location.origin,
                },
            });

            if (error) throw error;
            return { data, error: null };
        }
    } catch (error: any) {
        console.error('❌ Error signing in with Apple:', error.message || error);
        return { data: null, error };
    }
};

/**
 * Update user password
 */
export const updatePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
        password: password
    });
    return { data, error };
};

/**
 * Delete user account and cleanup
 */
export const deleteAccount = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        const { error } = await supabase.rpc('delete_user_data');
        if (error) throw new Error(`Account deletion failed: ${error.message}`);

        // Nettoyer tout le cache local (Preferences + localStorage)
        await Preferences.remove({ key: 'koiny_local_v1' });
        await Preferences.remove({ key: 'koiny_local_v1_backup' });
        await Preferences.remove({ key: `koiny_parent_pin_v2_${user.id}` });
        localStorage.removeItem('koiny_local_v1');
        localStorage.removeItem('koiny_local_v1_backup');
        localStorage.removeItem('koiny_premium_active');

        // Révoquer la session Google native (évite la reconnexion silencieuse)
        if (Capacitor.isNativePlatform()) {
            try {
                const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
                await GoogleAuth.signOut();
            } catch (_) {
                // Ignore si Google Auth n'était pas initialisé (connexion Apple ou email)
            }
        }

        // Le compte auth est déjà supprimé par la RPC — signOut nettoie la session locale
        await supabase.auth.signOut();
        return { error: null };
    } catch (error: any) {
        return { error };
    }
};

export const ensureUserProfile = async (userId: string, email?: string) => {
    try {
        log(`🔍 [SUPABASE] Vérification profil pour: ${userId}`);

        const checkPromise = supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT_DATABASE')), 10000)
        );

        try {
            const { data } = await Promise.race([checkPromise, timeoutPromise]) as any;

            if (!data) {
                log('🆕 [SUPABASE] Profil inexistant. Création...');

                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: userId,
                        email: email || null,
                        full_name: email?.split('@')[0] || 'Parent',
                        role: 'parent'
                    }]);

                if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`);

                log('✅ [SUPABASE] Profil créé avec succès');
            } else {
                log(`✅ [SUPABASE] Profil existant vérifié`);
            }
        } catch (e: any) {
            console.warn('⚠️ [SUPABASE] Erreur lors de l\'initialisation:', e.message);
        }

        return true;
    } catch (error: any) {
        console.error('❌ [SUPABASE] Erreur critique ensureUserProfile:', error.message || error);
        return true;
    }
};

/**
 * RELATIONAL STORAGE: Load all user data from Supabase (V2 Schema)
 */
export const loadFromSupabase = async (userId: string): Promise<any> => {
    const start = performance.now();
    try {
        log(`📥 [SUPABASE] Chargement données V2 pour: ${userId}`);

        const fetchData = async () => {
            // Use the passed userId directly to avoid a slow getUser() network call
            // (especially critical right after iOS WebProcess unfreeze post-OAuth)
            const currentUserId = userId;

            // 1. Load Profile
            const { data: profile, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUserId)
                .maybeSingle();

            if (pError) throw pError;
            if (!profile) return null;

            // 2. Load Children directly by user_id
            const { data: children, error: cError } = await supabase
                .from('children')
                .select(`
                    *,
                    missions(*),
                    goals(*),
                    transactions(*)
                `)
                .eq('user_id', currentUserId);

            if (cError) throw cError;
            return { profile, children };
        };

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT_LOAD_DATA')), 8000)
        );

        // Usage de l'outil retry réseau: 3 tentatives avec backoff exponentiel
        const result = await withRetry(() => Promise.race([fetchData(), timeoutPromise])) as any;
        if (!result) return null;

        const { profile, children } = result;
        log(`✅ [SUPABASE] V2 Data loaded in ${(performance.now() - start).toFixed(0)}ms`);

        // 3. Map to GlobalState
        return {
            language: 'fr', // Default or fetch from stored pref if added to DB
            parentPin: profile.pin_hash, // Mapped from pin_hash
            parentTutorialSeen: true, // Legacy
            soundEnabled: true,
            parentBadge: 'NOVICE',
            totalApprovedMissions: 0,
            maxBalance: 100,
            updatedAt: profile.updated_at,
            children: (children || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                avatar: c.avatar_id || 'avatar_1', // Mapped from avatar_id
                colorClass: c.theme_color || 'indigo', // Mapped from theme_color
                balance: c.balance,
                tutorialSeen: true,
                birthday: null,
                giftRequested: c.gift_requested || false,
                missionRequested: c.mission_requested || false,
                missions: (c.missions || []).map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    reward: m.amount, // Mapped from amount
                    icon: m.icon_id || 'icon_star',
                    status: m.status === 'validated' ? 'COMPLETED' : (m.status === 'pending' ? 'PENDING' : 'ACTIVE'), // Map status
                    feedback: m.rejection_reason,
                    createdAt: m.created_at
                })),
                goals: (c.goals || []).map((g: any) => ({
                    id: g.id,
                    name: g.title, // Mapped from title
                    target: g.target_amount, // Mapped from target_amount
                    icon: g.image_url || 'fa-star', // Approximation
                    status: (['completed', 'COMPLETED'].includes(g.status) ? 'COMPLETED' : (g.status === 'archived' ? 'ARCHIVED' : 'ACTIVE')) as GoalStatus
                })),
                history: (c.transactions || []).sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ).map((t: any) => {
                    const d = new Date(t.created_at);
                    const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    return {
                        id: t.id,
                        date: dateFormatted,
                        title: t.description,
                        amount: t.type === 'withdrawal' ? -Math.abs(t.amount) : t.amount,
                        note: null
                    };
                })
            }))
        };
    } catch (err) {
        console.error('❌ Error loading from Supabase V2:', err);
        return null;
    }
};

export const saveToSupabase = async (userId: string, state: any): Promise<{ success: boolean, idMapping: Record<string, string> }> => {
    const idMapping: Record<string, string> = {};

    if (!userId || userId === 'local-owner' || userId === 'demo') return { success: false, idMapping };

    if (isSaving) {
        log('⏭️ [SUPABASE] Save already in progress, skipping');
        return { success: false, idMapping };
    }

    isSaving = true;

    log(`☁️ [SUPABASE] Save V2 START`);

    try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return { success: false, idMapping };

        const userId = currentUser.id;
        log(`👶 [SUPABASE] Enfants à sync: ${state.children?.length}`);

        // 1. Update Profile
        // Ne jamais écraser pin_hash avec null — le PIN est géré par pinStorage.ts
        const profilePayload: Record<string, any> = { updated_at: new Date().toISOString() };
        if (state.parentPin !== null && state.parentPin !== undefined) {
            profilePayload.pin_hash = state.parentPin;
        }
        const { error: profErr } = await supabase.from('profiles').update(profilePayload).eq('id', userId);

        if (profErr) {
            console.error('❌ [SUPABASE] Profile sync error:', profErr.message);
            return { success: false, idMapping };
        }

        // 3. Sync Children
        const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        for (const child of (state.children || [])) {
            log(`👶 [SUPABASE] Processing child: ${child.name} (ID: ${child.id}, isUUID: ${isUUID(child.id)})`);

            const childPayload: any = {
                user_id: userId,
                name: child.name,
                avatar_id: child.avatar || 'avatar_1',
                theme_color: child.colorClass || '#6366f1',
                balance: child.balance ?? 0,
                mission_requested: child.missionRequested || false,
                gift_requested: child.giftRequested || false
            };

            let savedChildId = child.id;

            if (isUUID(child.id)) {
                const { error: cErr } = await supabase.from('children').update(childPayload).eq('id', child.id);
                if (cErr) {
                    console.error('❌ Child update error:', cErr.message);
                    return { success: false, idMapping };
                }
            } else {
                // Vérifier si un enfant avec ce nom existe déjà (anti-doublon)
                const { data: existing } = await supabase
                    .from('children')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('name', child.name)
                    .single();

                if (existing) {
                    // L'enfant existe déjà → utiliser son ID
                    savedChildId = existing.id;
                    idMapping[child.id] = existing.id;
                    log('♻️ [SUPABASE] Child already exists, reusing ID:', existing.id);
                } else {
                    const { data: insertedChild, error: cInsErr } = await supabase
                        .from('children')
                        .insert([childPayload])
                        .select('id')
                        .single();

                    if (cInsErr) {
                        console.error('❌ Child insert error:', cInsErr.message);
                        return { success: false, idMapping };
                    }

                    if (insertedChild) {
                        savedChildId = insertedChild.id;
                        idMapping[child.id] = savedChildId;
                        log(`✅ [SUPABASE] Child created! New ID: ${savedChildId}`);
                    }
                }
            }

            // Sync Missions
            if (child.missions?.length > 0) {
                const missionsToUpsert = child.missions
                    .filter((m: any) => m.status !== 'COMPLETED')
                    .map((m: any) => {
                        // Map local status to DB status
                        let dbStatus = 'available';
                        if (m.status === 'COMPLETED') dbStatus = 'validated';
                        else if (m.status === 'PENDING') dbStatus = 'pending';
                        else if (m.status === 'REJECTED') dbStatus = 'rejected';
                        else if (m.status === 'ACTIVE') dbStatus = 'available';

                        return {
                            id: isUUID(m.id) ? m.id : crypto.randomUUID(),
                            child_id: savedChildId,
                            title: m.title,
                            amount: m.reward,
                            status: dbStatus,
                            icon_id: m.icon || 'icon_star',
                            created_by: m.created_by || currentUser.id,
                            recurrence: m.recurrence || 'once',
                            description: m.description || null,

                            // ✅ La règle : champs temporels/méta conditionnels au statut
                            completed_at: (dbStatus === 'pending' || dbStatus === 'validated')
                                ? (m.completed_at || new Date().toISOString())
                                : null,
                            validated_at: dbStatus === 'validated'
                                ? (m.validated_at || new Date().toISOString())
                                : null,
                            validated_by: dbStatus === 'validated'
                                ? (m.validated_by || currentUser.id)
                                : null,
                            rejection_reason: dbStatus === 'rejected'
                                ? (m.rejection_reason || m.feedback || null)
                                : null,
                        };
                    });

                if (missionsToUpsert.length > 0) {
                    const { error: mErr } = await supabase
                        .from('missions')
                        .upsert(missionsToUpsert, { onConflict: 'id' });
                    if (mErr) {
                        console.error('❌ Missions upsert error:', mErr.message);
                        return { success: false, idMapping };
                    }
                }
            }

            // Sync Goals
            if (child.goals?.length > 0) {
                // ✅ Sépare clairement nouveaux goals vs existants
                const newGoals = child.goals.filter((g: any) => !isUUID(g.id) && g.target > 0);
                const existingGoals = child.goals.filter((g: any) => isUUID(g.id) && g.target > 0);

                // ✅ Insert uniquement les nouveaux (avec vérification anti-doublon)
                if (newGoals.length > 0) {
                    // Charger les goals existants pour cet enfant afin d'éviter les doublons
                    const { data: existingDbGoals } = await supabase
                        .from('goals')
                        .select('id, title, target_amount')
                        .eq('child_id', savedChildId);

                    const goalsToInsert = newGoals
                        .filter((g: any) => {
                            // Vérifier si un goal avec le même titre ET montant existe déjà
                            const isDuplicate = (existingDbGoals || []).some(
                                (existing: any) => existing.title === (g.name || 'Objectif') && existing.target_amount === g.target
                            );
                            if (isDuplicate) {
                                log(`♻️ [SUPABASE] Goal "${g.name}" already exists for child, skipping insert`);
                                // Mapper l'ID local vers l'ID existant en DB
                                const matchingGoal = (existingDbGoals || []).find(
                                    (existing: any) => existing.title === (g.name || 'Objectif') && existing.target_amount === g.target
                                );
                                if (matchingGoal) {
                                    idMapping[g.id] = matchingGoal.id;
                                }
                            }
                            return !isDuplicate;
                        })
                        .map((g: any) => ({
                            id: crypto.randomUUID(),
                            child_id: savedChildId,
                            title: g.name || 'Objectif',
                            target_amount: g.target,
                            current_amount: g.current || 0,
                            image_url: g.icon || null,
                            status: g.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
                            is_achieved: g.status === 'COMPLETED'
                        }));

                    if (goalsToInsert.length > 0) {
                        const { error } = await supabase.from('goals').insert(goalsToInsert);
                        if (error) {
                            console.error('❌ Goals insert error:', error.message);
                        } else {
                            // Mapper les IDs des goals réellement insérés
                            const filteredNewGoals = newGoals.filter((g: any) => !idMapping[g.id]);
                            filteredNewGoals.forEach((g: any, i: number) => {
                                if (goalsToInsert[i]) {
                                    idMapping[g.id] = goalsToInsert[i].id;
                                }
                            });
                        }
                    }
                }

                // ✅ Update les existants sans les recréer
                if (existingGoals.length > 0) {
                    for (const g of existingGoals) {
                        await supabase.from('goals')
                            .update({
                                title: g.name,
                                target_amount: g.target,
                                current_amount: g.current || 0,
                                status: g.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
                                is_achieved: g.status === 'COMPLETED'
                            })
                            .eq('id', g.id);
                    }
                }
            }

            // Sync Transactions (Optimized: Split Insert/Upsert)
            if (child.history?.length > 0) {
                const mapTransaction = (h: any) => {
                    let type = 'bonus';
                    if (h.amount < 0) type = 'withdrawal';
                    if (h.amount < 0 && h.title?.toLowerCase().includes('achat')) type = 'withdrawal'; // Changed from 'goal_purchase' per request
                    if (h.amount > 0 && h.title?.toLowerCase().includes('mission')) type = 'mission';

                    return {
                        id: isUUID(h.id) ? h.id : crypto.randomUUID(),
                        child_id: savedChildId,
                        type,
                        amount: h.amount,
                        description: h.title || 'Transaction',
                        created_by: currentUser.id,
                        created_at: (() => {
                            const parts = (h.date || '').split('/');
                            if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00Z`;
                            return new Date().toISOString();
                        })()
                    };
                };

                // 1. New Transactions (Insert)
                const newTransactions = child.history
                    .filter((h: any) => !isUUID(h.id))
                    .map((h: any) => mapTransaction(h));

                if (newTransactions.length > 0) {
                    log(`🆕 [SUPABASE] Inserting ${newTransactions.length} new transactions`);
                    const { error: tErr } = await supabase.from('transactions').insert(newTransactions);
                    if (tErr) {
                        console.error('❌ Transactions insert error:', tErr.message);
                        return { success: false, idMapping };
                    }
                }

                // 2. Existing Transactions (Upsert)
                const existingTransactions = child.history
                    .filter((h: any) => isUUID(h.id))
                    .map((h: any) => mapTransaction(h));

                if (existingTransactions.length > 0) {
                    const { error: tErr } = await supabase.from('transactions').upsert(existingTransactions, { onConflict: 'id' });
                    if (tErr) {
                        console.error('❌ Transactions upsert error:', tErr.message);
                        return { success: false, idMapping };
                    }
                }
            }
        }

        log(`✅ [SUPABASE] Save V2 DONE. ID mappings:`, idMapping);
        return { success: true, idMapping };

    } catch (err: any) {
        console.error('❌ [SUPABASE] Save V2 CRASH:', err.message);
        return { success: false, idMapping };
    } finally {
        isSaving = false;
    }
};
