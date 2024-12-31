import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export function usePremium() {
  const router = useRouter();
  const { profile } = useAuth();
  const isPremium = profile?.role_level >= 1;

  const startCheckout = useCallback(async (billingInterval) => {
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billingInterval }),
      });

      const { url, error } = await response.json();
      if (error) throw new Error(error);
      
      router.push(url);
    } catch (error) {
      console.error('Error starting checkout:', error);
    }
  }, [router]);

  return {
    isPremium,
    startCheckout,
  };
} 