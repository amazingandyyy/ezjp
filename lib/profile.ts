import { supabase } from './supabase';
import type { UserProfile, ReadingLevel, Theme, FontSize } from './types';

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'email' | 'created_at' | 'updated_at'>>
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data;
}

export async function updateReadingPreferences(
  userId: string,
  preferences: {
    reading_level?: ReadingLevel;
    preferred_voice?: string;
    preferred_speed?: number;
    show_furigana?: boolean;
    font_size?: FontSize;
    theme?: Theme;
  }
): Promise<UserProfile | null> {
  return updateProfile(userId, preferences);
}

export async function updateUserInfo(
  userId: string,
  info: {
    full_name?: string;
    avatar_url?: string;
  }
): Promise<UserProfile | null> {
  return updateProfile(userId, info);
} 