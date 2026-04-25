import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export const useSync = () => {
  const { isOffline, user } = useAppStore();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isOffline && user) {
      syncData();
    }
  }, [isOffline, user]);

  const syncData = async () => {
    if (syncing) return;
    setSyncing(true);

    try {
      // 1. Sync Submissions
      const pendingSubmissions = await db.submissions
        .where('status')
        .equals('pending_sync')
        .toArray();

      for (const sub of pendingSubmissions) {
        const { error } = await supabase
          .from('submissions')
          .insert([{
            assignmentId: sub.materialId,
            studentId: sub.studentId,
            answer: sub.answers,
            score: sub.score,
            status: 'submitted'
          }]);

        if (!error) {
          await db.submissions.update(sub.id, { status: 'synced' });
          console.log(`Synced submission: ${sub.id}`);
        } else {
          console.error(`Error syncing submission ${sub.id}:`, error);
        }
      }

      // 2. Fetch Latest Classes and Materials for Offline Use
      // (This could be expanded to keep IndexedDB fresh)
      
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  return { syncing, syncData };
};
