'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getProfile, updateProfile } from './profile';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        reading_level: 'beginner',
        preferred_voice: null,
        preferred_speed: 1.0,
        show_furigana: true,
        font_size: 'large',
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
      console.log('Found existing profile:', userProfile);
    }

    setProfile(userProfile);
    return userProfile;
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      console.log('Checking session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error.message);
      }
      
      console.log('Session state:', session ? 'Active session' : 'No session');
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('Session found, fetching profile');
        await fetchOrCreateProfile(session.user.id);
      }
      setLoading(false);
    };

    getSession();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('New session detected, fetching profile');
        await fetchOrCreateProfile(session.user.id);
      } else {
        console.log('No session, clearing profile');
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
    console.log('Successfully signed out');
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