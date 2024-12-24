'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaHeart, 
  FaCog, 
  FaSun, 
  FaMoon, 
  FaBook, 
  FaUserCircle,
  FaGoogle 
} from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';

// Add LoadingIndicator component
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

export default function SavedNews() {
  const [savedNews, setSavedNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { user, profile, loading: authLoading, signInWithGoogle, signOut, updateProfile } = useAuth();
  const theme = profile?.theme || 'light';
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const settingsRef = useRef(null);
  const profileRef = useRef(null);

  const [updatingPreferences, setUpdatingPreferences] = useState({
    theme: false
  });

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
    if (newTheme === 'yellow') return;
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // If user is logged in, update their profile
    if (user) {
      await updatePreferenceWithMinDuration('theme', async () => {
        await updateProfile({
          theme: newTheme
        });
      });
    }
  };

  useEffect(() => {
    // Only redirect if auth is finished loading and there's no user
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    // Only fetch news if we have a user
    if (user) {
      fetchSavedNews();
    }
  }, [user, authLoading, router]);

  const fetchSavedNews = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('saved_news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse any JSON strings in the data
      const parsedData = data?.map(news => ({
        ...news,
        title: typeof news.title === 'string' ? 
          (news.title.startsWith('[') ? JSON.parse(news.title) : news.title) : 
          news.title
      })) || [];
      
      setSavedNews(parsedData);
    } catch (error) {
      console.error('Error fetching saved news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewsClick = (url) => {
    router.push(`/read?source=${encodeURIComponent(url)}`);
  };

  // Show loading state while auth is loading
  if (authLoading || isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className={`animate-spin rounded-full h-32 w-32 border-b-2 ${
          theme === 'dark' ? 'border-gray-200' : 'border-gray-900'
        }`}></div>
      </div>
    );
  }

  // If auth is loaded and there's no user, we'll redirect (handled in useEffect)
  if (!user) {
    return null;
  }

  const RubyText = ({ kanji, reading, showReading = true }) => (
    <ruby className="group">
      {kanji}
      <rt className={`${showReading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        {reading}
      </rt>
    </ruby>
  );

  const renderTitle = (title) => {
    if (Array.isArray(title)) {
      return title.map((part, i) => {
        if (part.type === "ruby") {
          return (
            <RubyText
              key={i}
              kanji={part.kanji}
              reading={part.reading}
            />
          );
        } else {
          return <span key={i}>{part.content}</span>;
        }
      });
    }
    return title;
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Back button - top left */}
      <button
        onClick={() => router.push('/')}
        className={`fixed top-4 left-4 z-50 p-3 rounded-lg shadow-lg border flex items-center justify-center 
          transition-colors duration-150
          ${theme === 'dark'
            ? 'bg-gray-800/95 hover:bg-gray-700/95 border-gray-700 backdrop-blur-sm'
            : '[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200 backdrop-blur-sm'
          }`}
        title="Back to News Explorer"
      >
        <FaBook className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
      </button>

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
              theme === "dark"
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
              theme === "dark" ? "text-gray-300" : "[color-scheme:light] text-gray-600"
            }`} />
          </button>

          {/* Settings panel */}
          {showSettings && (
            <div 
              className={`absolute top-full right-0 mt-2 p-4 rounded-lg shadow-lg border w-72
              ${theme === "dark"
                ? "bg-gray-800 border-gray-700 text-gray-100"
                : "[color-scheme:light] bg-white border-gray-200 text-gray-900"
              }`}
            >
              <div className="space-y-4">
                {/* Theme controls */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium flex items-center ${theme === "dark" ? "" : "[color-scheme:light] text-gray-900"}`}>
                    Theme
                    <LoadingIndicator loading={updatingPreferences.theme} theme={theme} />
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
                          theme === themeOption.id
                            ? theme === "dark"
                              ? "bg-gray-600 text-white"
                              : "[color-scheme:light] bg-gray-700 text-white"
                            : theme === "dark"
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
              theme === "dark"
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
              theme === "dark" ? "text-gray-300" : "[color-scheme:light] text-gray-600"
            }`} />
          </button>

          {/* Profile panel - only shown when user is logged in and panel is open */}
          {user && showProfile && (
            <div 
              className={`absolute top-full right-0 mt-2 p-4 rounded-lg shadow-lg border w-72
              ${theme === "dark"
                ? "bg-gray-800 border-gray-700 text-gray-100"
                : "[color-scheme:light] bg-white border-gray-200 text-gray-900"
              }`}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    Signed in as
                  </p>
                  <p className={`font-medium ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                    {profile?.username || user.email}
                  </p>
                  <button
                    onClick={() => router.push(`/user/${encodeURIComponent(profile?.username || user.email)}`)}
                    className={`w-full px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2 ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    <FaUserCircle className="w-4 h-4" />
                    My Profile
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className={`w-full px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2 ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    <FaBook className="w-4 h-4" />
                    News List
                  </button>
                  <button
                    onClick={signOut}
                    className={`w-full px-3 py-1.5 rounded text-sm ${
                      theme === "dark"
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

      <div className="container mx-auto p-4 pt-24">
        <div className="flex items-center gap-2 mb-8">
          <h1 className={`text-3xl font-bold ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Saved News
          </h1>
          <FaHeart className={`w-6 h-6 ${
            theme === 'dark' ? 'text-red-400' : 'text-red-500'
          }`} />
        </div>

        {savedNews.length === 0 ? (
          <p className={`text-lg ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            No saved news yet. Click the heart icon while reading to save articles here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedNews.map((news) => (
              <div
                key={news.id}
                onClick={() => handleNewsClick(news.url)}
                className={`border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer group ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {news.image && (
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={news.image}
                      alt=""
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-4">
                  <h2 className={`text-xl font-semibold mb-2 ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    {renderTitle(news.title)}
                  </h2>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {news.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 