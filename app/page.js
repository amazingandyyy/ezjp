'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function NewsReader() {
  const [url, setUrl] = useState('https://www3.nhk.or.jp/news/easy/ne2024121811459/ne2024121811459.html');
  const [newsContent, setNewsContent] = useState('');
  const [sentences, setSentences] = useState([]);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState('1.0');
  const [isLoading, setIsLoading] = useState(false);
  const [audioElement, setAudioElement] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [audioCache, setAudioCache] = useState({});
  const [fontSize, setFontSize] = useState('medium');
  const [theme, setTheme] = useState('light'); // light, dark, yellow
  const [showSettings, setShowSettings] = useState(false);
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  const [repeatCountdown, setRepeatCountdown] = useState(0);

  const splitIntoSentences = (text) => {
    // Split by common Japanese sentence endings (, ！, ？)
    return text.split(/([。！？])/).reduce((acc, current, i, arr) => {
      if (i % 2 === 0) {
        if (arr[i + 1]) {
          acc.push(current + arr[i + 1]);
        } else if (current.trim()) {
          acc.push(current);
        }
      }
      return acc;
    }, []);
  };

  const fetchNews = async (targetUrl = url) => {
    setIsLoading(true);
    setAudioError('');
    // Clean up existing cache
    Object.values(audioCache).forEach(url => {
      URL.revokeObjectURL(url);
    });
    setAudioCache({});
    
    try {
      const response = await axios.get('/api/fetch-news', {
        params: { url: targetUrl }
      });
      
      if (response.data.success) {
        setNewsContent(response.data.content);
        setSentences(splitIntoSentences(response.data.content));
        setCurrentSentence(0);
        setUrl(targetUrl); // Update URL in case it was passed as parameter
      } else {
        throw new Error('Failed to fetch news');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setAudioError('Failed to fetch news content. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []); // Run once on mount

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

  const playCurrentSentence = async (index = currentSentence) => {
    if (!sentences[index]) return;
    
    try {
      setIsPlaying(true);
      setIsPaused(false);
      setAudioError('');
      
      let audio = audioElement;
      const cacheKey = `${sentences[index]}_${speed}`;
      
      // If there's a playing audio, stop it first
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      // Check if we have a cached audio blob
      if (audioCache[cacheKey]) {
        audio = new Audio(audioCache[cacheKey]);
      } else {
        // If not cached, fetch and cache the audio
        setIsVoiceLoading(true);
        
        try {
          const response = await fetch(`/api/tts?text=${encodeURIComponent(sentences[index])}&speed=${parseFloat(speed)}`);
          if (!response.ok) throw new Error('Failed to fetch audio');
          
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Cache the audio URL
          setAudioCache(prev => ({
            ...prev,
            [cacheKey]: audioUrl
          }));
          
          audio = new Audio(audioUrl);
        } catch (fetchError) {
          throw new Error('Failed to generate audio');
        }
      }

      // Set up audio event handlers
      audio.dataset.sentence = index.toString();
      
      audio.onerror = () => {
        setAudioError('Failed to play audio. Please make sure Voicevox is running.');
        setIsPlaying(false);
        setIsPaused(false);
        setAutoPlay(false);
        setIsVoiceLoading(false);
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setIsVoiceLoading(false);
        if (isRepeatMode) {
          // Start countdown
          setRepeatCountdown(1);
          const countdownInterval = setInterval(() => {
            setRepeatCountdown(prev => {
              if (prev <= 0) {
                clearInterval(countdownInterval);
                // Only replay if still in repeat mode
                if (isRepeatMode) {
                  setIsPlaying(true);
                  audio.currentTime = 0;
                  audio.play();
                }
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else if (autoPlay && index < sentences.length - 1) {
          setCurrentSentence(prev => prev + 1);
          setTimeout(() => playCurrentSentence(index + 1), 500);
        } else if (index === sentences.length - 1) {
          setAutoPlay(false);
        }
      };

      // Wait for audio to be loaded
      await new Promise((resolve, reject) => {
        audio.onloadeddata = () => {
          setIsVoiceLoading(false);
          resolve();
        };
        audio.onerror = reject;
      });

      setAudioElement(audio);
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioError('Failed to play audio. Please make sure Voicevox is running.');
      setIsPlaying(false);
      setIsPaused(false);
      setAutoPlay(false);
      setIsVoiceLoading(false);
    }
  };

  const pauseAudio = () => {
    if (audioElement && !audioElement.paused) {
      audioElement.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const resumeAudio = async () => {
    if (audioElement && audioElement.paused) {
      try {
        setIsPlaying(true);
        setIsPaused(false);
        await audioElement.play();
      } catch (error) {
        console.error('Error resuming audio:', error);
        setAudioError('Failed to resume audio');
        setIsPlaying(false);
        setIsPaused(false);
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
    
    if (autoPlay) {
      setAutoPlay(false);
      pauseAudio();
      return;
    }

    setAutoPlay(true);
    playCurrentSentence();
  };

  const handleNext = async () => {
    if (currentSentence < sentences.length - 1) {
      const nextIndex = currentSentence + 1;
      setCurrentSentence(nextIndex);
      try {
        setAutoPlay(true);
        await playCurrentSentence(nextIndex);
      } catch (error) {
        console.error('Error playing next sentence:', error);
      }
    }
  };

  const handlePrevious = async () => {
    if (currentSentence > 0) {
      const prevIndex = currentSentence - 1;
      setCurrentSentence(prevIndex);
      try {
        setAutoPlay(true);
        await playCurrentSentence(prevIndex);
      } catch (error) {
        console.error('Error playing previous sentence:', error);
      }
    }
  };

  const handleSpeedChange = async (newSpeed) => {
    // Stop current playback
    if (audioElement) {
      audioElement.pause();
    }

    // Clean up existing cache
    Object.values(audioCache).forEach(url => {
      URL.revokeObjectURL(url);
    });
    setAudioCache({});

    // Reset all play states
    setIsPlaying(false);
    setIsPaused(false);
    setAutoPlay(false);

    // Update speed
    setSpeed(newSpeed);
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return {
          main: 'bg-gray-900 text-gray-100',
          input: 'bg-gray-800 border-gray-700 text-gray-100 focus:border-gray-500',
          button: 'bg-gray-700 hover:bg-gray-600',
          select: 'bg-gray-800 border-gray-700 text-gray-100',
          controlBg: 'bg-gray-200 dark:bg-gray-700'
        };
      case 'yellow':
        return {
          main: 'bg-yellow-50',
          input: 'bg-white border-yellow-200',
          button: '',
          select: 'bg-white border-yellow-200',
          controlBg: 'bg-gray-200'
        };
      default:
        return {
          main: 'bg-white',
          input: 'bg-white border-gray-300',
          button: '',
          select: 'bg-white border-gray-300',
          controlBg: 'bg-gray-200'
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

  return (
    <div className={`min-h-screen ${themeClasses.main}`}>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Easy Japanese News Reader</h1>
          <button
            onClick={toggleSettings}
            className={`px-3 py-1 rounded ${
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title="Settings"
          >
            ⚙️
          </button>
        </div>

        {showSettings && (
          <div className={`mb-4 p-4 rounded border ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' :
            theme === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
            'bg-white border-gray-200'
          }`}>
            <div className="flex flex-wrap gap-6">
              {/* Font size controls */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Font Size:</label>
                <div className="flex gap-1">
                  {['small', 'medium', 'large', 'x-large'].map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFontSizeChange(size)}
                      className={`px-3 py-1 rounded ${
                        fontSize === size 
                          ? theme === 'dark' 
                            ? 'bg-gray-600 text-white' 
                            : 'bg-gray-700 text-white'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-200'
                      }`}
                      title={size.charAt(0).toUpperCase() + size.slice(1)}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme controls */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Theme:</label>
                <div className="flex gap-1">
                  {[
                    { id: 'light', icon: '☀️', title: 'Light Mode' },
                    { id: 'dark', icon: '🌙', title: 'Dark Mode' },
                    { id: 'yellow', icon: '📖', title: 'Yellow Mode' }
                  ].map((themeOption) => (
                    <button
                      key={themeOption.id}
                      onClick={() => handleThemeChange(themeOption.id)}
                      className={`px-3 py-1 rounded flex items-center justify-center ${
                        theme === themeOption.id
                          ? theme === 'dark'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-700 text-white'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-200'
                      }`}
                      title={themeOption.title}
                    >
                      {themeOption.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleUrlSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={handleUrlChange}
              className={`flex-1 p-2 border rounded ${themeClasses.input}`}
              placeholder="Enter NHK News URL"
            />
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 rounded ${
                theme === 'dark' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500'
              } text-white disabled:bg-gray-600 disabled:text-gray-300`}
            >
              {isLoading ? 'Loading...' : 'Fetch News'}
            </button>
          </div>
        </form>

        <div className="flex gap-2 mb-4">
          <button
            onClick={handlePlay}
            disabled={!newsContent || isLoading}
            className={`px-4 py-2 rounded ${
              isVoiceLoading ? 'bg-purple-600' :
              isPlaying ? 'bg-yellow-600' : 
              isPaused ? 'bg-blue-600' :
              autoPlay ? 'bg-red-600' : 
              'bg-green-600'
            } text-white disabled:bg-gray-600 disabled:text-gray-300 min-w-[120px] relative ${
              theme === 'dark' ? 'hover:opacity-90' : ''
            }`}
          >
            {isVoiceLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading Voice
              </span>
            ) : (
              isPlaying ? 'Pause' : 
              isPaused ? 'Resume' :
              autoPlay ? 'Stop' : 
              'Read News'
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <label className="text-sm">Speed:</label>
            <select
              value={speed}
              onChange={(e) => handleSpeedChange(e.target.value)}
              className={`p-2 border rounded ${themeClasses.select}`}
            >
              <option value="0.6">Super Slow (0.6x)</option>
              <option value="0.8">Slow (0.8x)</option>
              <option value="1.0">Normal (1.0x)</option>
              <option value="1.2">Fast (1.2x)</option>
            </select>
          </div>

          <button
            onClick={() => setIsRepeatMode(!isRepeatMode)}
            className={`px-3 py-1 rounded flex items-center gap-1 ${
              isRepeatMode 
                ? theme === 'dark'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-500 text-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-200'
            }`}
            title={isRepeatMode ? 'Disable Repeat' : 'Enable Repeat'}
          >
            <span>🔁</span>
            {isRepeatMode 
              ? repeatCountdown > 0 
                ? `Repeat in ${repeatCountdown}s` 
                : 'Repeating'
              : 'Repeat'
            }
          </button>
        </div>

        {sentences.length > 0 && (
          <div className="mb-4 flex gap-2 items-center">
            <button
              onClick={handlePrevious}
              disabled={currentSentence === 0 || isVoiceLoading}
              className={`px-4 py-2 rounded ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800'
                  : 'bg-gray-500 disabled:bg-gray-300'
              } text-white`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentSentence === sentences.length - 1 || isVoiceLoading}
              className={`px-4 py-2 rounded ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800'
                  : 'bg-gray-500 disabled:bg-gray-300'
              } text-white`}
            >
              Next
            </button>
            <span className={`px-4 py-2 rounded ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              {currentSentence + 1} / {sentences.length}
            </span>
            {isVoiceLoading && (
              <span className="text-purple-600 flex items-center gap-1">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating voice...
              </span>
            )}
          </div>
        )}

        {newsContent && (
          <div className={`mt-4 p-4 border rounded ${
            theme === 'dark' ? 'border-gray-700 bg-gray-800' :
            theme === 'yellow' ? 'border-yellow-200 bg-yellow-100' :
            'bg-white'
          }`}>
            <div>
              {sentences.map((sentence, index) => (
                <p
                  key={index}
                  className={`mb-2 ${
                    index === currentSentence ? 
                      theme === 'dark' ? 'bg-gray-700 p-2' :
                      theme === 'yellow' ? 'bg-yellow-200 p-2' :
                      'bg-yellow-100 p-2'
                    : ''
                  } ${
                    fontSize === 'small' ? 'text-sm' :
                    fontSize === 'medium' ? 'text-base' :
                    fontSize === 'large' ? 'text-lg' :
                    'text-xl'
                  }`}
                >
                  {sentence}
                </p>
              ))}
            </div>
          </div>
        )}

        {audioError && (
          <div className={`mt-4 p-4 border rounded ${
            theme === 'dark' ? 'bg-red-900 text-red-100 border-red-700' :
            'bg-red-100 text-red-700'
          }`}>
            {audioError}
          </div>
        )}

        {isLoading && (
          <div className={`mt-4 p-4 border rounded ${
            theme === 'dark' ? 'bg-blue-900 text-blue-100 border-blue-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            Loading news content...
          </div>
        )}
      </div>
    </div>
  );
}
