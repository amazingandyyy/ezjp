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
      // Update manifest colors based on theme
      const updateManifestColors = () => {
        const isDark = document.documentElement.classList.contains('dark');
        const manifest = document.querySelector('link[rel="manifest"]');
        if (manifest) {
          const manifestData = {
            ...JSON.parse(manifest.getAttribute('data-manifest')),
            theme_color: isDark ? '#166534' : '#22c55e',
            background_color: isDark ? '#1f2937' : '#ffffff'
          };
          manifest.setAttribute('data-manifest', JSON.stringify(manifestData));
        }
      };

      // Initial theme setup
      updateManifestColors();

      // Watch for theme changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            updateManifestColors();
          }
        });
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });

      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            newWorker.addEventListener('statechange', () => {
              // Handle state changes
            });
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Handle controller changes
      });
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