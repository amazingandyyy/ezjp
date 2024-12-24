"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FaCog, FaSun, FaMoon, FaGoogle, FaUserCircle, FaSpinner, FaHeart } from 'react-icons/fa';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

// Add LoadingIndicator component before NewsList
const LoadingIndicator = ({ loading }) => {
  if (!loading) return null;
  
  return (
    <div className="inline-flex items-center gap-2 ml-2">
      <div className="w-4 h-4 relative">
        <div className="absolute inset-0 rounded-full border-2 border-gray-300 border-r-transparent animate-spin"></div>
      </div>
      <span className="text-xs text-gray-500">Updating preference...</span>
    </div>
  );
};

export default function NewsList() {
  const [newsList, setNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [archivedUrls, setArchivedUrls] = useState(new Set());
  const [finishedUrls, setFinishedUrls] = useState(new Set());
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const settingsRef = useRef(null);
  const profileRef = useRef(null);
  const { user, profile, loading: authLoading, signInWithGoogle, signOut, updateProfile } = useAuth();

  // Get theme from profile if available, otherwise from localStorage
  const [theme, setTheme] = useState('light');

  const [updatingPreferences, setUpdatingPreferences] = useState({
    theme: false
  });

  useEffect(() => {
    if (profile) {
      // If user has a profile, use their saved theme
      setTheme(profile.theme);
    } else if (typeof window !== 'undefined') {
      // Otherwise, use localStorage
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme && savedTheme !== 'yellow') {
        setTheme(savedTheme);
      }
    }
  }, [profile]);

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

  // Handle theme change
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

  useEffect(() => {
    fetchNewsList();
  }, []); // Remove user dependency since we want to fetch for all users

  // Add function to fetch archived URLs
  const fetchArchivedUrls = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_news')
        .select('url');
      
      if (error) throw error;
      setArchivedUrls(new Set(data.map(item => item.url)));
    } catch (error) {
      console.error('Error fetching archived URLs:', error);
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
    if (!authLoading) {  // Only proceed if auth state is determined
      if (user) {
        Promise.all([fetchArchivedUrls(), fetchFinishedUrls()]);
      } else {
        setArchivedUrls(new Set());
        setFinishedUrls(new Set());
      }
    }
  }, [user, authLoading]);

  const fetchNewsList = async () => {
    try {
      const response = await axios.get("/api/fetch-news-list");
      if (response.data.success) {
        setNewsList(response.data.newsList);
        // Only refresh user data if auth is loaded and user exists
        if (!authLoading && user) {
          await Promise.all([fetchArchivedUrls(), fetchFinishedUrls()]);
        }
      } else {
        throw new Error("Failed to fetch news list");
      }
    } catch (error) {
      console.error("Error fetching news list:", error);
      setError("Failed to load news list");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewsClick = (originalLink) => {
    router.push(`/read?source=${encodeURIComponent(originalLink)}`);
  };

  // Show loading state only when both auth and data are loading
  if (authLoading || (isLoading && !newsList.length)) {
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

  // Show error state
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'
      }`}>
        <div className="text-center">
          <p className="text-xl mb-4">{error}</p>
          <button
            onClick={fetchNewsList}
            className={`px-4 py-2 rounded-lg ${
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-900" : "bg-white"
      }`}
    >
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
            <FaCog
              className={`w-5 h-5 ${
                theme === "dark"
                  ? "text-gray-300"
                  : "[color-scheme:light] text-gray-600"
              }`}
            />
          </button>

          {/* Settings panel */}
          {showSettings && (
            <div
              className={`absolute top-full right-0 mt-2 p-4 rounded-lg shadow-lg border w-72
              ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 text-gray-100"
                  : "[color-scheme:light] bg-white border-gray-200 text-gray-900"
              }`}
            >
              <div className="space-y-4">
                {/* Theme controls */}
                <div className="space-y-2">
                  <label
                    className={`text-sm font-medium flex items-center ${
                      theme === "dark"
                        ? ""
                        : "[color-scheme:light] text-gray-900"
                    }`}
                  >
                    Theme
                    <LoadingIndicator loading={updatingPreferences.theme} />
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
                        className={`flex-1 px-3 py-1.5 rounded flex items-center justify-center gap-2 ${
                          theme === themeOption.id
                            ? theme === "dark"
                              ? "bg-gray-600 text-white"
                              : "[color-scheme:light] bg-gray-700 text-white"
                            : theme === "dark"
                            ? "bg-gray-700 text-gray-300"
                            : "[color-scheme:light] bg-gray-200 text-gray-600"
                        } ${
                          updatingPreferences.theme
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
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
            <FaUserCircle
              className={`w-5 h-5 ${
                theme === "dark"
                  ? "text-gray-300"
                  : "[color-scheme:light] text-gray-600"
              }`}
            />
          </button>

          {/* Profile panel - only shown when user is logged in and panel is open */}
          {user && showProfile && (
            <div
              className={`absolute top-full right-0 mt-2 p-4 rounded-lg shadow-lg border w-72
              ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 text-gray-100"
                  : "[color-scheme:light] bg-white border-gray-200 text-gray-900"
              }`}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Signed in as
                  </p>
                  <p
                    className={`font-medium ${
                      theme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}
                  >
                    {profile?.username || user.email}
                  </p>
                  <button
                    onClick={() =>
                      router.push(
                        `/user/${encodeURIComponent(
                          profile?.username || user.email
                        )}`
                      )
                    }
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
                    onClick={() => router.push("/saved")}
                    className={`w-full px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2 ${
                      theme === "dark"
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

      <div className="container mx-auto p-4 pt-16">
        <h1
          className={`text-3xl font-bold mb-8 ${
            theme === "dark" ? "text-gray-100" : "text-gray-900"
          }`}
        >
          Explore Easy JP News
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsList.map((news, index) => (
            <div
              key={index}
              onClick={() => handleNewsClick(news.url)}
              className={`border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer group ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 hover:bg-gray-700"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="relative">
                {news.image && (
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={news.image}
                      alt={news.title}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {archivedUrls.has(news.url) && (
                    <div className="bg-red-500 rounded-full p-1.5 shadow-lg">
                      <FaHeart className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {finishedUrls.has(news.url) && (
                    <div className="bg-green-500 rounded-full p-1.5 shadow-lg">
                      <svg 
                        className="w-4 h-4 text-white"
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
              <div className="p-4">
                <h2
                  className={`text-xl font-semibold mb-2 ${
                    theme === "dark" ? "text-gray-100" : "text-gray-900"
                  }`}
                >
                  {news.title}
                </h2>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {news.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
