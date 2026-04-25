import { useState } from 'react';

// Sync is not needed when using localStorage — data is always local.
// This hook is kept as a no-op stub so Layout.tsx doesn't break.
export const useSync = () => {
  const [syncing] = useState(false);

  const syncData = async () => {
    // No-op: localStorage doesn't need syncing
  };

  return { syncing, syncData };
};
