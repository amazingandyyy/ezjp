'use client';
import { useState, useEffect, useRef } from 'react';
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
  FaRedo
} from 'react-icons/fa';

const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center space-y-4">
      <svg className="animate-spin h-12 w-12 text-blue-500" viewBox="0 0 24 24">
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
      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
        Loading news content...
      </p>
    </div>
  </div>
);

export default function NewsReader() {
  const [url, setUrl] = useState('https://www3.nhk.or.jp/news/easy/ne2024121811459/ne2024121811459.html');
  const [newsContent, setNewsContent] = useState('');
  const [sentences, setSentences] = useState([]);
  const [currentSentence, setCurrentSentence] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState('1.0');
  const [isLoading, setIsLoading] = useState(false);
  const [audioElement, setAudioElement] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [audioCache, setAudioCache] = useState({});
  const [fontSize, setFontSize] = useState('large');
  const [theme, setTheme] = useState('light'); // light, dark, yellow
  const [showSettings, setShowSettings] = useState(false);
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  const [repeatCountdown, setRepeatCountdown] = useState(0);
  const [showFurigana, setShowFurigana] = useState(true);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsDate, setNewsDate] = useState('');
  const [newsImages, setNewsImages] = useState([]);
  const [currentWord, setCurrentWord] = useState(-1);
  const [showWordHighlight, setShowWordHighlight] = useState(true);

  const settingsRef = useRef(null);
  const repeatModeRef = useRef(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    }

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const splitIntoSentences = (content) => {
    // Initialize variables for sentence building
    let currentSentence = [];
    const sentences = [];
    
    // Process each content part
    content.forEach((part) => {
      currentSentence.push(part);
      
      // If this part is text and ends with a sentence ending
      if (part.type === 'text' && /[。！？]$/.test(part.content)) {
        sentences.push([...currentSentence]);
        currentSentence = [];
      }
    });
    
    // Add any remaining content as the last sentence
    if (currentSentence.length > 0) {
      sentences.push(currentSentence);
    }
    
    return sentences;
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
        console.log("response", response.data);
        setNewsContent(response.data.content);
        setSentences(splitIntoSentences(response.data.content));
        setCurrentSentence(-1); // Reset to no selection
        setUrl(targetUrl);
        setNewsTitle(response.data.title);
        setNewsDate(response.data.date);
        setNewsImages(response.data.images);
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

  const playCurrentSentence = async (index = currentSentence) => {
    setCurrentWord(-1); // Reset word highlight when starting new sentence
    if (!sentences[index]) return;
    
    try {
      // Stop any existing audio first
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        setAudioElement(null); // Clear the old audio element
      }

      setIsPlaying(true);
      setIsPaused(false);
      setAudioError('');
      
      const sentenceText = sentenceToText(sentences[index]);
      const cacheKey = `${sentenceText}_${speed}`;
      
      let audio = new Audio(); // Always create a new audio element

      // Check if we have a cached audio blob
      if (audioCache[cacheKey]) {
        audio.src = audioCache[cacheKey];
      } else {
        setIsVoiceLoading(true);
        
        try {
          const response = await fetch(`/api/tts?text=${encodeURIComponent(sentenceText)}&speed=${parseFloat(speed)}`);
          if (!response.ok) throw new Error('Failed to fetch audio');
          
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          setAudioCache(prev => ({
            ...prev,
            [cacheKey]: audioUrl
          }));
          
          audio.src = audioUrl;
        } catch (fetchError) {
          throw new Error('Failed to generate audio');
        }
      }

      // Set up event handlers
      audio.dataset.sentence = index.toString();
      
      audio.onerror = () => {
        setAudioError('Failed to play audio. Please make sure Voicevox is running.');
        setIsPlaying(false);
        setIsPaused(false);
        setAutoPlay(false);
        setIsVoiceLoading(false);
      };
      
      // Wait for audio to be loaded before setting up onended
      await new Promise((resolve, reject) => {
        audio.onloadeddata = () => {
          setIsVoiceLoading(false);
          resolve();
        };
        audio.onerror = reject;
      });

      // Add ontimeupdate handler for word timing
      audio.ontimeupdate = () => {
        if (!sentences[index]) return;
        
        const words = processForDisplay(sentences[index]).length;
        const duration = audio.duration;
        const currentTime = audio.currentTime;
        
        // Estimate current word based on time
        const wordIndex = Math.floor((currentTime / duration) * words);
        if (wordIndex !== currentWord && wordIndex < words) {
          setCurrentWord(wordIndex);
        }
      };

      // Update onended to reset word highlight
      audio.onended = () => {
        console.log('Audio ended, repeat mode:', repeatModeRef.current);
        
        setCurrentWord(-1);
        setIsPlaying(false);
        setIsPaused(false);
        setIsVoiceLoading(false);

        // Clear any existing intervals first
        if (window.repeatInterval) {
          clearInterval(window.repeatInterval);
          window.repeatInterval = null;
        }

        if (repeatModeRef.current) {
          console.log('Starting repeat countdown');
          setRepeatCountdown(1);
          window.repeatInterval = setInterval(() => {
            setRepeatCountdown(prev => {
              if (prev <= 0) {
                clearInterval(window.repeatInterval);
                window.repeatInterval = null;
                if (repeatModeRef.current) {
                  setIsPlaying(true);
                  setTimeout(() => {
                    playCurrentSentence(index);
                  }, 100);
                }
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          if (index < sentences.length - 1) {
            setCurrentSentence(prev => prev + 1);
            setTimeout(() => {
              setIsPlaying(true);
              playCurrentSentence(index + 1);
            }, 800);
          }
        }
      };

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

    if (currentSentence === -1) {
      setCurrentSentence(0);
    }
    playCurrentSentence(currentSentence === -1 ? 0 : currentSentence);
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

  const RubyText = ({ kanji, reading, showReading }) => (
    <ruby className="group">
      {kanji}
      <rt className={`${showReading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        {reading}
      </rt>
    </ruby>
  );

  // Add helper function to process sentence for display
  const processForDisplay = (sentence) => {
    const result = [];
    let skipNext = false;

    sentence.forEach((part, index) => {
      if (skipNext) {
        skipNext = false;
        return;
      }

      if (part.type === 'ruby') {
        const nextPart = sentence[index + 1];
        // If next part is the hiragana reading of this kanji, skip it
        if (nextPart?.type === 'text' && nextPart.content === part.reading) {
          skipNext = true;
        }
        result.push(part);
      } else {
        result.push(part);
      }
    });

    return result;
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
    setCurrentWord(-1);
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
    ${theme === "dark" ? "bg-gray-800" : "bg-white"} 
    shadow-lg border 
    ${theme === "dark" ? "border-gray-700" : "border-gray-200"}
    z-40
  `;

  // Add a function to handle word highlighting
  const getWordClassName = (sentenceIndex, wordIndex) => {
    if (!showWordHighlight || sentenceIndex !== currentSentence) return '';
    
    return wordIndex === currentWord
      ? theme === "dark"
        ? "bg-gray-600 rounded px-1"
        : "bg-emerald-100 rounded px-1"
      : "";
  };

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

  return (
    <div className={`min-h-screen ${themeClasses.main}`}>
      <div className="container mx-auto p-4 pb-32"> {/* Add padding bottom to prevent content from being hidden behind controls */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Easy Japanese News Reader</h1>
        </div>

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
                theme === "dark"
                  ? "bg-blue-600 hover:bg-blue-500"
                  : "bg-blue-500"
              } text-white disabled:bg-gray-600 disabled:text-gray-300`}
            >
              {isLoading ? "Loading..." : "Fetch News"}
            </button>
          </div>
        </form>

        {newsContent && (
          <div
            className='mt-4 p-0 rounded relative'
          >
            {/* Title section with padding for controls */}
            <div className="pt-24 sm:pt-4"> {/* Add top padding on mobile, normal padding on desktop */}
              <div className="mb-6">
                <h2 className={`text-2xl font-bold mb-2 ${
                  theme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}>
                  {Array.isArray(newsTitle)
                    ? processForDisplay(newsTitle).map((part, i) =>
                        part.type === "ruby" ? (
                          <RubyText
                            key={i}
                            kanji={part.kanji}
                            reading={part.reading}
                            showReading={showFurigana}
                          />
                        ) : (
                          <span key={i}>{part.content}</span>
                        )
                      )
                    : newsTitle}
                </h2>
                <div
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {newsDate}
                </div>
              </div>

              {/* Progress indicator and repeat toggle - adjusted positioning */}
              {sentences.length > 0 && (
                <div className="absolute top-4 right-4 sm:top-4 flex flex-col gap-3">
                  {/* Progress bar row */}
                  <div className="flex items-center justify-end gap-2">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full w-32 h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-400" 
                            : "bg-gray-600"
                        }`}
                        style={{ 
                          width: `${currentSentence >= 0 ? ((currentSentence + 1) / sentences.length) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className={`text-xs whitespace-nowrap ${
                      theme === "dark" ? "text-gray-300" : "text-gray-600"
                    }`}>
                      {currentSentence >= 0
                        ? `${currentSentence + 1}/${sentences.length}`
                        : `${sentences.length}`}
                    </span>
                  </div>

                  {/* Repeat toggle row */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={handleRepeatToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        isRepeatMode
                          ? theme === "dark"
                            ? "bg-purple-600"
                            : "bg-purple-500"
                          : theme === "dark"
                          ? "bg-gray-700"
                          : "bg-gray-300"
                      }`}
                      title={`${isRepeatMode ? 'Stop' : 'Start'} sentence repeat mode`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform relative ${
                          isRepeatMode ? "translate-x-6" : "translate-x-1"
                        }`}
                      >
                        <FaRedo 
                          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 
                          ${isRepeatMode ? "text-purple-500" : "text-gray-400"}`} 
                        />
                      </span>
                    </button>
                    <span className={`text-xs whitespace-nowrap ${
                      theme === "dark" ? "text-gray-300" : "text-gray-600"
                    }`}>
                      {isRepeatMode 
                        ? repeatCountdown > 0 
                          ? `${repeatCountdown}s` 
                          : 'Repeating'
                        : 'Repeat'}
                    </span>
                  </div>
                </div>
              )}

              {newsImages.length > 0 && (
                <div className={imageContainerClass}>
                  <img
                    src={newsImages[0].src}
                    alt={newsImages[0].alt}
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
                {sentences.map((sentence, index) => (
                  <p
                    key={index}
                    onClick={() => handleSentenceClick(index)}
                    className={`mb-2 px-2 py-1 rounded-md leading-relaxed cursor-pointer hover:bg-opacity-75 
                      ${index === currentSentence
                        ? theme === "dark"
                          ? "bg-gray-700 p-4"
                          : theme === "yellow"
                            ? "bg-yellow-200 p-4"
                            : "bg-emerald-50 p-4"
                        : theme === "dark"
                        ? "hover:bg-gray-800"
                        : "hover:bg-gray-50"
                      } 
                      ${fontSize === "small"
                        ? "text-base leading-loose"
                        : fontSize === "medium"
                        ? "text-lg leading-loose"
                        : fontSize === "large"
                        ? "text-xl leading-loose"
                        : "text-2xl leading-loose"
                      }
                      ${isRepeatMode && index !== currentSentence 
                        ? theme === "dark"
                          ? "opacity-50"
                          : "opacity-40"
                        : ""
                      }
                      transition-opacity duration-200
                    `}
                  >
                    {processForDisplay(sentence).map((part, i) =>
                      part.type === "ruby" ? (
                        <span
                          key={i}
                          className={`inline-block ${getWordClassName(index, i)}`}
                        >
                          <RubyText
                            kanji={part.kanji}
                            reading={part.reading}
                            showReading={showFurigana}
                          />
                        </span>
                      ) : (
                        <span 
                          key={i}
                          className={getWordClassName(index, i)}
                        >
                          {part.content}
                        </span>
                      )
                    )}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {audioError && (
          <div
            className={`mt-4 p-4 border rounded ${
              theme === "dark"
                ? "bg-red-900 text-red-100 border-red-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {audioError}
          </div>
        )}

        {isLoading && <LoadingSpinner />}
      </div>

      {/* Add back the media controls */}
      {newsContent && (
        <div className={mediaControlsClass}>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentSentence <= 0 || isVoiceLoading || !isPlaying && !isPaused && !autoPlay}
              className={`p-2 rounded-full flex items-center justify-center 
                ${theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-500 disabled:bg-gray-800"
                  : "bg-gray-500 hover:bg-gray-400 active:bg-gray-300 disabled:bg-gray-300"
                } text-white w-10 h-10 transition-colors duration-150`}
              title="Previous"
            >
              <FaArrowLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (audioElement) {
                  audioElement.pause();
                  audioElement.currentTime = 0;
                }
                setIsPlaying(false);
                setIsPaused(false);
                setAutoPlay(false);
                setCurrentSentence(-1);
                setCurrentWord(-1);
                if (isRepeatMode) {
                  setIsRepeatMode(false);
                  setRepeatCountdown(0);
                }
              }}
              disabled={!newsContent || isLoading || (!isPlaying && !isPaused && !autoPlay && currentSentence === -1)}
              className={`p-2 rounded-full flex items-center justify-center 
                ${theme === "dark"
                  ? "bg-red-600 hover:bg-red-500 active:bg-red-400"
                  : "bg-red-500 hover:bg-red-400 active:bg-red-300"
                } text-white disabled:bg-gray-600 disabled:text-gray-300 w-10 h-10 transition-colors duration-150`}
              title="Stop and Reset"
            >
              <FaStop className="w-4 h-4" />
            </button>

            <button
              onClick={handlePlay}
              disabled={!newsContent || isLoading}
              className={`p-2 rounded-full flex items-center justify-center ${
                isVoiceLoading
                  ? "bg-purple-600 hover:bg-purple-500 active:bg-purple-400"
                  : isPlaying
                  ? "bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-400"
                  : "bg-green-600 hover:bg-green-500 active:bg-green-400"
              } text-white disabled:bg-gray-600 disabled:text-gray-300 w-12 h-12 transition-colors duration-150`}
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
                ${theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-500 disabled:bg-gray-800"
                  : "bg-gray-500 hover:bg-gray-400 active:bg-gray-300 disabled:bg-gray-300"
                } text-white w-10 h-10 transition-colors duration-150`}
              title="Next"
            >
              <FaArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add fixed settings button and drawer */}
      <div className="fixed bottom-6 right-6 z-50" ref={settingsRef}>
        {showSettings && (
          <div 
            className={`absolute bottom-16 right-0 mb-2 p-4 rounded-lg shadow-lg border w-72
            ${theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
            }`}
          >
            <div className="space-y-4">
              {/* Font size controls */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Font Size</label>
                <div className="flex gap-1">
                  {["small", "medium", "large", "x-large"].map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFontSizeChange(size)}
                      className={`flex-1 px-3 py-1.5 rounded ${
                        fontSize === size
                          ? theme === "dark"
                            ? "bg-gray-600 text-white"
                            : "bg-gray-700 text-white"
                          : theme === "dark"
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gray-200"
                      }`}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed control */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Speed</label>
                <select
                  value={speed}
                  onChange={(e) => handleSpeedChange(e.target.value)}
                  className={`w-full p-2 border rounded ${themeClasses.select}`}
                >
                  <option value="0.6">Super Slow (0.6x)</option>
                  <option value="0.8">Slow (0.8x)</option>
                  <option value="1.0">Normal (1.0x)</option>
                  <option value="1.2">Fast (1.2x)</option>
                </select>
              </div>

              {/* Theme controls */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Theme</label>
                <div className="flex gap-1">
                  {[
                    { id: "light", icon: <FaSun />, title: "Light" },
                    { id: "dark", icon: <FaMoon />, title: "Dark" },
                    { id: "yellow", icon: <FaBook />, title: "Yellow" },
                  ].map((themeOption) => (
                    <button
                      key={themeOption.id}
                      onClick={() => handleThemeChange(themeOption.id)}
                      className={`flex-1 px-3 py-1.5 rounded flex items-center justify-center gap-2 ${
                        theme === themeOption.id
                          ? theme === "dark"
                            ? "bg-gray-600 text-white"
                            : "bg-gray-700 text-white"
                          : theme === "dark"
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gray-200"
                      }`}
                    >
                      {themeOption.icon}
                      <span className="text-sm">{themeOption.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Furigana control */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Furigana</label>
                <button
                  onClick={() => setShowFurigana(!showFurigana)}
                  className={`w-full px-3 py-1.5 rounded flex items-center justify-center ${
                    showFurigana
                      ? theme === "dark"
                        ? "bg-gray-600 text-white"
                        : "bg-gray-700 text-white"
                      : theme === "dark"
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-200"
                  }`}
                >
                  {showFurigana ? "Hide Furigana" : "Show Furigana"}
                </button>
                <span className="text-xs text-gray-500 block text-center">
                  (Hover to show when hidden)
                </span>
              </div>

              {/* Word highlight control */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Word Highlight</label>
                <button
                  onClick={() => setShowWordHighlight(!showWordHighlight)}
                  className={`w-full px-3 py-1.5 rounded flex items-center justify-center ${
                    showWordHighlight
                      ? theme === "dark"
                        ? "bg-gray-600 text-white"
                        : "bg-gray-700 text-white"
                      : theme === "dark"
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-200"
                  }`}
                >
                  {showWordHighlight ? "Disable Word Highlight" : "Enable Word Highlight"}
                </button>
                <span className="text-xs text-gray-500 block text-center">
                  (Highlight words while reading)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Settings toggle button */}
        <button
          onClick={toggleSettings}
          className={`p-3 rounded-full shadow-lg flex items-center justify-center transition-colors duration-150 ${
            theme === "dark"
              ? showSettings
                ? "bg-gray-700"
                : "bg-gray-800 hover:bg-gray-700"
              : showSettings
                ? "bg-gray-100"
                : "bg-white hover:bg-gray-50"
          } border ${
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
          title="Settings"
        >
          <FaCog className={`w-6 h-6 ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`} />
        </button>
      </div>
    </div>
  );
}
