import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export function usePremium() {
  const router = useRouter();
  const { profile, user, signInWithGoogle } = useAuth();
  const isPremium = profile?.role_level >= 1;

  const startCheckout = useCallback(async (billingInterval) => {
    try {
      if (!user) {
        await signInWithGoogle();
        return;
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billingInterval }),
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          await signInWithGoogle();
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Error creating checkout session');
      }

      const { url, error } = await response.json();
      if (error) throw new Error(error);
      
      router.push(url);
    } catch (error) {
      console.error('Error starting checkout:', error);
      throw error;
    }
  }, [router, user, signInWithGoogle]);

  return {
    isPremium,
    startCheckout,
  };
} 