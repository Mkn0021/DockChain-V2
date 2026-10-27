"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

import { ALERT_STYLES, BASE_STYLES } from "@/data/provider.data";

export type AlertType = "success" | "error" | "info";

interface Alert {
  id: string;
  type: AlertType;
  message: string;
}

interface AlertContextProps {
  showAlert: (message: string, type?: AlertType) => void;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return context;
};

const AlertItem: React.FC<{
  alert: Alert;
  onDismiss: (id: string) => void;
}> = ({ alert, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeout(() => onDismiss(alert.id), 300);
  }, [alert.id, onDismiss]);

  useEffect(() => {
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, 5000);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - 2));
    }, 100);

    return () => {
      clearTimeout(enterTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [handleDismiss]);

  const styles = ALERT_STYLES[alert.type];

  const containerClasses = `
    ${BASE_STYLES.container}
    ${styles.container}
    ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
  `;

  return (
    <div className={containerClasses} role="alert" aria-live="polite">
      <styles.iconComponent className={`${BASE_STYLES.icon} ${styles.icon}`} />
      <span className="whitespace-pre-line leading-tight flex-1 text-text-primary">
        {alert.message}
      </span>
      <button
        onClick={handleDismiss}
        className="ml-2 text-2xl font-semibold opacity-60 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current rounded transition-opacity flex-shrink-0"
        aria-label="Dismiss alert"
      >
        ×
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
        <div
          className={`h-full ${styles.progressBg} transition-all duration-100`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const showAlert = useCallback((message: string, type: AlertType = "info") => {
    const id = Date.now().toString();
    const newAlert: Alert = { id, message, type };
    setAlerts((prev) => [...prev, newAlert]);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const contextValue: AlertContextProps = {
    showAlert,
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-8 right-4 z-50 space-y-3 pointer-events-none">
        {alerts.map((alert) => (
          <div key={alert.id} className="pointer-events-auto">
            <AlertItem alert={alert} onDismiss={dismissAlert} />
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
};
