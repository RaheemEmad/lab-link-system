import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ConflictResolutionOptions {
  tableName: string;
  recordId: string;
  onConflict?: (serverData: any, localData: any) => 'use_server' | 'use_local' | 'merge';
  enabled?: boolean;
}

interface ConflictState {
  hasConflict: boolean;
  serverData: any | null;
  lastChecked: Date | null;
}

/**
 * Hook for detecting and resolving conflicts between local autosaved data and server changes
 * Useful for preventing data loss when multiple users edit the same record
 * 
 * @example
 * const { checkForConflicts, resolveConflict, conflictState } = useConflictResolution({
 *   tableName: 'orders',
 *   recordId: orderId,
 *   onConflict: (serverData, localData) => {
 *     // Show conflict UI and let user decide
 *     return 'use_local';
 *   }
 * });
 */
export function useConflictResolution({
  tableName,
  recordId,
  onConflict,
  enabled = true,
}: ConflictResolutionOptions) {
  const [conflictState, setConflictState] = useState<ConflictState>({
    hasConflict: false,
    serverData: null,
    lastChecked: null,
  });

  // Check for conflicts by comparing server updated_at with local timestamp
  const checkForConflicts = useCallback(async (localTimestamp: string | null) => {
    if (!enabled || !recordId || !localTimestamp) return false;

    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) throw error;
      if (!data) return false;

      const serverUpdated = new Date((data as any).updated_at);
      const localUpdated = new Date(localTimestamp);

      // Check if server version is newer than local autosaved version
      if (serverUpdated > localUpdated) {
        setConflictState({
          hasConflict: true,
          serverData: data,
          lastChecked: new Date(),
        });

        // Show conflict notification
        toast({
          title: "⚠️ Conflict Detected",
          description: "This record has been updated by someone else. Your changes may conflict.",
          variant: "destructive",
        });

        return true;
      }

      setConflictState({
        hasConflict: false,
        serverData: null,
        lastChecked: new Date(),
      });

      return false;
    } catch (error) {
      console.error('Failed to check for conflicts:', error);
      return false;
    }
  }, [tableName, recordId, enabled]);

  // Resolve conflict using the provided strategy
  const resolveConflict = useCallback((localData: any): any => {
    if (!conflictState.hasConflict || !conflictState.serverData) {
      return localData;
    }

    // Use custom conflict resolution if provided
    if (onConflict) {
      const strategy = onConflict(conflictState.serverData, localData);
      
      switch (strategy) {
        case 'use_server':
          toast({
            title: "✅ Server Version Used",
            description: "Using the latest version from the server.",
          });
          return conflictState.serverData;
        
        case 'use_local':
          toast({
            title: "✅ Local Version Used",
            description: "Using your local changes. Server changes will be overwritten.",
          });
          return localData;
        
        case 'merge':
          // Merge strategy: keep local changes but preserve server timestamps
          toast({
            title: "🔀 Changes Merged",
            description: "Your changes have been merged with server updates.",
          });
          return {
            ...conflictState.serverData,
            ...localData,
            updated_at: conflictState.serverData.updated_at,
          };
        
        default:
          return localData;
      }
    }

    // Default: use local data but warn user
    toast({
      title: "⚠️ Using Local Changes",
      description: "Your local changes will overwrite server updates.",
      variant: "destructive",
    });
    
    return localData;
  }, [conflictState, onConflict]);

  // Clear conflict state
  const clearConflict = useCallback(() => {
    setConflictState({
      hasConflict: false,
      serverData: null,
      lastChecked: new Date(),
    });
  }, []);

  return {
    checkForConflicts,
    resolveConflict,
    clearConflict,
    conflictState,
  };
}
