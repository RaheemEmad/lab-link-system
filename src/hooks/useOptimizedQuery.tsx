import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { performanceMonitor } from '@/lib/performanceMonitor';
import { stateSync } from '@/lib/stateSync';
import { useEffect } from 'react';

/**
 * Enhanced query hook with performance monitoring and cross-tab state sync
 */
export function useOptimizedQuery<TData = unknown, TError = Error>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    enableStateSync?: boolean;
    logPerformance?: boolean;
  }
) {
  const { enableStateSync = true, logPerformance = true, ...queryOptions } = options || {};

  const query = useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      if (logPerformance) {
        return performanceMonitor.measureAsync(
          `query:${queryKey.join(':')}`,
          queryFn,
          { queryKey }
        );
      }
      return queryFn();
    },
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });

  // Sync state across tabs
  useEffect(() => {
    if (!enableStateSync) return;

    const syncKey = `query:${queryKey.join(':')}`;

    // Subscribe to state updates from other tabs
    const unsubscribe = stateSync.subscribe(syncKey, (data) => {
      if (data?.forceRefresh) {
        query.refetch();
      }
    });

    return unsubscribe;
  }, [queryKey, enableStateSync, query]);

  return query;
}
