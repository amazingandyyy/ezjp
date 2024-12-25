'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
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
  FaRedo,
  FaUserCircle,
  FaGoogle,
  FaSpinner,
  FaHeart,
  FaRegHeart,
  FaExternalLinkAlt
} from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';

// Add this helper function at the top level
const isBrowser = typeof window !== 'undefined';

// Add LoadingIndicator component before NewsReaderContent
const LoadingIndicator = ({ loading, theme }) => {
  if (!loading) return null;
  
  const spinnerColors = {
    dark: 'border-gray-300 border-r-transparent',
    light: 'border-gray-400 border-r-transparent',
    yellow: 'border-yellow-500 border-r-transparent'
  };

  const textColors = {
    dark: 'text-gray-500',
    light: 'text-gray-500',
    yellow: 'text-yellow-700'
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
const formatJapaneseDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}時${String(date.getMinutes()).padStart(2, '0')}分`;
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
            ${theme === 'dark' 
              ? article.url === sourceUrl
                ? 'bg-gray-800'
                : 'hover:bg-gray-800/70'
              : article.url === sourceUrl
                ? 'bg-gray-100'
                : 'hover:bg-gray-50'
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
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium mb-1 line-clamp-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-[rgb(19,31,36)]'
            }`}>
              {parseTitle(article.article?.title)}
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
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
  show_furigana: true,
  preferred_speed: 1.0,
  preferred_voice: null,
  reading_level: 'beginner'
};

const LOCAL_STORAGE_KEY = 'easy_jp_news_preferences';

function NewsReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sourceUrl = searchParams.get('source');
  const { user, loading: authLoading, signInWithGoogle, signOut, profile, updateProfile } = useAuth();

  const [url, setUrl] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [preferenceState, setPreferenceState] = useState({
    theme: 'light',
    font_size: 'medium',
    show_furigana: true,
    preferred_speed: 1.0,
    preferred_voice: null,
    reading_level: 'beginner'
  });
  const [showFurigana, setShowFurigana] = useState(true);
  const [speed, setSpeed] = useState('1.0');
  const [updatingPreferences, setUpdatingPreferences] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarView, setSidebarView] = useState('latest');
  const [showImages, setShowImages] = useState(true);
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
  const [autoPlay, setAutoPlay] = useState(false);
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  const [repeatCountdown, setRepeatCountdown] = useState(0);
  const repeatModeRef = useRef(false);
  const [audioCache, setAudioCache] = useState({});
  const [audioElement, setAudioElement] = useState(null);

  // Content-related states
  const [newsTitle, setNewsTitle] = useState([]);
  const [newsContent, setNewsContent] = useState([]);
  const [newsDate, setNewsDate] = useState(null);
  const [newsImages, setNewsImages] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(-1);
  const [sentences, setSentences] = useState([]);

  // Refs
  const sidebarRef = useRef(null);
  const settingsRef = useRef(null);
  const profileRef = useRef(null);

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
    min-h-screen relative pt-4
  `;

  const overlayClasses = `
    fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300
    ${!isLargeScreen && showSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'}
  `;

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      // Try to load from localStorage first
      const savedPrefs = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedPrefs) {
        try {
          const parsedPrefs = JSON.parse(savedPrefs);
          setPreferenceState(parsedPrefs);
        } catch (error) {
          console.error('Error parsing saved preferences:', error);
        }
      }

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

          // Save to localStorage and state
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPrefs));
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
      // Save to localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPrefs));
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
      fetchNews(decodedUrl)
        .catch(error => {
          console.error('Error in fetchNews:', error);
          setError('Failed to load article');
        })
        .then(() => {
          console.log('fetchNews finished');
          setLoading(false);
        });
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (!Array.isArray(data.title) || !Array.isArray(data.content)) {
        throw new Error('Invalid API response format');
      }

      console.log('Received API response');
      // Update all states at once
      setNewsTitle(data.title);
      setNewsContent(data.content);
      setNewsDate(data.published_date || data.date);
      setNewsImages(data.images || []);
      setCurrentSentence(0);
      setSentences(splitIntoSentences(data.content));
      
    } catch (error) {
      console.error('Error fetching news:', error);
      throw error;
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
      
      // Try to find Microsoft Keita first
      const keitaVoice = japaneseVoices.find(voice => 
        voice.name.toLowerCase().includes('microsoft keita') || 
        voice.name.toLowerCase().includes('microsoft けいた')
      );
      
      // Set default voice (Keita if available, otherwise first Japanese voice)
      if (!selectedVoice && japaneseVoices.length > 0) {
        setSelectedVoice(keitaVoice || japaneseVoices[0]);
      }
    }

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice]);

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

  const handleThemeChange = async (newTheme) => {
    if (user) {
      try {
        await savePreferences('theme', newTheme);
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    } else {
      setPreferenceState(prev => ({ ...prev, theme: newTheme }));
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
      preferred_speed: speedValue // Store as number, not string
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
        // Revert on error
        setPreferenceState(prev => ({ ...prev, preferred_speed: prev.preferred_speed }));
      } finally {
        setUpdatingPreferences(prev => ({ ...prev, preferred_speed: false }));
      }
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
      case 'yellow':
        return {
          main: '[color-scheme:light] bg-yellow-50 text-[rgb(19,31,36)]',
          input: '[color-scheme:light] bg-white border-yellow-200 text-[rgb(19,31,36)]',
          button: '[color-scheme:light]',
          select: '[color-scheme:light] bg-white border-yellow-200 text-[rgb(19,31,36)]',
          controlBg: '[color-scheme:light] bg-gray-200'
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
    if (!isPlaying && autoPlay && currentSentence < sentences.length) {
      playCurrentSentence();
    }
  }, [currentSentence, autoPlay]);

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
    setAutoPlay(false);
    
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
    if (!isRepeatMode && audioElement) {
      // If repeat mode is turned off during playback
      setRepeatCountdown(0);
    }
  }, [isRepeatMode]);

  // Update the repeat toggle button handler
  const handleRepeatToggle = () => {
    const newRepeatMode = !isRepeatMode;
    console.log('Toggling repeat mode to:', newRepeatMode);
    setIsRepeatMode(newRepeatMode);
    repeatModeRef.current = newRepeatMode;
    
    if (!newRepeatMode) {
      console.log('Turning off repeat mode');
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
    switch (preferenceState.theme) {
      case 'dark':
        return `${baseClasses} bg-gray-800 text-gray-100`;
      case 'yellow':
        return `${baseClasses} bg-yellow-100 text-yellow-800 border-2 border-yellow-400`;
      default: // light
        return `${baseClasses} bg-white text-[rgb(19,31,36)] shadow-md`;
    }
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

  // Update toggleFinished function
  const toggleFinished = async () => {
    if (!user || !url || finishLoading) return;

    setFinishLoading(true);
    try {
      if (isFinished) {
        // Remove from finished
        await supabase
          .from('finished_articles')
          .delete()
          .eq('user_id', user.id)
          .eq('url', url);
        setIsFinished(false);
      } else {
        // Add to finished articles
        await supabase
          .from('finished_articles')
          .insert([{
            user_id: user.id,
            url,
            finished_at: new Date().toISOString()
          }]);
        setIsFinished(true);
      }

      // Update finished URLs list
      await fetchFinishedArticles();
    } catch (error) {
      console.error('Error toggling finish status:', error);
    } finally {
      setFinishLoading(false);
    }
  };

  // Add this effect near other initialization effects
  useEffect(() => {
    if (user && url) {
      checkFinishStatus();
    }
  }, [user, url]);

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
    if (!user || !url || archiveLoading) return;

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
      {/* Overlay */}
      <div className={overlayClasses} onClick={() => !isLargeScreen && setShowSidebar(false)} />

      {/* Menu button - top left */}
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className={`p-3 rounded-lg shadow-lg border flex items-center justify-center 
            transition-colors duration-150
            ${preferenceState.theme === 'dark'
              ? 'bg-gray-800/95 hover:bg-gray-700/95 border-gray-700 backdrop-blur-sm'
              : '[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200 backdrop-blur-sm'
            }`}
          title={showSidebar ? "Hide News List" : "Show News List"}
        >
          <svg 
            className={`w-5 h-5 ${preferenceState.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 6h16M4 12h16M4 18h16" 
            />
          </svg>
        </button>

        <button
          onClick={() => router.push('/')}
          className={`p-3 rounded-lg shadow-lg border flex items-center justify-center 
            transition-colors duration-150
            ${preferenceState.theme === 'dark'
              ? 'bg-gray-800/95 hover:bg-gray-700/95 border-gray-700 backdrop-blur-sm'
              : '[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200 backdrop-blur-sm'
            }`}
          title="Back to News Explorer"
        >
          <FaBook className={`w-5 h-5 ${preferenceState.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Settings and Profile buttons - top right */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        {/* Settings Button */}
        <div ref={settingsRef}>
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowProfile(false);
            }}
            className={`p-3 rounded-lg shadow-lg border flex items-center justify-center transition-colors duration-150 ${
              preferenceState.theme === "dark"
                ? showSettings
                  ? "bg-gray-700/95 border-gray-700 backdrop-blur-sm"
                  : "bg-gray-800/95 hover:bg-gray-700/95 border-gray-700 backdrop-blur-sm"
                : showSettings
                  ? "[color-scheme:light] bg-gray-50/95 border-gray-200 backdrop-blur-sm"
                  : "[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200 backdrop-blur-sm"
            }`}
            title="Settings"
          >
            <FaCog className={`w-5 h-5 ${
              preferenceState.theme === "dark" ? "text-gray-300" : "[color-scheme:light] text-gray-600"
            }`} />
          </button>

          {/* Settings panel */}
          {showSettings && (
            <div 
              className={`absolute top-full right-0 mt-2 p-4 rounded-lg shadow-lg border w-72
              ${preferenceState.theme === "dark"
                ? "bg-gray-800 border-gray-700 text-gray-100"
                : "[color-scheme:light] bg-white border-gray-200 text-[rgb(19,31,36)]"
              }`}
            >
              <div className="space-y-4">
                {/* Font size controls */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium flex items-center ${preferenceState.theme === "dark" ? "" : "[color-scheme:light] text-[rgb(19,31,36)]"}`}>
                    Font Size
                    <LoadingIndicator loading={updatingPreferences.font_size} theme={preferenceState.theme} />
                  </label>
                  <div className="flex gap-1">
                    {[
                      { size: "medium", class: "text-lg" },
                      { size: "large", class: "text-xl" },
                      { size: "x-large", class: "text-2xl" },
                      { size: "xx-large", class: "text-3xl" }
                    ].map(({ size, class: sizeClass }) => (
                      <button
                        key={size}
                        onClick={() => handleFontSizeChange(size)}
                        disabled={updatingPreferences.font_size}
                        className={`flex-1 px-3 py-1.5 rounded flex items-center justify-center ${sizeClass} ${
                          preferenceState.font_size === size
                            ? preferenceState.theme === "dark"
                              ? "bg-gray-600 text-white"
                              : "[color-scheme:light] bg-gray-700 text-white"
                            : preferenceState.theme === "dark"
                            ? "bg-gray-700 text-gray-300"
                            : "[color-scheme:light] bg-gray-200 text-gray-600"
                        } ${updatingPreferences.font_size ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        A
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed control */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium flex items-center ${preferenceState.theme === "dark" ? "" : "[color-scheme:light] text-[rgb(19,31,36)]"}`}>
                    Speed
                    <LoadingIndicator loading={updatingPreferences.preferred_speed} theme={preferenceState.theme} />
                  </label>
                  <select
                    key={preferenceState.preferred_speed}
                    value={preferenceState.preferred_speed}
                    onChange={(e) => handleSpeedChange(e.target.value)}
                    disabled={updatingPreferences.preferred_speed}
                    className={`w-full p-2 border rounded ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-100"
                        : "[color-scheme:light] bg-white border-gray-300 text-[rgb(19,31,36)]"
                    } ${updatingPreferences.preferred_speed ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value={0.6}>Very Slow (0.6x)</option>
                    <option value={0.8}>Slow (0.8x)</option>
                    <option value={1.0}>Normal (1.0x)</option>
                    <option value={1.2}>Faster (1.2x)</option>
                  </select>
                </div>

                {/* Theme controls */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium flex items-center ${preferenceState.theme === "dark" ? "" : "[color-scheme:light] text-[rgb(19,31,36)]"}`}>
                    Theme
                    <LoadingIndicator loading={updatingPreferences.theme} theme={preferenceState.theme} />
                  </label>
                  <div className="flex gap-1">
                    {[
                      { id: "light", icon: <FaSun />, title: "Light" },
                      { id: "dark", icon: <FaMoon />, title: "Dark" },
                      { id: "yellow", icon: <FaBook />, title: "Yellow" },
                    ].map((themeOption) => (
                      <button
                        key={themeOption.id}
                        onClick={() => handleThemeChange(themeOption.id)}
                        disabled={updatingPreferences.theme}
                        className={`flex-1 px-3 py-1.5 rounded flex items-center justify-center gap-2 ${
                          preferenceState.theme === themeOption.id
                            ? preferenceState.theme === "dark"
                              ? "bg-gray-600 text-white"
                              : "[color-scheme:light] bg-gray-700 text-white"
                            : preferenceState.theme === "dark"
                            ? "bg-gray-700 text-gray-300"
                            : "[color-scheme:light] bg-gray-200 text-gray-600"
                        } ${updatingPreferences.theme ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {themeOption.icon}
                        <span className="text-sm">{themeOption.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Furigana control */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium flex items-center ${preferenceState.theme === "dark" ? "" : "[color-scheme:light] text-[rgb(19,31,36)]"}`}>
                    Furigana
                    <LoadingIndicator loading={updatingPreferences.show_furigana} theme={preferenceState.theme} />
                  </label>
                  <button
                    onClick={toggleFurigana}
                    disabled={updatingPreferences.show_furigana}
                    className={`w-full px-3 py-1.5 rounded flex items-center justify-center ${
                      preferenceState.show_furigana
                        ? preferenceState.theme === "dark"
                          ? "bg-gray-600 text-white"
                          : "[color-scheme:light] bg-gray-700 text-white"
                        : preferenceState.theme === "dark"
                        ? "bg-gray-700 text-gray-300"
                        : "[color-scheme:light] bg-gray-200 text-gray-600"
                    } ${updatingPreferences.show_furigana ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {preferenceState.show_furigana ? "Hide Furigana" : "Show Furigana"}
                  </button>
                  <span className={`text-xs block text-center ${
                    preferenceState.theme === "dark" ? "text-gray-500" : "[color-scheme:light] text-gray-500"
                  }`}>
                    (Hover to show when hidden)
                  </span>
                </div>

                {/* Voice selection control */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium flex items-center ${preferenceState.theme === "dark" ? "" : "[color-scheme:light] text-[rgb(19,31,36)]"}`}>
                    Voice
                    <LoadingIndicator loading={updatingPreferences.preferred_voice} theme={preferenceState.theme} />
                  </label>
                  <select
                    value={preferenceState.preferred_voice || ''}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    disabled={updatingPreferences.preferred_voice}
                    className={`w-full p-2 border rounded ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-100"
                        : "[color-scheme:light] bg-white border-gray-300 text-[rgb(19,31,36)]"
                    } ${updatingPreferences.preferred_voice ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {availableVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                    {availableVoices.length === 0 && (
                      <option value="" disabled>No Japanese voices available</option>
                    )}
                  </select>
                  {availableVoices.length === 0 && (
                    <p className={`text-xs text-red-500 ${preferenceState.theme === "dark" ? "" : "[color-scheme:light]"}`}>
                      No Japanese voices found. Please install Japanese language support in your system.
                    </p>
                  )}
                </div>

                {/* Image control */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${preferenceState.theme === "dark" ? "" : "[color-scheme:light] text-[rgb(19,31,36)]"}`}>Images</label>
                  <button
                    onClick={() => setShowImages(!showImages)}
                    className={`w-full px-3 py-1.5 rounded flex items-center justify-center ${
                      showImages
                        ? preferenceState.theme === "dark"
                          ? "bg-gray-600 text-white"
                          : "[color-scheme:light] bg-gray-700 text-white"
                        : preferenceState.theme === "dark"
                        ? "bg-gray-700 text-gray-300"
                        : "[color-scheme:light] bg-gray-200 text-gray-600"
                    } ${updatingPreferences.show_furigana ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {showImages ? "Hide Images" : "Show Images"}
                  </button>
                  <span className={`text-xs block text-center ${
                    preferenceState.theme === "dark" ? "text-gray-500" : "[color-scheme:light] text-gray-500"
                  }`}>
                    (Toggle article images)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Button */}
        <div ref={profileRef}>
          <button
            onClick={() => {
              if (!user) {
                signInWithGoogle();
              } else {
                setShowProfile(!showProfile);
                setShowSettings(false);
              }
            }}
            className={`p-3 rounded-lg shadow-lg border flex items-center justify-center transition-colors duration-150 ${
              preferenceState.theme === "dark"
                ? showProfile
                  ? "bg-gray-700/95 border-gray-700 backdrop-blur-sm"
                  : "bg-gray-800/95 hover:bg-gray-700/95 border-gray-700 backdrop-blur-sm"
                : showProfile
                  ? "[color-scheme:light] bg-gray-50/95 border-gray-200 backdrop-blur-sm"
                  : "[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200 backdrop-blur-sm"
            }`}
            title={user ? "Profile" : "Sign In"}
          >
            <FaUserCircle className={`w-5 h-5 ${
              preferenceState.theme === "dark" ? "text-gray-300" : "[color-scheme:light] text-gray-600"
            }`} />
          </button>

          {/* Profile panel - only shown when user is logged in and panel is open */}
          {user && showProfile && (
            <div 
              className={`absolute top-full right-0 mt-2 p-4 rounded-lg shadow-lg border w-72
              ${preferenceState.theme === "dark"
                ? "bg-gray-800 border-gray-700 text-gray-100"
                : "[color-scheme:light] bg-white border-gray-200 text-[rgb(19,31,36)]"
              }`}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className={`text-sm ${preferenceState.theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    Signed in as
                  </p>
                  <p className={`font-medium ${preferenceState.theme === "dark" ? "text-gray-100" : "text-[rgb(19,31,36)]"}`}>
                    {profile?.username || user.email}
                  </p>
                  <button
                    onClick={() => router.push(`/user/${encodeURIComponent(profile?.username || user.email)}`)}
                    className={`w-full px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2 ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    <FaUserCircle className="w-4 h-4" />
                    My Profile
                  </button>
                  <button
                    onClick={() => router.push('/saved')}
                    className={`w-full px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2 ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    <FaHeart className="w-4 h-4" />
                    Saved News
                  </button>
                  <button
                    onClick={signOut}
                    className={`w-full px-3 py-1.5 rounded text-sm ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={mainWrapperClasses}>
        {/* Sidebar */}
        <aside 
          ref={sidebarRef}
          className={sidebarClasses}
        >
          <div className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">News List</h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className={`p-2 rounded-full hover:bg-opacity-80 
                    ${preferenceState.theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {user && (
                <div className={`flex gap-1 p-1 rounded-lg ${
                  preferenceState.theme === 'dark' 
                    ? 'bg-gray-800/50' 
                    : 'bg-gray-100'
                  }`}
                >
                  <button
                    onClick={() => setSidebarView('latest')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2
                      ${sidebarView === 'latest'
                        ? preferenceState.theme === 'dark'
                          ? 'bg-gray-700 text-white shadow-sm'
                          : 'bg-white text-[rgb(19,31,36)] shadow-sm'
                        : preferenceState.theme === 'dark'
                          ? 'text-gray-400 hover:text-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
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
                    onClick={() => setSidebarView('saved')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2
                      ${sidebarView === 'saved'
                        ? preferenceState.theme === 'dark'
                          ? 'bg-gray-700 text-white shadow-sm'
                          : 'bg-white text-[rgb(19,31,36)] shadow-sm'
                        : preferenceState.theme === 'dark'
                          ? 'text-gray-400 hover:text-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <FaHeart className="w-3.5 h-3.5" />
                    Saved
                  </button>
                </div>
              )}
              
              <div className="space-y-4">
                {sidebarView === 'latest' ? (
                  recentNews?.length > 0 ? (
                    recentNews.map((article, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          router.push(`/read?source=${encodeURIComponent(article.url)}`);
                          setShowSidebar(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex gap-3
                          ${preferenceState.theme === 'dark' 
                            ? article.url === sourceUrl
                              ? 'bg-gray-800'
                              : 'hover:bg-gray-800/70'
                            : article.url === sourceUrl
                              ? 'bg-gray-100'
                              : 'hover:bg-gray-50'
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
                                  e.target.style.display = 'none';
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
                          <h3 className={`font-medium mb-1 line-clamp-2 ${
                            preferenceState.theme === 'dark' ? 'text-gray-200' : 'text-[rgb(19,31,36)]'
                          }`}>
                            {Array.isArray(article.title) 
                              ? article.title.map((part, i) => 
                                  part.type === 'ruby' ? part.kanji : part.content
                                ).join('')
                              : article.title}
                          </h3>
                          <p className={`text-sm ${
                            preferenceState.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {Array.isArray(article.date)
                              ? article.date.map(part => part.type === 'ruby' ? part.kanji : part.content).join('')
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
                      <svg className={`animate-spin h-6 w-6 mb-2 ${
                        preferenceState.theme === 'dark' ? 'text-gray-400' : 'text-[rgb(19,31,36)]'
                      }`} viewBox="0 0 24 24">
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
                      <span className={preferenceState.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
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
          {newsContent && (
            <div
              className='mt-4 p-0 rounded relative'
            >
              {/* Title section with padding for controls */}
              <div className="pt-4">
                <div className="mb-6">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h2 className={`text-2xl font-bold ${
                      preferenceState.theme === "dark" ? "text-gray-100" : "text-[rgb(19,31,36)]"
                    }`}>
                      {renderTitle(newsTitle)}
                    </h2>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                        ${preferenceState.theme === "dark"
                          ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      title={url ? new URL(url).hostname : 'Open original article'}
                    >
                      <FaExternalLinkAlt className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">Original</span>
                    </a>
                  </div>
                  <div
                    className={`text-sm ${
                      preferenceState.theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {formatJapaneseDate(newsDate)}
                  </div>

                  {/* News image */}
                  {newsImages?.length > 0 && showImages && (
                    <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-w-xl mx-auto">
                      <img
                        src={newsImages[0]}
                        alt=""
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {/* Progress indicator and repeat toggle - moved below image */}
                  {sentences?.length > 0 && (
                    <div className="mt-4 flex justify-between items-center">
                      {/* Progress bar on the left */}
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full w-48 h-2 overflow-hidden ${
                          preferenceState.theme === "dark" 
                            ? "bg-gray-800" 
                            : "bg-gray-100"
                        }`}>
                          <div 
                            className={`h-full transition-all duration-300 ${
                              preferenceState.theme === "dark" 
                                ? "bg-green-500" 
                                : "bg-green-600"
                            }`}
                            style={{ 
                              width: `${currentSentence >= 0 ? ((currentSentence + 1) / sentences.length) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className={`text-sm font-medium whitespace-nowrap ${
                          preferenceState.theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }`}>
                          {currentSentence >= 0
                            ? `${currentSentence + 1} / ${sentences.length}`
                            : `${sentences.length}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {newsImages.length > 0 && (
                  <div className={imageContainerClass}>
                    <img
                      src={newsImages[0]}
                      alt={newsImages[0].alt || ''}
                      className="w-full h-auto"
                    />
                    {newsImages[0].caption && (
                      <p className="p-2 text-sm text-gray-600">
                        {newsImages[0].caption}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  {newsContent.map((paragraph, pIndex) => (
                    <p
                      key={pIndex}
                      className={`mb-6 px-2 py-1 rounded-md leading-relaxed
                        ${preferenceState.font_size === "medium"
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
                        const sentenceBelongsToParagraph = sentence.some(part => 
                          paragraph.content.includes(part)
                        );

                        if (!sentenceBelongsToParagraph) return null;

                        return (
                          <span
                            key={sIndex}
                            onClick={() => handleSentenceClick(sIndex)}
                            className={`inline cursor-pointer rounded px-1
                              ${sIndex === currentSentence
                                ? preferenceState.theme === "dark"
                                  ? "bg-gray-700"
                                  : preferenceState.theme === "yellow"
                                    ? "bg-yellow-200"
                                    : "bg-emerald-50"
                                : preferenceState.theme === "dark"
                                  ? "hover:bg-gray-700/50"
                                  : "hover:bg-gray-100"
                              }
                              ${isRepeatMode && sIndex !== currentSentence 
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
                                return <span key={index}>{part.content}</span>;
                              }
                            })}
                          </span>
                        );
                      })}
                    </p>
                  ))}

                  {/* Mark as Finished button at the bottom of the article */}
                  {user && (
                    <div className="mt-8 mb-24 sm:mb-28 flex justify-center">
                      <button
                        onClick={toggleFinished}
                        disabled={finishLoading}
                        className={`
                          px-4 py-2 rounded-lg flex items-center justify-center gap-2
                          transition-all duration-150
                          ${preferenceState.theme === "dark"
                            ? isFinished
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                            : isFinished
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }
                          ${finishLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {finishLoading ? (
                          <div className="w-5 h-5 relative">
                            <div className={`absolute inset-0 rounded-full border-2 animate-spin ${
                              preferenceState.theme === "dark"
                                ? "border-gray-300 border-r-transparent"
                                : preferenceState.theme === "yellow"
                                  ? "border-yellow-500 border-r-transparent"
                                  : "border-gray-400 border-r-transparent"
                            }`}></div>
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
                <div className={`fixed inset-0 backdrop-blur-sm z-50 ${
                  preferenceState.theme === "dark" 
                    ? "bg-black/10" 
                    : "bg-white/70"
                }`} />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Media controls */}
      {sentences?.length > 0 && (
        <div className={`
          fixed bottom-0 left-0 right-0 z-40
          sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:w-[320px]
          ${preferenceState.theme === "dark"
            ? "bg-gray-800 border-t sm:border border-gray-700"
            : "[color-scheme:light] bg-white border-t sm:border border-gray-200"
          }
          px-4 sm:px-6 py-4 sm:rounded-full sm:shadow-lg
          shadow-[0_-2px_15px_-3px_rgba(0,0,0,0.1)] sm:shadow-lg
        `}>
          <div className="flex items-center justify-center gap-3">
            {/* Archive button */}
            {user && (
              <>
                <button
                  onClick={toggleSave}
                  disabled={archiveLoading}
                  className={`p-2 rounded-full flex items-center justify-center transition-colors duration-150
                    ${preferenceState.theme === "dark"
                      ? "hover:bg-gray-700/50"
                      : "hover:bg-gray-100/50"
                    }
                    ${archiveLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  title={isArchived ? "Remove from Saved" : "Save Article"}
                >
                  {archiveLoading ? (
                    <div className="w-4 h-4 relative">
                      <div className={`absolute inset-0 rounded-full border-2 animate-spin ${
                        preferenceState.theme === "dark"
                          ? "border-gray-300 border-r-transparent"
                          : preferenceState.theme === "yellow"
                            ? "border-yellow-500 border-r-transparent"
                            : "border-gray-400 border-r-transparent"
                      }`}></div>
                    </div>
                  ) : isArchived ? (
                    <FaHeart className={`w-4 h-4 ${
                      preferenceState.theme === "dark"
                        ? "text-red-400"
                        : preferenceState.theme === "yellow"
                          ? "text-red-500"
                          : "text-red-500"
                    }`} />
                  ) : (
                    <FaRegHeart className={`w-4 h-4 ${
                      preferenceState.theme === "dark"
                        ? "text-gray-300 hover:text-purple-400"
                        : preferenceState.theme === "yellow"
                          ? "text-gray-600 hover:text-purple-500"
                          : "text-gray-600 hover:text-purple-500"
                    }`} />
                  )}
                </button>
              </>
            )}

            {/* Play controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentSentence === 0 || isVoiceLoading}
                className={`p-2 rounded-full flex items-center justify-center 
                  ${preferenceState.theme === "dark"
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
                } text-white disabled:${preferenceState.theme === "dark" ? "opacity-40" : "bg-gray-600"} w-12 h-12 transition-all duration-150`}
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
                disabled={currentSentence === sentences.length - 1 || isVoiceLoading}
                className={`p-2 rounded-full flex items-center justify-center 
                  ${preferenceState.theme === "dark"
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
                ${preferenceState.theme === "dark"
                  ? "hover:bg-gray-700/50"
                  : "hover:bg-gray-100/50"
                }
              `}
              title={isRepeatMode 
                ? "Currently repeating one sentence with 1 second pause between repeats" 
                : "Click to repeat one sentence with 1 second pause between repeats"}
            >
              <RepeatIcon 
                className={`w-4 h-4 ${
                  isRepeatMode
                    ? "text-purple-500"
                    : preferenceState.theme === "dark"
                      ? "text-gray-300 hover:text-purple-400"
                      : "text-gray-600 hover:text-purple-500"
                }`} 
                isActive={isRepeatMode}
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
