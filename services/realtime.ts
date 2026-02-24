import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

type RealtimeCallback = (payload: any) => void;

class RealtimeService {
    private channels: Map<string, RealtimeChannel> = new Map();
    private callbacks: Map<string, RealtimeCallback[]> = new Map();

    /**
     * Subscribe to changes on a specific table for a family
     * @param familyId - The family owner's ID
     * @param tableName - The table to watch (children, missions, goals, history_entries)
     * @param callback - Function to call when changes occur
     */
    subscribe(familyId: string, tableName: string, callback: RealtimeCallback): () => void {
        const supabase = getSupabase();
        const channelName = `${familyId}:${tableName}`;

        console.log(`🔔 [REALTIME] Subscribing to ${channelName}`);

        // Store callback
        if (!this.callbacks.has(channelName)) {
            this.callbacks.set(channelName, []);
        }
        this.callbacks.get(channelName)!.push(callback);

        // Create channel if it doesn't exist
        if (!this.channels.has(channelName)) {
            const channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: tableName,
                        filter: `family_id=eq.${familyId}`
                    },
                    (payload) => {
                        console.log(`🔔 [REALTIME] Change detected on ${tableName}:`, payload);
                        const callbacks = this.callbacks.get(channelName) || [];
                        callbacks.forEach(cb => cb(payload));
                    }
                )
                .subscribe((status, err) => {
                    console.log(`🔔 [REALTIME] Channel ${channelName} status: ${status}`);
                    if (err) console.error(`❌ [REALTIME] Channel ${channelName} error:`, err);

                    if (status === 'TIMED_OUT') {
                        console.warn(`⚠️ [REALTIME] Joining ${channelName} timed out. Retrying in 3s...`);
                        setTimeout(() => {
                            if (this.channels.has(channelName)) {
                                this.channels.delete(channelName);
                                this.subscribe(familyId, tableName, callback);
                            }
                        }, 3000);
                    }
                });

            this.channels.set(channelName, channel);
        }

        // Return unsubscribe function
        return () => {
            const callbacks = this.callbacks.get(channelName) || [];
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }

            // If no more callbacks, remove the channel
            if (callbacks.length === 0) {
                const channel = this.channels.get(channelName);
                if (channel) {
                    console.log(`🔕 [REALTIME] Unsubscribing from ${channelName}`);
                    supabase.removeChannel(channel);
                    this.channels.delete(channelName);
                    this.callbacks.delete(channelName);
                }
            }
        };
    }

    /**
     * Subscribe to all family data changes
     * @param familyId - The family owner's ID
     * @param callback - Function to call when any change occurs
     */
    subscribeToFamily(familyId: string, callback: RealtimeCallback): () => void {
        const tables = ['children', 'missions', 'goals', 'transactions'];
        const unsubscribers = tables.map(table =>
            this.subscribe(familyId, table, callback)
        );

        // Return a function that unsubscribes from all tables
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }

    /**
     * Unsubscribe from all channels
     */
    unsubscribeAll(): void {
        console.log('🔕 [REALTIME] Unsubscribing from all channels');
        const supabase = getSupabase();

        this.channels.forEach((channel, channelName) => {
            console.log(`🔕 [REALTIME] Removing channel ${channelName}`);
            supabase.removeChannel(channel);
        });

        this.channels.clear();
        this.callbacks.clear();
    }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
