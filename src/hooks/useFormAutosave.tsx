import { useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface AutosaveOptions {
  storageKey: string;
  debounceMs?: number;
  onRecover?: (data: any) => void;
  enabled?: boolean;
}

interface AutosaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasRecoveredData: boolean;
}

/**
 * Hook for automatic form data saving and recovery
 * Saves form data to localStorage and recovers it on component mount
 * 
 * @example
 * const { saveData, clearSavedData, autosaveState } = useFormAutosave({
 *   storageKey: 'new-order-form',
 *   debounceMs: 1000,
 *   onRecover: (data) => form.reset(data)
 * });
 * 
 * // Save data on form change
 * useEffect(() => {
 *   const values = form.getValues();
 *   saveData(values);
 * }, [formData]);
 * 
 * // Clear on successful submission
 * const onSubmit = async (data) => {
 *   await submitForm(data);
 *   clearSavedData();
 * };
 */
export function useFormAutosave({
  storageKey,
  debounceMs = 1000,
  onRecover,
  enabled = true,
}: AutosaveOptions) {
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({
    isSaving: false,
    lastSaved: null,
    hasRecoveredData: false,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const hasRecoveredRef = useRef(false);

  // Recover saved data on mount
  useEffect(() => {
    if (!enabled || hasRecoveredRef.current) return;

    try {
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const savedAt = new Date(parsed.timestamp);
        
        // Show recovery notification
        toast({
          title: "📝 Draft Recovered",
          description: `Form data from ${savedAt.toLocaleString()} has been restored.`,
          duration: 5000,
        });

        // Call recovery callback
        if (onRecover && parsed.data) {
          onRecover(parsed.data);
        }

        setAutosaveState(prev => ({
          ...prev,
          hasRecoveredData: true,
          lastSaved: savedAt,
        }));

        hasRecoveredRef.current = true;
      }
    } catch (error) {
      console.error('Failed to recover autosaved data:', error);
    }
  }, [storageKey, onRecover, enabled]);

  // Save data with debouncing
  const saveData = (data: any) => {
    if (!enabled) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setAutosaveState(prev => ({ ...prev, isSaving: true }));

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      try {
        const savePayload = {
          data,
          timestamp: new Date().toISOString(),
        };

        localStorage.setItem(storageKey, JSON.stringify(savePayload));
        
        setAutosaveState({
          isSaving: false,
          lastSaved: new Date(),
          hasRecoveredData: autosaveState.hasRecoveredData,
        });
      } catch (error) {
        console.error('Failed to autosave data:', error);
        setAutosaveState(prev => ({ ...prev, isSaving: false }));
      }
    }, debounceMs);
  };

  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey);
      setAutosaveState({
        isSaving: false,
        lastSaved: null,
        hasRecoveredData: false,
      });
      hasRecoveredRef.current = false;
    } catch (error) {
      console.error('Failed to clear autosaved data:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    saveData,
    clearSavedData,
    autosaveState,
  };
}
