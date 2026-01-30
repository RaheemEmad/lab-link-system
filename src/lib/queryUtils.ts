import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type AsyncState, type PaginatedResponse } from '@/types';

const QUERY_DEFAULTS = {
  staleTime: 30 * 1000,
  gcTime: 5 * 60 * 1000,
};

export class QueryError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'QueryError';
  }
}

interface FetchOptions<T> {
  queryKey: any[];
  queryFn: () => Promise<T>;
  options?: Omit<UseQueryOptions<T, QueryError>, 'queryKey' | 'queryFn'>;
}

export function createQuery<T>(
  { queryKey, queryFn, options }: FetchOptions<T>
) {
  return {
    queryKey,
    queryFn,
    ...QUERY_DEFAULTS,
    ...options,
  };
}

export function createMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, QueryError, TVariables>, 'mutationFn'>
) {
  return {
    mutationFn,
    ...options,
  };
}

export function handleSupabaseError(error: unknown): QueryError {
  if (error instanceof Error) {
    if ('code' in error) {
      return new QueryError(
        (error as any).code,
        error.message,
        error
      );
    }
    return new QueryError('UNKNOWN_ERROR', error.message, error);
  }
  return new QueryError('UNKNOWN_ERROR', String(error));
}

export async function paginate<T>(
  query: ReturnType<typeof supabase.from>,
  page: number = 0,
  pageSize: number = 25
): Promise<PaginatedResponse<T>> {
  try {
    const offset = page * pageSize;
    const { data, count, error } = await query
      .range(offset, offset + pageSize - 1)
      .select('*', { count: 'exact' });

    if (error) throw error;

    return {
      data: (data || []) as T[],
      total: count || 0,
      page,
      limit: pageSize,
      hasMore: count ? offset + pageSize < count : false,
    };
  } catch (error) {
    throw handleSupabaseError(error);
  }
}

export function buildQueryFilters(
  query: ReturnType<typeof supabase.from>,
  filters: Record<string, any>
): ReturnType<typeof supabase.from> {
  let result = query;

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (value === 'not_null') {
      result = result.not(key, 'is', null);
    } else if (typeof value === 'boolean') {
      result = result.eq(key, value);
    } else if (Array.isArray(value)) {
      result = result.in(key, value);
    } else if (typeof value === 'object' && value.gt !== undefined) {
      result = result.gt(key, value.gt);
    } else if (typeof value === 'object' && value.lt !== undefined) {
      result = result.lt(key, value.lt);
    } else {
      result = result.eq(key, value);
    }
  });

  return result;
}

export function deduplicateQueries<T>(
  items: T[],
  keyFn: (item: T) => string | number
): T[] {
  const seen = new Set<string | number>();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const asyncStateInitial = (): AsyncState<unknown> => ({ status: 'idle' });

export function isAsyncLoading<T>(state: AsyncState<T>): boolean {
  return state.status === 'pending';
}

export function isAsyncSuccess<T>(state: AsyncState<T>): state is { status: 'success'; data: T } {
  return state.status === 'success';
}

export function isAsyncError(state: AsyncState<unknown>): state is { status: 'error'; error: string } {
  return state.status === 'error';
}
