'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// Create context for update state
export const UpdateContext = createContext({
  showUpdatePrompt: false,
  setShowUpdatePrompt: () => {},
  applyUpdate: () => {},
});

// Hook to use update context
export const useUpdate = () => useContext(UpdateContext);

export default function ServiceWorkerRegistration({ children }) {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        // Unregister service worker in development
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
          }
        });
      } else {
        // Register service worker and handle updates
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            setRegistration(reg);

            // Check for updates immediately
            reg.update();

            // Check for updates periodically
            const interval = setInterval(() => {
              reg.update();
            }, 1000 * 60 * 60); // Check every hour

            // Handle update found
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setShowUpdatePrompt(true);
                }
              });
            });

            // Listen for messages from the service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data.type === 'UPDATE_AVAILABLE') {
                setShowUpdatePrompt(true);
              }
            });

            return () => clearInterval(interval);
          })
          .catch((err) => {
            console.error('Service worker registration failed:', err);
          });
      }
    }
  }, []);

  const applyUpdate = () => {
    if (registration && registration.waiting) {
      // Send message to service worker to skip waiting
      registration.waiting.postMessage('skipWaiting');
      
      // Reload the page to activate the new service worker
      window.location.reload();
    }
  };

  return (
    <UpdateContext.Provider value={{ showUpdatePrompt, setShowUpdatePrompt, applyUpdate }}>
      {children}
      {showUpdatePrompt && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="mr-4">A new version is available!</p>
            <button
              onClick={applyUpdate}
              className="bg-white text-green-600 px-4 py-2 rounded hover:bg-green-50 transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      )}
    </UpdateContext.Provider>
  );
} 