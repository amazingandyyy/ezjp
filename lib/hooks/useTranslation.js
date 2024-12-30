import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export function useTranslation() {
  const { profile } = useAuth();
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTranslations() {
      try {
        const language = profile?.ui_language || 'en';
        const translations = await import(`@/messages/${language}/common.json`);
        setTranslations(translations.default);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to English if translation fails
        const translations = await import('@/messages/en/common.json');
        setTranslations(translations.default);
      } finally {
        setIsLoading(false);
      }
    }

    loadTranslations();
  }, [profile?.ui_language]);

  const t = (key) => {
    if (isLoading) return '';
    
    // Handle nested keys like 'settings.theme.title'
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return key; // Return the key if translation not found
    }
    
    return value || key;
  };

  return { t, isLoading };
} 