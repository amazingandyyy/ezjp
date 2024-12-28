"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import { FaHeart, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import Navbar from '../components/Navbar';

// Add helper function to create JST date
const createJSTDate = (year, month, day, hours = 0, minutes = 0, seconds = 0) => {
  // Create a date in UTC
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  return date;
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    
    // Create date in JST
    const jstDate = createJSTDate(year, month, day, hours, minutes, seconds);
    const now = new Date();

    // Debug log for date parsing
    console.log('formatRelativeTime debug:', {
      input: dateStr,
      parsed: {
        datePart,
        timePart,
        year,
        month,
        day,
        hours,
        minutes,
        seconds
      },
      jstDate: jstDate.toISOString(),
      localJstDate: jstDate.toString(),
      now: now.toISOString(),
      localNow: now.toString(),
      isToday: isToday(dateStr)
    });

    const diffInMilliseconds = now.getTime() - jstDate.getTime();
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Calculate remainders
    const remainingHours = Math.abs(diffInHours % 24);
    const remainingMinutes = Math.abs(diffInMinutes % 60);

    return diffInDays >= 7 
      ? `${Math.floor(diffInDays / 7)}週間前`
      : diffInDays > 0
      ? `${diffInDays}日${remainingHours}時間前`
      : remainingHours > 0
      ? `${remainingHours}時間${remainingMinutes}分前`
      : remainingMinutes > 0
      ? `${remainingMinutes}分前`
      : diffInSeconds > 0
      ? '1分前'
      : 'たった今';
  } catch (e) {
    console.error('Error formatting date:', e, dateStr);
    return dateStr;
  }
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  try {
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart ? timePart.split(':').map(Number) : [0, 0, 0];
    
    // Create date in JST
    const date = createJSTDate(year, month, day, hours, minutes, seconds);
    const now = new Date();

    // Calculate time difference in hours
    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));

    // Consider it today's news if it's less than 24 hours old
    return diffInHours < 24;
  } catch (e) {
    console.error('Error parsing date:', e, dateStr);
    return false;
  }
};

// Add isMainichiUrl helper function at the top level
const isMainichiUrl = (url) => {
  try {
    return url?.includes('mainichi.jp');
  } catch (e) {
    return false;
  }
};

export default function NewsList() {
  const [newsList, setNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [archivedUrls, setArchivedUrls] = useState(new Set());
  const [finishedUrls, setFinishedUrls] = useState(new Set());
  const [hideFinished, setHideFinished] = useState(true);
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

      <div className="container mx-auto px-6 py-8 pt-24 max-w-[1600px]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
          <h1
            className={`text-4xl font-bold tracking-tight ${
              theme === "dark" ? "text-gray-100" : "text-[rgb(19,31,36)]"
            }`}
          >
            All News
          </h1>
          {user && (
            <div className="flex items-center gap-5">
              <div className={`text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}>
                <span className="font-medium text-green-500">{finishedStats.recent}</span>
                <span className="mx-1.5">/</span>
                <span>{finishedStats.total}</span>
                <span className="ml-2 text-xs opacity-75">finished this week</span>
              </div>
              <button
                onClick={() => setHideFinished(!hideFinished)}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-300
                  ${theme === "dark"
                    ? "bg-gray-800/80 hover:bg-gray-700 text-gray-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
              >
                {hideFinished ? (
                  <FaEye className="w-4 h-4 text-green-500" />
                ) : (
                  <FaEyeSlash className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium">
                  {hideFinished ? "Show all articles" : "Hide finished"}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Today's News Section */}
        {newsList.some(news => isToday(news.date)) && (
          <div className="mb-16">
            <h2 className={`text-xl font-semibold mb-8 flex items-center gap-3 ${
              theme === "dark" ? "text-gray-200" : "text-gray-800"
            }`}>
              <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Today's News</span>
            </h2>
            {user && hideFinished && newsList.filter(news => isToday(news.date)).every(news => finishedUrls.has(news.url)) ? (
              <div className={`flex flex-col items-center justify-center py-8 rounded-xl ${
                theme === "dark" ? "bg-gray-800/50" : "bg-gray-50"
              }`}>
                <div className="bg-green-500 rounded-full p-3 mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className={`text-lg font-medium mb-1 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  All caught up!
                </h3>
                <p className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}>
                  You've read all of today's articles
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {newsList
                  .filter(news => isToday(news.date))
                  .filter(news => !hideFinished || !finishedUrls.has(news.url))
                  .map((news, index) => (
                    <NewsCard 
                      key={index} 
                      news={news} 
                      theme={theme}
                      finishedUrls={finishedUrls}
                      archivedUrls={archivedUrls}
                      onClick={() => handleNewsClick(news.url)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Previous News Section */}
        <div>
          <h2 className={`text-xl font-semibold mb-8 ${
            theme === "dark" ? "text-gray-200" : "text-gray-800"
          }`}>
            Previous News
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {newsList
              .filter(news => !isToday(news.date))
              .filter(news => !hideFinished || !finishedUrls.has(news.url))
              .map((news, index) => (
                <NewsCard 
                  key={index} 
                  news={news} 
                  theme={theme}
                  finishedUrls={finishedUrls}
                  archivedUrls={archivedUrls}
                  onClick={() => handleNewsClick(news.url)}
                />
              ))}
          </div>
        </div>

        {/* Loading more indicator */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="py-12 flex justify-center"
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

// Extract NewsCard component
const NewsCard = ({ news, theme, finishedUrls, archivedUrls, onClick }) => (
  <div
    onClick={onClick}
    className={`transition-all duration-300 cursor-pointer group hover:translate-y-[-4px] ${
      finishedUrls.has(news.url) ? 'opacity-40 hover:opacity-100' : ''
    }`}
  >
    <div className="relative">
      {news.image ? (
        <div className="aspect-video relative overflow-hidden rounded-xl shadow-sm">
          <img
            src={news.image}
            alt={news.title}
            className="object-cover w-full h-full transition-all duration-700 blur-sm group-hover:scale-105"
            onLoad={(e) => {
              e.target.classList.remove('blur-sm');
            }}
          />
        </div>
      ) : isMainichiUrl(news.url) ? (
        <div className={`aspect-video relative overflow-hidden rounded-xl shadow-sm ${theme === 'dark' ? 'bg-[#1a1f24]' : 'bg-blue-50'} flex items-center justify-center`}>
          <img
            src="/icons/Mainichi_logo_2024.png"
            alt="Mainichi"
            className="w-48 h-auto transition-all duration-300 group-hover:scale-105 opacity-90"
          />
        </div>
      ) : null}
      <div className="absolute top-3 right-3 flex gap-2">
        {archivedUrls.has(news.url) && (
          <div className="bg-red-500/90 backdrop-blur-sm rounded-full p-2 shadow-lg transition-transform duration-300 hover:scale-110">
            <FaHeart className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        {finishedUrls.has(news.url) && (
          <div className="bg-emerald-500/90 backdrop-blur-sm rounded-full p-2 shadow-lg transition-transform duration-300 hover:scale-110">
            <svg 
              className="w-3.5 h-3.5 text-white"
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
    <div className="pt-4">
      <h2
        className={`text-lg font-semibold leading-snug mb-2.5 line-clamp-2 ${
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
);
