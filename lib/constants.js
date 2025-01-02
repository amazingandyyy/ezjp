// Add constants at the top
export const DEFAULT_READER_PREFERENCES = {
  theme: "dark",
  font_size: "large", // second size
  show_furigana: true,
  preferred_speed: 1.0,
  preferred_voice: "ja-JP-Standard-D",
  reading_level: "beginner",
};

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  ja: '日本語 (Japanese)',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  de: 'Deutsch (German)',
  it: 'Italiano (Italian)',
  ko: '한국어 (Korean)',
  'zh-TW': '繁體中文 (Traditional Chinese)',
  vi: 'Tiếng Việt (Vietnamese)'
};

export const DEFAULT_LANGUAGE = 'en';

export const JLPT_LEVELS = {
  n5: 'N5 (Beginner)',
  n4: 'N4 (Basic)',
  n3: 'N3 (Intermediate)',
  n2: 'N2 (Advanced)',
  n1: 'N1 (Expert)'
};

// Premium feature usage limits
export const PREMIUM_LIMITS = {
  AI_TUTOR: {
    FREE: 10,           // Free users get 10 sessions per month
    PREMIUM: 1000       // Premium users get 1000 sessions per month
  },
  TTS: {
    FREE: 1000,         // Free users get 1K characters per month
    PREMIUM: 100000     // Premium users get 100K characters per month
  }
};
