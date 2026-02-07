import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

export const getSupabase = () => supabase;

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async () => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) throw error;
        return { data, error: null };
    } catch (error: any) {
        console.error('Error signing in with Google:', error.message);
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

        // Logic for cleaning up user data in DB should be handled by DB functions/policies
        // or a dedicated API call if RLS isn't enough to delete related data.

        const { error } = await supabase.rpc('delete_user_data');
        if (error) console.warn('Cleanup RPC failed:', error.message);

        const { error: signOutError } = await supabase.auth.signOut();
        return { error: signOutError };
    } catch (error: any) {
        return { error };
    }
};

/**
 * Ensure a profile exists for the user in the 'profiles' table
 */
export const ensureUserProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            // Create profile if it doesn't exist
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ id: userId }]);
            if (insertError) throw insertError;
        }
        return true;
    } catch (error) {
        console.error('Error ensuring user profile:', error);
        return false;
    }
};

/**
 * Co-parenting: Add a co-parent by email
 */
export const addCoParent = async (email: string) => {
    // This typically involves an invitation system or a direct DB link
    const { data, error } = await supabase
        .from('co_parents')
        .insert([{ email }]);
    return { data, error };
};

/**
 * Co-parenting: Remove a co-parent relationship
 */
export const removeCoParent = async (email: string) => {
    const { error } = await supabase
        .from('co_parents')
        .delete()
        .eq('email', email);
    return { error };
};

/**
 * Co-parenting: Get list of co-parents
 */
export const getCoParents = async () => {
    const { data, error } = await supabase
        .from('co_parents')
        .select('*');

    if (error) {
        console.error('Error fetching co-parents:', error);
        return [];
    }
    return data || [];
};
