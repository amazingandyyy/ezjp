"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import { FaHeart, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import useStatsStore from '@/lib/stores/stats';
import { formatRelativeTime, formatJapaneseDate, createJSTDate } from '@/lib/utils/date';
import { getNewsSource } from '@/lib/utils/urls';
import Navbar from '@/app/components/Navbar';

const isToday = (dateStr) => {
  if (!dateStr) return false;
  try {
    // Create date in JST from ISO string
    const jstDate = createJSTDate(dateStr);
    const now = new Date();
    const jstNow = createJSTDate(now.toISOString());

    // Calculate time difference in hours
    const diffInMilliseconds = jstNow.getTime() - jstDate.getTime();
    const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));

    // Consider it today's news if it's less than 24 hours old
    return diffInHours < 24;
  } catch (e) {
    console.error('Error parsing date:', e, dateStr);
    return false;
  }
};

const placeholderIcons = [
  // Document with lines
  <path key="1" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  // Star
  <path key="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
    d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />,
  // Rocket
  <path key="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
    d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />,
  // Sun
  <path key="4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
    d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />,
  // Moon
  <path key="5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
    d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />,
  // Sparkles
  <path key="6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
];

const texturePatterns = {
  dots: (
    <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.15]">
      <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="currentColor" />
      </pattern>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
    </svg>
  ),
  grid: (
    <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.15]">
      <pattern id="grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </pattern>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />
    </svg>
  ),
  waves: (
    <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.15]">
      <pattern id="waves" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
        <path d="M0 10 Q 10 0, 20 10 Q 30 20, 40 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </pattern>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#waves)" />
    </svg>
  ),
  diagonal: (
    <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.15]">
      <pattern id="diagonal" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" stroke="currentColor" strokeWidth="0.5" />
      </pattern>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#diagonal)" />
    </svg>
  )
};

const placeholderStyles = [
  // Document - subtle blue tint with dots
  { 
    gradient: 'bg-gradient-to-br from-gray-800 to-blue-900/40',
    lightGradient: 'bg-gradient-to-br from-gray-100 to-blue-100/60',
    texture: texturePatterns.dots
  },
  // Book - subtle warm brown with grid
  { 
    gradient: 'bg-gradient-to-br from-gray-800 to-amber-900/40',
    lightGradient: 'bg-gradient-to-br from-gray-100 to-amber-100/60',
    texture: texturePatterns.grid
  },
  // Star - subtle gold with diagonal
  { 
    gradient: 'bg-gradient-to-br from-gray-800 to-yellow-900/40',
    lightGradient: 'bg-gradient-to-br from-gray-100 to-yellow-100/60',
    texture: texturePatterns.diagonal
  },
  // Moon - subtle night blue with waves
  { 
    gradient: 'bg-gradient-to-br from-gray-800 to-indigo-900/40',
    lightGradient: 'bg-gradient-to-br from-gray-100 to-indigo-100/60',
    texture: texturePatterns.waves
  },
  // Sparkles - subtle purple with dots
  { 
    gradient: 'bg-gradient-to-br from-gray-800 to-purple-900/40',
    lightGradient: 'bg-gradient-to-br from-gray-100 to-purple-100/60',
    texture: texturePatterns.dots
  },
  // Reading person - subtle sage with grid
  { 
    gradient: 'bg-gradient-to-br from-gray-800 to-emerald-900/40',
    lightGradient: 'bg-gradient-to-br from-gray-100 to-emerald-100/60',
    texture: texturePatterns.grid
  },
  // Newspaper - subtle cool gray with diagonal
  { 
    gradient: 'bg-gradient-to-br from-gray-800 to-slate-900/40',
    lightGradient: 'bg-gradient-to-br from-gray-100 to-slate-200/60',
    texture: texturePatterns.diagonal
  },
  // Light bulb - subtle warm yellow with waves
  { 
    gradient: 'bg-gradient-to-br from-gray-800 to-amber-900/40',
    lightGradient: 'bg-gradient-to-br from-gray-100 to-amber-100/60',
    texture: texturePatterns.waves
  }
];

// Add background texture pattern
const backgroundTexture = {
  squares: (
    <svg width="100%" height="100%" className="fixed inset-0 pointer-events-none">
      <pattern id="bg-squares" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <path d="M 15 0 L 65 0 M 80 15 L 80 65 M 65 80 L 15 80 M 0 65 L 0 15" 
          className="stroke-gray-900/[0.04] dark:stroke-gray-100/[0.04]" 
          strokeWidth="1" 
          strokeDasharray="2 2" 
          fill="none" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#bg-squares)" />
    </svg>
  )
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
        theme === "dark" ? "bg-[rgb(19,31,36)]" : "bg-gray-50"
      }`}
    >
      {/* Add background texture */}
      {backgroundTexture.squares}

      <Navbar theme={theme} hideNewsListButton={true} />
      <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-24">
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
              <div
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                <span className="font-medium text-green-500">
                  {finishedStats.recent}
                </span>
                <span className="mx-1.5">/</span>
                <span>{finishedStats.total}</span>
                <span className="ml-2 text-xs opacity-75">
                  finished this week
                </span>
              </div>
              <button
                onClick={() => setHideFinished(!hideFinished)}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-300
                  ${
                    theme === "dark"
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
        {newsList.some((news) => isToday(news.date)) && (
          <div className="mb-16">
            <h2
              className={`text-xl font-semibold mb-8 flex items-center gap-3 ${
                theme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}
            >
              <svg
                className="w-5 h-5 text-green-500"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Today's News</span>
            </h2>
            {user &&
            hideFinished &&
            newsList
              .filter((news) => isToday(news.date))
              .every((news) => finishedUrls.has(news.url)) ? (
              <div
                className={`flex flex-col items-center justify-center py-8 rounded-xl ${
                  theme === "dark" ? "bg-gray-800/50" : "bg-gray-50"
                }`}
              >
                <div className="bg-green-500 rounded-full p-3 mb-4">
                  <svg
                    className="w-6 h-6 text-white"
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
                <h3
                  className={`text-lg font-medium mb-1 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  All caught up!
                </h3>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  You've read all of today's articles
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {newsList
                  .filter((news) => isToday(news.date))
                  .filter(
                    (news) => !hideFinished || !finishedUrls.has(news.url)
                  )
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
          <h2
            className={`text-xl font-semibold mb-8 ${
              theme === "dark" ? "text-gray-200" : "text-gray-800"
            }`}
          >
            Previous News
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {newsList
              .filter((news) => !isToday(news.date))
              .filter((news) => !hideFinished || !finishedUrls.has(news.url))
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
          <div ref={loadMoreRef} className="py-12 flex justify-center">
            {loadingMore ? (
              <div
                className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                  theme === "dark" ? "border-gray-400" : "border-gray-800"
                }`}
              />
            ) : (
              <div
                className={`h-8 w-8 ${
                  theme === "dark" ? "text-gray-600" : "text-gray-400"
                }`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Extract NewsCard component
const NewsCard = ({ news, theme, finishedUrls, archivedUrls, onClick }) => {
  // Randomly select an icon and its corresponding style
  const randomIndex = useMemo(() => Math.floor(Math.random() * placeholderIcons.length), []);
  const randomIcon = useMemo(() => placeholderIcons[randomIndex], [randomIndex]);
  const style = useMemo(() => placeholderStyles[randomIndex], [randomIndex]);

  return (
    <div
      onClick={onClick}
      className={`transition-all duration-300 cursor-pointer group hover:translate-y-[-4px] ${
        finishedUrls.has(news.url) ? 'opacity-40 hover:opacity-100' : ''
      }`}
    >
      <div className="relative min-h-[40px]">
        {news.image ? (
          <div className="aspect-video relative overflow-hidden rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] to-black/[0.08] dark:from-black/[0.05] dark:to-black/[0.12] pointer-events-none" />
            <img
              src={news.image}
              alt={news.title}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              style={{ willChange: 'transform' }}
            />
            <div className="absolute inset-0 bg-white/[0.02] dark:bg-black/[0.02] backdrop-blur-[0.2px] pointer-events-none" />
          </div>
        ) : (
          <div className={`aspect-video relative overflow-hidden rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] ${
            theme === 'dark' ? style.gradient : style.lightGradient
          } flex flex-col items-center justify-center gap-3 transition-all duration-300 group-hover:shadow-[0_15px_40px_rgb(0,0,0,0.12)] dark:group-hover:shadow-[0_15px_40px_rgb(0,0,0,0.3)]`}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] to-black/[0.08] dark:from-black/[0.05] dark:to-black/[0.12] pointer-events-none transition-opacity duration-300 group-hover:opacity-75" />
            {style.texture}
            <svg className={`w-11 h-11 relative transition-all duration-300 group-hover:scale-105 group-hover:text-gray-500 dark:group-hover:text-gray-400 ${
              theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {randomIcon}
            </svg>
            <div className={`text-center relative transition-all duration-300 group-hover:scale-[1.02] group-hover:text-gray-500 dark:group-hover:text-gray-300 ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`}>
              <p className="text-sm font-medium">
                {(() => {
                  const source = getNewsSource(news.url);
                  switch (source) {
                    case 'mainichi':
                      return 'Mainichi';
                    case 'nhk':
                      return 'NHK';
                    default:
                      return 'Unknown';
                  }
                })()} news has no image
              </p>
              <p className="text-sm font-medium">content inside still worth reading</p>
            </div>
            <div className="absolute inset-0 bg-white/[0.02] dark:bg-black/[0.02] backdrop-blur-[0.2px] pointer-events-none transition-opacity duration-300 group-hover:opacity-75" />
          </div>
        )}
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
};
