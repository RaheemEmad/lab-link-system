import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

interface RetryState {
  retryCount: number;
  isRetrying: boolean;
  nextRetryIn: number | null;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Custom hook that wraps useMutation with exponential backoff retry logic
 * Provides automatic retry for failed operations with increasing delays
 */
export function useRetryMutation<TData = unknown, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables> & {
    retryConfig?: RetryConfig;
    onRetryExhausted?: (error: TError) => void;
  }
) {
  const [retryState, setRetryState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    nextRetryIn: null,
  });

  const config = { ...DEFAULT_CONFIG, ...options?.retryConfig };

  const calculateDelay = useCallback((attemptNumber: number): number => {
    const delay = Math.min(
      config.initialDelay * Math.pow(config.backoffMultiplier, attemptNumber),
      config.maxDelay
    );
    return delay;
  }, [config]);

  const executeWithRetry = useCallback(
    async (variables: TVariables, attemptNumber = 0): Promise<TData> => {
      try {
        setRetryState({
          retryCount: attemptNumber,
          isRetrying: attemptNumber > 0,
          nextRetryIn: null,
        });

        const result = await mutationFn(variables);
        
        // Success - reset retry state
        setRetryState({
          retryCount: 0,
          isRetrying: false,
          nextRetryIn: null,
        });

        return result;
      } catch (error) {
        const isLastAttempt = attemptNumber >= config.maxRetries;

        if (isLastAttempt) {
          // Exhausted all retries
          setRetryState({
            retryCount: attemptNumber,
            isRetrying: false,
            nextRetryIn: null,
          });

          if (options?.onRetryExhausted) {
            options.onRetryExhausted(error as TError);
          }

          toast.error('Operation failed after multiple attempts', {
            description: 'Please try again later or contact support if the issue persists.',
          });

          throw error;
        }

        // Calculate delay for next retry
        const delay = calculateDelay(attemptNumber);
        
        setRetryState({
          retryCount: attemptNumber + 1,
          isRetrying: true,
          nextRetryIn: delay,
        });

        toast.warning(`Operation failed, retrying in ${Math.round(delay / 1000)}s...`, {
          description: `Attempt ${attemptNumber + 1} of ${config.maxRetries}`,
        });

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Recursive retry
        return executeWithRetry(variables, attemptNumber + 1);
      }
    },
    [mutationFn, config, calculateDelay, options]
  );

  const mutation = useMutation<TData, TError, TVariables>({
    ...options,
    mutationFn: executeWithRetry,
  });

  return {
    ...mutation,
    retryState,
    isRetrying: retryState.isRetrying,
    retryCount: retryState.retryCount,
    nextRetryIn: retryState.nextRetryIn,
  };
}
