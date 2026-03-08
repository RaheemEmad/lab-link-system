import { useCallback, useReducer } from "react";

type DialogType = "status" | "history" | "notes" | "chat" | "bulkStatus" | "delete";

interface DialogState<T> {
  type: DialogType | null;
  data: T | null;
}

type DialogAction<T> =
  | { type: "OPEN"; dialog: DialogType; data: T }
  | { type: "OPEN_SIMPLE"; dialog: DialogType }
  | { type: "CLOSE" };

function dialogReducer<T>(state: DialogState<T>, action: DialogAction<T>): DialogState<T> {
  switch (action.type) {
    case "OPEN":
      return { type: action.dialog, data: action.data };
    case "OPEN_SIMPLE":
      return { type: action.dialog, data: null };
    case "CLOSE":
      return { type: null, data: null };
    default:
      return state;
  }
}

export function useDialogState<T>() {
  const [state, dispatch] = useReducer(dialogReducer<T>, { type: null, data: null });

  const open = useCallback((dialog: DialogType, data: T) => {
    dispatch({ type: "OPEN", dialog, data });
  }, []);

  const openSimple = useCallback((dialog: DialogType) => {
    dispatch({ type: "OPEN_SIMPLE", dialog });
  }, []);

  const close = useCallback(() => {
    dispatch({ type: "CLOSE" });
  }, []);

  const isOpen = useCallback(
    (dialog: DialogType) => state.type === dialog,
    [state.type]
  );

  return { state, open, openSimple, close, isOpen };
}
