"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FaHeart } from 'react-icons/fa';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import Navbar from './components/Navbar';

export default function NewsList() {
  const [newsList, setNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [archivedUrls, setArchivedUrls] = useState(new Set());
  const [finishedUrls, setFinishedUrls] = useState(new Set());
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  // Get theme from profile if available, otherwise from localStorage
  const [theme, setTheme] = useState('light');

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

  useEffect(() => {
    fetchNewsList();
  }, []); // Remove user dependency since we want to fetch for all users

  // Add function to fetch archived URLs
  const fetchArchivedUrls = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_articles')
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
        theme === 'dark' ? 'bg-[rgb(19,31,36)]' : 'bg-white'
      }`}>
        <div className={`animate-spin rounded-full h-32 w-32 border-b-2 ${
          theme === 'dark' ? 'border-gray-200' : 'border-[rgb(19,31,36)]'
        }`}></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-[rgb(19,31,36)] text-white' : 'bg-white text-black'
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
        theme === "dark" ? "bg-[rgb(19,31,36)]" : "bg-white"
      }`}
    >
      {/* Add Navbar */}
      <Navbar 
        theme={theme}
        hideNewsListButton={true}
      />

      <div className="container mx-auto p-4 pt-16">
        <h1
          className={`text-3xl font-bold mb-8 text-center ${
            theme === "dark" ? "text-gray-100" : "text-[rgb(19,31,36)]"
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
                  ? "bg-[rgb(19,31,36)] border-gray-700 hover:bg-[rgb(29,41,46)]"
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
                    theme === "dark" ? "text-gray-100" : "text-[rgb(19,31,36)]"
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
