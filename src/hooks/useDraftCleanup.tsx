import { useEffect, useCallback } from 'react';

interface DraftCleanupOptions {
  maxAgeDays?: number;
  keyPrefix?: string;
}

/**
 * Hook for automatic cleanup of old autosaved drafts from localStorage
 * Runs on mount and cleans up drafts older than specified days
 * 
 * @example
 * useDraftCleanup({ maxAgeDays: 7, keyPrefix: 'order-form' });
 */
export function useDraftCleanup({ 
  maxAgeDays = 7,
  keyPrefix 
}: DraftCleanupOptions = {}) {
  
  const cleanupOldDrafts = useCallback(() => {
    try {
      const now = new Date().getTime();
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      let cleanedCount = 0;

      // Iterate through all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Skip if key doesn't match prefix (if provided)
        if (keyPrefix && !key.startsWith(keyPrefix)) continue;

        try {
          const value = localStorage.getItem(key);
          if (!value) continue;

          const parsed = JSON.parse(value);
          
          // Check if it has a timestamp field
          if (parsed.timestamp) {
            const savedTime = new Date(parsed.timestamp).getTime();
            const age = now - savedTime;

            // Remove if older than max age
            if (age > maxAge) {
              localStorage.removeItem(key);
              cleanedCount++;
              console.log(`🗑️ Cleaned up old draft: ${key} (${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`);
            }
          }
        } catch (error) {
          // Skip items that aren't valid JSON or don't have timestamp
          continue;
        }
      }

      if (cleanedCount > 0) {
        console.log(`✅ Cleaned up ${cleanedCount} old draft(s)`);
      }
    } catch (error) {
      console.error('Failed to cleanup old drafts:', error);
    }
  }, [maxAgeDays, keyPrefix]);

  // Run cleanup on mount
  useEffect(() => {
    cleanupOldDrafts();
  }, [cleanupOldDrafts]);

  return { cleanupOldDrafts };
}

/**
 * Get all autosaved drafts from localStorage
 * Useful for creating a drafts management page
 */
export function getAllDrafts(keyPrefix?: string): Array<{
  key: string;
  data: any;
  timestamp: Date;
  age: string;
}> {
  const drafts: Array<{
    key: string;
    data: any;
    timestamp: Date;
    age: string;
  }> = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Skip if key doesn't match prefix (if provided)
      if (keyPrefix && !key.startsWith(keyPrefix)) continue;

      try {
        const value = localStorage.getItem(key);
        if (!value) continue;

        const parsed = JSON.parse(value);
        
        if (parsed.timestamp) {
          const timestamp = new Date(parsed.timestamp);
          const age = getTimeAgo(timestamp);

          drafts.push({
            key,
            data: parsed.data,
            timestamp,
            age,
          });
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    console.error('Failed to get drafts:', error);
  }

  // Sort by timestamp (newest first)
  return drafts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Delete a specific draft by key
 */
export function deleteDraft(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to delete draft:', error);
    return false;
  }
}

/**
 * Delete all drafts (optionally by prefix)
 */
export function deleteAllDrafts(keyPrefix?: string): number {
  let deletedCount = 0;

  try {
    const keys: string[] = [];
    
    // Collect keys to delete
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (!keyPrefix || key.startsWith(keyPrefix)) {
        keys.push(key);
      }
    }

    // Delete collected keys
    keys.forEach(key => {
      localStorage.removeItem(key);
      deletedCount++;
    });

  } catch (error) {
    console.error('Failed to delete all drafts:', error);
  }

  return deletedCount;
}

// Helper function to get human-readable time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
