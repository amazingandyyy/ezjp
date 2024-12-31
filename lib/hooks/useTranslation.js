import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export function useTranslation(namespace = 'common') {
  const { profile } = useAuth();
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTranslations() {
      try {
        const language = profile?.ui_language || 'en';
        console.log('Loading translations for language:', language, 'namespace:', namespace);
        console.log('Current profile:', profile);
        const translations = await import(`@/messages/${language}/${namespace}.json`);
        console.log('Loaded translations:', translations.default);
        setTranslations(translations.default);
      } catch (error) {
        console.error(`Failed to load translations for ${namespace}:`, error);
        console.error('Error details:', error.message);
        // Fallback to English if translation fails
        try {
          console.log('Falling back to English translations');
          const translations = await import(`@/messages/en/${namespace}.json`);
          console.log('Loaded fallback translations:', translations.default);
          setTranslations(translations.default);
        } catch (fallbackError) {
          console.error('Failed to load fallback translations:', fallbackError);
          console.error('Fallback error details:', fallbackError.message);
          setTranslations({});
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadTranslations();
  }, [profile?.ui_language, namespace]);

  const t = (key, params = {}) => {
    if (isLoading) {
      console.log('Translations still loading, returning key:', key);
      return key;
    }
    
    // Handle nested keys like 'settings.theme.title'
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.log(`Translation not found for key: ${key}, current path: ${keys.slice(0, keys.indexOf(k) + 1).join('.')}`);
        return key;
      }
    }
    
    // If the value is not a string, return the key
    if (typeof value !== 'string') {
      console.log(`Translation value is not a string for key: ${key}, value type: ${typeof value}, value:`, value);
      return key;
    }
    
    // Replace parameters in the string
    return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  };

  return { t, isLoading };
} 