"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FaCog, FaSun, FaMoon } from 'react-icons/fa';

export default function NewsList() {
  const [newsList, setNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  // Get theme from localStorage if available, otherwise use light mode
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme && savedTheme !== 'yellow') {
        setTheme(savedTheme);
      }
      // No else clause - we'll keep the default light theme
      // Remove system preference check to always default to light mode

      // Only listen for system changes if no theme is saved
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        if (!localStorage.getItem('theme')) {
          // Optional: if you want to completely ignore system preference
          // and always default to light, comment out this line
          // setTheme(e.matches ? 'dark' : 'light');
        }
      };
      mediaQuery.addEventListener('change', handleChange);

      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Handle theme change
  const handleThemeChange = (newTheme) => {
    if (newTheme === 'yellow') return;
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Handle click outside settings
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

  useEffect(() => {
    fetchNewsList();
  }, []);

  const fetchNewsList = async () => {
    try {
      const response = await axios.get("/api/fetch-news-list");
      if (response.data.success) {
        setNewsList(response.data.newsList);
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

  if (isLoading) {
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

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="text-red-600 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Settings button - top right */}
      <div className="fixed top-4 right-4 z-50" ref={settingsRef}>
        <button
          onClick={() => setShowSettings(!showSettings)}
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
                <label className={`text-sm font-medium ${theme === "dark" ? "" : "[color-scheme:light] text-gray-900"}`}>Theme</label>
                <div className="flex gap-1">
                  {[
                    { id: "light", icon: <FaSun />, title: "Light" },
                    { id: "dark", icon: <FaMoon />, title: "Dark" },
                  ].map((themeOption) => (
                    <button
                      key={themeOption.id}
                      onClick={() => handleThemeChange(themeOption.id)}
                      className={`flex-1 px-3 py-1.5 rounded flex items-center justify-center gap-2 ${
                        theme === themeOption.id
                          ? theme === "dark"
                            ? "bg-gray-600 text-white"
                            : "[color-scheme:light] bg-gray-700 text-white"
                          : theme === "dark"
                          ? "bg-gray-700 text-gray-300"
                          : "[color-scheme:light] bg-gray-200 text-gray-600"
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

      <div className="container mx-auto p-4">
        <h1 className={`text-3xl font-bold mb-8 ${
          theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
        }`}>
          NHK Easy News
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsList.map((news, index) => (
            <div
              key={index}
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
                    alt={news.title}
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              )}
              <div className="p-4">
                <h2 className={`text-xl font-semibold mb-2 ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {news.title}
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
      </div>
    </div>
  );
}
