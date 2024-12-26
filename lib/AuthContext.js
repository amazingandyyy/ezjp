'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getProfile, updateProfile } from './profile';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Fetch or create user profile
  const fetchOrCreateProfile = async (userId) => {
    console.log('Fetching or creating profile for user:', userId);
    let userProfile = await getProfile(userId);
    
    // If profile doesn't exist, create it
    if (!userProfile) {
      console.log('No existing profile found, creating new profile');
      const { data: userData } = await supabase.auth.getUser();
      const { user } = userData;
      
      console.log('User data:', user);
      
      const newProfile = {
        id: userId,
        email: user.email,
        full_name: user.user_metadata?.name || user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        japanese_level: 'N5',
        preferred_voice: null,
        preferred_speed: 1.0,
        show_furigana: true,
        font_size: 'medium',
        theme: 'light'
      };

      console.log('Attempting to create profile with data:', newProfile);

      const { data: profile, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      console.log('Successfully created profile:', profile);
      userProfile = profile;
    } else {
      // Update existing profile with latest Google data if available
      const { data: userData } = await supabase.auth.getUser();
      const { user } = userData;
      
      if (user?.user_metadata) {
        const updates = {
          full_name: user.user_metadata.name || user.user_metadata.full_name || userProfile.full_name,
          avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || userProfile.avatar_url
        };
        
        // Only update if there are changes
        if (updates.full_name !== userProfile.full_name || updates.avatar_url !== userProfile.avatar_url) {
          console.log('Updating profile with latest Google data:', updates);
          const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
            
          if (!error) {
            userProfile = updatedProfile;
          }
        }
      }
      console.log('Found existing profile:', userProfile);
    }

    setProfile(userProfile);
    return userProfile;
  };

  // Handle auth state change
  const handleAuthChange = async (session) => {
    setLoading(true);
    try {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('Session available, fetching profile');
        await fetchOrCreateProfile(session.user.id);
      } else {
        console.log('No session, clearing profile');
        setProfile(null);
      }
    } catch (error) {
      console.error('Error handling auth change:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Initial session check
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (isMounted) {
          await handleAuthChange(session);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (isMounted && initialized) {
        await handleAuthChange(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initialized]);

  const signInWithGoogle = async () => {
    console.log('Initiating Google sign in...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('Signing out...');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Clear user preferences from localStorage
      localStorage.removeItem('easy_jp_news_preferences');
      console.log('Successfully signed out');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user) {
      console.log('Cannot update profile: no user logged in');
      return null;
    }
    console.log('Updating profile with:', updates);
    const updatedProfile = await updateProfile(user.id, updates);
    if (updatedProfile) {
      console.log('Profile updated successfully:', updatedProfile);
      setProfile(updatedProfile);
    } else {
      console.error('Failed to update profile');
    }
    return updatedProfile;
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signInWithGoogle,
      signOut,
      updateProfile: updateUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
}; 
