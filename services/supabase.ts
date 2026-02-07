// Mock Supabase service for Local Version
// This mock is designed to let the app run without an actual Supabase backend

const mockAuth: any = {
    onAuthStateChange: (callback: any) => {
        console.log('Mock onAuthStateChange registered');
        return { data: { subscription: { unsubscribe: () => { } } } };
    },
    getSession: async () => ({ data: { session: null } }),
    getUser: async () => ({ data: { user: null } }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async (creds: any) => ({ data: { user: { id: 'mock-user', email: creds.email } }, error: null }),
    signUp: async (creds: any) => ({ data: { user: { id: 'mock-user', email: creds.email } }, error: null }),
    resetPasswordForEmail: async (email: string, options?: any) => ({ error: null })
};

const mockSupabase: any = {
    auth: mockAuth,
    from: (table: string) => {
        const queryBuilder: any = {
            upsert: async (data: any) => ({ error: null }),
            insert: (data: any) => queryBuilder,
            select: () => queryBuilder,
            single: async () => ({ data: { id: 'mock-id' }, error: null }),
            maybeSingle: async () => ({ data: { id: 'mock-id' }, error: null }),
            eq: () => queryBuilder,
            then: (resolve: any) => resolve({ data: [], error: null }) // Support for awaiting the builder itself
        };
        return queryBuilder;
    }
};

export const getSupabase = () => mockSupabase;

export const signInWithGoogle = async () => {
    console.log('Mock signInWithGoogle called');
    return { error: null };
};

export const updatePassword = async (password: string) => {
    console.log('Mock updatePassword called');
    return { error: null };
};

export const deleteAccount = async () => {
    console.log('Mock deleteAccount called');
    return { error: null };
};

export const ensureUserProfile = async (userId: string) => {
    console.log('Mock ensureUserProfile called for:', userId);
    return true;
};

// Co-parenting mocks
export const addCoParent = async (email: string) => {
    console.log('Mock addCoParent called for:', email);
    return { error: null };
};

export const removeCoParent = async (email: string) => {
    console.log('Mock removeCoParent called for:', email);
    return { error: null };
};

export const getCoParents = async () => {
    console.log('Mock getCoParents called');
    return []; // Returning array directly as expected by ParentView.tsx
};
