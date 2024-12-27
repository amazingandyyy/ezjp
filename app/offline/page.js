'use client';
import { useEffect, useState } from 'react';
import { FaWifi } from 'react-icons/fa';

export default function Offline() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      // Get theme from HTML class
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');

      // Listen for theme changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const isDark = document.documentElement.classList.contains('dark');
            setTheme(isDark ? 'dark' : 'light');
          }
        });
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      return () => observer.disconnect();
    }
  }, []);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <FaWifi className={`w-16 h-16 ${
            theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
          }`} />
        </div>
        <h1 className="text-2xl font-bold mb-4">You're offline</h1>
        <p className={`mb-6 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Please check your internet connection and try again
        </p>
        <button
          onClick={() => window.location.reload()}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-green-500 hover:bg-green-400 text-white'
          }`}
        >
          Retry
        </button>
      </div>
    </div>
  );
} 