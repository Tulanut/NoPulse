import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';

export function useNetworkStatus() {
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isServerReachable, setIsServerReachable] = useState<boolean>(true);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);

  const checkConnection = useCallback(async () => {
    if (simulatedOffline || !navigator.onLine) {
      setIsServerReachable(false);
      return;
    }
    const reachable = await ApiService.checkHealth();
    setIsServerReachable(reachable);
  }, [simulatedOffline]);

  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      checkConnection();
    };

    const handleOffline = () => {
      setIsBrowserOnline(false);
      setIsServerReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkConnection();

    // Check heartbeat every 10 seconds
    const interval = setInterval(checkConnection, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection]);

  const toggleSimulateOffline = () => {
    setSimulatedOffline((prev) => {
      const next = !prev;
      if (next) {
        setIsServerReachable(false);
      } else {
        setTimeout(checkConnection, 100);
      }
      return next;
    });
  };

  const isOnline = !simulatedOffline && isBrowserOnline && isServerReachable;

  return {
    isOnline,
    isBrowserOnline,
    isServerReachable,
    simulatedOffline,
    toggleSimulateOffline,
    checkConnection,
  };
}
