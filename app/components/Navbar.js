import { useRef, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaBook, FaUserCircle, FaHeart, FaDownload, FaUser } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';

export default function Navbar({ 
  showSidebar, 
  onSidebarToggle,
  theme,
  hideNewsListButton = false
}) {
  const router = useRouter();
  const { user, profile, signInWithGoogle, signOut } = useAuth();
  const profileRef = useRef(null);
  const [showProfile, setShowProfile] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [stats, setStats] = useState({
    totalReadingTime: 0,
    totalArticlesRead: 0,
    totalSavedArticles: 0,
    totalFinishedArticles: 0,
    longestStreak: 0,
    currentStreak: 0
  });

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle install click
  const handleInstallClick = async () => {
    if (installPrompt) {
      // Show the install prompt
      installPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await installPrompt.userChoice;
      // Clear the saved prompt since it can't be used again
      setInstallPrompt(null);
      // Optionally track the outcome
      console.log(`User ${outcome} the installation`);
    } else {
      // Fallback for browsers that don't support install prompt
      window.location.href = '/manifest.json';
    }
  };

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }

    // Only add the event listener if the profile dropdown is open
    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProfile]);

  // Add calculateStreaks function from profile page
  const calculateStreaks = useMemo(() => (finishedArticles) => {
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
  }, []);

  // Add useEffect to fetch stats when dropdown opens
  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !showProfile) return;

      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        // Fetch user's reading stats
        const { data: readingStats, error: statsError } = await supabase
          .from('reading_stats')
          .select('total_reading_time, total_articles_read')
          .eq('user_id', user.id)
          .maybeSingle();

        if (statsError && statsError.code !== 'PGRST116') {
          console.error('Error fetching reading stats:', statsError);
        }

        // Fetch finished articles for streak calculation
        const { data: finished, error: finishedError } = await supabase
          .from('finished_articles')
          .select('finished_at')
          .eq('user_id', user.id)
          .order('finished_at', { ascending: false });

        if (finishedError) {
          console.error('Error fetching finished articles:', finishedError);
        }

        // Calculate streaks
        const streaks = calculateStreaks(finished || []);

        // Fetch finished articles count
        const { count: finishedCount, error: finishedCountError } = await supabase
          .from('finished_articles')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);

        // Fetch today's finished articles count
        const { count: todayFinishedCount, error: todayFinishedError } = await supabase
          .from('finished_articles')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('finished_at', todayStr);

        if (finishedCountError) {
          console.error('Error fetching finished count:', finishedCountError);
        }

        if (todayFinishedError) {
          console.error('Error fetching today finished count:', todayFinishedError);
        }

        setStats({
          totalReadingTime: readingStats?.total_reading_time || 0,
          totalArticlesRead: readingStats?.total_articles_read || 0,
          totalFinishedArticles: finishedCount || 0,
          todayFinishedArticles: todayFinishedCount || 0,
          currentStreak: streaks.current,
          longestStreak: streaks.longest
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [user, showProfile, calculateStreaks]);

  // Memoize the stats display
  const StatsDisplay = useMemo(() => (
    <div className="px-4 py-3">
      <div className="grid grid-cols-2 gap-8">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 flex items-center justify-center rounded-md ${
            theme === "dark"
              ? "bg-orange-500/10 text-orange-400"
              : "bg-orange-50 text-orange-600"
          }`}>
            <svg 
              stroke="currentColor" 
              fill="currentColor" 
              strokeWidth="0" 
              viewBox="0 0 384 512" 
              className="w-4 h-4 flex-shrink-0" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M216 23.86c0-23.8-30.65-32.77-44.15-13.04C48 191.85 224 200 224 288c0 35.63-29.11 64.46-64.85 63.99-35.17-.45-63.15-29.77-63.15-64.94v-85.51c0-21.7-26.47-32.23-41.43-16.5C27.8 213.16 0 261.33 0 320c0 105.87 86.13 192 192 192s192-86.13 192-192c0-170.29-168-193-168-296.14z"></path>
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-2xl font-bold ${
                theme === "dark" ? "text-gray-100" : "text-gray-900"
              }`}>
                {stats.currentStreak}
              </p>
              <p className={`text-xs font-medium ${
                theme === "dark" ? "text-orange-400/90" : "text-orange-600/90"
              }`}>
                day{stats.currentStreak !== 1 ? 's' : ''}
              </p>
            </div>
            <p className={`text-xs ${
              theme === "dark" ? "text-gray-500" : "text-gray-500"
            }`}>
              Current Streak
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 flex items-center justify-center rounded-md ${
            theme === "dark"
              ? "bg-green-500/10 text-green-400"
              : "bg-green-50 text-green-600"
          }`}>
            <svg 
              className="w-5 h-5 flex-shrink-0" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-2xl font-bold ${
                theme === "dark" ? "text-gray-100" : "text-gray-900"
              }`}>
                {stats.totalFinishedArticles}
              </p>
              {stats.todayFinishedArticles > 0 && (
                <p className={`text-xs font-medium ${
                  theme === "dark" ? "text-green-400/90" : "text-green-600/90"
                }`}>
                  +{stats.todayFinishedArticles} today
                </p>
              )}
            </div>
            <p className={`text-xs ${
              theme === "dark" ? "text-gray-500" : "text-gray-500"
            }`}>
              Articles Finished
            </p>
          </div>
        </div>
      </div>
    </div>
  ), [theme, stats]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16">
      <div
        className={`w-full h-full flex items-center justify-between px-6
        border-b-2 transition-all
        ${
          theme === "dark"
            ? "bg-gray-800 border-gray-600/50"
            : "[color-scheme:light] bg-white border-gray-200"
        }`}
      >
        {/* Left side - Menu button and Logo */}
        <div className="flex items-center gap-4">
          {!hideNewsListButton && (
            <button
              onClick={() => onSidebarToggle(!showSidebar)}
              className={`p-3 rounded-lg shadow-lg border flex items-center justify-center 
                transition-colors duration-150
                ${
                  theme === "dark"
                    ? "bg-gray-800/95 hover:bg-gray-700/95 border-gray-700"
                    : "[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200"
                }`}
              title={showSidebar ? "Hide News List" : "Show News List"}
            >
              <svg
                className={`w-5 h-5 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}

          {/* Logo */}
          <div
            onClick={() => window.location.href = '/'}
            className={`cursor-pointer flex items-center justify-center 
              letter-spacing-wide text-2xl hover:opacity-80 active:scale-95 transition-all
              ${
                theme === "dark"
                  ? "text-white"
                  : "[color-scheme:light] text-black"
              }`}
            title="EZJP News"
          >
            <span className="font-extrabold flex items-center">
              EZ
              <Image
                src="/icons/ezjp-app.png"
                alt="EZJP Logo"
                width={32}
                height={32}
                className="mx-1"
              />
              JP
            </span>
          </div>
        </div>

        {/* Right side - Profile button */}
        <div>
          <div ref={profileRef} className="relative">
            <button
              onClick={() => {
                if (!user) {
                  router.push('/join?theme=dark&ref=join-now');
                } else {
                  setShowProfile(!showProfile);
                }
              }}
              className={`p-0 flex items-center justify-center transition-all duration-200 
                ${
                user ? (
                  theme === "dark"
                    ? "text-gray-200 hover:opacity-80 active:scale-95"
                    : "text-gray-700 hover:opacity-80 active:scale-95"
                ) : (
                  theme === "dark"
                    ? "rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600/90 hover:to-purple-700/90 text-white shadow-md hover:shadow-lg hover:shadow-purple-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    : "rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600/90 hover:to-purple-700/90 text-white shadow-md hover:shadow-lg hover:shadow-purple-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                )
              }`}
              title={user ? "" : "Join Now"}
            >
              {user ? (
                <div className="flex items-center gap-2 py-2 rounded-lg transition-colors">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className={`w-8 h-8 rounded-full object-cover border-2 transition-transform hover:scale-105 ${
                        showProfile 
                          ? theme === "dark"
                            ? "border-green-400"
                            : "border-green-400"
                          : theme === "dark"
                            ? "border-gray-700"
                            : "border-gray-200"
                      }`}
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-105
                      ${showProfile 
                        ? theme === "dark"
                          ? "border-green-400"
                          : "border-green-400"
                        : theme === "dark"
                          ? "border-gray-700"
                          : "border-gray-200"
                      }
                      ${theme === "dark"
                        ? "bg-gray-800 text-gray-200"
                        : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <FaUser className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm font-medium flex items-center gap-1.5 px-1">
                  <FaUserCircle className="w-4 h-4" />
                  <span className="tracking-wide">Join</span>
                </div>
              )}
            </button>

            {/* Profile panel - only shown when user is logged in and panel is open */}
            {user && showProfile && (
              <div
                className={`absolute top-full right-0 mt-0 rounded-xl shadow-xl border w-80
                ${
                  theme === "dark"
                    ? "bg-gray-800/95 border-gray-700/50 backdrop-blur-sm"
                    : "[color-scheme:light] bg-white/95 border-gray-200/50 backdrop-blur-sm"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2">
                  {/* User info section */}
                  <div 
                    onClick={() => router.push(`/profile/${encodeURIComponent(profile?.username || user.email)}`)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      theme === "dark"
                        ? "hover:bg-gray-700/30"
                        : "hover:bg-gray-100/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile"
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-offset-2 ring-gray-200 dark:ring-gray-700 dark:ring-offset-gray-800"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-gray-200 dark:ring-gray-700 dark:ring-offset-gray-800
                          ${
                            theme === "dark"
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          <FaUser className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium truncate ${
                            theme === "dark"
                              ? "text-gray-100"
                              : "text-[rgb(19,31,36)]"
                          }`}
                        >
                          {profile?.username || user.email}
                        </p>
                        <p
                          className={`text-sm truncate ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {profile?.username ? user.email : "No username set"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notifications section */}
                  <div className="border-y border-gray-200/10">
                    {!profile?.username && (
                      <div 
                        onClick={() => router.push('/settings')}
                        className={`flex items-start gap-3 p-4 cursor-pointer transition-colors
                          ${theme === "dark"
                            ? "hover:bg-gray-700/30 bg-yellow-500/5"
                            : "hover:bg-gray-100/70 bg-yellow-50/30"
                          }`}
                      >
                        <div className={`w-9 h-9 flex items-center justify-center rounded-md ${
                          theme === "dark"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-yellow-100 text-yellow-600"
                        }`}>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${
                              theme === "dark" ? "text-gray-100" : "text-gray-900"
                            }`}>
                              Set up your username
                            </p>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              theme === "dark"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-yellow-100 text-yellow-600"
                            }`}>
                              Required
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}>
                            Make your profile easier to find and share
                          </p>
                        </div>
                        <div className={`flex items-center self-center ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {stats.todayFinishedArticles === 0 && (
                      <div 
                        onClick={() => router.push('/')}
                        className={`flex items-start gap-3 p-4 cursor-pointer transition-colors border-t border-gray-200/10
                          ${theme === "dark"
                            ? "hover:bg-gray-700/30 bg-orange-500/5"
                            : "hover:bg-gray-100/70 bg-orange-50/30"
                          }`}
                      >
                        <div className={`w-9 h-9 flex items-center justify-center rounded-md ${
                          theme === "dark"
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-orange-100 text-orange-600"
                        }`}>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${
                              theme === "dark" ? "text-gray-100" : "text-gray-900"
                            }`}>
                              Read today's article
                            </p>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              theme === "dark"
                                ? "bg-orange-500/20 text-orange-400"
                                : "bg-orange-100 text-orange-600"
                            }`}>
                              Daily Goal
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}>
                            Keep your learning streak going
                          </p>
                        </div>
                        <div className={`flex items-center self-center ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats section */}
                  {StatsDisplay}

                  {/* Navigation section */}
                  <div className="p-1">
                    <button
                      onClick={() => router.push('/settings')}
                      className={`w-full px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors
                        ${
                          theme === "dark"
                            ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                            : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                        }`}
                    >
                      <div className="w-7 h-7 flex items-center justify-center">
                        <svg className="w-[1.125rem] h-[1.125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => router.push('/download')}
                      className={`w-full px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors
                        ${
                          theme === "dark"
                            ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                            : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                        }`}
                    >
                      <div className="w-7 h-7 flex items-center justify-center">
                        <svg className="w-[1.125rem] h-[1.125rem]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 16L4 17C4 18.6569 5.34315 20 7 20L17 20C18.6569 20 20 18.6569 20 17L20 16M16 12L12 16M12 16L8 12M12 16L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>Download App</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 