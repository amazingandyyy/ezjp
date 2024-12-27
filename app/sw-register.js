'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
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
        // Only register service worker in production
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.error('Service worker registration failed:', err);
        });
      }
    }
  }, []);

  return null;
} 