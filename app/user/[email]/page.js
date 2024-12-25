'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaHeart, FaBook, FaClock, FaEdit, FaCheck, FaTimes, FaUser, FaEgg, FaFire, FaShare, FaTwitter, FaWhatsapp, FaLinkedin, FaLink } from 'react-icons/fa';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthContext';
import Navbar from '../../components/Navbar';

// Import RubyText component and utility functions from read/page.js
const RubyText = ({ part, preferenceState }) => {
  if (!part || part.type !== 'ruby' || !part.kanji || !part.reading) {
    return null;
  }
  return (
    <ruby className="group">
      {part.kanji}
      <rt className={`${preferenceState?.show_furigana ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        {part.reading}
      </rt>
    </ruby>
  );
};

// Import processContent utility from read/page.js
const processContent = (content) => {
  if (!Array.isArray(content)) return [];
  return content.map((part, index) => {
    if (part?.type === 'ruby') {
      return {
        type: 'ruby',
        kanji: part.kanji,
        reading: part.reading
      };
    } else if (part?.type === 'text') {
      return {
        type: 'text',
        content: part.content
      };
    }
    return null;
  }).filter(Boolean);
};

// Helper function to format time duration
const formatDuration = (minutes) => {
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours} hour${hours > 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${remainingMinutes} min` : ''}`;
};

// Helper function to format date
const formatDate = (dateString, type = 'finished') => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  const suffix = type === 'saved' ? 'saved article' : 'finished article';
  
  if (diffDays === 0) {
    return ['Today at ' + timeStr, suffix];
  } else if (diffDays === 1) {
    return ['Yesterday at ' + timeStr, suffix];
  } else if (diffDays < 7) {
    return [`${diffDays} days ago at ${timeStr}`, suffix];
  } else {
    return [
      date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      }) + ' at ' + timeStr,
      suffix
    ];
  }
};

// Import formatJapaneseDate from read/page.js
const formatJapaneseDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}時${String(date.getMinutes()).padStart(2, '0')}分`;
  } catch (e) {
    return dateStr;
  }
};

export default function UserProfile() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [savedNews, setSavedNews] = useState([]);
  const [finishedNews, setFinishedNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('light');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef(null);
  const [stats, setStats] = useState({
    totalReadingTime: 0,
    totalArticlesRead: 0,
    totalSavedArticles: 0,
    totalFinishedArticles: 0,
    longestStreak: 0,
    currentStreak: 0
  });

  // Add getActivityItems function to handle the timeline items
  const getActivityItems = () => {
    const items = [
      // Add saved articles
      ...(savedNews || []).map(item => ({
        type: 'saved',
        date: item.created_at,
        data: {
          url: item.article?.url || '',
          article: item.article,
          reading_time: item.reading_time
        }
      })),
      // Add finished articles
      ...(finishedNews || []).map(item => ({
        type: 'finished',
        date: item.finished_at,
        data: {
          url: item.article?.url || '',
          article: item.article
        }
      }))
    ];

    // Sort all items by date, most recent first
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Add function to calculate longest streak
  const calculateLongestStreak = (finishedArticles) => {
    if (!finishedArticles?.length) return 0;

    // Get unique dates (in YYYY-MM-DD format) when articles were finished
    const dates = finishedArticles.map(article => {
      const date = new Date(article.finished_at);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
    const uniqueDates = [...new Set(dates)].sort();

    let currentStreak = 1;
    let longestStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(currDate - prevDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return longestStreak;
  };

  // Add function to calculate current streak
  const calculateStreaks = (finishedArticles) => {
    if (!finishedArticles?.length) return { longest: 0, current: 0 };

    // Get unique dates (in YYYY-MM-DD format) when articles were finished
    const dates = finishedArticles.map(article => {
      const date = new Date(article.finished_at);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
    const uniqueDates = [...new Set(dates)].sort().reverse(); // Sort in descending order for current streak

    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    // Calculate current streak
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if the most recent activity was today or yesterday
    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffTime = Math.abs(prevDate - currDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      currentStreak = 0;
    }

    // Calculate longest streak
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(prevDate - currDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { longest: longestStreak, current: currentStreak };
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!params.email) return;
      
      try {
        setIsLoading(true);
        const identifier = decodeURIComponent(params.email);
        let profileQuery = supabase.from('profiles').select('*');

        // Check if the identifier is an email or username
        if (identifier.includes('@')) {
          profileQuery = profileQuery.eq('email', identifier);
        } else {
          profileQuery = profileQuery.eq('username', identifier);
        }

        const { data: profiles, error: profileError } = await profileQuery.maybeSingle();

        if (!isMounted) return;

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // Don't set error, just use default profile
        }

        // If no profile found, create a default one
        const defaultProfile = {
          id: identifier,
          username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
          email: identifier.includes('@') ? identifier : null,
          created_at: new Date().toISOString(),
          theme: 'light'
        };

        const profileData = profiles || defaultProfile;
        setProfile(profileData);
        setTheme(profileData.theme || 'light');

        // Fetch user's saved news with article data
        const { data: saved, error: savedError } = await supabase
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
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (savedError) {
          console.error('Error fetching saved news:', savedError);
          // Don't return on error, continue with empty array
        }

        // Fetch user's finished articles with article data
        const { data: finished, error: finishedArticlesError } = await supabase
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
          .eq('user_id', profileData.id)
          .order('finished_at', { ascending: false });

        if (!isMounted) return;

        if (finishedArticlesError) {
          console.error('Error fetching finished articles:', finishedArticlesError);
          // Don't return on error, continue with empty array
        }

        setSavedNews(saved || []);
        setFinishedNews(finished || []);

        // Fetch user's reading stats
        const { data: readingStats, error: statsError } = await supabase
          .from('reading_stats')
          .select('total_reading_time, total_articles_read')
          .eq('user_id', profileData.id)
          .maybeSingle();

        if (!isMounted) return;

        if (statsError && statsError.code !== 'PGRST116') {
          console.error('Error fetching reading stats:', statsError);
          // Don't return on error, continue with default stats
        }

        // Fetch finished articles count
        const { count: finishedCount, error: finishedError } = await supabase
          .from('finished_articles')
          .select('id', { count: 'exact' })
          .eq('user_id', profileData.id);

        if (finishedError) {
          console.error('Error fetching finished articles:', finishedError);
          // Don't return on error, continue with zero count
        }

        setStats({
          totalReadingTime: readingStats?.total_reading_time || 0,
          totalArticlesRead: readingStats?.total_articles_read || 0,
          totalSavedArticles: saved?.length || 0,
          totalFinishedArticles: finishedCount || 0,
          longestStreak: calculateLongestStreak(finished || []),
          currentStreak: calculateStreaks(finished || []).current
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error in profile loading:', error);
        // Don't set error state, use default values instead
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [params.email]);

  // Add click outside handler for share menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false);
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showShareMenu]);

  // Add share functions
  const getShareUrl = () => {
    return `${window.location.origin}/user/${profile?.username || profile?.email}`;
  };

  const copyToClipboard = async () => {
    try {
      const url = getShareUrl();
      const text = `Checkout my reading progress on #EZJP\n${url}`;
      await navigator.clipboard.writeText(text);
      setShowShareMenu(false);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToTwitter = () => {
    const url = getShareUrl();
    const isOwnProfile = currentUser?.id === profile?.id;
    const text = isOwnProfile
      ? `Check out my Japanese reading progress on EZJP! Currently on a ${stats.currentStreak}-day streak and have read ${stats.totalFinishedArticles} articles.\n\n${url}\n\n#EZJP #Japanese #LearnJapanese`
      : `Check out ${profile?.username || 'this reader'}'s Japanese reading progress on EZJP! They've finished ${stats.totalFinishedArticles} articles with a ${stats.longestStreak}-day best streak.\n\n${url}\n\n#EZJP #Japanese #LearnJapanese`;
    
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank'
    );
    setShowShareMenu(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[rgb(19,31,36)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[rgb(19,31,36)] mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Add processForDisplay function
  const processForDisplay = (sentence) => {
    // Filter out hiragana readings that follow kanji
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

  const renderTitle = (title) => {
    if (Array.isArray(title)) {
      return title.map((part, i) => {
        if (part.type === "ruby") {
          return (
            <RubyText
              key={i}
              part={part}
              preferenceState={{ show_furigana: true }}
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
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[rgb(19,31,36)]' : 'bg-gray-50'}`}>
      <Navbar theme={theme} hideNewsListButton={true} />
      
      <div className="container mx-auto p-4 pt-24 pb-32">
        <div className="max-w-4xl mx-auto">
          {/* Profile header */}
          <div className={`mb-8 ${theme === 'dark' ? 'bg-[rgb(19,31,36)]' : 'bg-gray-50'}`}>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="flex flex-col items-center sm:items-start">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${
                  theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
                }`}>
                  {profile?.username?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase()}
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <h1 className={`text-3xl font-bold ${
                    theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'
                  }`}>
                    {profile?.username || 'Anonymous User'}
                  </h1>
                  <div className="flex items-center gap-2">
                    <div className="relative" ref={shareMenuRef}>
                      <button
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className={`p-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        title="Share profile"
                      >
                        <FaShare className="w-4 h-4" />
                      </button>
                      {showShareMenu && (
                        <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-10 ${
                          theme === 'dark'
                            ? 'bg-gray-800 border border-gray-700'
                            : 'bg-white border border-gray-200'
                        }`}>
                          <button
                            onClick={copyToClipboard}
                            className={`w-full px-4 py-2 text-sm flex items-center gap-3 transition-colors ${
                              theme === 'dark'
                                ? 'text-gray-300 hover:bg-gray-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <FaLink className="w-4 h-4" />
                            Copy Link
                          </button>
                          <button
                            onClick={shareToTwitter}
                            className={`w-full px-4 py-2 text-sm flex items-center gap-3 transition-colors ${
                              theme === 'dark'
                                ? 'text-gray-300 hover:bg-gray-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              fill="currentColor"
                            >
                              <path d="M13.3174 10.7749L19.1457 4H17.7646L12.7039 9.88256L8.66193 4H4L10.1122 12.8955L4 20H5.38119L10.7254 13.7878L14.994 20H19.656L13.3171 10.7749H13.3174ZM11.4257 12.9738L10.8064 12.0881L5.87886 5.03974H8.00029L11.9769 10.728L12.5962 11.6137L17.7652 19.0075H15.6438L11.4257 12.9742V12.9738Z" />
                            </svg>
                            Share on X
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Joined {new Date(profile?.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Stats Section */}
            <div className={`pt-6 sm:pt-8 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`p-4 sm:p-6 rounded-xl shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                  <div>
                    <div className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
                      {stats.longestStreak} days
                    </div>
                    <div className={`text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <FaFire className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                      Best Streak
                    </div>
                    <div className={`mt-2 text-xs flex items-center gap-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className={`px-2 py-0.5 rounded ${
                        stats.currentStreak > 0
                          ? theme === 'dark'
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-orange-100 text-orange-700'
                          : theme === 'dark'
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {stats.currentStreak} days current
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
                      {stats.totalFinishedArticles}
                    </div>
                    <div className={`text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <FaCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                      Finished Read
                    </div>
                  </div>
                  <div>
                    <div className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
                      {formatDuration(stats.totalReadingTime)}
                    </div>
                    <div className={`text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <FaClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                      Total Reading Time
                    </div>
                  </div>
                  <div>
                    <div className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
                      {stats.totalSavedArticles}
                    </div>
                    <div className={`text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <FaHeart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                      Saved Articles
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
            Activity
          </h2>

          <div className="relative">
            {/* Timeline line */}
            <div className={`absolute left-0 top-0 bottom-0 w-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />

            <div className="space-y-6">
              {/* Activity items */}
              {getActivityItems().map((item, index) => (
                <div key={`${item.type}-${index}`} className="relative flex gap-4">
                  {/* Timeline dot and date */}
                  <div className="relative">
                    <div className={`absolute left-0 top-1 w-3 h-3 -ml-1.5 rounded-full border-2 ${theme === 'dark' ? 'border-gray-800' : 'border-white'} ${
                      item.type === "saved" ? "bg-red-500" : "bg-green-500"
                    }`} />
                    <div className={`pl-4 text-sm whitespace-nowrap ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(item.date, item.type).map((text, i) => (
                        <div key={i} className={
                          i === 1
                            ? "text-sm font-medium flex items-center gap-1.5"
                            : "text-xs opacity-75"
                        }>
                          {text}
                          {i === 1 &&
                            (item.type === "saved" ? (
                              <FaHeart className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <FaCheck className="w-3.5 h-3.5 text-green-500" />
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Article content */}
                  <button onClick={() =>
                    router.push(
                      `/read?source=${encodeURIComponent(item.data.url)}`
                    )
                  } className={`flex-1 ml-4 p-4 rounded-lg transition-opacity duration-200 hover:opacity-70 text-left`}>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="block w-full sm:w-32 h-32 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          {item.data.article?.images?.[0] ? (
                            <img src={item.data.article.images[0]} alt="" className="w-full h-full object-cover" onError={(e) => {
                              e.target.parentElement.style.display = "none";
                            }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <FaBook className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium mb-2 break-words line-clamp-2 ${theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
                            {(() => {
                              try {
                                let title =
                                  item.data.article?.title || item.data.title;

                                // If title is a string that looks like JSON, try to parse it
                                if (
                                  typeof title === "string" &&
                                  (title.startsWith("[") || title.startsWith("{"))
                                ) {
                                  try {
                                    title = JSON.parse(title);
                                  } catch (e) {
                                    return title || "Untitled Article";
                                  }
                                }

                                // Process title using processContent if it's an array
                                if (Array.isArray(title)) {
                                  return processContent(title).map((part, i) => {
                                    if (part.type === "ruby") {
                                      return (
                                        <RubyText
                                          key={i}
                                          part={part}
                                          preferenceState={{
                                            show_furigana: true,
                                          }}
                                        />
                                      );
                                    }
                                    return <span key={i}>{part.content}</span>;
                                  });
                                }

                                return title || "Untitled Article";
                              } catch (e) {
                                return "Untitled Article";
                              }
                            })()}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {item.data.article?.publish_date
                                ? formatJapaneseDate(
                                    item.data.article.publish_date
                                  )
                                : "No date"}
                            </p>
                            {item.type === "saved" &&
                              item.data.reading_time > 0 && (
                                <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <FaClock className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="whitespace-nowrap">
                                    Read for{" "}
                                    {formatDuration(item.data.reading_time)}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              ))}

              {/* Joined timeline item */}
              <div className="relative flex gap-4">
                <div className="relative">
                  <div className={`absolute left-0 top-1 w-3 h-3 -ml-1.5 rounded-full border-2 ${theme === 'dark' ? 'border-gray-800 bg-yellow-500' : 'border-white bg-yellow-500'}`} />
                  <div className={`pl-4 text-sm whitespace-nowrap ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {(() => {
                      const date = new Date(profile?.created_at);
                      return [
                        date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                        }) +
                          ' at ' +
                          date.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          }),
                        'joined EZJP as Reader',
                      ];
                    })().map((text, i) => (
                      <div key={i} className={i === 1 ? 'text-sm font-medium flex items-center gap-1.5' : 'text-xs opacity-75'}>
                        {text}
                        {i === 1 && (
                          <FaEgg className="w-3.5 h-3.5 text-yellow-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 ml-4" />
              </div>

              {savedNews.length === 0 && (
                <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <FaHeart className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p>No saved articles yet</p>
                  <p className="text-sm mt-2">
                    Articles you save will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 