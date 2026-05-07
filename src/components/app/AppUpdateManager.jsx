import { useEffect, useRef } from 'react';

export default function AppUpdateManager() {
  const updatingRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let swRegistration = null;

    const checkForUpdates = () => {
      if (swRegistration) {
        swRegistration.update().catch((err) => {
          console.error("Failed to check for updates:", err);
        });
      }
    };

    const registerServiceWorker = async () => {
      try {
        swRegistration = await navigator.serviceWorker.register('/sw.js?v=2', {
          updateViaCache: 'none'
        });

        // If there's already a waiting worker, reload
        if (swRegistration.waiting) {
          if (!updatingRef.current) {
            updatingRef.current = true;
            window.location.reload();
          }
        }

        swRegistration.addEventListener('updatefound', () => {
          const installingWorker = swRegistration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (!updatingRef.current) {
                  updatingRef.current = true;
                  window.location.reload();
                }
              }
            };
          }
        });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    registerServiceWorker();

    const intervalId = setInterval(checkForUpdates, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', checkForUpdates);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', checkForUpdates);
    };
  }, []);

  return null;
}