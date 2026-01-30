import { useCallback, useReducer } from 'react';

interface FormFieldError {
  [key: string]: string;
}

interface FormState<T> {
  values: T;
  errors: FormFieldError;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isDirty: boolean;
}

type FormAction<T> =
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'CLEAR_ERROR'; field: string }
  | { type: 'SET_TOUCHED'; field: string }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'RESET'; values: T }
  | { type: 'SET_VALUES'; values: Partial<T> };

function formReducer<T extends Record<string, any>>(
  state: FormState<T>,
  action: FormAction<T>
): FormState<T> {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        isDirty: true,
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: '' },
      };

    case 'SET_TOUCHED':
      return {
        ...state,
        touched: { ...state.touched, [action.field]: true },
      };

    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.isSubmitting,
      };

    case 'RESET':
      return {
        values: action.values,
        errors: {},
        touched: {},
        isSubmitting: false,
        isDirty: false,
      };

    case 'SET_VALUES':
      return {
        ...state,
        values: { ...state.values, ...action.values },
        isDirty: true,
      };

    default:
      return state;
  }
}

export function useFormState<T extends Record<string, any>>(initialValues: T) {
  const [state, dispatch] = useReducer(formReducer<T>, {
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isDirty: false,
  });

  const setFieldValue = useCallback((field: string, value: any) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const setFieldError = useCallback((field: string, error: string) => {
    dispatch({ type: 'SET_ERROR', field, error });
  }, []);

  const clearFieldError = useCallback((field: string) => {
    dispatch({ type: 'CLEAR_ERROR', field });
  }, []);

  const setFieldTouched = useCallback((field: string) => {
    dispatch({ type: 'SET_TOUCHED', field });
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', isSubmitting });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET', values: initialValues });
  }, [initialValues]);

  const setValues = useCallback((values: Partial<T>) => {
    dispatch({ type: 'SET_VALUES', values });
  }, []);

  const getFieldProps = useCallback(
    (field: string) => ({
      value: state.values[field] ?? '',
      onChange: (e: any) => {
        const value = e.target?.value ?? e;
        setFieldValue(field, value);
      },
      onBlur: () => setFieldTouched(field),
    }),
    [state.values, setFieldValue, setFieldTouched]
  );

  const getFieldError = useCallback(
    (field: string) => (state.touched[field] ? state.errors[field] : ''),
    [state.touched, state.errors]
  );

  return {
    ...state,
    setFieldValue,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    setSubmitting,
    reset,
    setValues,
    getFieldProps,
    getFieldError,
  };
}
