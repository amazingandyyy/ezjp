'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { 
  FaPlay, 
  FaPause, 
  FaStop, 
  FaCog,
  FaArrowLeft,
  FaArrowRight,
  FaSun,
  FaMoon,
  FaBook,
  FaHeart,
  FaRegHeart,
  FaExternalLinkAlt
} from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';

// Add import for Navbar
import Navbar from '../components/Navbar';

// Add this helper function at the top level
const isBrowser = typeof window !== 'undefined';

// Add LoadingIndicator component before NewsReaderContent
const LoadingIndicator = ({ loading, theme }) => {
  if (!loading) return null;
  
  const spinnerColors = {
    dark: 'border-gray-300 border-r-transparent',
    light: 'border-gray-400 border-r-transparent'
  };

  const textColors = {
    dark: 'text-gray-500',
    light: 'text-gray-500'
  };
  
  return (
    <div className="inline-flex items-center gap-2 ml-2">
      <div className="w-4 h-4 relative">
        <div className={`absolute inset-0 rounded-full border-2 animate-spin ${spinnerColors[theme]}`}></div>
      </div>
      <span className={`text-xs ${textColors[theme]}`}>Updating preference...</span>
    </div>
  );
};

// Add RubyText component
const RubyText = ({ part, preferenceState }) => {
  if (!part || part.type !== 'ruby' || !part.kanji || !part.reading) {
    return null;
  }
  return (
    <ruby className="group">
      {part.kanji}
      <rt className={`${preferenceState.show_furigana ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        {part.reading}
      </rt>
    </ruby>
  );
};

// Add helper function to process content
const processContent = (content) => {
  if (!Array.isArray(content)) return [];
  return content.map((part, index) => {
    if (part?.type === 'ruby') {
      return {
        type: 'ruby',
        kanji: part.kanji,
        reading: part.reading
      };
    } else if (part?.type === 'text') {
      return {
        type: 'text',
        content: part.content
      };
    }
    return null;
  }).filter(Boolean);
};

// Add helper function to render content
const renderContent = (content) => {
  if (!Array.isArray(content)) return null;
  return content.map((paragraph, pIndex) => {
    if (paragraph.type !== 'paragraph') return null;
    return (
      <p
        key={pIndex}
        className="mb-6"
      >
        {paragraph.content.map((part, index) => {
          if (part.type === 'ruby') {
            return <RubyText key={index} part={part} preferenceState={preferenceState} />;
          } else if (part.type === 'text') {
            return <span key={index}>{part.content}</span>;
          }
          return null;
        })}
      </p>
    );
  });
};

// Add custom RepeatIcon component
const RepeatIcon = ({ className, isActive, theme }) => (
  <div className="relative">
    <svg 
      role="img" 
      viewBox="-1 -1 18 18" 
      className={className}
      stroke={isActive ? "rgb(168 85 247)" : "currentColor"}
      fill={isActive ? "rgb(168 85 247)" : "currentColor"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="0.1"
    >
      <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"></path>
    </svg>
    {isActive && (
      <>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2">
          <div className={`bg-purple-500 rounded w-2.5 h-2.5 flex items-center justify-center ring-[0.3px] ${theme === 'dark' ? 'ring-gray-700' : 'ring-white'}`}>
            <span className="text-[6px] font-bold text-white leading-none">1</span>
          </div>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-500"></div>
      </>
    )}
  </div>
);

// Add this helper function at the top level
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();

    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Calculate remainders
    const remainingHours = Math.abs(diffInHours % 24);
    const remainingMinutes = Math.abs(diffInMinutes % 60);

    if (diffInDays >= 7) {
      return `${Math.floor(diffInDays / 7)}週間前`;
    } else if (diffInDays > 0) {
      return `${diffInDays}日${remainingHours}時間前`;
    } else if (remainingHours > 0) {
      return `${remainingHours}時間${remainingMinutes}分前`;
    } else if (remainingMinutes > 0) {
      return `${remainingMinutes}分前`;
    } else if (diffInSeconds > 0) {
      return '1分前';
    } else {
      return 'たった今';
    }
  } catch (e) {
    console.error('Error formatting relative time:', e, dateStr);
    return '';
  }
};

// Add this helper function at the top level
const formatJapaneseDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const jpTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}時${String(date.getMinutes()).padStart(2, '0')}分`;
    const relativeTime = formatRelativeTime(dateStr);
    return relativeTime ? `${jpTime}（${relativeTime}）` : jpTime;
  } catch (e) {
    return dateStr;
  }
};

// Add SavedNewsList component before NewsReaderContent
const SavedNewsList = ({ news, theme, sourceUrl, onNewsClick }) => {
  const parseTitle = (title) => {
    try {
      if (Array.isArray(title)) {
        return title.map(part => part.type === 'ruby' ? part.kanji : part.content).join('');
      }
      return title;
    } catch (e) {
      return title;
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      return formatJapaneseDate(date);
    } catch (e) {
      return dateStr;
    }
  };

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <FaHeart className={`w-6 h-6 mb-2 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`} />
        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
          No saved articles yet
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {news.map((article, index) => (
        <button
          key={index}
          onClick={() => onNewsClick(article.url)}
          className={`w-full text-left p-3 rounded-lg transition-colors flex gap-3
            ${
              theme === "dark"
                ? article.url === sourceUrl
                  ? "bg-gray-800"
                  : "hover:bg-gray-800/70"
                : article.url === sourceUrl
                ? "bg-gray-100"
                : "hover:bg-gray-50"
            }`}
        >
          <div className="flex-shrink-0">
            {article.article?.images?.[0] && (
              <div className="w-20 h-20 relative rounded-md overflow-hidden">
                <img
                  src={article.article.images[0]}
                  alt=""
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={`font-medium mb-1 line-clamp-2 ${
                theme === "dark" ? "text-gray-200" : "text-[rgb(19,31,36)]"
              }`}
            >
              {parseTitle(article.article?.title)}
            </h3>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {formatDate(article.article?.publish_date)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

// Add constants at the top
const DEFAULT_PREFERENCES = {
  theme: 'light',
  font_size: 'medium',
  show_furigana: false,
  preferred_speed: 1.0,
  preferred_voice: null,
  reading_level: 'beginner'
};

// Add after the LoadingIndicator component
const MotivationalMessage = ({ show, theme }) => {
  const messages = [
    // Achievement messages
    { ja: '🎉 よくできました！', en: 'Well done!' },
    { ja: '⭐️ 素晴らしい！', en: 'Excellent!' },
    { ja: '💪 頑張りましたね！', en: 'Great effort!' },
    { ja: '🌟 継続は力なり', en: 'Consistency is power' },
    { ja: '🚀 一歩一歩前進', en: 'Step by step' },
    { ja: '🌱 日々の努力が実を結ぶ', en: 'Daily efforts bear fruit' },
    // Encouraging messages
    { ja: '✨ すごい進歩です！', en: 'Amazing progress!' },
    { ja: '🎯 目標達成！', en: 'Goal achieved!' },
    { ja: '🌈 その調子！', en: "That's the spirit!" },
    { ja: '💫 輝かしい成果！', en: 'Brilliant result!' },
    // Learning journey messages
    { ja: '📚 知識は力なり', en: 'Knowledge is power' },
    { ja: '🎓 学びは冒険だ', en: 'Learning is an adventure' },
    { ja: '🌅 新しい朝が来た', en: 'A new dawn awaits' },
    { ja: '🔥 情熱を持ち続けて', en: 'Keep the passion alive' },
    // Milestone messages
    { ja: '🏆 また一つ達成！', en: 'Another milestone reached!' },
    { ja: '⚡️ 止まらない成長', en: 'Unstoppable growth' },
    { ja: '🎨 上手くなってきた', en: "You're getting better!" },
    { ja: '🌊 波に乗ってる！', en: "You're on a roll!" },
    // Wisdom messages
    { ja: '🍀 努力は裏切らない', en: 'Hard work pays off' },
    { ja: '🌸 千里の道も一歩から', en: 'Every journey begins with a step' },
    { ja: '🎋 夢は叶うもの', en: 'Dreams do come true' },
    { ja: '🎭 日本語の世界へようこそ', en: 'Welcome to the world of Japanese' },
    // Fun messages
    { ja: '🌈 やったね！', en: 'You did it!' },
    { ja: '🎪 素晴らしいショー！', en: 'What a performance!' },
    { ja: '🎮 レベルアップ！', en: 'Level up!' },
    { ja: '🎵 リズムに乗ってる', en: "You're in the groove!" }
  ];

  const [message] = useState(() => messages[Math.floor(Math.random() * messages.length)]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className={`
        relative
        animate-[bounceIn_3s_cubic-bezier(0.68,-0.55,0.265,1.55)]
        px-16 py-10 rounded-3xl
        transform rotate-2
        ${theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-800/95 to-gray-900/95 shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-2 border-gray-700/50' 
          : 'bg-gradient-to-br from-white/95 to-gray-50/95 shadow-[0_8px_32px_rgba(0,0,0,0.15)] border-2 border-gray-200/50'
        }
      `}>
        {/* Decorative elements with longer animations */}
        <div className="absolute -top-3 -left-3 w-6 h-6 bg-yellow-400 rounded-full animate-[spin_4s_linear_infinite]" />
        <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-purple-400 rounded-full animate-[spin_4s_linear_infinite_reverse]" />
        <div className="absolute top-1/2 -left-3 w-4 h-4 bg-green-400 rounded-full animate-[bounce_3s_infinite]" />
        <div className="absolute top-1/2 -right-3 w-4 h-4 bg-blue-400 rounded-full animate-[bounce_3s_infinite_0.5s]" />
        
        <div className="relative">
          <div className={`
            text-6xl font-bold mb-6 text-center
            animate-[rubberBand_3s_ease-in-out]
            ${theme === 'dark' ? 'text-white' : 'text-gray-800'}
          `}>
            {message.ja}
          </div>
          <div className={`
            text-2xl font-medium text-center
            animate-[fadeInUp_2s_ease-out_0.5s_both]
            ${theme === 'dark' ? 'text-purple-300' : 'text-purple-500'}
          `}>
            {message.en}
          </div>
        </div>
      </div>
    </div>
  );
};

// Update the ConfirmationModal component
const ConfirmationModal = ({ show, onConfirm, onCancel, theme }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className={`
        relative w-[90%] max-w-md p-6 rounded-2xl shadow-xl
        animate-[bounceIn_0.5s_cubic-bezier(0.68,-0.55,0.265,1.55)]
        ${theme === 'dark' 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
      `}>
        <div className={`text-xl font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          Wait! Are you sure? 🤔
        </div>
        
        <div className={`mb-6 space-y-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          <p className="text-sm">
            If you just want to see the celebration animation again:
          </p>
          <div className="pl-4 space-y-2">
            <p className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Read another article to see it again! 🎉
            </p>
            <p className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Keep your progress tracked 📈
            </p>
            <p className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Build your reading streak 🔥
            </p>
          </div>
          
          <div className="mt-4">
            <p className="text-sm font-medium">
              Unfinishing this article will:
            </p>
            <div className="pl-4 mt-2 space-y-2">
              <p className="flex items-center gap-2">
                <span className="text-red-500">•</span>
                Remove it from your finished articles
              </p>
              <p className="flex items-center gap-2">
                <span className="text-red-500">•</span>
                Reset your progress for this article
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className={`
              px-4 py-2 rounded-lg font-medium
              ${theme === 'dark' 
                ? 'bg-green-600 text-white hover:bg-green-500' 
                : 'bg-green-500 text-white hover:bg-green-400'
              }
            `}
          >
            Keep it! 🌟
          </button>
          <button
            onClick={onConfirm}
            className={`
              px-4 py-2 rounded-lg font-medium
              ${theme === 'dark'
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
              }
            `}
          >
            Unfinish Article
          </button>
        </div>
      </div>
    </div>
  );
};

function NewsReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sourceUrl = searchParams.get('source');
  const { user, loading: authLoading, signInWithGoogle, signOut, profile, updateProfile } = useAuth();

  const [url, setUrl] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [preferenceState, setPreferenceState] = useState(DEFAULT_PREFERENCES);
  const [updatingPreferences, setUpdatingPreferences] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarView, setSidebarView] = useState('latest');
  const [recentNews, setRecentNews] = useState([]);
  const [savedNews, setSavedNews] = useState([]);
  const [recentNewsError, setRecentNewsError] = useState(false);
  const [archivedUrls, setArchivedUrls] = useState(new Set());
  const [finishedUrls, setFinishedUrls] = useState(new Set());
  const [isArchived, setIsArchived] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finishLoading, setFinishLoading] = useState(false);
  const [hasRecordedArticle, setHasRecordedArticle] = useState(false);
  const [readingStartTime, setReadingStartTime] = useState(null);

  // Audio-related states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [repeatCountdown, setRepeatCountdown] = useState(0);
  const repeatModeRef = useRef(false);
  const [audioCache, setAudioCache] = useState({});
  const [audioElement, setAudioElement] = useState(null);

  // Content-related states
  const [newsTitle, setNewsTitle] = useState([]);
  const [newsContent, setNewsContent] = useState([]);
  const [newsDate, setNewsDate] = useState(null);
  const [newsImages, setNewsImages] = useState([]);
  const [currentSentence, setCurrentSentence] = useState(-1);
  const [sentences, setSentences] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showMotivation, setShowMotivation] = useState(false);
  const [showConfirmUnfinish, setShowConfirmUnfinish] = useState(false);  // Add this line

  // Refs
  const sidebarRef = useRef(null);
  const settingsRef = useRef(null);
  const profileRef = useRef(null);

  // Add this state near other state declarations
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Media query hook
  const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        const media = window.matchMedia(query);
        setMatches(media.matches);

        const listener = (e) => setMatches(e.matches);
        media.addEventListener('change', listener);

        return () => media.removeEventListener('change', listener);
      }
    }, [query]);

    return matches;
  };

  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const isExtraLargeScreen = useMediaQuery('(min-width: 1300px)');

  // Layout classes
  const sidebarClasses = `
    fixed top-0 h-screen transform transition-all duration-300 ease-in-out z-50
    ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
    ${isLargeScreen ? 'lg:fixed lg:top-0' : ''}
    ${preferenceState.theme === 'dark' ? 'bg-[rgb(19,31,36)]' : 'bg-white'} 
    border-r ${preferenceState.theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
    overflow-y-auto
    w-[400px]
  `;

  const mainContentClasses = `
    transition-all duration-300 ease-in-out transform
    ${showSidebar && isLargeScreen 
      ? 'lg:translate-x-[200px]' 
      : 'translate-x-0'
    }
    max-w-3xl mx-auto
    pt-8 p-4 pb-32
  `;

  const mainWrapperClasses = `
    min-h-screen relative pt-6
  `;

  const overlayClasses = `
    fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300
    ${!isLargeScreen && showSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'}
  `;

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      // Try to load from localStorage first

      if (!user) {
        return;
      }

      try {
        console.log('Loading user preferences from database...');
        const { data: preferences, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading preferences:', error);
          return;
        }

        console.log('Loaded preferences:', preferences);

        if (preferences) {
          // Ensure preferred_speed is a valid number
          let preferred_speed = 1.0; // Default value
          if (typeof preferences.preferred_speed === 'number' && !isNaN(preferences.preferred_speed)) {
            preferred_speed = preferences.preferred_speed;
          } else if (typeof preferences.preferred_speed === 'string') {
            const parsed = parseFloat(preferences.preferred_speed);
            if (!isNaN(parsed)) {
              preferred_speed = parsed;
            }
          }

          const newPrefs = {
            theme: preferences.theme || DEFAULT_PREFERENCES.theme,
            font_size: preferences.font_size || DEFAULT_PREFERENCES.font_size,
            show_furigana: preferences.show_furigana ?? DEFAULT_PREFERENCES.show_furigana,
            preferred_speed: preferred_speed,
            preferred_voice: preferences.preferred_voice || DEFAULT_PREFERENCES.preferred_voice,
            reading_level: preferences.reading_level || DEFAULT_PREFERENCES.reading_level
          };

          setPreferenceState(newPrefs);

          if (preferences.preferred_voice && availableVoices.length > 0) {
            const savedVoice = availableVoices.find(v => v.voiceURI === preferences.preferred_voice);
            if (savedVoice) {
              setSelectedVoice(savedVoice);
            }
          }
        }
      } catch (error) {
        console.error('Error in loadPreferences:', error);
      }
    };

    loadPreferences();
  }, [user, availableVoices]);

  // Update document theme when preference changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark', 'yellow');
      document.documentElement.classList.add(preferenceState.theme);
    }
  }, [preferenceState.theme]);

  // Save user preferences
  const savePreferences = async (key, value) => {
    // Update local state first
    setPreferenceState(prev => {
      const newPrefs = { ...prev, [key]: value };
      return newPrefs;
    });

    if (!user) return;

    try {
      setUpdatingPreferences(prev => ({ ...prev, [key]: true }));
      console.log('Saving preference to database:', key, value);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          [key]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Preference saved:', data);
    } catch (error) {
      console.error(`Error saving ${key} preference:`, error);
      throw error;
    } finally {
      setUpdatingPreferences(prev => ({ ...prev, [key]: false }));
    }
  };

  // Theme toggle handler
  const toggleTheme = () => {
    const newTheme = preferenceState.theme === 'light' ? 'dark' : 'light';
    setPreferenceState(prev => ({ ...prev, theme: newTheme }));
    savePreferences('theme', newTheme);
  };

  useEffect(() => {
    if (sourceUrl) {
      // Stop any playing audio before fetching new article
      if (isPlaying) {
        speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
      }
      // Reset states before fetching new article
      setNewsTitle([]);
      setNewsContent([]);
      setNewsDate(null);
      setNewsImages([]);
      setCurrentSentence(0);
      setSentences([]);
      setError(null);
      
      // Decode the URL before using it
      const decodedUrl = decodeURIComponent(sourceUrl);
      setLoading(true);
      fetchNews(decodedUrl);
      setUrl(decodedUrl);
    } else {
      router.push('/');
    }
  }, [sourceUrl]);  // Remove router from dependencies to prevent double fetches

  // Fetch news content
  const fetchNews = async (url) => {
    if (!url) return;
    
    try {
      console.log('Fetching article from API');
      const response = await fetch(`/api/fetch-news?source=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        setError('This article had an issue loading. Please try another one.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.message || 'This article had an issue loading. Please try another one.');
        setLoading(false);
        return;
      }

      // Process the successful response
      setNewsTitle(data.title);
      setNewsContent(data.content);
      setNewsDate(data.published_date || data.date);
      setNewsImages(data.images || []);
      setCurrentSentence(0);
      setSentences(splitIntoSentences(data.content));
      setLoading(false);  // Add this line to set loading to false after successful fetch
      
    } catch (error) {
      console.error('Error fetching news:', error);
      setError('This article had an issue loading. Please try another one.');
      setLoading(false);
    }
  };

  const isValidUrl = (urlString) => {
    try {
      const url = new URL(urlString);
      return url.hostname.includes('nhk.or.jp');
    } catch {
      return false;
    }
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (!isValidUrl(url)) {
      setAudioError('Please enter a valid NHK news URL');
      return;
    }
    fetchNews(url);
  };

  const sentenceToText = (sentence) => {
    // Filter out hiragana readings that follow kanji
    return sentence.map((part, index) => {
      if (part.type === 'ruby') {
        // Get the next part
        const nextPart = sentence[index + 1];
        
        // If next part is the hiragana reading of this kanji, skip it
        if (nextPart?.type === 'text' && nextPart.content === part.reading) {
          nextPart.skip = true; // Mark for skipping
        }
        return part.kanji;
      }
      
      if (part.type === 'text' && !part.skip) {
        return part.content;
      }
      
      return '';
    }).join('');
  };

  // Initialize voices
  useEffect(() => {
    if (!isBrowser) return;

    function loadVoices() {
      const voices = speechSynthesis.getVoices();
      const japaneseVoices = voices.filter(voice => voice.lang.includes('ja-JP'));
      setAvailableVoices(japaneseVoices);
      
      // Only set default voice if no voice is currently selected
      if (!selectedVoice && japaneseVoices.length > 0) {
        // Try to find Microsoft Keita first
        const keitaVoice = japaneseVoices.find(voice => 
          voice.name.toLowerCase().includes('microsoft keita') || 
          voice.name.toLowerCase().includes('microsoft けいた')
        );
        
        // Set default voice (Keita if available, otherwise first Japanese voice)
        setSelectedVoice(keitaVoice || japaneseVoices[0]);
      }
    }

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []); // Remove selectedVoice from dependencies

  // Helper function to get Japanese voice
  const getJapaneseVoice = async () => {
    if (selectedVoice) return selectedVoice;
    
    // Wait for voices to be loaded
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
      await new Promise(resolve => {
        speechSynthesis.onvoiceschanged = () => {
          resolve();
        };
      });
    }
    
    const japaneseVoices = speechSynthesis.getVoices().filter(voice => 
      voice.lang.includes('ja-JP')
    );
    
    if (japaneseVoices.length === 0) {
      throw new Error('No Japanese voices found');
    }
    
    // Try to find Microsoft Keita first
    const keitaVoice = japaneseVoices.find(voice => 
      voice.name.toLowerCase().includes('microsoft keita') || 
      voice.name.toLowerCase().includes('microsoft けいた')
    );
    
    return keitaVoice || japaneseVoices[0];
  };

  // Update the playCurrentSentence function
  const playCurrentSentence = async (index = currentSentence) => {
    if (!isBrowser || !sentences[index]) return;
    
    try {
      speechSynthesis.cancel();
      setAudioError('');
      
      const sentenceText = sentenceToText(sentences[index]);
      const japaneseVoice = await getJapaneseVoice();
      
      if (!japaneseVoice) {
        throw new Error('No Japanese voice found');
      }

      const utterance = new SpeechSynthesisUtterance(sentenceText);
      utterance.voice = japaneseVoice;
      utterance.lang = 'ja-JP';
      
      // Ensure speed is a valid number
      const speed = typeof preferenceState.preferred_speed === 'number' && !isNaN(preferenceState.preferred_speed)
        ? preferenceState.preferred_speed
        : 1.0;

      // Log speed before setting
      console.log('Setting utterance rate:', {
        preferenceStateSpeed: preferenceState.preferred_speed,
        finalRate: speed,
        type: typeof speed
      });
      
      utterance.rate = speed;

      // Set playing state just before speaking
      setIsPlaying(true);
      setIsPaused(false);
      
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        
        if (repeatModeRef.current) {
          setRepeatCountdown(1);
          window.repeatInterval = setInterval(() => {
            setRepeatCountdown(prev => {
              if (prev <= 0) {
                clearInterval(window.repeatInterval);
                if (repeatModeRef.current) {
                  playCurrentSentence(index);
                }
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else if (index < sentences.length - 1) {
          setCurrentSentence(prev => prev + 1);
          setTimeout(() => {
            playCurrentSentence(index + 1);
          }, 800);
        }
      };

      utterance.onpause = () => {
        setIsPlaying(false);
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };

      speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioError('Failed to play audio. Please make sure your browser supports Japanese text-to-speech.');
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const pauseAudio = () => {
    if (!isBrowser) return;
    speechSynthesis.pause();
    setIsPlaying(false);
    setIsPaused(true);
  };

  const resumeAudio = () => {
    if (!isBrowser) return;
    speechSynthesis.resume();
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePlay = async () => {
    if (isPlaying) {
      pauseAudio();
      return;
    }
    
    if (isPaused) {
      resumeAudio();
      return;
    }

    if (currentSentence === -1) {
      setCurrentSentence(0);
    }
    playCurrentSentence(currentSentence === -1 ? 0 : currentSentence);
  };

  const handleNext = async () => {
    if (!sentences || currentSentence >= sentences.length - 1) return;
    
    const nextIndex = currentSentence + 1;
    setCurrentSentence(nextIndex);
    try {
      await playCurrentSentence(nextIndex);
    } catch (error) {
      console.error('Error playing next sentence:', error);
    }
  };

  const handlePrevious = async () => {
    if (!sentences || currentSentence <= 0) return;
    
    const prevIndex = currentSentence - 1;
    setCurrentSentence(prevIndex);
    try {
      await playCurrentSentence(prevIndex);
    } catch (error) {
      console.error('Error playing previous sentence:', error);
    }
  };

  // Helper function to ensure minimum loading duration
  const updatePreferenceWithMinDuration = async (key, updateFn) => {
    setUpdatingPreferences(prev => ({ ...prev, [key]: true }));
    const startTime = Date.now();
    
    try {
      await updateFn();
    } catch (error) {
      console.error(`Error updating ${key} preference:`, error);
    } finally {
      // Ensure loading state shows for at least 500ms
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 500 - elapsedTime);
      
      setTimeout(() => {
        setUpdatingPreferences(prev => ({ ...prev, [key]: false }));
      }, remainingTime);
    }
  };

  // Update the handleThemeChange function
  const handleThemeChange = async (newTheme) => {
    if (user) {
      try {
        await savePreferences('theme', newTheme);
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    } else {
      setPreferenceState(prev => ({ ...prev, theme: newTheme }));
      setToastMessage('Tip: Sign in to remember your reader preferences');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    }
  };

  const handleFontSizeChange = async (size) => {
    if (user) {
      try {
        await savePreferences('font_size', size);
      } catch (error) {
        console.error('Error saving font size:', error);
      }
    } else {
      setPreferenceState(prev => ({ ...prev, font_size: size }));
      setToastMessage('Tip: Sign in to remember your reader preferences');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    }
  };

  // Update the speed change handler
  const handleSpeedChange = async (newSpeed) => {
    const speedValue = parseFloat(newSpeed);
    console.log('Speed change requested:', { newSpeed, speedValue, type: typeof speedValue });
    
    if (isNaN(speedValue)) {
      console.error('Invalid speed value:', newSpeed);
      return;
    }

    // Update local state first for immediate feedback
    setPreferenceState(prev => ({
      ...prev,
      preferred_speed: speedValue
    }));

    if (user) {
      try {
        setUpdatingPreferences(prev => ({ ...prev, preferred_speed: true }));
        
        const { data, error } = await supabase
          .from('profiles')
          .update({
            preferred_speed: speedValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select();

        if (error) {
          console.error('Database error:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error saving speed:', error);
        setPreferenceState(prev => ({ ...prev, preferred_speed: prev.preferred_speed }));
      } finally {
        setUpdatingPreferences(prev => ({ ...prev, preferred_speed: false }));
      }
    } else {
      setToastMessage('Tip: Sign in to remember your reader preferences');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    }
  };

  const handleVoiceChange = async (voiceURI) => {
    const voice = availableVoices.find(v => v.voiceURI === voiceURI);
    if (user) {
      try {
        await savePreferences('preferred_voice', voiceURI);
      } catch (error) {
        console.error('Error saving voice:', error);
      }
    } else {
      setPreferenceState(prev => ({ ...prev, preferred_voice: voiceURI }));
      setToastMessage('Tip: Sign in to remember your reader preferences');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    }
    setSelectedVoice(voice);
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const toggleFurigana = async () => {
    const newValue = !preferenceState.show_furigana;
    if (user) {
      try {
        await savePreferences('show_furigana', newValue);
      } catch (error) {
        console.error('Error saving furigana preference:', error);
      }
    } else {
      setPreferenceState(prev => ({ ...prev, show_furigana: newValue }));
      setToastMessage('Tip: Sign in to remember your reader preferences');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    }
  };

  const getThemeClasses = () => {
    switch (preferenceState.theme) {
      case 'dark':
        return {
          main: 'bg-[rgb(19,31,36)] text-gray-100',
          input: 'bg-gray-800 border-gray-700 text-gray-100 focus:border-gray-500',
          button: 'bg-gray-700 hover:bg-gray-600',
          select: 'bg-gray-800 border-gray-700 text-gray-100',
          controlBg: 'bg-gray-200 dark:bg-gray-700'
        };
      default: // light theme
        return {
          main: '[color-scheme:light] bg-white text-[rgb(19,31,36)]',
          input: '[color-scheme:light] bg-white border-gray-300 text-[rgb(19,31,36)]',
          button: '[color-scheme:light]',
          select: '[color-scheme:light] bg-white border-gray-300 text-[rgb(19,31,36)]',
          controlBg: '[color-scheme:light] bg-gray-200'
        };
    }
  };

  const themeClasses = getThemeClasses();

  useEffect(() => {
    if (!isPlaying && preferenceState.auto_play && currentSentence < sentences.length) {
      playCurrentSentence();
    }
  }, [currentSentence, preferenceState.auto_play]);

  useEffect(() => {
    return () => {
      // Clean up cached audio URLs
      Object.values(audioCache).forEach(url => {
        URL.revokeObjectURL(url);
      });
      // Clean up current audio element
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioCache, audioElement]);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Add play button icons
  const playIcons = {
    play: <FaPlay className="w-4 h-4" />,
    pause: <FaPause className="w-4 h-4" />,
    stop: <FaStop className="w-4 h-4" />,
    loading: (
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )
  };

  // Add click handler for sentences
  const handleSentenceClick = async (index) => {
    if (index === currentSentence) return;
    
    setCurrentSentence(index);
    if (audioElement) {
      audioElement.pause();
    }
    setIsPlaying(false);
    setIsPaused(false);
    
    try {
      await playCurrentSentence(index);
    } catch (error) {
      console.error('Error playing selected sentence:', error);
    }
  };

  // Add this class to the image container
  const imageContainerClass = "mt-8 rounded-lg border-2 hidden border-gray-300 overflow-hidden";

  // Add this class near the top of the component where other class definitions are
  const mediaControlsClass = `
    fixed bottom-6 left-1/2 -translate-x-1/2 
    px-6 py-4 rounded-full 
    ${preferenceState.theme === "dark" ? "bg-gray-800" : "bg-white"} 
    shadow-lg border 
    ${preferenceState.theme === "dark" ? "border-gray-700" : "border-gray-200"}
    z-40
  `;

  // Add a useEffect to handle repeat mode changes
  useEffect(() => {
    if (!preferenceState.repeat_mode && audioElement) {
      // If repeat mode is turned off during playback
      setRepeatCountdown(0);
    }
  }, [preferenceState.repeat_mode]);

  // Update the repeat toggle button handler
  const handleRepeatToggle = () => {
    const newRepeatMode = !preferenceState.repeat_mode;
    setPreferenceState(prev => ({ ...prev, repeat_mode: newRepeatMode }));
    repeatModeRef.current = newRepeatMode;
    
    if (!newRepeatMode) {
      setRepeatCountdown(0);
      if (window.repeatInterval) {
        clearInterval(window.repeatInterval);
        window.repeatInterval = null;
      }
    }
  };

  // Update the sentence rendering to use chunks
  const renderSentence = (sentence, index) => {
    return processContent(sentence).map((part, i) => {
      if (part.type === "ruby") {
        return (
          <span key={i}>
            <RubyText
              part={part}
              preferenceState={preferenceState}
            />
          </span>
        );
      } else {
        return (
          <span key={i}>
            {part.content}
          </span>
        );
      }
    });
  };

  // Add function to fetch archived URLs
  const fetchArchivedUrls = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_articles')
        .select(`
          url,
          article:articles (
            id,
            url
          )
        `);
      
      if (error) throw error;
      setArchivedUrls(new Set(data.map(item => item.url)));
    } catch (error) {
      console.error('Error fetching archived URLs:', error);
      setArchivedUrls(new Set());
    }
  };

  // Add function to fetch finished URLs
  const fetchFinishedUrls = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('finished_articles')
        .select('url');
      
      if (error) throw error;
      setFinishedUrls(new Set(data.map(item => item.url)));
    } catch (error) {
      console.error('Error fetching finished URLs:', error);
    }
  };

  // Update the useEffect to fetch both archived and finished URLs
  useEffect(() => {
    if (user) {
      fetchArchivedUrls();
      fetchFinishedArticles();
    } else {
      setArchivedUrls(new Set());
      setFinishedUrls(new Set());
    }
  }, [user]);

  // Add this useEffect to fetch archived URLs when user changes
  useEffect(() => {
    if (user) {
      fetchArchivedUrls();
    } else {
      setArchivedUrls(new Set());
    }
  }, [user]);

  // Update the fetchRecentNews function
  const fetchRecentNews = async () => {
    try {
      const response = await axios.get('/api/fetch-news-list', {
        params: { limit: 100 }
      });
      if (response.data.success && Array.isArray(response.data.newsList)) {
        setRecentNews(response.data.newsList);
        // Refresh finished and archived URLs when fetching news
        if (user) {
          fetchFinishedArticles();
          fetchArchivedUrls();
        }
      } else {
        console.error('Invalid response format from fetch-news-list');
        setRecentNews([]);
      }
    } catch (error) {
      console.error('Error fetching recent news:', error);
      setRecentNews([]);
    }
  };

  // Add this useEffect to fetch recent news when sidebar opens
  useEffect(() => {
    if (showSidebar) {
      setRecentNewsError(false);
      fetchRecentNews();
    }
  }, [showSidebar]);

  // Update effect to handle auto-showing sidebar
  useEffect(() => {
    if (isExtraLargeScreen) {
      setShowSidebar(true); // Auto show on extra large screens (1300px+)
    } else if (!isLargeScreen) {
      setShowSidebar(false); // Auto hide on small screens (<1024px)
    }
    // Don't auto-change on regular large screens (1024px-1300px) to allow user control
  }, [isLargeScreen, isExtraLargeScreen]);

  // Update the floating nav position calculation
  const floatingNavClasses = `
    fixed top-4 h-12 z-50 rounded-full shadow-lg border px-4
    transition-all duration-300 ease-in-out transform
    ${showSidebar && isLargeScreen 
      ? 'lg:translate-x-[200px] left-1/2 -translate-x-1/2' 
      : 'left-1/2 -translate-x-1/2'
    }
    ${preferenceState.theme === "dark"
      ? "bg-gray-800/95 border-gray-700 backdrop-blur-sm"
      : "[color-scheme:light] bg-white/95 border-gray-200 backdrop-blur-sm"
    }
  `;

  // Handle click outside settings and profile
  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }

    if (showSettings || showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings, showProfile]);

  // Initialize preferences from profile if available
  useEffect(() => {
    if (profile) {
      setPreferenceState({
        theme: profile.theme || 'light',
        font_size: profile.font_size || 'medium',
        show_furigana: profile.show_furigana ?? true,
        preferred_speed: profile.preferred_speed || 1.0,
        preferred_voice: profile.preferred_voice || null,
        reading_level: profile.reading_level || 'beginner'
      });
      
      if (profile.preferred_voice) {
        const savedVoice = availableVoices.find(v => v.voiceURI === profile.preferred_voice);
        if (savedVoice) {
          setSelectedVoice(savedVoice);
        }
      }
    }
  }, [profile, availableVoices]);

  // Update the repeat countdown styles
  const getRepeatCountdownClasses = () => {
    const baseClasses = 'fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-medium z-50';
    return preferenceState.theme === 'dark'
      ? `${baseClasses} bg-gray-800 text-gray-100`
      : `${baseClasses} bg-white text-[rgb(19,31,36)] shadow-md`;
  };

  // Add function to update reading stats
  const updateReadingStats = async (readingTime) => {
    if (!user || hasRecordedArticle) return;

    try {
      // First try to update existing stats
      const { error } = await supabase.rpc('increment_reading_stats', {
        p_user_id: user.id,
        p_reading_time: readingTime
      });

      if (error) throw error;
      setHasRecordedArticle(true);
    } catch (error) {
      console.error('Error updating reading stats:', error);
    }
  };

  // Add effect to start tracking reading time when content loads
  useEffect(() => {
    if (newsContent && !readingStartTime) {
      setReadingStartTime(Date.now());
    }
  }, [newsContent]);

  // Add effect to update reading time when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (readingStartTime && user) {
        const readingTime = (Date.now() - readingStartTime) / (1000 * 60); // Convert to minutes
        updateReadingStats(readingTime);
      }
    };
  }, [readingStartTime, user, url]);

  // Add effect to record article read after a certain time
  useEffect(() => {
    const MINIMUM_READ_TIME = 30000; // 30 seconds
    
    const recordArticleRead = async () => {
      if (!user || !url || !readingStartTime || hasRecordedArticle) return;
      
      const readingTime = Math.floor((Date.now() - readingStartTime) / 1000);
      if (readingTime >= MINIMUM_READ_TIME) {
        try {
          await updateReadingStats(readingTime);
        } catch (error) {
          console.error('Error recording article read:', error);
        }
      }
    };

    const cleanup = () => {
      if (readingStartTime) {
        recordArticleRead();
      }
    };

    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, [readingStartTime, user, url]);

  // Add this function near other data fetching functions
  const fetchSavedNews = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_articles')
        .select(`
          *,
          article:articles (
            id,
            url,
            title,
            publish_date,
            images
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSavedNews(data || []);
    } catch (error) {
      console.error('Error fetching saved news:', error);
      setSavedNews([]);
    }
  };

  // Add this effect to fetch saved news when needed
  useEffect(() => {
    if (user && sidebarView === 'saved') {
      fetchSavedNews();
    }
  }, [user, sidebarView]);

  // Add this function near other data fetching functions
  const checkFinishStatus = async () => {
    if (!user || !url) return;

    try {
      const { data, error } = await supabase
        .from('finished_articles')
        .select(`
          id,
          article:articles (
            id,
            url
          )
        `)
        .eq('user_id', user.id)
        .eq('url', url)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setIsFinished(!!data);
    } catch (error) {
      console.error('Error checking finish status:', error);
    }
  };

  // Add function to fetch finished articles
  const fetchFinishedArticles = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('finished_articles')
        .select(`
          *,
          article:articles (
            id,
            url,
            title,
            publish_date,
            images
          )
        `)
        .order('finished_at', { ascending: false });
      
      if (error) throw error;
      setFinishedUrls(new Set(data?.map(item => item.url) || []));
      
      // Check if current article is finished
      if (url) {
        setIsFinished(data.some(item => item.url === url));
      }
    } catch (error) {
      console.error('Error fetching finished articles:', error);
      setFinishedUrls(new Set());
    }
  };

  // Update the useEffect to fetch finished articles
  useEffect(() => {
    if (user) {
      fetchFinishedArticles();
    } else {
      setFinishedUrls(new Set());
    }
  }, [user]);

  // Add this function near other utility functions
  const triggerCelebration = () => {
    const duration = 3000; // Increased from 1500ms to 3000ms
    const end = Date.now() + duration;

    // Show motivational message
    setShowMotivation(true);
    setTimeout(() => {
      setShowMotivation(false);
    }, 3000); // Increased to match duration

    const colors = ['#FF5757', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B6B'];

    // Initial burst
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.8 },
      colors: colors,
      gravity: 0.8
    });

    // Continuous side bursts
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());

    // Additional bursts at intervals
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.6 },
        colors: colors,
        gravity: 1
      });
    }, 1000);

    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0.8 },
        colors: colors,
        gravity: 1.2
      });
    }, 2000);
  };

  // Update the toggleFinished function to include confirmation
  const toggleFinished = async () => {
    if (!user) {
      setToastMessage('Tip: Sign in to track your reading progress');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return;
    }

    if (finishLoading) return;

    // If trying to unmark, show confirmation first
    if (isFinished) {
      setShowConfirmUnfinish(true);
      return;
    }

    setFinishLoading(true);
    try {
      // First get or create the article record
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select('id')
        .eq('url', url)
        .single();

      if (articleError && articleError.code === 'PGRST116') {
        // Article doesn't exist, create it
        const { data: newArticle, error: createError } = await supabase
          .from('articles')
          .insert([{
            url,
            title: newsTitle,
            publish_date: newsDate,
            images: newsImages
          }])
          .select()
          .single();

        if (createError) throw createError;

        // Add to finished articles with new article reference
        await supabase
          .from('finished_articles')
          .insert([{
            user_id: user.id,
            url,
            article_id: newArticle.id,
            finished_at: new Date().toISOString()
          }]);
      } else if (articleError) {
        throw articleError;
      } else {
        // Article exists, use its ID
        await supabase
          .from('finished_articles')
          .insert([{
            user_id: user.id,
            url,
            article_id: article.id,
            finished_at: new Date().toISOString()
          }]);
      }
      setIsFinished(true);
      // Trigger celebration animation when marking as finished
      triggerCelebration();

      // Update finished URLs list
      await fetchFinishedArticles();
    } catch (error) {
      console.error('Error toggling finish status:', error);
    } finally {
      setFinishLoading(false);
    }
  };

  // Add function to handle unfinishing
  const handleUnfinish = async () => {
    setFinishLoading(true);
    try {
      // Ensure we're using the decoded URL
      const decodedUrl = decodeURIComponent(url);
      
      // Only delete the finished_articles record, don't touch the profile
      await supabase
        .from('finished_articles')
        .delete()
        .eq('user_id', user.id)
        .eq('url', decodedUrl);
        
      setIsFinished(false);
      await fetchFinishedArticles();
    } catch (error) {
      console.error('Error unmarking article:', error);
    } finally {
      setFinishLoading(false);
      setShowConfirmUnfinish(false);
    }
  };

  // Add these utility functions near the top with other utility functions
  const renderTitle = (title) => {
    if (!Array.isArray(title)) return null;
    return title.map((part, index) => {
      if (part.type === 'ruby') {
        return <RubyText key={index} part={part} preferenceState={preferenceState} />;
      } else if (part.type === 'text') {
        return <span key={index}>{part.content}</span>;
      }
      return null;
    });
  };

  const renderContent = (content) => {
    if (!Array.isArray(content)) return null;
    return content.map((paragraph, pIndex) => {
      if (paragraph.type !== 'paragraph') return null;
      return (
        <p
          key={pIndex}
          className="mb-6"
        >
          {paragraph.content.map((part, index) => {
            if (part.type === 'ruby') {
              return <RubyText key={index} part={part} preferenceState={preferenceState} />;
            } else if (part.type === 'text') {
              return <span key={index}>{part.content}</span>;
            }
            return null;
          })}
        </p>
      );
    });
  };

  // Check if article is saved
  const checkSaveStatus = async () => {
    if (!user || !url) return;

    try {
      // Ensure we're using the decoded URL
      const decodedUrl = decodeURIComponent(url);
      const { data } = await supabase
        .from('saved_articles')
        .select('id')
        .eq('user_id', user.id)
        .eq('url', decodedUrl)
        .single();
      
      setIsArchived(!!data);
    } catch (error) {
      console.error('Error checking save status:', error);
    }
  };

  // Toggle save status
  const toggleSave = async () => {
    if (!user) {
      setToastMessage('Tip: Sign in to save articles for later');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return;
    }

    if (archiveLoading) return;

    setArchiveLoading(true);
    try {
      if (isArchived) {
        // Remove from saved
        await supabase
          .from('saved_articles')
          .delete()
          .eq('user_id', user.id)
          .eq('url', url);
        setIsArchived(false);
      } else {
        // Get article ID from the database
        const { data: article, error: articleError } = await supabase
          .from('articles')
          .select('id')
          .eq('url', url)
          .single();

        if (articleError) {
          console.error('Error getting article:', articleError);
          throw articleError;
        }

        // Add to saved news with article reference
        await supabase
          .from('saved_articles')
          .insert([{
            user_id: user.id,
            url,
            article_id: article.id
          }]);
        setIsArchived(true);
      }

      // Refresh saved articles list if sidebar is showing saved articles
      if (sidebarView === 'saved') {
        fetchSavedNews();
      }
    } catch (error) {
      console.error('Error toggling save status:', error);
    } finally {
      setArchiveLoading(false);
    }
  };

  // Check save status when user or URL changes
  useEffect(() => {
    if (user && url) {
      checkSaveStatus();
    }
  }, [user, url]);

  // Handle sidebar responsiveness
  useEffect(() => {
    if (isExtraLargeScreen) {
      setShowSidebar(true); // Auto show on extra large screens (1300px+)
    } else if (!isLargeScreen) {
      setShowSidebar(false); // Auto hide on small screens (<1024px)
    }
    // Don't auto-change on regular large screens (1024px-1300px) to allow user control
  }, [isLargeScreen, isExtraLargeScreen]);

  // Handle clicks outside sidebar on mobile
  useEffect(() => {
    function handleClickOutside(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && !isLargeScreen) {
        setShowSidebar(false);
      }
    }

    if (showSidebar && !isLargeScreen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSidebar, isLargeScreen]);

  // Helper function to split content into sentences
  const splitIntoSentences = (content) => {
    if (!Array.isArray(content)) return [];
    
    const sentences = [];
    let currentSentence = [];

    content.forEach((paragraph) => {
      if (paragraph.type === 'paragraph') {
        const paragraphContent = paragraph.content;
        let lastWasRuby = false;

        paragraphContent.forEach((part, index) => {
          currentSentence.push(part);
          
          // Check if this is the end of a sentence
          if (part.type === 'text' && 
              part.content.match(/[。！？]$/) && 
              !lastWasRuby && 
              index < paragraphContent.length - 1) {
            sentences.push([...currentSentence]);
            currentSentence = [];
          }
          
          lastWasRuby = part.type === 'ruby';
        });

        // Add remaining content as a sentence at paragraph end
        if (currentSentence.length > 0) {
          sentences.push([...currentSentence]);
          currentSentence = [];
        }
      }
    });

    return sentences;
  };

  return (
    <div className={`min-h-screen ${themeClasses.main}`}>
      {/* Add Navbar */}
      <Navbar
        showSidebar={showSidebar}
        onSidebarToggle={setShowSidebar}
        theme={preferenceState.theme}
      />

      {/* Settings button and dropdown - bottom right */}
      <div className="fixed bottom-4 right-4 z-50">
        <div ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`group relative p-3 rounded-lg shadow-lg border flex items-center justify-center transition-colors duration-150 ${
              preferenceState.theme === "dark"
                ? showSettings
                  ? "bg-gray-700/95 border-gray-700 backdrop-blur-sm"
                  : "bg-gray-800/95 hover:bg-gray-700/95 border-gray-700 backdrop-blur-sm"
                : showSettings
                ? "[color-scheme:light] bg-gray-50/95 border-gray-200 backdrop-blur-sm"
                : "[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200 backdrop-blur-sm"
            }`}
            title="Article Reader Preference"
          >
            <FaCog
              className={`w-5 h-5 ${
                preferenceState.theme === "dark"
                  ? "text-gray-300"
                  : "[color-scheme:light] text-gray-600"
              }`}
            />
            {/* Tooltip */}
            <div
              className={`absolute bottom-full right-0 mb-2 px-2 py-1 text-sm rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ${
                preferenceState.theme === "dark"
                  ? "bg-gray-800 text-gray-100"
                  : "bg-white text-gray-600"
              }`}
            >
              Article Reader Preference
            </div>
          </button>

          {/* Settings panel */}
          {showSettings && (
            <div
              className={`absolute bottom-full right-0 mb-2 p-4 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] border backdrop-blur-sm
              w-[calc(100vw-2rem)] sm:w-[400px] md:w-[320px]
              ${
                preferenceState.theme === "dark"
                  ? "bg-gray-800/95 border-gray-700"
                  : "[color-scheme:light] bg-white/95 border-gray-200"
              }`}
            >
              <div className="space-y-6 sm:space-y-4">
                {/* Font size controls */}
                <div className="space-y-3 sm:space-y-2">
                  <label
                    className={`text-base sm:text-sm font-medium flex items-center ${
                      preferenceState.theme === "dark"
                        ? ""
                        : "[color-scheme:light] text-[rgb(19,31,36)]"
                    }`}
                  >
                    Font Size
                    <LoadingIndicator
                      loading={updatingPreferences.font_size}
                      theme={preferenceState.theme}
                    />
                  </label>
                  <div className="flex gap-1">
                    {[
                      { size: "medium", class: "text-lg" },
                      { size: "large", class: "text-xl" },
                      { size: "x-large", class: "text-2xl" },
                      { size: "xx-large", class: "text-3xl" },
                    ].map(({ size, class: sizeClass }) => (
                      <button
                        key={size}
                        onClick={() => handleFontSizeChange(size)}
                        disabled={updatingPreferences.font_size}
                        className={`flex-1 px-3 py-2.5 sm:py-1.5 rounded flex items-center justify-center ${sizeClass} transition-all duration-200 border ${
                          preferenceState.font_size === size
                            ? preferenceState.theme === "dark"
                              ? "bg-green-500/10 text-green-400 border-green-500/50"
                              : "[color-scheme:light] bg-green-50 text-green-700 border-green-500/50"
                            : preferenceState.theme === "dark"
                            ? "bg-gray-700 text-gray-300 border-transparent hover:border-gray-600"
                            : "[color-scheme:light] bg-gray-200 text-gray-600 border-transparent hover:border-gray-300"
                        } ${
                          updatingPreferences.font_size
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        A
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed control */}
                <div className="space-y-3 sm:space-y-2">
                  <label
                    className={`text-base sm:text-sm font-medium flex items-center ${
                      preferenceState.theme === "dark"
                        ? ""
                        : "[color-scheme:light] text-[rgb(19,31,36)]"
                    }`}
                  >
                    Speed
                    <LoadingIndicator
                      loading={updatingPreferences.preferred_speed}
                      theme={preferenceState.theme}
                    />
                  </label>
                  <select
                    value={preferenceState.preferred_speed}
                    onChange={(e) => handleSpeedChange(e.target.value)}
                    disabled={updatingPreferences.preferred_speed}
                    className={`w-full p-3 sm:p-2 text-base sm:text-sm rounded transition-all duration-200 border ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-100 focus:border-green-500/50"
                        : "[color-scheme:light] bg-white border-gray-300 text-[rgb(19,31,36)] focus:border-green-500/50"
                    } ${
                      updatingPreferences.preferred_speed
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <option value={0.6}>Very Slow (0.6x)</option>
                    <option value={0.8}>Slow (0.8x)</option>
                    <option value={1.0}>Normal (1.0x)</option>
                    <option value={1.2}>Faster (1.2x)</option>
                  </select>
                </div>

                {/* Theme controls */}
                <div className="space-y-3 sm:space-y-2">
                  <label
                    className={`text-base sm:text-sm font-medium flex items-center ${
                      preferenceState.theme === "dark"
                        ? ""
                        : "[color-scheme:light] text-[rgb(19,31,36)]"
                    }`}
                  >
                    Theme
                    <LoadingIndicator
                      loading={updatingPreferences.theme}
                      theme={preferenceState.theme}
                    />
                  </label>
                  <div className="flex gap-1">
                    {[
                      { id: "light", icon: <FaSun />, title: "Light" },
                      { id: "dark", icon: <FaMoon />, title: "Dark" },
                    ].map((themeOption) => (
                      <button
                        key={themeOption.id}
                        onClick={() => handleThemeChange(themeOption.id)}
                        disabled={updatingPreferences.theme}
                        className={`flex-1 px-3 py-2.5 sm:py-1.5 rounded flex items-center justify-center gap-2 transition-all duration-200 border ${
                          preferenceState.theme === themeOption.id
                            ? preferenceState.theme === "dark"
                              ? "bg-green-500/10 text-green-400 border-green-500/50"
                              : "[color-scheme:light] bg-green-50 text-green-700 border-green-500/50"
                            : preferenceState.theme === "dark"
                            ? "bg-gray-700 text-gray-300 border-transparent hover:border-gray-600"
                            : "[color-scheme:light] bg-gray-200 text-gray-600 border-transparent hover:border-gray-300"
                        } ${
                          updatingPreferences.theme
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {themeOption.icon}
                        <span className="text-base sm:text-sm">
                          {themeOption.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Furigana control */}
                <div className="space-y-3 sm:space-y-2">
                  <label
                    className={`text-base sm:text-sm font-medium flex items-center ${
                      preferenceState.theme === "dark"
                        ? ""
                        : "[color-scheme:light] text-[rgb(19,31,36)]"
                    }`}
                  >
                    Furigana
                    <LoadingIndicator
                      loading={updatingPreferences.show_furigana}
                      theme={preferenceState.theme}
                    />
                  </label>
                  <button
                    onClick={toggleFurigana}
                    disabled={updatingPreferences.show_furigana}
                    className={`w-full flex items-center justify-between px-4 py-3 sm:px-3 sm:py-2 rounded transition-all duration-200 border ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                        : "[color-scheme:light] bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                    } ${
                      updatingPreferences.show_furigana
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base sm:text-sm">
                        {preferenceState.show_furigana ? "Visible" : "Hidden"}
                      </span>
                      <ruby className="text-base sm:text-sm">
                        日本語
                        {preferenceState.show_furigana && (
                          <rt className="transition-opacity duration-200">
                            にほんご
                          </rt>
                        )}
                      </ruby>
                    </div>
                    <div
                      className={`relative inline-flex h-7 sm:h-6 w-12 sm:w-11 items-center rounded-full transition-colors duration-200 ease-in-out border ${
                        preferenceState.show_furigana
                          ? preferenceState.theme === "dark"
                            ? "bg-green-500/20 border-green-500/30"
                            : "bg-green-50 border-green-500/30"
                          : preferenceState.theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-gray-200 border-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 sm:h-4 w-5 sm:w-4 transform rounded-full transition-transform duration-200 ease-in-out border ${
                          preferenceState.show_furigana
                            ? "translate-x-6 bg-green-600 border-green-500"
                            : "translate-x-1 bg-white border-gray-300"
                        } shadow-sm`}
                      />
                    </div>
                  </button>
                </div>

                {/* Voice selection control */}
                <div className="space-y-3 sm:space-y-2">
                  <label
                    className={`text-base sm:text-sm font-medium flex items-center ${
                      preferenceState.theme === "dark"
                        ? ""
                        : "[color-scheme:light] text-[rgb(19,31,36)]"
                    }`}
                  >
                    Voice
                    <LoadingIndicator
                      loading={updatingPreferences.preferred_voice}
                      theme={preferenceState.theme}
                    />
                  </label>
                  <select
                    value={preferenceState.preferred_voice || ""}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    disabled={updatingPreferences.preferred_voice}
                    className={`w-full p-3 sm:p-2 text-base sm:text-sm rounded transition-all duration-200 border ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-100 focus:border-green-500/50"
                        : "[color-scheme:light] bg-white border-gray-300 text-[rgb(19,31,36)] focus:border-green-500/50"
                    } ${
                      updatingPreferences.preferred_voice
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {availableVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                    {availableVoices.length === 0 && (
                      <option value="" disabled>
                        No Japanese voices available
                      </option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      <div
        className={overlayClasses}
        onClick={() => !isLargeScreen && setShowSidebar(false)}
      />

      <div className={mainWrapperClasses}>
        {/* Sidebar */}
        <aside ref={sidebarRef} className={sidebarClasses}>
          <div className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">News List</h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className={`p-2 rounded-full hover:bg-opacity-80 
                    ${
                      preferenceState.theme === "dark"
                        ? "hover:bg-gray-800"
                        : "hover:bg-gray-100"
                    }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {user && (
                <div
                  className={`flex gap-1 p-1 rounded-lg ${
                    preferenceState.theme === "dark"
                      ? "bg-gray-800/50"
                      : "bg-gray-100"
                  }`}
                >
                  <button
                    onClick={() => setSidebarView("latest")}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2
                      ${
                        sidebarView === "latest"
                          ? preferenceState.theme === "dark"
                            ? "bg-gray-700 text-white shadow-sm"
                            : "bg-white text-[rgb(19,31,36)] shadow-sm"
                          : preferenceState.theme === "dark"
                          ? "text-gray-400 hover:text-gray-200"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Latest
                  </button>
                  <button
                    onClick={() => setSidebarView("saved")}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2
                      ${
                        sidebarView === "saved"
                          ? preferenceState.theme === "dark"
                            ? "bg-gray-700 text-white shadow-sm"
                            : "bg-white text-[rgb(19,31,36)] shadow-sm"
                          : preferenceState.theme === "dark"
                          ? "text-gray-400 hover:text-gray-200"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    <FaHeart className="w-3.5 h-3.5" />
                    Saved
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {sidebarView === "latest" ? (
                  recentNews?.length > 0 ? (
                    recentNews.map((article, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          router.push(
                            `/read?source=${encodeURIComponent(article.url)}`
                          );
                          setShowSidebar(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex gap-3
                        ${
                          finishedUrls.has(article.url)
                            ? "opacity-40 hover:opacity-100"
                            : ""
                        }
                          ${
                            preferenceState.theme === "dark"
                              ? article.url === sourceUrl
                                ? "bg-gray-800"
                                : "hover:bg-gray-800/70"
                              : article.url === sourceUrl
                              ? "bg-gray-100"
                              : "hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex-shrink-0 relative">
                          {article.image && (
                            <div className="w-20 h-20 relative rounded-md overflow-hidden">
                              <img
                                src={article.image}
                                alt=""
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            </div>
                          )}
                          <div className="absolute -top-1 -right-1 flex gap-1">
                            {archivedUrls.has(article.url) && (
                              <div className="bg-red-500 rounded-full p-1 shadow-lg">
                                <FaHeart className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {finishedUrls.has(article.url) && (
                              <div className="bg-green-500 rounded-full p-1 shadow-lg">
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`font-medium mb-1 line-clamp-2 ${
                              preferenceState.theme === "dark"
                                ? "text-gray-200"
                                : "text-[rgb(19,31,36)]"
                            }`}
                          >
                            {Array.isArray(article.title)
                              ? article.title
                                  .map((part, i) =>
                                    part.type === "ruby"
                                      ? part.kanji
                                      : part.content
                                  )
                                  .join("")
                              : article.title}
                          </h3>
                          <p
                            className={`text-sm ${
                              preferenceState.theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-600"
                            }`}
                          >
                            {Array.isArray(article.date)
                              ? article.date
                                  .map((part) =>
                                    part.type === "ruby"
                                      ? part.kanji
                                      : part.content
                                  )
                                  .join("")
                              : formatJapaneseDate(article.date)}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : recentNewsError ? (
                    <div className="flex items-center justify-center h-32 text-red-500">
                      Failed to load news. Please try again.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32">
                      <svg
                        className={`animate-spin h-6 w-6 mb-2 ${
                          preferenceState.theme === "dark"
                            ? "text-gray-400"
                            : "text-[rgb(19,31,36)]"
                        }`}
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span
                        className={
                          preferenceState.theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }
                      >
                        Loading news...
                      </span>
                    </div>
                  )
                ) : (
                  <SavedNewsList
                    news={savedNews}
                    theme={preferenceState.theme}
                    sourceUrl={sourceUrl}
                    onNewsClick={(url) => {
                      router.push(`/read?source=${encodeURIComponent(url)}`);
                      setShowSidebar(false);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className={mainContentClasses}>
          {loading ? (
            <div className="mt-16 animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite] space-y-8">
              {/* Title placeholder */}
              <div className="space-y-2">
                <div className="h-8 bg-gray-100/80 dark:bg-gray-800/40 rounded-lg w-4/5"></div>
                <div className="h-4 bg-gray-100/80 dark:bg-gray-800/40 rounded w-32"></div>
              </div>

              {/* Image placeholder */}
              <div className="m-0 aspect-video bg-gray-100/80 dark:bg-gray-800/40 rounded-lg max-w-xl mx-auto"></div>

              {/* Progress bar placeholder */}
              <div className="mt-6 flex items-center gap-3">
                <div className="h-3 bg-gray-100/80 dark:bg-gray-800/40 rounded-full w-48"></div>
                <div className="h-4 bg-gray-100/80 dark:bg-gray-800/40 rounded w-16"></div>
              </div>

              {/* Content paragraphs placeholder - reduced to 2 paragraphs */}
              <div className="mt-8 space-y-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-6 bg-gray-100/80 dark:bg-gray-800/40 rounded-lg w-full"></div>
                    <div className="h-6 bg-gray-100/80 dark:bg-gray-800/40 rounded-lg w-11/12"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            newsContent && (
              <div className="mt-4 p-0 rounded relative">
                {/* Title section with padding for controls */}
                <div className="pt-6">
                  <div className="mb-6">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h2
                        className={`text-2xl font-bold ${
                          preferenceState.theme === "dark"
                            ? "text-gray-100"
                            : "text-[rgb(19,31,36)]"
                        }`}
                      >
                        {renderTitle(newsTitle)}
                      </h2>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                        ${
                          preferenceState.theme === "dark"
                            ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                        title={
                          url ? new URL(url).hostname : "Open original article"
                        }
                      >
                        <FaExternalLinkAlt className="w-4 h-4" />
                        <span className="text-sm font-medium hidden sm:inline">
                          Original
                        </span>
                      </a>
                    </div>
                    <div
                      className={`text-sm ${
                        preferenceState.theme === "dark"
                          ? "text-gray-400"
                          : "text-gray-600"
                      }`}
                    >
                      {formatJapaneseDate(newsDate)}
                    </div>

                    {/* News image - always show if available */}
                    {newsImages?.length > 0 && (
                      <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-w-xl mx-auto">
                        <img
                          src={newsImages[0]}
                          alt=""
                          className="w-full h-auto transition-all duration-700 blur-sm hover:blur-none"
                          onLoad={(e) => {
                            e.target.classList.remove('blur-sm');
                          }}
                        />
                      </div>
                    )}

                    {/* Progress indicator and repeat toggle */}
                    {sentences?.length > 0 && (
                      <div className="mt-4 flex justify-between items-center">
                        {/* Progress bar on the left */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-full w-48 h-3 overflow-hidden ${
                              preferenceState.theme === "dark"
                                ? "bg-gray-800"
                                : "bg-gray-100"
                            }`}
                          >
                            <div
                              className={`h-full transition-all duration-300 ${
                                preferenceState.theme === "dark"
                                  ? "bg-green-500/30"
                                  : "bg-green-600"
                              }`}
                              style={{
                                width: `${
                                  currentSentence >= 0
                                    ? ((currentSentence + 1) /
                                        sentences.length) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span
                            className={`text-sm font-medium whitespace-nowrap ${
                              preferenceState.theme === "dark"
                                ? "text-gray-300"
                                : "text-gray-600"
                            }`}
                          >
                            {currentSentence >= 0
                              ? `${currentSentence + 1} / ${sentences.length}`
                              : `${sentences.length}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    {newsContent.map((paragraph, pIndex) => (
                      <p
                        key={pIndex}
                        className={`mb-6 px-2 py-1 rounded-md leading-relaxed
                        ${
                          preferenceState.font_size === "medium"
                            ? "text-lg leading-loose"
                            : preferenceState.font_size === "large"
                            ? "text-xl leading-loose"
                            : preferenceState.font_size === "x-large"
                            ? "text-2xl leading-loose"
                            : "text-3xl leading-loose"
                        }
                      `}
                      >
                        {sentences.map((sentence, sIndex) => {
                          // Find if this sentence belongs to this paragraph
                          const sentenceBelongsToParagraph = sentence.some(
                            (part) => paragraph.content.includes(part)
                          );

                          if (!sentenceBelongsToParagraph) return null;

                          return (
                            <span
                              key={sIndex}
                              onClick={() => handleSentenceClick(sIndex)}
                              className={`inline cursor-pointer rounded px-1
                              ${
                                sIndex === currentSentence
                                  ? preferenceState.theme === "dark"
                                    ? "bg-gray-700"
                                    : "bg-emerald-50"
                                  : preferenceState.theme === "dark"
                                  ? "hover:bg-gray-700/50"
                                  : "hover:bg-gray-100"
                              }
                              ${
                                preferenceState.repeat_mode &&
                                sIndex !== currentSentence
                                  ? preferenceState.theme === "dark"
                                    ? "opacity-50"
                                    : "opacity-40"
                                  : ""
                              }
                              transition-all duration-200
                            `}
                            >
                              {sentence.map((part, index) => {
                                if (part.type === "ruby") {
                                  return (
                                    <RubyText
                                      key={index}
                                      part={part}
                                      preferenceState={preferenceState}
                                    />
                                  );
                                } else {
                                  return (
                                    <span key={index}>{part.content}</span>
                                  );
                                }
                              })}
                            </span>
                          );
                        })}
                      </p>
                    ))}

                    {newsContent && newsContent.length > 0 ? (
                      /* Mark as Finished button at the bottom of the article */
                      <div className="mt-8 mb-24 sm:mb-28 flex justify-center">
                        <button
                          onClick={toggleFinished}
                          disabled={finishLoading}
                          className={`
                          px-4 py-2 rounded-lg flex items-center justify-center gap-2
                          transition-all duration-150
                          ${
                            preferenceState.theme === "dark"
                              ? isFinished
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                              : isFinished
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }
                          ${finishLoading ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                        >
                          {finishLoading ? (
                            <div className="w-5 h-5 relative">
                              <div
                                className={`absolute inset-0 rounded-full border-2 animate-spin ${
                                  preferenceState.theme === "dark"
                                    ? "border-gray-300 border-r-transparent"
                                    : "border-gray-400 border-r-transparent"
                                }`}
                              ></div>
                            </div>
                          ) : (
                            <>
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={isFinished ? "2.5" : "2"}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span className="font-medium">
                                {isFinished ? "Finished Reading" : "Mark as Finished"}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : !loading && error ? (
                      <div className="mt-8 mb-24 sm:mb-28 flex flex-col items-center justify-center gap-4">
                        <div className={`p-3 rounded-full ${preferenceState.theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
                          <svg className={`w-6 h-6 ${preferenceState.theme === "dark" ? "text-gray-400" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className={`text-lg font-medium ${preferenceState.theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                          Article content not available
                        </div>
                        <p className={`text-sm ${preferenceState.theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                          This article may have been removed or is no longer accessible
                        </p>
                      </div>
                    ) : (
                      <div className="mt-8 mb-24 sm:mb-28 flex flex-col items-center justify-center gap-4">
                        <div className={`p-3 rounded-full ${preferenceState.theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
                          <svg className={`w-6 h-6 ${preferenceState.theme === "dark" ? "text-gray-400" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className={`text-lg font-medium ${preferenceState.theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                          Article content not available
                        </div>
                        <p className={`text-sm ${preferenceState.theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                          This article may have been removed or is no longer accessible
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {audioError && (
                  <div
                    className={`mt-4 p-4 border rounded ${
                      preferenceState.theme === "dark"
                        ? "bg-red-900 text-red-100 border-red-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {audioError}
                  </div>
                )}

                {loading && (
                  <div
                    className={`fixed inset-0 backdrop-blur-sm z-50 ${
                      preferenceState.theme === "dark"
                        ? "bg-black/10"
                        : "bg-white/70"
                    }`}
                  />
                )}
              </div>
            )
          )}
        </main>
      </div>

      {/* Media controls */}
      {sentences?.length > 0 && (
        <div
          className={`
          fixed bottom-0 left-0 right-0 z-40
          sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:w-[320px]
          ${
            preferenceState.theme === "dark"
              ? "bg-gray-800 border-t sm:border border-gray-700"
              : "[color-scheme:light] bg-white border-t sm:border border-gray-200"
          }
          px-4 sm:px-6 py-4 sm:rounded-full sm:shadow-lg
          shadow-[0_-2px_15px_-3px_rgba(0,0,0,0.1)] sm:shadow-lg
        `}
        >
          <div className="flex items-center justify-center gap-3">
            {/* Archive button */}
            <button
              onClick={toggleSave}
              disabled={archiveLoading}
              className={`p-2 rounded-full flex items-center justify-center transition-colors duration-150
                ${
                  preferenceState.theme === "dark"
                    ? "hover:bg-gray-700/50"
                    : "hover:bg-gray-100/50"
                }
                ${archiveLoading ? "opacity-50 cursor-not-allowed" : ""}
              `}
              title={isArchived ? "Remove from Saved" : "Save Article"}
            >
              {archiveLoading ? (
                <div className="w-4 h-4 relative">
                  <div
                    className={`absolute inset-0 rounded-full border-2 animate-spin ${
                      preferenceState.theme === "dark"
                        ? "border-gray-300 border-r-transparent"
                        : "border-gray-400 border-r-transparent"
                    }`}
                  ></div>
                </div>
              ) : isArchived ? (
                <FaHeart
                  className={`w-4 h-4 ${
                    preferenceState.theme === "dark"
                      ? "text-red-400"
                      : "text-red-500"
                  }`}
                />
              ) : (
                <FaRegHeart
                  className={`w-4 h-4 ${
                    preferenceState.theme === "dark"
                      ? "text-gray-300 hover:text-purple-400"
                      : "text-gray-600 hover:text-purple-500"
                  }`}
                />
              )}
            </button>

            {/* Play controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentSentence === 0 || isVoiceLoading}
                className={`p-2 rounded-full flex items-center justify-center 
                  ${
                    preferenceState.theme === "dark"
                      ? "bg-gray-700 hover:enabled:bg-gray-600 active:enabled:bg-gray-500 disabled:opacity-40"
                      : "bg-gray-500 hover:enabled:bg-gray-400 active:enabled:bg-gray-300 disabled:bg-gray-300"
                  } text-white w-10 h-10 transition-all duration-150`}
                title="Previous"
              >
                <FaArrowLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handlePlay}
                disabled={!newsContent || loading}
                className={`p-2 rounded-full flex items-center justify-center ${
                  isVoiceLoading
                    ? "bg-purple-600 hover:enabled:bg-purple-500 active:enabled:bg-purple-400"
                    : isPlaying
                    ? "bg-yellow-600 hover:enabled:bg-yellow-500 active:enabled:bg-yellow-400"
                    : "bg-green-600 hover:enabled:bg-green-500 active:enabled:bg-green-400"
                } text-white disabled:${
                  preferenceState.theme === "dark"
                    ? "opacity-40"
                    : "bg-gray-600"
                } w-12 h-12 transition-all duration-150`}
                title={
                  isVoiceLoading
                    ? "Loading Voice"
                    : isPlaying
                    ? "Pause"
                    : "Play"
                }
              >
                {isVoiceLoading
                  ? playIcons.loading
                  : isPlaying
                  ? playIcons.pause
                  : playIcons.play}
              </button>

              <button
                onClick={handleNext}
                disabled={
                  currentSentence === sentences.length - 1 || isVoiceLoading
                }
                className={`p-2 rounded-full flex items-center justify-center 
                  ${
                    preferenceState.theme === "dark"
                      ? "bg-gray-700 hover:enabled:bg-gray-600 active:enabled:bg-gray-500 disabled:opacity-40"
                      : "bg-gray-500 hover:enabled:bg-gray-400 active:enabled:bg-gray-300 disabled:bg-gray-300"
                  } text-white w-10 h-10 transition-all duration-150`}
                title="Next"
              >
                <FaArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Repeat toggle button */}
            <button
              onClick={handleRepeatToggle}
              className={`p-2 rounded-full flex items-center justify-center transition-colors duration-150
                ${
                  preferenceState.theme === "dark"
                    ? "hover:bg-gray-700/50"
                    : "hover:bg-gray-100/50"
                }
              `}
              title={
                preferenceState.repeat_mode
                  ? "Currently repeating one sentence with 1 second pause between repeats"
                  : "Click to repeat one sentence with 1 second pause between repeats"
              }
            >
              <RepeatIcon
                className={`w-4 h-4 ${
                  preferenceState.repeat_mode
                    ? "text-purple-500"
                    : preferenceState.theme === "dark"
                    ? "text-gray-300 hover:text-purple-400"
                    : "text-gray-600 hover:text-purple-500"
                }`}
                isActive={preferenceState.repeat_mode}
                theme={preferenceState.theme}
              />
            </button>
          </div>
        </div>
      )}

      {/* Repeat countdown */}
      {repeatCountdown > 0 && (
        <div className={`${getRepeatCountdownClasses()} mb-20 sm:mb-0`}>
          Repeat sentence in {repeatCountdown} s
        </div>
      )}

      {showToast && (
        <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 w-[90%] sm:w-auto animate-fade-in-out">
          <div
            className={`group flex items-center justify-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium cursor-pointer
            transition-transform duration-300 hover:scale-105 hover:-translate-y-1
            ${preferenceState.theme === "dark"
              ? "bg-[rgb(19,31,36)] text-gray-100 border border-purple-500/50 shadow-[0_8px_32px_-8px_rgba(168,85,247,0.5)]"
              : "bg-white text-gray-700 border border-purple-200/50 shadow-[0_8px_32px_-8px_rgba(168,85,247,0.25)]"
            }`}
            onClick={() => {
              setShowToast(false);
              const ref = toastMessage.includes('save articles') ? 'heart' 
                : toastMessage.includes('track your reading') ? 'finished'
                : 'reader-preference';
              router.push(`/join?theme=dark&ref=${ref}`);
            }}
          >
            <div className={`p-1.5 rounded-lg transition-colors duration-300 ${preferenceState.theme === "dark" 
              ? "bg-purple-500/30" 
              : "bg-purple-100"}`}
            >
              <svg className={`w-4 h-4 ${preferenceState.theme === "dark" ? "text-purple-300" : "text-purple-500"}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>{toastMessage}</span>
            <div className={`p-1.5 rounded-lg transition-colors duration-300 ${preferenceState.theme === "dark" 
              ? "bg-purple-500/30 group-hover:bg-purple-500" 
              : "bg-purple-100 group-hover:bg-purple-500"}`}
            >
              <svg className={`w-4 h-4 ${preferenceState.theme === "dark" 
                ? "text-purple-300 group-hover:text-white" 
                : "text-purple-500 group-hover:text-white"} transition-colors duration-300`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      )}
      {/* Add Motivational Message */}
      <MotivationalMessage show={showMotivation} theme={preferenceState.theme} />

      {/* Add Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmUnfinish}
        onConfirm={handleUnfinish}
        onCancel={() => setShowConfirmUnfinish(false)}
        theme={preferenceState.theme}
      />
    </div>
  );
}

// Create the main page component that wraps the content in Suspense
export default function NewsReader() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 backdrop-blur-sm bg-white/70 z-50" />
    }>
      <NewsReaderContent />
    </Suspense>
  );
}
