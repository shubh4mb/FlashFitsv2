import React, { createContext, useContext, useState, useCallback } from 'react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title?: string;
  message: string;
  buttons?: AlertButton[];
  type?: AlertType;
}

interface ToastOptions {
  message: string;
  type?: AlertType;
  duration?: number;
}

interface AlertContextData {
  showAlert: (options: AlertOptions) => void;
  showToast: (options: ToastOptions) => void;
  hideAlert: () => void;
  hideToast: () => void;
  alertState: {
    visible: boolean;
    options: AlertOptions | null;
  };
  toastState: {
    visible: boolean;
    options: ToastOptions | null;
  };
}

const AlertContext = createContext<AlertContextData>({} as AlertContextData);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<{ visible: boolean; options: AlertOptions | null }>({
    visible: false,
    options: null,
  });

  const [toastState, setToastState] = useState<{ visible: boolean; options: ToastOptions | null }>({
    visible: false,
    options: null,
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({ visible: true, options });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    setToastState({ visible: true, options });
  }, []);

  const hideToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showToast,
        hideAlert,
        hideToast,
        alertState,
        toastState,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context.showAlert;
};

export const useToast = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useToast must be used within an AlertProvider');
  }
  return context.showToast;
};

export const useAlertInternal = () => {
  return useContext(AlertContext);
};
