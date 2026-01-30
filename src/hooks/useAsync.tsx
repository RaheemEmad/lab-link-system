import { useCallback, useReducer, useState, useEffect, useRef } from 'react';
import { type AsyncState } from '@/types';

type AsyncAction<T> =
  | { type: 'PENDING' }
  | { type: 'SUCCESS'; payload: T }
  | { type: 'ERROR'; payload: string };

function asyncReducer<T>(state: AsyncState<T>, action: AsyncAction<T>): AsyncState<T> {
  switch (action.type) {
    case 'PENDING':
      return { status: 'pending' };
    case 'SUCCESS':
      return { status: 'success', data: action.payload };
    case 'ERROR':
      return { status: 'error', error: action.payload };
    default:
      return state;
  }
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true
) {
  const [state, dispatch] = useReducer(asyncReducer<T>, { status: 'idle' });

  const execute = useCallback(async () => {
    dispatch({ type: 'PENDING' });
    try {
      const result = await asyncFunction();
      dispatch({ type: 'SUCCESS', payload: result });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'ERROR', payload: message });
      throw error;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      void execute();
    }
  }, [immediate, execute]);

  return { state, execute };
}

export function useLocalStorage<T>(key: string, initialValue?: T) {
  const getStoredValue = useCallback(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (_error) {
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T | undefined>(() => getStoredValue());

  const setValue = useCallback(
    (value: T | undefined) => {
      try {
        setStoredValue(value);
        if (value === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (_error) {
        console.error(`Error setting localStorage key "${key}":`, _error);
      }
    },
    [key]
  );

  return [storedValue, setValue] as const;
}

export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return { value, toggle, setTrue, setFalse } as const;
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
