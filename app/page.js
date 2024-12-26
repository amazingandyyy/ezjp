"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import { FaHeart, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import Navbar from './components/Navbar';

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays >= 7) {
      return `${Math.floor(diffInDays / 7)}週間前`;
    } else if (diffInDays > 0) {
      return `${diffInDays}日${diffInHours % 24}時間前`;
    } else if (diffInHours > 0) {
      return `${diffInHours}時間${diffInMinutes % 60}分前`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes}分前`;
    } else {
      return 'たった今';
    }
  } catch (e) {
    return dateStr;
  }
};

export default function NewsList() {
  const [newsList, setNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [archivedUrls, setArchivedUrls] = useState(new Set());
  const [finishedUrls, setFinishedUrls] = useState(new Set());
  const [hideFinished, setHideFinished] = useState(false);
  const [finishedStats, setFinishedStats] = useState({ recent: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const pathname = usePathname();

  // Get theme from profile if available, otherwise from localStorage
  const [theme, setTheme] = useState('light');

  // Load theme from localStorage or profile
  useEffect(() => {
    const updateTheme = () => {
      if (profile) {
        setTheme(profile.theme);
      } else if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && savedTheme !== 'yellow') {
          setTheme(savedTheme);
        }
      }
    };

    // Update theme whenever we navigate back to this page
    updateTheme();
  }, [profile, pathname]); // Add pathname as dependency to update theme on navigation

  // Add intersection observer ref
  const observerRef = useRef();
  const loadMoreRef = useCallback(node => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMoreNews();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loadingMore, hasMore]);

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

  // Add function to fetch finished stats
  const fetchFinishedStats = async () => {
    if (!user) return;
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      // Get total count of articles from the news list that are within 7 days
      const recentArticles = newsList.filter(article => {
        try {
          const articleDate = new Date(article.date);
          return articleDate >= oneWeekAgo;
        } catch (e) {
          return false;
        }
      });

      // Count finished articles from the recent articles list
      const recentFinishedCount = recentArticles.filter(article => 
        finishedUrls.has(article.url)
      ).length;

      setFinishedStats({
        recent: recentFinishedCount,
        total: recentArticles.length
      });
    } catch (error) {
      console.error('Error fetching finished stats:', error);
    }
  };

  // Update useEffect to include stats fetch
  useEffect(() => {
    if (!authLoading) {  // Only proceed if auth state is determined
      if (user) {
        Promise.all([fetchArchivedUrls(), fetchFinishedUrls(), fetchFinishedStats()]);
      } else {
        setArchivedUrls(new Set());
        setFinishedUrls(new Set());
        setFinishedStats({ recent: 0, total: 0 });
      }
    }
  }, [user, authLoading, newsList]); // Add newsList as dependency

  // Add effect to update stats when finishedUrls changes
  useEffect(() => {
    if (user && newsList.length > 0) {
      fetchFinishedStats();
    }
  }, [finishedUrls, newsList]);

  // Add loadMoreNews function
  const loadMoreNews = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNewsList(nextPage, true);
  }, [page, loadingMore, hasMore]);

  // Modify fetchNewsList to support pagination
  const fetchNewsList = async (pageNum = 1, append = false) => {
    try {
      const pageSize = pageNum === 1 ? 50 : 12;
      const offset = pageNum === 1 ? 0 : 50 + ((pageNum - 2) * 12);
      
      const response = await axios.get("/api/fetch-news-list", {
        params: { 
          offset,
          limit: pageSize
        }
      });
      if (response.data.success) {
        const newNews = response.data.newsList;
        setHasMore(response.data.hasMore);
        setNewsList(prev => {
          const updatedList = append ? [...prev, ...newNews] : newNews;
          // Update stats after updating the list
          if (user) {
            setTimeout(() => fetchFinishedStats(), 0);
          }
          return updatedList;
        });
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
      setLoadingMore(false);
    }
  };

  const handleNewsClick = (originalLink) => {
    router.push(`/read?source=${encodeURIComponent(originalLink)}`);
  };

  // Show loading state only when both auth and data are loading
  if (isLoading && !newsList.length) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-[rgb(19,31,36)]' : 'bg-white'
      }`}>
        <div className={`animate-spin rounded-full h-16 w-16 border-b-2 ${
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

      <div className="container mx-auto p-4 pt-24">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <h1
            className={`text-3xl font-bold text-center ${
              theme === "dark" ? "text-gray-100" : "text-[rgb(19,31,36)]"
            }`}
          >
            Find the latest news
          </h1>
          {user && (
            <div className="flex items-center gap-4">
              <div className={`text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}>
                <span className="font-medium text-green-500">{finishedStats.recent}</span>
                <span className="mx-1">/</span>
                <span>{finishedStats.total}</span>
                <span className="ml-1 text-xs opacity-75">finished in the past 7 days</span>
              </div>
              <button
                onClick={() => setHideFinished(!hideFinished)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                  ${theme === "dark"
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
              >
                {hideFinished ? (
                  <FaEye className="w-5 h-5 text-green-500" />
                ) : (
                  <FaEyeSlash className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm font-medium">
                  {hideFinished ? "Show all articles" : "Hide finished"}
                </span>
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {newsList
            .filter(news => !hideFinished || !finishedUrls.has(news.url))
            .map((news, index) => (
            <div
              key={index}
              onClick={() => handleNewsClick(news.url)}
              className={`transition-all cursor-pointer group ${finishedUrls.has(news.url) ? 'opacity-40 hover:opacity-100' : ''}`}
            >
              <div className="relative">
                {news.image && (
                  <div className="aspect-video relative overflow-hidden rounded-lg">
                    <img
                      src={news.image}
                      alt={news.title}
                      className="object-cover w-full h-full transition-all duration-700 blur-sm group-hover:scale-110"
                      onLoad={(e) => {
                        e.target.classList.remove('blur-sm');
                      }}
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
                    <div className="bg-emerald-500 rounded-full p-1.5 shadow-lg">
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
              <div className="pt-3">
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
                  {formatRelativeTime(news.date)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Loading more indicator */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="py-8 flex justify-center"
          >
            {loadingMore ? (
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                theme === 'dark' ? 'border-gray-400' : 'border-gray-800'
              }`} />
            ) : (
              <div className={`h-8 w-8 ${
                theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
              }`} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
