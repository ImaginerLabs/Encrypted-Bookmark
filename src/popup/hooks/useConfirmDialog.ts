import { useState, useCallback } from "react";

export interface ConfirmDialogState {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
}

const INITIAL_CONFIRM_DIALOG: ConfirmDialogState = {
  visible: false,
  title: "",
  message: "",
  onConfirm: async () => {},
};

export function useConfirmDialog() {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(
    INITIAL_CONFIRM_DIALOG,
  );

  const showConfirmDialog = useCallback(
    (title: string, message: string, onConfirm: () => Promise<void>) => {
      setConfirmDialog({
        visible: true,
        title,
        message,
        onConfirm,
      });
    },
    [],
  );

  const hideConfirmDialog = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    confirmDialog,
    showConfirmDialog,
    hideConfirmDialog,
  };
}