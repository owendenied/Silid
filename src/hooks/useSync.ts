import { useState } from 'react';
import { supabaseReal } from '../lib/supabase';
import { localDb } from '../lib/localDb';
import { useAppStore } from '../store/useAppStore';

export const useSync = () => {
  const [syncing, setSyncing] = useState(false);
  const { user } = useAppStore();

  const syncData = async () => {
    if (!user || !navigator.onLine) return;
    setSyncing(true);
    console.log('🔄 Syncing data from Supabase...');

    try {
      // Sync basic tables
      const tables = ['classrooms', 'assignments', 'submissions', 'users', 'enrollments'];
      
      for (const table of tables) {
        const { data, error } = await supabaseReal.from(table).select('*');
        if (!error && data) {
          localDb.upsertTable(table, data);
        }
      }

      console.log('✅ Sync complete!');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  return { syncing, syncData };
};

