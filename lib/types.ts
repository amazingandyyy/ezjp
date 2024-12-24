export type ReadingLevel = 'beginner' | 'intermediate' | 'advanced';
export type Theme = 'light' | 'dark' | 'yellow';
export type FontSize = 'medium' | 'large' | 'x-large' | 'xx-large';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  reading_level: ReadingLevel;
  preferred_voice: string | null;
  preferred_speed: number;
  show_furigana: boolean;
  font_size: FontSize;
  theme: Theme;
  created_at: string;
  updated_at: string;
} 