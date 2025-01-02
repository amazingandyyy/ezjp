'use client';
import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { marked } from 'marked';
import { DEFAULT_READER_PREFERENCES } from '@/lib/constants';
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
import useStatsStore from '@/lib/stores/stats';
import { formatJapaneseDate } from '@/lib/utils/date';
import { getNewsSource, getHostname } from '@/lib/utils/urls';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { toast } from 'react-hot-toast';

import {
  LoadingIndicator,
  RubyText,
  processContent,
  RepeatIcon,
  SavedNewsList,
  MotivationalMessage,
  ConfirmationModal,
  NHKLogo,
  MainichiLogo,
  renderTitle,
} from "./components";

// Add import for Navbar
import Navbar from '../components/Navbar';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

// Add this helper function at the top level
const isBrowser = typeof window !== 'undefined';

// Add repeat mode constants
export const REPEAT_MODES = {
  NONE: 'none',
  ONE: 'one',
  ALL: 'all'
};

// Add at the top with other imports
// const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

// Add audioManager instance in the NewsReaderContent component
function NewsReaderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sourceUrl = searchParams.get('source');
  const { user, signOut, profile } = useAuth();
  const { t } = useTranslation();
  const [isPremium, setIsPremium] = useState(false);

  // All state declarations
  const [url, setUrl] = useState('');
  const [currentArticleId, setCurrentArticleId] = useState(null);
  const [article, setArticle] = useState(null); // Add article state
  const [showProfile, setShowProfile] = useState(false);
  const [preferenceState, setPreferenceState] = useState({
    ...DEFAULT_READER_PREFERENCES,
    preferred_translation_language: 'en'
  });
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
  const [loadingNewsList, setLoadingNewsList] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [repeatCountdown, setRepeatCountdown] = useState(0);
  const [repeatMode, setRepeatMode] = useState(REPEAT_MODES.ALL);
  const [audioCache, setAudioCache] = useState({});
  const [audioElement, setAudioElement] = useState(null);
  const [newsTitle, setNewsTitle] = useState([]);
  const [newsContent, setNewsContent] = useState([]);
  const [newsDate, setNewsDate] = useState(null);
  const [newsImages, setNewsImages] = useState([]);
  const [newsLabels, setNewsLabels] = useState([]); // Add state for labels
  const [wordCount, setWordCount] = useState(0); // Add state for word count
  const [currentSentence, setCurrentSentence] = useState(-1);
  const [sentences, setSentences] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showMotivation, setShowMotivation] = useState(false);
  const [showConfirmUnfinish, setShowConfirmUnfinish] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentAudio, setCurrentAudio] = useState(null);
  const audioRef = useRef(null);

  // Refs
  const sidebarRef = useRef(null);
  const settingsRef = useRef(null);
  const profileRef = useRef(null);

  // Add refs for timers
  const repeatIntervalRef = useRef(null);
  const repeatTimeoutRef = useRef(null);

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
    fixed top-0 h-screen transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-50
    ${showSidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
    ${isLargeScreen ? 'lg:fixed lg:top-0 lg:shadow-xl' : ''}
    ${preferenceState.theme === 'dark' 
      ? 'bg-[rgb(19,31,36)] backdrop-blur-xl bg-opacity-95' 
      : 'bg-white backdrop-blur-xl bg-opacity-95'
    } 
    border-r ${preferenceState.theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}
    overflow-y-auto
    w-[400px]
    scrollbar-thin ${preferenceState.theme === 'dark' 
      ? 'scrollbar-track-gray-800 scrollbar-thumb-gray-700' 
      : 'scrollbar-track-gray-100 scrollbar-thumb-gray-300'
    }
  `;

  const mainContentClasses = `
    transition-all duration-300 ease-in-out transform
    ${showSidebar && isLargeScreen 
      ? 'lg:translate-x-[200px]' 
      : 'translate-x-0'
    }
    max-w-3xl mx-auto
    pt-8 p-4 pb-32
    ${preferenceState.theme === 'dark' ? 'prose-invert' : 'prose'}
    prose-headings:font-serif
    prose-p:leading-relaxed
    prose-p:tracking-wide
  `;

  const mainWrapperClasses = `
    min-h-screen relative pt-6
  `;

  const overlayClasses = `
    fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-all duration-500
    ${!isLargeScreen && showSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'}
  `;

  // Add this class near the top of the component where other class definitions are
  const mediaControlsClass = `
    fixed left-0 sm:left-1/2 bottom-0 sm:bottom-6
    w-full sm:w-auto sm:-translate-x-1/2
    px-4 sm:px-6 py-4 pb-8 sm:pb-4 sm:rounded-full
    backdrop-blur-md
    ${preferenceState.theme === "dark" ? "bg-gray-800/90" : "bg-white/90"} 
    shadow-lg border-t sm:border 
    ${preferenceState.theme === "dark" ? "border-gray-700" : "border-gray-200"}
    z-40
    transition-all duration-300 ease-in-out
  `;

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

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

        if (preferences) {
          // Ensure preferred_speed is a valid number
          let preferred_speed = 1.0;
          if (typeof preferences.preferred_speed === 'number' && !isNaN(preferences.preferred_speed)) {
            preferred_speed = preferences.preferred_speed;
          } else if (typeof preferences.preferred_speed === 'string') {
            const parsed = parseFloat(preferences.preferred_speed);
            if (!isNaN(parsed)) {
              preferred_speed = parsed;
            }
          }

          setPreferenceState(prev => ({
            ...prev,
            theme: preferences.theme || prev.theme,
            font_size: preferences.font_size || prev.font_size,
            show_furigana: preferences.show_furigana ?? prev.show_furigana,
            preferred_speed: preferred_speed,
            preferred_voice: preferences.preferred_voice || prev.preferred_voice,
            reading_level: preferences.reading_level || prev.reading_level,
            preferred_translation_language: preferences.preferred_translation_language || prev.preferred_translation_language
          }));
        }
      } catch (error) {
        console.error('Error in loadPreferences:', error);
      }
    };

    loadPreferences();
  }, [user]); // Only depend on user changes

  // Remove selectedVoice state
  const [availableVoices, setAvailableVoices] = useState([]);
  
  // Voice initialization effect
  useEffect(() => {
    const fetchVoices = async (retryCount = 0) => {
      try {
        const response = await fetch('/api/tts/voices');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        setAvailableVoices(data.voices);
        
        // Set default voice based on login status
        if (!preferenceState.preferred_voice) {
          // Default voices for different user states
          const defaultVoice = !user ? 'ja-JP-Standard-D' : 'ja-JP-Wavenet-D';
          setPreferenceState(prev => ({ ...prev, preferred_voice: defaultVoice }));
        }
      } catch (error) {
        console.error('Error fetching voices:', error);
        // Retry up to 3 times with exponential backoff
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          setTimeout(() => fetchVoices(retryCount + 1), delay);
        } else {
          setAudioError(t('reader.errors.failedToLoadVoices'));
        }
      }
    };

    fetchVoices();
  }, [user]); // Add user as dependency to update when login status changes

  // Function to cleanup current audio
  const cleanupAudio = async () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.onended = null; // Remove event listeners
      currentAudio.onplay = null;
      currentAudio.onpause = null;
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      // Small delay to ensure audio is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  // Update the handleVoiceChange function
  const handleVoiceChange = async (voiceName) => {
    // Check for premium voices - use profile.role_level instead of isPremium
    if ((voiceName.includes("Neural2") || voiceName.includes("Wavenet")) && (!profile?.role_level || profile.role_level === 0)) {
      setToastMessage(t("reader.messages.premiumVoicesOnly"));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }

    try {
      setIsVoiceLoading(true);
      setIsPlaying(false);
      setIsPaused(false);

      // Cleanup current audio
      await cleanupAudio();

      // Clear audio cache first
      Object.values(audioCache).forEach(url => {
        URL.revokeObjectURL(url);
      });
      setAudioCache({});

      // Update local state first
      setPreferenceState(prev => ({
        ...prev,
        preferred_voice: voiceName
      }));

      // Only update database if user is logged in
      if (user) {
        try {
          setUpdatingPreferences(prev => ({ ...prev, preferred_voice: true }));
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ preferred_voice: voiceName })
            .eq('id', user.id);

          if (updateError) throw updateError;
        } catch (error) {
          console.error('Error updating voice preference:', error);
          // Don't throw here - we still want to continue with voice change even if save fails
        } finally {
          setUpdatingPreferences(prev => ({ ...prev, preferred_voice: false }));
        }
      }

      // Wait for state update to be reflected
      await new Promise(resolve => setTimeout(resolve, 100));

      // If there's a current sentence, wait a bit before replaying with new voice
      if (currentSentence >= 0 && sentences[currentSentence]) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const sentenceText = sentenceToText(sentences[currentSentence]);
        
        // Make TTS request with new voice explicitly
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: sentenceText,
            speed: preferenceState.preferred_speed,
            voice: voiceName, // Use new voice directly
            userId: user?.id,
            articleId: currentArticleId,
            sentenceIndex: currentSentence,
            characterCount: sentenceText.length
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || error.error);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = preferenceState.preferred_speed || 1.0;

        // Set up the onended handler
        audio.onended = () => {
          setIsPlaying(false);
          setIsPaused(false);
          handleSentenceEnd(currentSentence, repeatMode);
        };

        // Cache the new audio
        const cacheKey = `${sentenceText}_${voiceName}_${preferenceState.preferred_speed}`;
        setAudioCache(prev => ({
          ...prev,
          [cacheKey]: url
        }));

        setCurrentAudio(audio);
        setIsVoiceLoading(false);
        setIsPlaying(true);
        setIsPaused(false);
        await audio.play();
      }
    } catch (error) {
      console.error('Error in voice change:', error);
      setAudioError(t('reader.errors.failedToChangeVoice'));
    } finally {
      setIsVoiceLoading(false);
    }
  };

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

  // Add new state for article loading
  const [loadingArticle, setLoadingArticle] = useState(false);

  // Add helper function to count words
  const countWords = (content) => {
    if (!Array.isArray(content)) return 0;
    
    let count = 0;
    content.forEach(paragraph => {
      if (paragraph.type === 'paragraph') {
        paragraph.content.forEach(part => {
          if (part.type === 'ruby') {
            count++; // Count each kanji compound as one word
          } else if (part.type === 'text') {
            // Count Japanese words by splitting on spaces and punctuation
            const words = part.content.split(/[\s。、！？]/);
            count += words.filter(word => word.length > 0).length;
          }
        });
      }
    });
    return count;
  };

  // Update fetchNews function to set labels and word count
  const fetchNews = async (url) => {
    if (!url) return;
    
    try {
      console.log('Fetching article from API');
      setLoadingArticle(true);
      setError(null); // Clear any previous errors
      
      const response = await fetch(`/api/fetch-news?source=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error('This article had an issue loading. Please try another one.');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || 'This article had an issue loading. Please try another one.');
      }

      // Process the successful response
      setNewsTitle(data.title);
      setNewsContent(data.content);
      const dateToUse = data.publish_date || data.published_date || data.date;
      console.log('Using date:', dateToUse);
      setNewsDate(dateToUse);
      setNewsImages(data.images || []);
      setNewsLabels(data.labels || []); // Set labels
      setCurrentSentence(-1);
      setSentences(splitIntoSentences(data.content));
      setReadingStartTime(Date.now());
      
      // Calculate and set word count
      setWordCount(countWords(data.content));
    } catch (error) {
      console.error('Error fetching news:', error);
      setError(error.message || 'This article had an issue loading. Please try another one.');
      // Clear content states on error
      setNewsTitle([]);
      setNewsContent([]);
      setNewsDate(null);
      setNewsImages([]);
      setNewsLabels([]);
      setCurrentSentence(-1);
      setSentences([]);
      setWordCount(0);
    } finally {
      // Add a minimum loading time to prevent flashing
      const minimumLoadingTime = 300;
      const loadingStartTime = Date.now();
      const timeElapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minimumLoadingTime - timeElapsed);
      
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      setLoadingArticle(false);
    }
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
      if (!preferenceState.preferred_voice && japaneseVoices.length > 0) {
        // Try to find Microsoft Keita first
        const keitaVoice = japaneseVoices.find(voice => 
          voice.name.toLowerCase().includes('microsoft keita') || 
          voice.name.toLowerCase().includes('microsoft けいた')
        );
        
        // Set default voice (Keita if available, otherwise first Japanese voice)
        setPreferenceState(prev => ({ ...prev, preferred_voice: keitaVoice || japaneseVoices[0] }));
      }
    }

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []); // Remove selectedVoice from dependencies

  // Add this useEffect near other useEffects
  useEffect(() => {
    // If there's a current utterance playing, update its onend handler
    if (isPlaying && window.currentUtterance) {
      const utterance = window.currentUtterance;
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        
        // Clear any existing repeat intervals
        if (repeatIntervalRef.current) {
          clearInterval(repeatIntervalRef.current);
          repeatIntervalRef.current = null;
        }
        
        if (repeatMode === REPEAT_MODES.ONE) {
          let countdownValue = 2;
          setRepeatCountdown(countdownValue);
          repeatIntervalRef.current = setInterval(() => {
            countdownValue -= 1;
            setRepeatCountdown(countdownValue);
            
            if (countdownValue <= 0) {
              clearInterval(repeatIntervalRef.current);
              repeatIntervalRef.current = null;
              
              repeatTimeoutRef.current = setTimeout(() => {
                const repeatUtterance = new SpeechSynthesisUtterance(sentenceToText(sentences[currentSentence]));
                repeatUtterance.voice = utterance.voice;
                repeatUtterance.lang = 'ja-JP';
                repeatUtterance.rate = utterance.rate;
                
                // Store the new utterance
                window.currentUtterance = repeatUtterance;
                
                // Set up the same handlers
                repeatUtterance.onend = utterance.onend;
                repeatUtterance.onpause = utterance.onpause;
                repeatUtterance.onresume = utterance.onresume;
                
                setIsPlaying(true);
                speechSynthesis.speak(repeatUtterance);
              }, 200);
            }
          }, 1000);
        } else if (repeatMode === REPEAT_MODES.ALL && currentSentence < sentences.length - 1) {
          repeatTimeoutRef.current = setTimeout(() => {
            setCurrentSentence(currentSentence + 1);
            playCurrentSentence(currentSentence + 1);
          }, 800);
        } else if (repeatMode === REPEAT_MODES.ALL && currentSentence === sentences.length - 1) {
          let countdownValue = 5;
          setRepeatCountdown(countdownValue);
          repeatIntervalRef.current = setInterval(() => {
            countdownValue -= 1;
            setRepeatCountdown(countdownValue);
            
            if (countdownValue <= 0) {
              clearInterval(repeatIntervalRef.current);
              repeatIntervalRef.current = null;
              
              repeatTimeoutRef.current = setTimeout(() => {
                setCurrentSentence(0);
                playCurrentSentence(0);
              }, 200);
            }
          }, 1000);
        }
      };
    }
  }, [repeatMode, isPlaying]);

  // Add useEffect to clear audio cache when voice or speed changes
  useEffect(() => {
    // Clear audio cache when voice or speed changes
    setAudioCache({});
    // Also stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    setIsPlaying(false);
    setIsPaused(false);
  }, [preferenceState.preferred_voice, preferenceState.preferred_speed]);

  // Audio playback functions
  const playCurrentSentence = async (index = currentSentence) => {
    if (!isBrowser || !sentences[index] || !currentArticleId) {
      console.error('Cannot play sentence: missing required data');
      return;
    }
    
    try {
      const sentenceText = sentenceToText(sentences[index]);
      const cacheKey = `${sentenceText}_${preferenceState.preferred_voice}_${preferenceState.preferred_speed}`;

      setIsVoiceLoading(true);
      setAudioError('');
      
      // Cleanup previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onplay = null;
        audioRef.current.onpause = null;
        audioRef.current.onerror = null;
      }

      let audioUrl = audioCache[cacheKey];
      
      if (!audioUrl) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: sentenceText,
            speed: preferenceState.preferred_speed,
            voice: preferenceState.preferred_voice,
            userId: user?.id,
            articleId: currentArticleId,
            sentenceIndex: index,
            characterCount: sentenceText.length
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || error.error);
        }
        
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        
        setAudioCache(prev => ({
          ...prev,
          [cacheKey]: audioUrl
        }));
      }

      const audio = new Audio(audioUrl);
      audio.playbackRate = preferenceState.preferred_speed || 1.0;
      
      // Set up event handlers
      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        // Ensure we're using the current index when the audio ends
        handleSentenceEnd(index, repeatMode);
      };

      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };

      audio.onpause = () => {
        setIsPlaying(false);
        setIsPaused(true);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setAudioError('Failed to play audio. Please try again.');
        setIsPlaying(false);
        setIsPaused(false);
      };

      // Store reference for cleanup
      audioRef.current = audio;
      setCurrentAudio(audio);
      
      setIsVoiceLoading(false);
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioError(error.message || 'Failed to play audio. Please try again.');
      setIsVoiceLoading(false);
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const resumeAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  // Add cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current = null;
      }
      Object.values(audioCache).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Update speed when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = preferenceState.preferred_speed || 1.0;
    }
  }, [preferenceState.preferred_speed]);

  // Add handleSentenceEnd function to handle repeat logic
  const handleSentenceEnd = (index, mode = repeatMode) => {
    // Clear any existing interval and timeouts
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }

    // Reset countdown
    setRepeatCountdown(0);

    // Use the provided mode or current state
    const currentMode = mode || repeatMode;

    if (currentMode === REPEAT_MODES.ONE) {
      // For repeat one: wait 2 seconds and replay the same sentence
      let countdownValue = 2;
      setRepeatCountdown(countdownValue);
      
      repeatIntervalRef.current = setInterval(() => {
        countdownValue -= 1;
        setRepeatCountdown(countdownValue);
        
        if (countdownValue <= 0) {
          clearInterval(repeatIntervalRef.current);
          repeatIntervalRef.current = null;
          
          // Play the same sentence again
          repeatTimeoutRef.current = setTimeout(() => {
            if (repeatMode === REPEAT_MODES.ONE) {
              playCurrentSentence(index);
            }
          }, 200);
        }
      }, 1000);
    } else if (currentMode === REPEAT_MODES.ALL) {
      if (index < sentences.length - 1) {
        // If not the last sentence, play next sentence after a short delay
        repeatTimeoutRef.current = setTimeout(() => {
          if (repeatMode === REPEAT_MODES.ALL) {
            setCurrentSentence(index + 1);
            playCurrentSentence(index + 1);
          }
        }, 800);
      } else {
        // If last sentence, wait 5 seconds and start from beginning
        let countdownValue = 5;
        setRepeatCountdown(countdownValue);
        
        repeatIntervalRef.current = setInterval(() => {
          countdownValue -= 1;
          setRepeatCountdown(countdownValue);
          
          if (countdownValue <= 0) {
            clearInterval(repeatIntervalRef.current);
            repeatIntervalRef.current = null;
            setRepeatCountdown(0);
            
            if (repeatMode === REPEAT_MODES.ALL) {
              setCurrentSentence(0);
              repeatTimeoutRef.current = setTimeout(() => {
                playCurrentSentence(0);
              }, 200);
            }
          }
        }, 1000);
      }
    } else {
      // For no repeat: continue to next sentence if available
      if (index < sentences.length - 1) {
        repeatTimeoutRef.current = setTimeout(() => {
          if (repeatMode === REPEAT_MODES.NONE) {
            setCurrentSentence(index + 1);
            playCurrentSentence(index + 1);
          }
        }, 800);
      } else {
        // If it's the last sentence, just stop
        setIsPlaying(false);
        setIsPaused(false);
        setRepeatCountdown(0);
        setCurrentSentence(-1); // Reset to beginning
      }
    }
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

    // Update local state immediately for instant feedback
    setPreferenceState(prev => ({
      ...prev,
      preferred_speed: speedValue
    }));

    // Apply speed to current audio immediately if playing
    if (currentAudio) {
      currentAudio.playbackRate = speedValue;
    }

    // Save to database in the background if user is logged in
    if (user) {
      try {
        setUpdatingPreferences(prev => ({ ...prev, preferred_speed: true }));
        
        const { error } = await supabase
          .from('profiles')
          .update({
            preferred_speed: speedValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Database error:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error saving speed:', error);
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

  // Update useEffect for speed changes
  useEffect(() => {
    if (currentAudio) {
      const speed = typeof preferenceState.preferred_speed === 'number' && !isNaN(preferenceState.preferred_speed)
        ? preferenceState.preferred_speed
        : 1.0;
      currentAudio.playbackRate = speed;
    }
  }, [preferenceState.preferred_speed, currentAudio]);

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
      // Stop any playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      
      // Clean up cached audio URLs
      Object.values(audioCache).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [currentAudio, audioCache]);

  useEffect(() => {
    if (currentAudio) {
      currentAudio.playbackRate = preferenceState.preferred_speed || 1.0;
    }
  }, [preferenceState.preferred_speed]);

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
    
    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    setCurrentSentence(index);
    setIsPlaying(false);
    setIsPaused(false);
    
    // Play the new sentence
    await playCurrentSentence(index);
  };

  // Update the repeat countdown styles
  const getRepeatCountdownClasses = () => {
    const baseClasses = 'fixed left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-medium z-50';
    const positionClasses = 'bottom-[100px] sm:bottom-24'; // Increased bottom spacing for mobile
    return `${baseClasses} ${positionClasses} ${
      preferenceState.theme === 'dark'
        ? 'bg-gray-800 text-gray-100'
        : 'bg-white text-[rgb(19,31,36)] shadow-md'
    }`;
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
      setLoadingNewsList(true);
      const response = await axios.get('/api/fetch-news-list', {
        params: { limit: 50 }
      });
      if (response.data.success && Array.isArray(response.data.newsList)) {
        setRecentNews(response.data.newsList);
        // Refresh finished and archived URLs when fetching news
        if (user) {
          await Promise.all([
            fetchFinishedArticles(),
            fetchArchivedUrls()
          ]);
        }
      } else {
        console.error('Invalid response format from fetch-news-list');
        setRecentNews([]);
        setRecentNewsError(true);
      }
    } catch (error) {
      console.error('Error fetching recent news:', error);
      setRecentNews([]);
      setRecentNewsError(true);
    } finally {
      // Add a minimum loading time to prevent flashing
      const minimumLoadingTime = 300;
      const loadingStartTime = Date.now();
      const timeElapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minimumLoadingTime - timeElapsed);
      
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      setLoadingNewsList(false);
    }
  };

  // Add this useEffect to fetch recent news when sidebar opens
  useEffect(() => {
    if (showSidebar && !recentNews?.length) {
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
        reading_level: profile.reading_level || 'beginner',
        preferred_translation_language: profile.preferred_translation_language || 'en'
      });
      
      if (profile.preferred_voice) {
        const savedVoice = availableVoices.find(v => v.voiceURI === profile.preferred_voice);
        if (savedVoice) {
          setPreferenceState(prev => ({ ...prev, preferred_voice: savedVoice }));
        }
      }
    }
  }, [profile, availableVoices]);

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
      setFinishLoading(true);
      const currentUrl = new URL(url);
      const urlWithoutParams = currentUrl.origin + currentUrl.pathname;

      const { data } = await supabase
        .from('finished_articles')
        .select('id')
        .eq('user_id', user.id)
        .eq('url', urlWithoutParams)
        .single();
      
      setIsFinished(!!data);
    } catch (error) {
      if (error.code !== 'PGRST116') { // Ignore "not found" errors
        console.error('Error checking finish status:', error);
      }
      setIsFinished(false);
    } finally {
      setFinishLoading(false);
    }
  };

  // Add this effect to check status when URL or user changes
  useEffect(() => {
    checkFinishStatus();
    checkSaveStatus();
  }, [url, user]);

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
      setToastMessage(t('reader.messages.signInToSaveArticles'));
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

  // Add a useEffect to handle repeat mode changes
  useEffect(() => {
    if (!preferenceState.repeat_mode && audioElement) {
      // If repeat mode is turned off during playback
      setRepeatCountdown(0);
    }
  }, [preferenceState.repeat_mode]);

  // Update the repeat toggle button handler
  const handleRepeatToggle = () => {
    const nextMode = getNextRepeatMode(repeatMode);
    setRepeatMode(nextMode);

    // Clear all timers
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
    setRepeatCountdown(0);

    // If we're switching from REPEAT_ONE to another mode and audio is not playing,
    // we need to handle the transition immediately
    if (repeatMode === REPEAT_MODES.ONE && !isPlaying) {
      handleSentenceEnd(currentSentence, nextMode);
    }
  };

  // Add helper function to get next repeat mode
  const getNextRepeatMode = (currentMode) => {
    switch (currentMode) {
      case REPEAT_MODES.NONE:
        return REPEAT_MODES.ALL;
      case REPEAT_MODES.ALL:
        return REPEAT_MODES.ONE;
      case REPEAT_MODES.ONE:
        return REPEAT_MODES.NONE;
      default:
        return REPEAT_MODES.NONE;
    }
  };

  // Update the sentence rendering to use chunks
  const renderSentence = (sentence, index) => {
    if (!isLearningMode) {
      return processContent(sentence).map((part, i) => {
        if (part.type === "ruby") {
          return (
            <span key={i} className="transition-all duration-200">
              <RubyText
                part={part}
                preferenceState={preferenceState}
              />
            </span>
          );
        } else {
          return (
            <span key={i} className="transition-all duration-200">
              {part.content}
            </span>
          );
        }
      });
    }

    // Learning mode display
    return (
      <div className="my-4 first:mt-0 last:mb-0">
        {/* Sentence content */}
        <div
          className={`mb-3 p-5 rounded-xl ${
            preferenceState.theme === "dark" ? "bg-gray-800/50" : "bg-gray-50"
          }`}
        >
          <div
            className={`${
              preferenceState.font_size === "medium"
                ? "text-lg"
                : preferenceState.font_size === "large"
                ? "text-xl"
                : preferenceState.font_size === "x-large"
                ? "text-2xl"
                : "text-3xl"
            } leading-relaxed tracking-wide`}
          >
            {processContent(sentence).map((part, i) => {
              if (part.type === "ruby") {
                return (
                  <span key={i} className="transition-all duration-200">
                    <RubyText part={part} preferenceState={preferenceState} />
                  </span>
                );
              } else {
                return (
                  <span key={i} className="transition-all duration-200">
                    {part.content}
                  </span>
                );
              }
            })}
          </div>
        </div>

        {/* Learning mode buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => {
              if (isPlaying && currentSentence === index) {
                pauseAudio();
              } else {
                setCurrentSentence(index);
                playCurrentSentence(index);
              }
            }}
            disabled={isVoiceLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${preferenceState.theme === "dark"
                ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
          >
            {isVoiceLoading && currentSentence === index ? (
              <div className="w-4 h-4 relative">
                <div
                  className={`absolute inset-0 rounded-full border-2 animate-spin ${
                    preferenceState.theme === "dark"
                      ? "border-purple-400 border-r-transparent"
                      : "border-purple-700 border-r-transparent"
                  }`}
                ></div>
              </div>
            ) : isPlaying && currentSentence === index ? (
              "Pause"
            ) : (
              t('reader.buttons.read')
            )}
          </button>

          {/* Translation controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => translateSentence(sentenceToText(sentence), index)}
              disabled={loadingTranslations[index]}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${preferenceState.theme === "dark"
                  ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }
                ${loadingTranslations[index] ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {loadingTranslations[index] ? (
                <div className="w-4 h-4 relative">
                  <div
                    className={`absolute inset-0 rounded-full border-2 animate-spin ${
                      preferenceState.theme === "dark"
                        ? "border-blue-400 border-r-transparent"
                        : "border-blue-700 border-r-transparent"
                    }`}
                  ></div>
                </div>
              ) : (
                `${SUPPORTED_LANGUAGES[preferenceState.preferred_translation_language]}`
              )}
            </button>
          </div>

          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${
                preferenceState.theme === "dark"
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }
              ${loadingTutor[index] ? "opacity-50 cursor-not-allowed" : ""}
            `}
            onClick={() => getTutorExplanation(sentenceToText(sentence), index)}
            disabled={loadingTutor[index]}
          >
            {loadingTutor[index] ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 relative">
                  <div
                    className={`absolute inset-0 rounded-full border-2 animate-spin ${
                      preferenceState.theme === "dark"
                        ? "border-green-400 border-r-transparent"
                        : "border-green-700 border-r-transparent"
                    }`}
                  ></div>
                </div>
                <span>{t('reader.buttons.aiTutor')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span>{t('reader.buttons.aiTutor')}</span>
              </div>
            )}
          </button>
        </div>

        {/* Translation section */}
        <div
          className={`mb-3 rounded-xl ${
            preferenceState.theme === "dark" ? "bg-gray-800/30" : "bg-gray-50"
          }`}
        >
          {translations[index] ? (
            <div className="p-5 space-y-3">
              <div
                className={`${
                  preferenceState.font_size === "medium"
                    ? "text-base"
                    : preferenceState.font_size === "large"
                    ? "text-lg"
                    : preferenceState.font_size === "x-large"
                    ? "text-xl"
                    : "text-2xl"
                } leading-relaxed tracking-wide`}
              >
                {translations[index]}
              </div>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 p-5 ${
                preferenceState.theme === "dark"
                  ? "text-gray-400"
                  : "text-gray-500"
              }`}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              <span className="text-sm font-medium">
                {t('reader.translation.clickToTranslate', { language: SUPPORTED_LANGUAGES[preferenceState.preferred_translation_language].toLowerCase() })}
              </span>
            </div>
          )}
        </div>
        <div
          className={`text-sm rounded-xl p-5 ${
            preferenceState.theme === "dark" ? "bg-gray-800/30" : "bg-gray-50"
          }`}
        >
          <div
            className={`prose ${
              preferenceState.theme === "dark" ? "prose-invert" : ""
            } max-w-none
            prose-headings:font-bold prose-headings:tracking-tight
            prose-h1:text-xl prose-h1:mt-0 prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b ${
              preferenceState.theme === "dark"
                ? "prose-h1:border-gray-700"
                : "prose-h1:border-gray-200"
            }
            prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
            prose-p:text-base prose-p:leading-relaxed prose-p:my-3
            prose-li:text-base prose-li:my-1
            prose-strong:text-base prose-strong:font-semibold
            prose-em:text-gray-500 prose-em:font-normal
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
            [&_td]:border [&_td]:p-2 [&_td]:text-sm [&_td]:align-middle
            [&_th]:border [&_th]:p-2 [&_th]:text-sm [&_th]:font-bold [&_th]:align-middle
            ${
              preferenceState.theme === "dark"
                ? "[&_td]:border-gray-700 [&_th]:border-gray-700 [&_th]:bg-gray-800/50"
                : "[&_td]:border-gray-200 [&_th]:border-gray-200 [&_th]:bg-gray-100"
            }
            [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4
            [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4
            [&_code]:text-sm [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
            ${
              preferenceState.theme === "dark"
                ? "[&_code]:bg-gray-800 [&_code]:text-gray-200"
                : "[&_code]:bg-gray-100 [&_code]:text-gray-800"
            }
          `}
          >
            {tutorExplanations[index] ? (
              <div className="space-y-6">
                {/* Translation section with no horizontal scroll */}
                <div>
                  <div
                    className="text-base leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: marked(
                        tutorExplanations[index]
                          .split("# Cultural Context")[0]
                          .replace("# Translation\n", "")
                      ),
                    }}
                  />
                </div>

                {/* Cultural Context section with no horizontal scroll */}
                {tutorExplanations[index].includes("# Cultural Context") && (
                  <div>
                    <h1 className="text-xl font-bold tracking-tight mb-3">
                      Cultural Context
                    </h1>
                    <div
                      className="text-base leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: marked(
                          tutorExplanations[index]
                            .split("# Cultural Context")[1]
                            .split("# Important Grammar Concepts")[0]
                            .replace(/^\s*\n/gm, "")
                        ),
                      }}
                    />
                  </div>
                )}

                {/* Important Grammar Concepts section with horizontal scroll if needed */}
                {tutorExplanations[index].includes(
                  "# Important Grammar Concepts"
                ) && (
                  <div>
                    <div className="overflow-x-auto -mx-5">
                      <div
                        className="px-5 min-w-[320px]"
                        dangerouslySetInnerHTML={{
                          __html: marked(
                            tutorExplanations[index]
                              .split("# Important Grammar Concepts")[1]
                              .split("# Key Vocabulary")[0]
                              .replace(/^\s*\n/gm, "")
                          ),
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Key Vocabulary section with horizontal scroll for table */}
                {tutorExplanations[index].includes("# Key Vocabulary") && (
                  <div>
                    <h1 className="text-xl font-bold tracking-tight mb-3">
                      Key Vocabulary
                    </h1>
                    <div className="overflow-x-auto -mx-5">
                      <div
                        className="px-5 min-w-[600px]"
                        dangerouslySetInnerHTML={{
                          __html: marked(
                            tutorExplanations[index]
                              .split("# Key Vocabulary")[1]
                              .split("\n\n")[0]
                              .replace(/^\s*\n/gm, "")
                          ),
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Follow-up Conversations */}
                {conversations[index]?.length > 0 && (
                  <div className="mt-8">
                    <h1 className="text-xl font-bold tracking-tight mb-4">Follow-up Questions</h1>
                    <div className="space-y-4">
                      {conversations[index].map((conv, convIndex) => (
                        <div key={convIndex} className="space-y-3">
                          {/* Question */}
                          <div className={`flex items-start gap-3 ${
                            preferenceState.theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}>
                            <div className={`p-2 rounded-lg ${
                              preferenceState.theme === "dark" 
                                ? "bg-blue-500/20 text-blue-400" 
                                : "bg-blue-50 text-blue-700"
                            }`}>
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">You asked:</p>
                              <p className="mt-1">{conv.question}</p>
                            </div>
                          </div>

                          {/* Answer */}
                          <div className={`flex items-start gap-3 ${
                            preferenceState.theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}>
                            <div className={`p-2 rounded-lg ${
                              preferenceState.theme === "dark"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-green-50 text-green-700"
                            }`}>
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">AI Tutor's response:</p>
                              {conv.loading ? (
                                <div className="flex items-center gap-2 mt-2 text-sm">
                                  <div className="w-4 h-4 relative">
                                    <div className={`absolute inset-0 rounded-full border-2 animate-spin ${
                                      preferenceState.theme === "dark"
                                        ? "border-green-400 border-r-transparent"
                                        : "border-green-700 border-r-transparent"
                                    }`}></div>
                                  </div>
                                  <span>Thinking...</span>
                                </div>
                              ) : (
                                <div className="mt-1 prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: marked(conv.answer) }} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up Question Input */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ask a follow-up question..."
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        preferenceState.theme === "dark"
                          ? "bg-gray-800/50 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-gray-600"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-400"
                      }`}
                      value={followUpQuestions[index] || ""}
                      onChange={(e) =>
                        setFollowUpQuestions((prev) => ({
                          ...prev,
                          [index]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          const question = followUpQuestions[index];
                          if (question?.trim()) {
                            getTutorExplanation(
                              sentenceToText(sentence),
                              index,
                              question
                            );
                            setFollowUpQuestions((prev) => ({
                              ...prev,
                              [index]: "",
                            }));
                          }
                        }
                      }}
                    />
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${
                          preferenceState.theme === "dark"
                            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }
                        ${
                          loadingTutor[index]
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }
                      `}
                      onClick={() => {
                        const question = followUpQuestions[index];
                        if (question?.trim()) {
                          getTutorExplanation(
                            sentenceToText(sentence),
                            index,
                            question
                          );
                          setFollowUpQuestions((prev) => ({
                            ...prev,
                            [index]: "",
                          }));
                        }
                      }}
                      disabled={
                        loadingTutor[index] || !followUpQuestions[index]?.trim()
                      }
                    >
                      Ask
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`${
                  preferenceState.theme === "dark"
                    ? "text-gray-400"
                    : "text-gray-600"
                }`}
              >
                {loadingTutor[index] ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                    <span>AI Tutor is thinking...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <span>{t('reader.translation.clickForAITutor')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add cleanup for repeat interval
  useEffect(() => {
    return () => {
      if (repeatIntervalRef.current) {
        clearInterval(repeatIntervalRef.current);
        repeatIntervalRef.current = null;
      }
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
        repeatTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle clicks outside sidebar
  useEffect(() => {
    function handleClickOutside(event) {
      if (sidebarRef.current && 
          !sidebarRef.current.contains(event.target) && 
          !event.target.closest('button[title="Show News List"]') && // Exclude the toggle button
          showSidebar) {
        setShowSidebar(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSidebar]);

  // Add this useEffect to handle speed changes
  useEffect(() => {
    if (isPlaying && window.currentUtterance) {
      const speed = typeof preferenceState.preferred_speed === 'number' && !isNaN(preferenceState.preferred_speed)
        ? preferenceState.preferred_speed
        : 1.0;

      // Cancel current speech and restart with new speed
      const currentText = window.currentUtterance.text;
      const currentVoice = window.currentUtterance.voice;
      const currentHandlers = {
        onend: window.currentUtterance.onend,
        onpause: window.currentUtterance.onpause,
        onresume: window.currentUtterance.onresume
      };

      speechSynthesis.cancel();
      
      const newUtterance = new SpeechSynthesisUtterance(currentText);
      window.currentUtterance = newUtterance;
      newUtterance.voice = currentVoice;
      newUtterance.lang = 'ja-JP';
      newUtterance.rate = speed;
      
      // Restore handlers
      newUtterance.onend = currentHandlers.onend;
      newUtterance.onpause = currentHandlers.onpause;
      newUtterance.onresume = currentHandlers.onresume;
      
      speechSynthesis.speak(newUtterance);
    }
  }, [preferenceState.preferred_speed]);

  // Update useEffect for source URL changes
  useEffect(() => {
    async function handleNoSource() {
      try {
        setLoadingArticle(true);
        
        // First try to find an unread article from existing recentNews
        if (recentNews?.length) {
          const unreadArticle = recentNews.find(article => !finishedUrls.has(article.url));
          if (unreadArticle) {
            setUrl(unreadArticle.url);
            await fetchNews(unreadArticle.url);
            return;
          }
        }
        
        // If no unread article found in existing list, fetch new list
        const response = await fetch('/api/fetch-news-list?limit=100');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.newsList)) {
          const unreadArticle = data.newsList.find(article => !finishedUrls.has(article.url));
          if (unreadArticle) {
            setUrl(unreadArticle.url);
            await fetchNews(unreadArticle.url);
            return;
          }
        }
        
        // Only redirect to home if we truly can't find any unread articles
        setLoadingArticle(false);
        router.push('/');
      } catch (error) {
        console.error('Error handling no source:', error);
        setLoadingArticle(false);
        router.push('/');
      }
    }

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
      setNewsLabels([]);
      setCurrentSentence(-1);
      setSentences([]);
      setError(null);
      
      // Decode the URL before using it
      const decodedUrl = decodeURIComponent(sourceUrl);
      setUrl(decodedUrl);
      fetchNews(decodedUrl);
    } else {
      handleNoSource();
    }
  }, [sourceUrl]);

  // Add this useEffect to fetch available voices
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch('/api/tts/voices');
        if (!response.ok) throw new Error('Failed to fetch voices');
        const data = await response.json();
        setAvailableVoices(data.voices);
        
        // Only set a default voice if none is selected
        if (data.voices.length > 0 && !preferenceState.preferred_voice) {
          setPreferenceState(prev => ({ ...prev, preferred_voice: data.voices[0].name }));
        }
      } catch (error) {
        console.error('Error fetching voices:', error);
      }
    };

    fetchVoices();
  }, []); // Remove dependency on preferenceState.preferred_voice

  // Add function to handle unfinishing
  const handleUnfinish = async () => {
    setFinishLoading(true);
    try {
      // Ensure we're using the decoded URL
      const decodedUrl = decodeURIComponent(url);
      
      // Only delete the finished_articles record
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

  // Add this function to calculate total reading time
  const calculateTotalReadingTime = (startTime) => {
    if (!startTime) return 0;
    const endTime = Date.now();
    const totalMinutes = (endTime - startTime) / (1000 * 60); // Convert to minutes
    return Math.round(totalMinutes * 10) / 10; // Round to 1 decimal place
  };

  // Update the toggleFinished function
  const toggleFinished = async () => {
    if (!user) {
      setToastMessage(t('reader.messages.signInToTrackProgress'));
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return;
    }

    // If trying to unmark, show confirmation first
    if (isFinished) {
      setShowConfirmUnfinish(true);
      return;
    }

    try {
      setIsUpdating(true);
      const currentUrl = new URL(url);
      const urlWithoutParams = currentUrl.origin + currentUrl.pathname;

      // Calculate total reading time
      const totalReadingTime = calculateTotalReadingTime(readingStartTime);

      // First check if article exists
      const { data: existingArticle } = await supabase
        .from('articles')
        .select('id')
        .eq('url', urlWithoutParams)
        .single();

      let articleId;
      if (!existingArticle) {
        // Create article if it doesn't exist
        const { data: newArticle, error: createError } = await supabase
          .from('articles')
          .insert([{
            url: urlWithoutParams,
            title: newsTitle,
            publish_date: newsDate,
            images: newsImages
          }])
          .select()
          .single();

        if (createError) throw createError;
        articleId = newArticle.id;
      } else {
        articleId = existingArticle.id;
      }

      // Add to finished articles
      const { error: finishError } = await supabase
        .from('finished_articles')
        .insert([{ 
          user_id: user.id,
          url: urlWithoutParams,
          article_id: articleId,
          finished_at: new Date().toISOString()
        }]);

      if (finishError) throw finishError;

      // Update reading stats with the calculated time
      await updateReadingStats(totalReadingTime);
      
      // Notify about stats change
      useStatsStore.getState().notifyStatsChange();
      
      setIsFinished(true);
      triggerCelebration();
    } catch (error) {
      console.error('Error toggling finished status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Add this function near other utility functions
  const triggerCelebration = () => {
    const duration = 2000; // Reduced from 3000 to 2000ms
    const end = Date.now() + duration;

    // Show motivational message
    setShowMotivation(true);
    setTimeout(() => {
      setShowMotivation(false);
    }, 2000); // Reduced from 3000 to 2000ms

    const colors = ['#6BCB77', '#4D96FF', '#FFD93D']; // More subtle colors

    // Initial burst - reduced particle count and spread
    confetti({
      particleCount: 50, // Reduced from 100
      spread: 60, // Reduced from 100
      origin: { y: 0.8 },
      colors: colors,
      gravity: 0.8
    });

    // Continuous side bursts - reduced frequency and count
    (function frame() {
      confetti({
        particleCount: 2, // Reduced from 4
        angle: 60,
        spread: 40, // Reduced from 55
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 2, // Reduced from 4
        angle: 120,
        spread: 40, // Reduced from 55
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        setTimeout(() => requestAnimationFrame(frame), 100); // Added delay between frames
      }
    }());

    // Single additional burst halfway through
    setTimeout(() => {
      confetti({
        particleCount: 30, // Reduced from 60-80
        spread: 50, // Reduced from 100-120
        origin: { y: 0.7 },
        colors: colors,
        gravity: 1
      });
    }, 1000);
  };

  // Add useEffect to fetch article ID when source URL changes
  useEffect(() => {
    const fetchArticleId = async () => {
      if (!sourceUrl) return;
      
      const maxRetries = 3;
      const retryDelay = 2000; // 2 seconds
      
      const tryFetchArticle = async (retryCount = 0) => {
        try {
          // Try to get existing article first
          const { data: existingArticle, error: selectError } = await supabase
            .from('articles')
            .select('id')
            .eq('url', sourceUrl)
            .single();

          if (!selectError && existingArticle) {
            setCurrentArticleId(existingArticle.id);
            return true;
          }

          // If we've reached max retries, give up
          if (retryCount >= maxRetries) {
            console.error('Failed to fetch article ID after max retries');
            return false;
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return tryFetchArticle(retryCount + 1);
        } catch (error) {
          console.error('Error fetching article ID:', error);
          return false;
        }
      };

      tryFetchArticle();
    };
    
    fetchArticleId();
  }, [sourceUrl]);

  // Add cleanup
  useEffect(() => {
    return () => {
      // Clean up cached audio URLs
      Object.values(audioCache).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const [isLearningMode, setIsLearningMode] = useState(false);

  // Add these state variables near other state declarations
  const [translations, setTranslations] = useState({});
  const [loadingTranslations, setLoadingTranslations] = useState({});
  const [tutorExplanations, setTutorExplanations] = useState({});
  const [loadingTutor, setLoadingTutor] = useState({});
  const [followUpQuestions, setFollowUpQuestions] = useState({});
  const [conversations, setConversations] = useState({}); // Add this line to track conversation history

  // Add this near other state declarations
  const [targetLanguage, setTargetLanguage] = useState('en');

  // Update the translateSentence function
  const translateSentence = async (text, index) => {
    try {
      setLoadingTranslations(prev => ({ ...prev, [index]: true }));
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          target: preferenceState.preferred_translation_language,
          articleId: currentArticleId,
          sentenceIndex: index
        }),
      });

      if (!response.ok) throw new Error('Translation failed');

      const { translation } = await response.json();
      setTranslations(prev => ({ ...prev, [index]: translation }));
    } catch (error) {
      console.error('Translation error:', error);
      setToastMessage(t('reader.errors.translationFailed'));
      setShowToast(true);
    } finally {
      setLoadingTranslations(prev => ({ ...prev, [index]: false }));
    }
  };

  // Add this function near other utility functions
  const getTutorExplanation = async (sentenceText, index, followUpQuestion = null) => {
    if ((tutorExplanations[index] && !followUpQuestion) || loadingTutor[index]) return;
    
    if (!currentArticleId) {
      setTutorExplanations(prev => ({
        ...prev,
        [index]: t('reader.errors.waitForArticleLoad')
      }));
      return;
    }
    
    // Add debug logging
    console.log('Debug - User and Profile info:', {
      userId: user?.id,
      roleLevel: profile?.role_level,
      userObject: user,
      profileObject: profile,
      preferredLanguage: preferenceState.preferred_translation_language
    });
    
    // Check if user is premium using profile.role_level
    if (!profile?.role_level) {
      console.log('Debug - Access denied: No role_level found in profile');
      setToastMessage(t('reader.messages.premiumFeatureAITutor'));
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return;
    }

    console.log('Debug - Access granted: role_level =', profile.role_level);
    
    // If it's a follow-up question, add it to conversations immediately
    if (followUpQuestion) {
      setConversations(prev => ({
        ...prev,
        [index]: [
          ...(prev[index] || []),
          {
            question: followUpQuestion,
            answer: null, // null indicates loading state
            loading: true
          }
        ]
      }));
    }
    
    try {
      setLoadingTutor(prev => ({ ...prev, [index]: true }));
      
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: sentenceText,
          articleId: currentArticleId,
          sentenceIndex: index,
          userId: user?.id,
          followUpQuestion,
          lang: preferenceState.preferred_translation_language
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Tutor analysis failed');
      }

      const data = await response.json();
      
      if (followUpQuestion) {
        // Update the last conversation entry with the response
        setConversations(prev => ({
          ...prev,
          [index]: prev[index].map((conv, i) => 
            i === prev[index].length - 1
              ? { ...conv, answer: data.explanation, loading: false }
              : conv
          )
        }));
      } else {
        setTutorExplanations(prev => ({
          ...prev,
          [index]: data.explanation
        }));
      }
    } catch (error) {
      console.error('Tutor error:', error);
      if (followUpQuestion) {
        // Update the last conversation entry with the error
        setConversations(prev => ({
          ...prev,
          [index]: prev[index].map((conv, i) => 
            i === prev[index].length - 1
              ? { ...conv, answer: `Analysis error: ${error.message}`, loading: false }
              : conv
          )
        }));
      } else {
        setTutorExplanations(prev => ({
          ...prev,
          [index]: `Analysis error: ${error.message}`
        }));
      }
    } finally {
      setLoadingTutor(prev => ({ ...prev, [index]: false }));
    }
  };

  // Add this component near other component definitions
  const LearningModeButton = ({ theme, isLearningMode, onToggle }) => (
    <div className="group relative">
      <button
        onClick={onToggle}
        className={`p-2 rounded-full flex items-center justify-center transition-colors duration-150
          ${theme === "dark" 
            ? isLearningMode 
              ? "bg-purple-500/20 text-purple-400" 
              : "hover:bg-gray-700/50 text-gray-300" 
            : isLearningMode 
              ? "bg-purple-100 text-purple-700" 
              : "hover:bg-gray-100/50 text-gray-600"
          }`}
      >
        <FaBook className="w-4 h-4" />
      </button>
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        ${theme === "dark"
          ? "bg-gray-800 text-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-gray-700"
          : "bg-white text-gray-600 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200"
        }`}
      >
        {isLearningMode ? t('reader.learningMode.disable') : t('reader.learningMode.enable')}
      </div>
    </div>
  );

  // Add translation language change handler
  const handleTranslationLanguageChange = async (language) => {
    if (user) {
      try {
        setUpdatingPreferences(prev => ({ ...prev, preferred_translation_language: true }));
        
        const { error } = await supabase
          .from('profiles')
          .update({
            preferred_translation_language: language,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) throw error;
        
        setPreferenceState(prev => ({
          ...prev,
          preferred_translation_language: language
        }));
      } catch (error) {
        console.error('Error saving translation language:', error);
      } finally {
        setUpdatingPreferences(prev => ({ ...prev, preferred_translation_language: false }));
      }
    } else {
      setPreferenceState(prev => ({
        ...prev,
        preferred_translation_language: language
      }));
      setToastMessage(t("reader.messages.signInToSavePreferences"));
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    }
  };

  // Add this near other state declarations
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);

  // Add translateAll function
  const translateAll = async () => {
    if (!sentences?.length || isTranslatingAll) return;
    
    setIsTranslatingAll(true);
    try {
      // Create an array of promises for each sentence
      const translationPromises = sentences.map((sentence, index) => 
        translateSentence(sentenceToText(sentence), index)
      );

      // Wait for all translations to complete
      await Promise.allSettled(translationPromises);
    } catch (error) {
      console.error('Translation error:', error);
      setToastMessage(t("reader.messages.premiumFeatureAccess"));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsTranslatingAll(false);
    }
  };

  // Add useEffect to check premium status
  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          setIsPremium(data?.is_premium || false);
        } catch (error) {
          console.error('Error checking premium status:', error);
          setIsPremium(false);
        }
      } else {
        setIsPremium(false);
      }
    };

    checkPremiumStatus();
  }, [user]);

  return (
    <div className={`min-h-screen ${themeClasses.main}`}>
      <Navbar
        showSidebar={showSidebar}
        onSidebarToggle={setShowSidebar}
        theme={preferenceState.theme}
        hideNewsListButton={false}
      />

      {/* Settings button and dropdown - bottom right */}
      <div className="fixed bottom-8 sm:bottom-4 right-4 z-50">
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
              {t("reader.preferences.title")}
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
                    {t("reader.preferences.fontSize")}
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
                    {t("reader.preferences.readingSpeed")}
                    <LoadingIndicator
                      loading={updatingPreferences.preferred_speed}
                      theme={preferenceState.theme}
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        value={(() => {
                          const speeds = [0.7, 0.85, 1.0, 1.15, 1.3];
                          return speeds.indexOf(
                            preferenceState.preferred_speed
                          ) !== -1
                            ? speeds.indexOf(preferenceState.preferred_speed)
                            : 2; // Default to 1.0
                        })()}
                        onChange={(e) => {
                          const speeds = [0.7, 0.85, 1.0, 1.15, 1.3];
                          handleSpeedChange(speeds[e.target.value]);
                        }}
                        disabled={updatingPreferences.preferred_speed}
                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer
                          ${
                            preferenceState.theme === "dark"
                              ? "bg-gray-700"
                              : "[color-scheme:light] bg-gray-200"
                          }
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-4
                          [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:transition-all
                          [&::-webkit-slider-thumb]:duration-150
                          ${
                            preferenceState.theme === "dark"
                              ? "[&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:hover:bg-green-400"
                              : "[&::-webkit-slider-thumb]:bg-green-600 [&::-webkit-slider-thumb]:hover:bg-green-500"
                          }
                        `}
                      />
                      {/* Dots */}
                      <div className="absolute inset-x-0 flex justify-between px-1 pointer-events-none">
                        {[
                          {
                            speed: 0.7,
                            label: t("reader.preferences.speeds.slow"),
                          },
                          {
                            speed: 0.85,
                            label: t("reader.preferences.speeds.relaxed"),
                          },
                          {
                            speed: 1.0,
                            label: t("reader.preferences.speeds.normal"),
                          },
                          {
                            speed: 1.15,
                            label: t("reader.preferences.speeds.fast"),
                          },
                          {
                            speed: 1.3,
                            label: t("reader.preferences.speeds.veryFast"),
                          },
                        ].map(({ speed, label }) => (
                          <div
                            key={speed}
                            className="flex flex-col items-center gap-1"
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                speed === preferenceState.preferred_speed
                                  ? preferenceState.theme === "dark"
                                    ? "bg-green-500"
                                    : "bg-green-600"
                                  : preferenceState.theme === "dark"
                                  ? "bg-gray-600"
                                  : "bg-gray-300"
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Labels */}
                    <div className="flex justify-between px-1">
                      {[
                        {
                          speed: 0.7,
                          label: t("reader.preferences.speeds.slow"),
                        },
                        {
                          speed: 0.85,
                          label: t("reader.preferences.speeds.relaxed"),
                        },
                        {
                          speed: 1.0,
                          label: t("reader.preferences.speeds.normal"),
                        },
                        {
                          speed: 1.15,
                          label: t("reader.preferences.speeds.fast"),
                        },
                        {
                          speed: 1.3,
                          label: t("reader.preferences.speeds.veryFast"),
                        },
                      ].map(({ speed, label }) => (
                        <div key={speed} className="flex flex-col items-center">
                          <span
                            className={`text-xs font-medium ${
                              speed === preferenceState.preferred_speed
                                ? preferenceState.theme === "dark"
                                  ? "text-green-500"
                                  : "text-green-600"
                                : preferenceState.theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
                          >
                            {label}
                          </span>
                          <span
                            className={`text-[10px] ${
                              speed === preferenceState.preferred_speed
                                ? preferenceState.theme === "dark"
                                  ? "text-green-500"
                                  : "text-green-600"
                                : preferenceState.theme === "dark"
                                ? "text-gray-500"
                                : "text-gray-400"
                            }`}
                          >
                            {speed}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
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
                    {t("reader.preferences.theme.title")}
                    <LoadingIndicator
                      loading={updatingPreferences.theme}
                      theme={preferenceState.theme}
                    />
                  </label>
                  <div className="flex gap-1">
                    {[
                      {
                        id: "light",
                        icon: <FaSun />,
                        title: t("reader.preferences.theme.light"),
                      },
                      {
                        id: "dark",
                        icon: <FaMoon />,
                        title: t("reader.preferences.theme.dark"),
                      },
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
                    {t("reader.preferences.furigana")}
                    <LoadingIndicator
                      loading={updatingPreferences.show_furigana}
                      theme={preferenceState.theme}
                    />
                  </label>
                  <div
                    onClick={
                      !updatingPreferences.show_furigana
                        ? toggleFurigana
                        : undefined
                    }
                    className={`w-full flex items-center justify-between px-4 py-3 sm:px-3 sm:py-2 rounded transition-all duration-200 border ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-800/50 border-gray-700/50 text-gray-300 hover:border-gray-600/50"
                        : "[color-scheme:light] bg-gray-50/80 border-gray-200/80 text-gray-600 hover:border-gray-300"
                    } ${
                      updatingPreferences.show_furigana
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <span>
                      {preferenceState.show_furigana
                        ? t("reader.preferences.furiganaToggle.hide")
                        : t("reader.preferences.furiganaToggle.show")}
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs ${
                          preferenceState.theme === "dark"
                            ? "text-gray-500"
                            : "text-gray-400"
                        }`}
                      >
                        {t("reader.preferences.furiganaToggle.hover")}
                      </span>
                      <div
                        className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border transition-colors duration-300 ease-in-out ${
                          preferenceState.show_furigana
                            ? preferenceState.theme === "dark"
                              ? "bg-green-500/20 border-green-500/30"
                              : "bg-green-100 border-green-200"
                            : preferenceState.theme === "dark"
                            ? "bg-gray-700/50 border-gray-600/50"
                            : "bg-gray-200 border-gray-300"
                        } ${
                          updatingPreferences.show_furigana
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <span
                          className={`pointer-events-none absolute top-[1px] left-[1px] inline-block h-3 w-3 transform rounded-full shadow-sm ring-0 transition duration-300 ease-in-out ${
                            preferenceState.show_furigana
                              ? "translate-x-3"
                              : "translate-x-0"
                          } ${
                            preferenceState.show_furigana
                              ? preferenceState.theme === "dark"
                                ? "bg-green-500"
                                : "bg-green-600"
                              : preferenceState.theme === "dark"
                              ? "bg-gray-400"
                              : "bg-white"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
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
                    {t("reader.preferences.voice")}
                    <LoadingIndicator
                      loading={updatingPreferences.preferred_voice}
                      theme={preferenceState.theme}
                    />
                  </label>
                  <select
                    value={preferenceState.preferred_voice || ""}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    disabled={
                      updatingPreferences.preferred_voice ||
                      availableVoices.length === 0 ||
                      isVoiceLoading
                    }
                    className={`w-full p-3 sm:p-2 text-base sm:text-sm rounded transition-all duration-200 border ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-100 focus:border-green-500/50"
                        : "[color-scheme:light] bg-white border-gray-300 text-[rgb(19,31,36)] focus:border-green-500/50"
                    } ${
                      updatingPreferences.preferred_voice ||
                      availableVoices.length === 0 ||
                      isVoiceLoading
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {availableVoices.map((voice) => {
                      const isPremiumVoice =
                        voice.name.includes("Neural2") ||
                        voice.name.includes("Wavenet");
                      return (
                        <option
                          key={voice.name}
                          value={voice.name}
                          className={`${
                            isPremiumVoice && !isPremium
                              ? preferenceState.theme === "dark"
                                ? "text-yellow-400"
                                : "text-yellow-600"
                              : ""
                          }`}
                        >
                          {voice.displayName} (
                          {(voice.ssmlGender || "unspecified").toLowerCase()})
                          {isPremiumVoice &&
                            (isPremium ? " (Premium)" : " (Premium Only)")}
                        </option>
                      );
                    })}
                    {availableVoices.length === 0 && (
                      <option value="" disabled>
                        {t("reader.loadingVoices")}
                      </option>
                    )}
                  </select>
                </div>

                {/* Translation Language control */}
                <div className="space-y-3 sm:space-y-2">
                  <label
                    className={`text-base sm:text-sm font-medium flex items-center ${
                      preferenceState.theme === "dark"
                        ? ""
                        : "[color-scheme:light] text-[rgb(19,31,36)]"
                    }`}
                  >
                    {t("reader.translationLanguage")}
                    <LoadingIndicator
                      loading={
                        updatingPreferences.preferred_translation_language
                      }
                      theme={preferenceState.theme}
                    />
                  </label>
                  <select
                    value={preferenceState.preferred_translation_language}
                    onChange={(e) =>
                      handleTranslationLanguageChange(e.target.value)
                    }
                    disabled={
                      updatingPreferences.preferred_translation_language
                    }
                    className={`w-full p-3 sm:p-2 text-base sm:text-sm rounded transition-all duration-200 border ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-100 focus:border-green-500/50"
                        : "[color-scheme:light] bg-white border-gray-300 text-[rgb(19,31,36)] focus:border-green-500/50"
                    } ${
                      updatingPreferences.preferred_translation_language
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
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
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h2
                  className={`text-lg font-serif tracking-wide ${
                    preferenceState.theme === "dark"
                      ? "text-gray-200"
                      : "text-gray-800"
                  }`}
                >
                  {t("newsListDrawer.title")}
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className={`p-2 rounded-full transition-all duration-200
                    ${
                      preferenceState.theme === "dark"
                        ? "hover:bg-gray-800/80 active:bg-gray-700/80"
                        : "hover:bg-gray-100/80 active:bg-gray-200/80"
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

              {/* Add Show All News button */}
              <button
                onClick={() => router.push("/")}
                className={`w-full p-3 rounded-xl transition-all duration-200 flex items-center justify-between
                  ${
                    preferenceState.theme === "dark"
                      ? "bg-gray-800/50 hover:bg-gray-700/50 text-gray-200"
                      : "bg-gray-100/80 hover:bg-gray-200/80 text-gray-700"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-700"
                        : "bg-white"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 2v4M8 2v4M3 10h18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="font-medium">
                    {t("newsListDrawer.title")}
                  </span>
                </div>
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {user && (
                <div
                  className={`flex gap-1 p-1 rounded-xl ${
                    preferenceState.theme === "dark"
                      ? "bg-gray-800/50 backdrop-blur-sm"
                      : "bg-gray-100/80 backdrop-blur-sm"
                  }`}
                >
                  <button
                    onClick={() => setSidebarView("latest")}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2
                      ${
                        sidebarView === "latest"
                          ? preferenceState.theme === "dark"
                            ? "bg-gray-700/90 text-white shadow-sm ring-1 ring-gray-600"
                            : "bg-white text-[rgb(19,31,36)] shadow-sm ring-1 ring-gray-200"
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    {t("newsListDrawer.tabs.unread")}
                  </button>
                  <button
                    onClick={() => setSidebarView("read")}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2
                      ${
                        sidebarView === "read"
                          ? preferenceState.theme === "dark"
                            ? "bg-gray-700/90 text-white shadow-sm ring-1 ring-gray-600"
                            : "bg-white text-[rgb(19,31,36)] shadow-sm ring-1 ring-gray-200"
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
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t("newsListDrawer.status.finished")}
                  </button>
                  <button
                    onClick={() => setSidebarView("saved")}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2
                      ${
                        sidebarView === "saved"
                          ? preferenceState.theme === "dark"
                            ? "bg-gray-700/90 text-white shadow-sm ring-1 ring-gray-600"
                            : "bg-white text-[rgb(19,31,36)] shadow-sm ring-1 ring-gray-200"
                          : preferenceState.theme === "dark"
                          ? "text-gray-400 hover:text-gray-200"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    <FaHeart className="w-3.5 h-3.5" />
                    {t("newsListDrawer.tabs.saved")}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {sidebarView === "latest" ? (
                  <div className="space-y-3">
                    {loadingNewsList ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-3">
                        <svg
                          className={`animate-spin h-6 w-6 ${
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
                          className={`text-sm font-medium ${
                            preferenceState.theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                        >
                          {t("newsListDrawer.sections.recent.loading")}
                        </span>
                      </div>
                    ) : recentNewsError ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-3 p-6 rounded-xl bg-red-500/10">
                        <svg
                          className="w-8 h-8 text-red-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-sm text-red-500 text-center font-medium">
                          {t("newsListDrawer.sections.recent.failed")}
                        </p>
                      </div>
                    ) : recentNews?.length > 0 ? (
                      (() => {
                        const unreadArticles = recentNews.filter(
                          (article) => !finishedUrls.has(article.url)
                        );
                        return unreadArticles.length > 0 ? (
                          <>
                            {unreadArticles.map((article, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  router.push(
                                    `/read?source=${encodeURIComponent(
                                      article.url
                                    )}`
                                  );
                                  setShowSidebar(false);
                                }}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex gap-4 group
                                  ${
                                    preferenceState.theme === "dark"
                                      ? article.url === sourceUrl
                                        ? "bg-gray-800/90 ring-1 ring-gray-700"
                                        : "hover:bg-gray-800/70 hover:ring-1 hover:ring-gray-700"
                                      : article.url === sourceUrl
                                      ? "bg-gray-100/90 ring-1 ring-gray-200"
                                      : "hover:bg-gray-50/90 hover:ring-1 hover:ring-gray-200"
                                  }`}
                              >
                                <div className="flex-shrink-0 relative">
                                  {article.image ||
                                  article.article?.images?.[0] ? (
                                    <div className="w-20 h-20 relative rounded-lg overflow-hidden ring-1 ring-black/5">
                                      <img
                                        src={
                                          article.image ||
                                          article.article?.images?.[0]
                                        }
                                        alt=""
                                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                                        onError={(e) => {
                                          e.target.parentElement.style.display =
                                            "none";
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      className={`w-20 h-20 rounded-lg flex items-center justify-center ${
                                        preferenceState.theme === "dark"
                                          ? "bg-gray-800"
                                          : "bg-gray-100"
                                      } ring-1 ring-black/5`}
                                    >
                                      <svg
                                        className={`w-6 h-6 ${
                                          preferenceState.theme === "dark"
                                            ? "text-gray-700"
                                            : "text-gray-300"
                                        }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={1.5}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                  <div className="absolute -top-1 -right-1 flex gap-1">
                                    {archivedUrls.has(article.url) && (
                                      <div className="bg-red-500 rounded-full p-1 shadow-lg ring-2 ring-white dark:ring-[rgb(19,31,36)]">
                                        <FaHeart className="w-3 h-3 text-white" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3
                                    className={`font-medium mb-1 line-clamp-2 tracking-wide ${
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
                            ))}
                            <button
                              onClick={() => {
                                router.push("/");
                                setShowSidebar(false);
                              }}
                              className={`w-full p-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group
                                ${
                                  preferenceState.theme === "dark"
                                    ? "bg-gray-800/50 hover:bg-gray-700/50 text-gray-300"
                                    : "bg-gray-100/80 hover:bg-gray-200/80 text-gray-600"
                                }`}
                            >
                              <span className="font-medium">
                                {t("newsListDrawer.sections.more.title")}
                              </span>
                              <svg
                                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          </>
                        ) : (
                          !loadingNewsList && (
                            <div className="flex flex-col items-center justify-center h-32 text-center">
                              <svg
                                className={`w-6 h-6 mb-2 ${
                                  preferenceState.theme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-500"
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                              </svg>
                              <span
                                className={
                                  preferenceState.theme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-500"
                                }
                              >
                                {t("newsListDrawer.sections.recent.empty")}
                              </span>
                            </div>
                          )
                        );
                      })()
                    ) : null}
                  </div>
                ) : sidebarView === "read" ? (
                  recentNews?.length > 0 ? (
                    recentNews
                      .filter((article) => finishedUrls.has(article.url))
                      .map((article, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            router.push(
                              `/read?source=${encodeURIComponent(article.url)}`
                            );
                            setShowSidebar(false);
                          }}
                          className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex gap-4 group
                            ${
                              preferenceState.theme === "dark"
                                ? article.url === sourceUrl
                                  ? "bg-gray-800/90 ring-1 ring-gray-700"
                                  : "hover:bg-gray-800/70 hover:ring-1 hover:ring-gray-700"
                                : article.url === sourceUrl
                                ? "bg-gray-100/90 ring-1 ring-gray-200"
                                : "hover:bg-gray-50/90 hover:ring-1 hover:ring-gray-200"
                            }`}
                        >
                          <div className="flex-shrink-0 relative">
                            {article.image || article.article?.images?.[0] ? (
                              <div className="w-20 h-20 relative rounded-lg overflow-hidden ring-1 ring-black/5">
                                <img
                                  src={
                                    article.image ||
                                    article.article?.images?.[0]
                                  }
                                  alt=""
                                  className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                                  onError={(e) => {
                                    e.target.parentElement.style.display =
                                      "none";
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                className={`w-20 h-20 rounded-lg flex items-center justify-center ${
                                  preferenceState.theme === "dark"
                                    ? "bg-gray-800"
                                    : "bg-gray-100"
                                } ring-1 ring-black/5`}
                              >
                                <svg
                                  className={`w-6 h-6 ${
                                    preferenceState.theme === "dark"
                                      ? "text-gray-700"
                                      : "text-gray-300"
                                  }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </div>
                            )}
                            <div className="absolute -top-1 -right-1 flex gap-1">
                              {archivedUrls.has(article.url) && (
                                <div className="bg-red-500 rounded-full p-1 shadow-lg ring-2 ring-white dark:ring-[rgb(19,31,36)]">
                                  <FaHeart className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <div className="bg-green-500 rounded-full p-1 shadow-lg ring-2 ring-white dark:ring-[rgb(19,31,36)]">
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
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-medium mb-1 line-clamp-2 tracking-wide ${
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
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <FaBook
                        className={`w-6 h-6 mb-2 ${
                          preferenceState.theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      />
                      <span
                        className={
                          preferenceState.theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }
                      >
                        {t("newsListDrawer.sections.recent.empty")}
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
                    finishedUrls={finishedUrls}
                  />
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className={mainContentClasses}>
          {loadingArticle ? (
            <div className="mt-8 space-y-8 pt-4">
              {/* Title placeholder */}
              <div className="space-y-4">
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-60 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>

              {/* Image placeholder */}
              <div className="aspect-video w-full max-w-xl mx-auto bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="mt-2 rounded-full w-48 h-3 overflow-hidden shadow-inner bg-gray-800/80 animate-pulse" />

              {/* Content placeholders */}
              <div className="space-y-6">
                {/* Paragraph 1 */}
                <div className="space-y-3">
                  <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-8 w-11/12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-8 w-4/5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>

                {/* Paragraph 2 */}
                <div className="space-y-3">
                  <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-8 w-10/12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>

                {/* Paragraph 3 */}
                <div className="space-y-3">
                  <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-8 w-9/12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-8 w-5/6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="mt-8 mb-24 sm:mb-28 flex flex-col items-center justify-center gap-4">
              <div
                className={`text-lg font-medium ${
                  preferenceState.theme === "dark"
                    ? "text-gray-300"
                    : "text-gray-700"
                }`}
              >
                {t("reader.errors.contentUnavailable")}
              </div>
              <p
                className={`text-sm ${
                  preferenceState.theme === "dark"
                    ? "text-gray-400"
                    : "text-gray-500"
                }`}
              >
                {t("reader.errors.contentRemoved")}
              </p>
            </div>
          ) : newsContent?.length > 0 ? (
            <div className="mt-4 p-0 rounded relative">
              {/* Title section with padding for controls */}
              <div className="pt-6">
                <div className="mb-6">
                  <div
                    className={`text-sm flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 ${
                      preferenceState.theme === "dark"
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}
                  >
                    <div className="inline-flex items-center gap-2 min-w-0">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 min-w-0 truncate transition-all duration-200 hover:opacity-80`}
                        title={url ? getHostname(url) : "Open original article"}
                      >
                        {(() => {
                          const source = getNewsSource(url);
                          switch (source) {
                            case "nhk":
                              return (
                                <NHKLogo
                                  className="opacity-90 flex-shrink-0 transition-opacity duration-200"
                                  theme={preferenceState.theme}
                                />
                              );
                            case "mainichi":
                              return (
                                <MainichiLogo
                                  className="opacity-90 flex-shrink-0 transition-opacity duration-200"
                                  theme={preferenceState.theme}
                                />
                              );
                            default:
                              return (
                                <FaExternalLinkAlt className="w-3 h-3 flex-shrink-0" />
                              );
                          }
                        })()}
                        <span className="font-medium truncate">
                          {(() => {
                            const source = getNewsSource(url);
                            switch (source) {
                              case "nhk":
                                return "NEWS WEB EASY";
                              case "mainichi":
                                return "小学生新聞";
                              default:
                                return getHostname(url);
                            }
                          })()}
                        </span>
                      </a>
                    </div>
                    {/* Add word count */}
                    <div className="inline-flex items-center gap-1.5">
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
                          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                        />
                      </svg>
                      <span className="font-medium">{wordCount} words</span>
                    </div>
                  </div>
                  {/* Add labels if available */}
                  {newsLabels?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {newsLabels.map((label, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${
                              preferenceState.theme === "dark"
                                ? "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30"
                                : "bg-purple-50 text-purple-700 ring-1 ring-purple-500/20"
                            }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-start gap-4 mb-3">
                    <h2
                      className={`font-serif leading-snug tracking-tight w-full break-words overflow-wrap-anywhere ${
                        preferenceState.font_size === "medium"
                          ? "text-2xl"
                          : "text-3xl"
                      } ${
                        preferenceState.theme === "dark"
                          ? "text-gray-100"
                          : "text-[rgb(19,31,36)]"
                      }`}
                    >
                      {renderTitle(newsTitle)}
                    </h2>
                  </div>
                  <div className="inline-flex items-center">
                    {/* Add debug comment */}
                    {/* Debug: {JSON.stringify({newsDate})} */}
                    <span
                      className={`text-sm font-medium ${
                        preferenceState.theme === "dark"
                          ? "text-gray-400"
                          : "text-gray-600"
                      }`}
                    >
                      {newsDate && formatJapaneseDate(newsDate)}
                    </span>
                  </div>
                  {/* News image - always show if available */}
                  {newsImages?.length > 0 && (
                    <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 max-w-xl mx-auto">
                      <img
                        src={newsImages[0]}
                        alt=""
                        className="w-full h-auto aspect-video object-cover transition-all duration-700 blur-sm hover:blur-none"
                        onLoad={(e) => {
                          e.target.classList.remove("blur-sm");
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
                          className={`rounded-full w-48 h-3 overflow-hidden shadow-inner ${
                            preferenceState.theme === "dark"
                              ? "bg-gray-800/80"
                              : "bg-gray-100"
                          }`}
                        >
                          <div
                            className={`h-full transition-all duration-500 ease-in-out transform ${
                              preferenceState.theme === "dark"
                                ? "bg-green-500/40"
                                : "bg-green-600/90"
                            }`}
                            style={{
                              width: `${
                                currentSentence >= 0
                                  ? ((currentSentence + 1) / sentences.length) *
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
                            : `0 / ${sentences.length}`}
                        </span>
                      </div>

                      {/* Translate All button */}
                      {isLearningMode && (
                        <button
                          onClick={translateAll}
                          disabled={isTranslatingAll || !sentences.length}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 mr-2
                  ${
                    preferenceState.theme === "dark"
                      ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }
                  ${isTranslatingAll ? "opacity-50 cursor-not-allowed" : ""}
                `}
                        >
                          {isTranslatingAll ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 relative">
                                <div
                                  className={`absolute inset-0 rounded-full border-2 animate-spin ${
                                    preferenceState.theme === "dark"
                                      ? "border-blue-400 border-r-transparent"
                                      : "border-blue-700 border-r-transparent"
                                  }`}
                                ></div>
                              </div>
                              <span>{t("reader.buttons.translatingAll")}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                                />
                              </svg>
                              <span>{t("reader.buttons.translateAllSentences")}</span>
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  {newsContent.map((paragraph, pIndex) => (
                    <div
                      key={pIndex}
                      className={`mb-6 px-2 py-1 rounded-md ${
                        preferenceState.font_size === "medium"
                          ? "text-lg"
                          : preferenceState.font_size === "large"
                          ? "text-xl"
                          : preferenceState.font_size === "x-large"
                          ? "text-2xl"
                          : "text-3xl"
                      }`}
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
                            onClick={() =>
                              !isLearningMode && handleSentenceClick(sIndex)
                            }
                            className={`inline ${
                              !isLearningMode ? "cursor-pointer" : ""
                            } p-0.5 rounded
                              ${
                                currentSentence >= 0 &&
                                sIndex === currentSentence
                                  ? preferenceState.theme === "dark"
                                    ? "bg-emerald-900/80 shadow-sm"
                                    : "bg-emerald-100 ring-0 shadow-sm"
                                  : preferenceState.theme === "dark"
                                  ? !isLearningMode
                                    ? "hover:bg-gray-700/80"
                                    : ""
                                  : !isLearningMode
                                  ? "hover:bg-gray-100"
                                  : ""
                              }
                              ${
                                repeatMode === REPEAT_MODES.ONE &&
                                sIndex !== currentSentence &&
                                currentSentence >= 0
                                  ? "opacity-30"
                                  : ""
                              }
                              transition-all duration-300 ease-in-out
                            `}
                          >
                            {renderSentence(sentence, sIndex)}
                          </span>
                        );
                      })}
                    </div>
                  ))}

                  {newsContent && newsContent.length > 0 ? (
                    <>
                      {/* Copyright disclaimer */}
                      <div
                        className={`mt-12 mb-8 text-xs text-center ${
                          preferenceState.theme === "dark"
                            ? "text-gray-500"
                            : "text-gray-400"
                        }`}
                      >
                        {(() => {
                          const source = getNewsSource(url);
                          switch (source) {
                            case "nhk":
                              return (
                                <>
                                  Content copyright © {new Date().getFullYear()}{" "}
                                  NHK.
                                </>
                              );
                            case "mainichi":
                              return (
                                <>
                                  Content copyright © {new Date().getFullYear()}{" "}
                                  The Mainichi Newspapers.
                                </>
                              );
                            default:
                              return (
                                <>
                                  Content copyright © {new Date().getFullYear()}{" "}
                                  {getHostname(url)}.
                                </>
                              );
                          }
                        })()}
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline ml-1"
                        >
                          View original article
                        </a>
                      </div>

                      {/* Mark as Finished button */}
                      <div className="mt-8 mb-40 sm:mb-28 flex justify-center">
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
                          ${
                            finishLoading ? "opacity-50 cursor-not-allowed" : ""
                          }
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
                                {isFinished
                                  ? t("reader.finishedReading")
                                  : t("reader.markAsFinished")}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : !loading && error ? (
                    <div className="mt-8 mb-24 sm:mb-28 flex flex-col items-center justify-center gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          preferenceState.theme === "dark"
                            ? "bg-gray-800"
                            : "bg-gray-100"
                        }`}
                      >
                        <svg
                          className={`w-6 h-6 ${
                            preferenceState.theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div
                        className={`text-lg font-medium ${
                          preferenceState.theme === "dark"
                            ? "text-gray-300"
                            : "text-gray-700"
                        }`}
                      >
                        Article content not available
                      </div>
                      <p
                        className={`text-sm ${
                          preferenceState.theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      >
                        This article may have been removed or is no longer
                        accessible
                      </p>
                    </div>
                  ) : (
                    <div className="mt-8 mb-24 sm:mb-28 flex flex-col items-center justify-center gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          preferenceState.theme === "dark"
                            ? "bg-gray-800"
                            : "bg-gray-100"
                        }`}
                      >
                        <svg
                          className={`w-6 h-6 ${
                            preferenceState.theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div
                        className={`text-lg font-medium ${
                          preferenceState.theme === "dark"
                            ? "text-gray-300"
                            : "text-gray-700"
                        }`}
                      >
                        Article content not available
                      </div>
                      <p
                        className={`text-sm ${
                          preferenceState.theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      >
                        This article may have been removed or is no longer
                        accessible
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
          ) : null}
        </main>
      </div>

      {/* Media controls */}
      {sentences?.length > 0 && (
        <div className={mediaControlsClass}>
          <div className="flex items-center justify-center gap-3">
            {/* Archive button */}
            <div className="group relative">
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
                  <FaHeart className={`w-4 h-4 text-red-500`} />
                ) : (
                  <FaRegHeart
                    className={`w-4 h-4 ${
                      preferenceState.theme === "dark"
                        ? "text-gray-300 hover:text-red-400"
                        : "text-gray-600 hover:text-red-500"
                    }`}
                  />
                )}
              </button>
              <div
                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                ${
                  preferenceState.theme === "dark"
                    ? "bg-gray-800 text-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-gray-700"
                    : "bg-white text-gray-600 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200"
                }`}
              >
                {isArchived ? t("reader.unsave") : t("reader.save")}
              </div>
            </div>

            {/* Learning mode toggle */}
            <LearningModeButton
              theme={preferenceState.theme}
              isLearningMode={isLearningMode}
              onToggle={() => setIsLearningMode(!isLearningMode)}
            />

            {/* Play controls */}
            <div className="flex items-center gap-2">
              {/* Previous button */}
              <div className="group relative">
                <button
                  onClick={handlePrevious}
                  disabled={currentSentence <= 0 || isVoiceLoading}
                  className={`p-2 rounded-full flex items-center justify-center 
                    ${
                      preferenceState.theme === "dark"
                        ? "bg-gray-700 hover:enabled:bg-gray-600 active:enabled:bg-gray-500 disabled:opacity-40"
                        : "bg-gray-500 hover:enabled:bg-gray-400 active:enabled:bg-gray-300 disabled:bg-gray-300"
                    } text-white w-10 h-10 transition-all duration-150`}
                >
                  <FaArrowLeft className="w-4 h-4" />
                </button>
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  ${
                    preferenceState.theme === "dark"
                      ? "bg-gray-800 text-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-gray-700"
                      : "bg-white text-gray-600 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200"
                  }`}
                >
                  {t("reader.navigation.previous")}
                </div>
              </div>

              {/* Play/Pause button */}
              <div className="group relative">
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
                >
                  {isVoiceLoading
                    ? playIcons.loading
                    : isPlaying
                    ? playIcons.pause
                    : playIcons.play}
                </button>
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  ${
                    preferenceState.theme === "dark"
                      ? "bg-gray-800 text-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-gray-700"
                      : "bg-white text-gray-600 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200"
                  }`}
                >
                  {isVoiceLoading
                    ? t("reader.playback.loading")
                    : isPlaying
                    ? t("reader.playback.pause")
                    : t("reader.playback.play")}
                </div>
              </div>

              {/* Next button */}
              <div className="group relative">
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
                >
                  <FaArrowRight className="w-4 h-4" />
                </button>
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  ${
                    preferenceState.theme === "dark"
                      ? "bg-gray-800 text-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-gray-700"
                      : "bg-white text-gray-600 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200"
                  }`}
                >
                  {t("reader.navigation.next")}
                </div>
              </div>
            </div>

            {/* Repeat toggle button */}
            <div className="group relative">
              <button
                onClick={handleRepeatToggle}
                className={`p-2 rounded-full flex items-center justify-center transition-colors duration-150
                  ${
                    preferenceState.theme === "dark"
                      ? "hover:bg-gray-700/50"
                      : "hover:bg-gray-100/50"
                  }
                `}
              >
                <RepeatIcon
                  className={`w-4 h-4 ${
                    repeatMode !== REPEAT_MODES.NONE
                      ? "text-purple-500"
                      : preferenceState.theme === "dark"
                      ? "text-gray-300 hover:text-purple-400"
                      : "text-gray-600 hover:text-purple-500"
                  }`}
                  mode={repeatMode}
                  theme={preferenceState.theme}
                />
              </button>
              <div
                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                ${
                  preferenceState.theme === "dark"
                    ? "bg-gray-800 text-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-gray-700"
                    : "bg-white text-gray-600 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200"
                }`}
              >
                {repeatMode === REPEAT_MODES.NONE
                  ? t("reader.repeat.none")
                  : repeatMode === REPEAT_MODES.ONE
                  ? t("reader.repeat.one")
                  : t("reader.repeat.all")}
              </div>
            </div>
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
            ${
              preferenceState.theme === "dark"
                ? "bg-[rgb(19,31,36)] text-gray-100 border border-purple-500/50 shadow-[0_8px_32px_-8px_rgba(168,85,247,0.5)]"
                : "bg-white text-gray-700 border border-purple-200/50 shadow-[0_8px_32px_-8px_rgba(168,85,247,0.25)]"
            }`}
            onClick={() => {
              setShowToast(false);
              if (toastMessage.includes("Premium feature")) {
                router.push("/settings?section=membership&ref=ai_tutor");
              } else if (toastMessage.includes("save articles")) {
                router.push("/join?theme=dark&ref=heart");
              } else if (toastMessage.includes("track your reading")) {
                router.push("/join?theme=dark&ref=finished");
              } else {
                router.push("/join?theme=dark&ref=reader-preference");
              }
            }}
          >
            <div
              className={`p-1.5 rounded-lg transition-colors duration-300 ${
                preferenceState.theme === "dark"
                  ? "bg-purple-500/30"
                  : "bg-purple-100"
              }`}
            >
              <svg
                className={`w-4 h-4 ${
                  preferenceState.theme === "dark"
                    ? "text-purple-300"
                    : "text-purple-500"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span>{toastMessage}</span>
            <div
              className={`p-1.5 rounded-lg transition-colors duration-300 ${
                preferenceState.theme === "dark"
                  ? "bg-purple-500/30 group-hover:bg-purple-500"
                  : "bg-purple-100 group-hover:bg-purple-500"
              }`}
            >
              <svg
                className={`w-4 h-4 ${
                  preferenceState.theme === "dark"
                    ? "text-purple-300 group-hover:text-white"
                    : "text-purple-500 group-hover:text-white"
                } transition-colors duration-300`}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
      {/* Add Motivational Message */}
      <MotivationalMessage
        show={showMotivation}
        theme={preferenceState.theme}
      />

      {/* Add Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmUnfinish}
        onConfirm={handleUnfinish}
        onCancel={() => setShowConfirmUnfinish(false)}
        theme={preferenceState.theme}
      />

      {/* Add this inside the learning mode button group, after the existing translation button */}
      {isLearningMode && (
        <button
          onClick={translateAll}
          disabled={isTranslatingAll || !sentences.length}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
            ${
              preferenceState.theme === "dark"
                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }
            ${isTranslatingAll ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {isTranslatingAll ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 relative">
                <div
                  className={`absolute inset-0 rounded-full border-2 animate-spin ${
                    preferenceState.theme === "dark"
                      ? "border-blue-400 border-r-transparent"
                      : "border-blue-700 border-r-transparent"
                  }`}
                ></div>
              </div>
              <span>{t("reader.buttons.translatingAll")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              <span>{t("reader.buttons.translateAll")}</span>
            </div>
          )}
        </button>
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
