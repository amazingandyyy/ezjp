import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  FaBook,
  FaUserCircle,
  FaHeart,
  FaBookOpen,
  FaUser,
  FaFire,
  FaCheck,
  FaMoon,
  FaSun,
  FaCrown,
} from "react-icons/fa";
import { useAuth } from '@/lib/AuthContext';
import { useUpdate } from '@/app/sw-register';
import { useTranslation } from '@/lib/hooks/useTranslation';
import Image from 'next/image';
import useSystemStore from '@/lib/stores/system';
import useStatsStore from '@/lib/stores/stats';
import { supabase } from '@/lib/supabase';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

export default function Navbar({ 
  showSidebar, 
  onSidebarToggle,
  theme,
  hideNewsListButton = false
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, signInWithGoogle, signOut } = useAuth();
  const { showUpdatePrompt, applyUpdate } = useUpdate();
  const { version, fetchVersion } = useSystemStore();
  const { stats, fetchStats } = useStatsStore();
  const { t } = useTranslation();
  const profileRef = useRef(null);
  const [showProfile, setShowProfile] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [handledLangParam, setHandledLangParam] = useState(false);

  // Add language query parameter handler
  useEffect(() => {
    const lang = searchParams.get('lang');

    if (lang && SUPPORTED_LANGUAGES[lang] && user && !handledLangParam && profile) {
      // Only update if the language is different from the current one
      if (profile.ui_language !== lang) {
        const updateLanguage = async () => {
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ ui_language: lang })
              .eq('id', user.id);

            if (error) throw error;
            
            // Remove the lang parameter and reload
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('lang');
            window.location.href = newUrl.toString();
          } catch (error) {
            console.error('Error updating language:', error);
          }
        };

        updateLanguage();
      }
      setHandledLangParam(true);
    }
  }, [user, searchParams, profile, handledLangParam]);

  // Update stats when profile is opened
  useEffect(() => {
    if (showProfile && user) {
      fetchStats(user.id);
    }
  }, [showProfile, user, fetchStats]);

  // Listen for stats updates
  useEffect(() => {
    const handleStatsUpdate = () => {
      if (user && showProfile) {
        fetchStats(user.id);
      }
    };

    window.addEventListener('statsUpdated', handleStatsUpdate);
    
    return () => {
      window.removeEventListener('statsUpdated', handleStatsUpdate);
    };
  }, [user, showProfile, fetchStats]);

  // Refresh stats periodically when profile is open
  useEffect(() => {
    if (!showProfile || !user) return;

    const intervalId = setInterval(() => {
      fetchStats(user.id);
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [showProfile, user, fetchStats]);

  // Add handleSignOut function
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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

  // Add function to refresh stats
  const refreshStats = useCallback(() => {
    if (!user) {
      return;
    }
  }, [user]); // Only depend on user

  // Add effect to refresh stats periodically when profile is open
  useEffect(() => {
    // Initial refresh
    refreshStats();

    // Set up periodic refresh
    const intervalId = setInterval(refreshStats, 30000); // Refresh every 30 seconds

    // Listen for goal updates
    const handleGoalsUpdate = () => {
      console.log('Goals updated, refreshing stats...');
      refreshStats();
    };

    window.addEventListener('goalsUpdated', handleGoalsUpdate);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('goalsUpdated', handleGoalsUpdate);
    };
  }, [refreshStats]);

  // Memoize the stats display
  const StatsDisplay = useMemo(
    () => (
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-8">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-xl ${
                theme === "dark"
                  ? "bg-orange-500/20 text-orange-400"
                  : "bg-orange-100 text-orange-600"
              }`}
            >
              <FaFire className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <p
                  className={`text-2xl font-bold ${
                    theme === "dark" ? "text-gray-100" : "text-gray-900"
                  }`}
                >
                  {stats.currentStreak}
                </p>
                <p
                  className={`text-xs font-medium ${
                    theme === "dark"
                      ? "text-orange-400/90"
                      : "text-orange-600/90"
                  }`}
                >
                  {t("navbar.profile.days")}
                </p>
              </div>
              <p
                className={`text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {t("navbar.profile.streak")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-xl ${
                theme === "dark"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-green-100 text-green-600"
              }`}
            >
              <FaCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <p
                  className={`text-2xl font-bold ${
                    theme === "dark" ? "text-gray-100" : "text-gray-900"
                  }`}
                >
                  {stats.totalFinishedArticles}
                </p>
                {stats.todayFinishedArticles > 0 && (
                  <p
                    className={`text-xs font-medium ${
                      theme === "dark"
                        ? "text-green-400/90"
                        : "text-green-600/90"
                    }`}
                  >
                    +{stats.todayFinishedArticles} {t("navbar.profile.today")}
                  </p>
                )}
              </div>
              <p
                className={`text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {t("navbar.profile.read")}
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    [theme, stats]
  );

  // Handle theme update
  const handleUpdate = async (field, value) => {
    try {
      if (field === 'theme') {
        const { error } = await supabase
          .from('profiles')
          .update({ theme: value })
          .eq('id', user.id);

        if (error) throw error;
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  // Fetch version on mount
  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  // Add useEffect to check for username and redirect
  useEffect(() => {
    if (user && profile && !profile.username && router.pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [user, profile, router]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16">
      <div
        className={`w-full h-full flex items-center justify-between px-6
        border-b-2 backdrop-blur-md transition-all
        ${
          theme === "dark"
            ? "bg-gray-800/80 border-gray-600/50"
            : "[color-scheme:light] bg-white/80 border-gray-200/50"
        }`}
      >
        {/* Left side - Menu button and Logo */}
        <div className="flex items-center gap-4">
          {!hideNewsListButton && (
            <button
              onClick={() => onSidebarToggle(!showSidebar)}
              className={`p-2 rounded-xl shadow-lg border flex items-center justify-center 
                transition-colors duration-150 w-8 h-8
                ${
                  theme === "dark"
                    ? "bg-gray-800/95 hover:bg-gray-700/95 border-gray-700"
                    : "[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200"
                }`}
              title={showSidebar ? t('navbar.toggleNewsList.hide') : t('navbar.toggleNewsList.show')}
            >
              <svg
                className={`w-4 h-4 ${
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
            onClick={() => router.push('/')}
            className={`cursor-pointer flex items-center justify-center 
              letter-spacing-wide text-2xl hover:opacity-80 active:scale-95 transition-all
              ${
                theme === "dark"
                  ? "text-white"
                  : "[color-scheme:light] text-black"
              }`}
            title={t('navbar.logo.title')}
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
          <div ref={profileRef} className="relative static sm:relative">
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
                <div className="flex items-center gap-2 py-2 rounded-xl transition-colors">
                  <div className="relative">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={t('navbar.profile.avatar')}
                        className={`w-8 h-8 rounded-xl object-cover transition-all duration-200 hover:scale-105 ${
                          showProfile 
                            ? theme === "dark"
                              ? "shadow-lg shadow-gray-900/50"
                              : "shadow-lg shadow-gray-400/50"
                            : theme === "dark"
                              ? profile?.role_level > 0
                                ? "border-2 border-amber-300"
                                : "border-2 border-gray-700"
                              : profile?.role_level > 0
                                ? "border-2 border-amber-300"
                                : "border-2 border-gray-200"
                        }`}
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105
                        ${showProfile 
                          ? theme === "dark"
                            ? "shadow-lg shadow-gray-900/50"
                            : "shadow-lg shadow-gray-400/50"
                          : theme === "dark"
                            ? profile?.role_level > 0
                              ? "border-2 border-amber-300"
                              : "border-2 border-gray-700"
                            : profile?.role_level > 0
                              ? "border-2 border-amber-300"
                              : "border-2 border-gray-200"
                        }
                        ${theme === "dark"
                          ? "bg-gray-800 text-gray-200"
                          : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <FaUser className="w-4 h-4" />
                      </div>
                    )}
                    {profile?.role_level > 0 && (
                      <div className={`absolute -top-1.5 -right-1.5 p-1 rounded-md shadow-lg ${
                        theme === "dark"
                          ? "bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 text-amber-900 ring-1 ring-amber-200/50"
                          : "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-900 ring-1 ring-amber-300/50"
                      }`}>
                        <FaCrown className="w-2 h-2" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2 text-sm font-medium flex items-center gap-2">
                  <FaUserCircle className="w-4 h-4" />
                  <span className="tracking-wide">{t('navbar.join')}</span>
                </div>
              )}
            </button>

            {/* Profile panel - only shown when user is logged in and panel is open */}
            {user && showProfile && (
              <div
                className={`fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[4.5rem] sm:top-full mt-1 
                  rounded-2xl shadow-lg border-2 overflow-hidden max-h-[calc(100vh-5rem)] overflow-y-auto
                  sm:w-[320px]
                  ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700 backdrop-blur-md"
                      : "[color-scheme:light] bg-white border-gray-200 backdrop-blur-md"
                  }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Profile Section */}
                <div className="p-3">
                  <div 
                    onClick={() => router.push(`/profile/${encodeURIComponent(profile?.username || user.email)}`)}
                    className={`p-3 rounded-xl cursor-pointer transition-colors ${
                      theme === "dark"
                        ? "hover:bg-gray-700/50"
                        : "hover:bg-gray-100/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile"
                          className="w-11 h-11 rounded-xl object-cover border-2 border-gray-200/10 dark:border-gray-700/50"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 border-gray-200/10 dark:border-gray-700/50
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
                          className={`text-[15px] font-medium leading-tight truncate ${
                            theme === "dark"
                              ? "text-gray-100"
                              : "text-[rgb(19,31,36)]"
                          }`}
                        >
                          {profile?.username || user.email}
                        </p>
                        <p
                          className={`text-[13px] truncate mt-0.5 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {profile?.username ? user.email : t('common.noUsername')}
                        </p>
                        {profile?.role_level > 0 && (
                          <div className={`flex items-center gap-1.5 mt-1.5`}>
                            <div className={`px-2 py-0.5 text-[10px] font-medium rounded-md flex items-center gap-1 ${
                              theme === "dark"
                                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                : "bg-yellow-50 text-yellow-600 border border-yellow-200"
                            }`}>
                              <FaCrown className="w-2.5 h-2.5" />
                              {profile.role_level === 1 ? "Premium" : profile.role_level >= 10 ? "Admin" : "Member"}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Section */}
                  <div className="mt-2">
                    <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Current Streak */}
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${
                            theme === "dark"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-orange-100 text-orange-600"
                          }`}>
                            <FaFire className="w-5 h-5" />
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
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              {t('navbar.profile.streak')}
                            </p>
                          </div>
                        </div>

                        {/* Articles Finished */}
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${
                            theme === "dark"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-green-100 text-green-600"
                          }`}>
                            <FaCheck className="w-5 h-5" />
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
                                  +{stats.todayFinishedArticles} {t('navbar.profile.today')}
                                </p>
                              )}
                            </div>
                            <p className={`text-xs ${
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              {t('navbar.profile.read')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Settings */}
                <div className="p-2">
                  {/* Theme Toggle */}
                  <button
                    onClick={() => handleUpdate("theme", theme === "dark" ? "light" : "dark")}
                    className={`w-full p-3 rounded-lg text-sm flex items-center justify-between transition-colors
                      ${
                        theme === "dark"
                          ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                          : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 flex items-center justify-center">
                        {theme === "dark" ? (
                          <svg className="w-[1.125rem] h-[1.125rem]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg className="w-[1.125rem] h-[1.125rem]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span>{theme === "dark" ? t('navbar.theme.light') : t('navbar.theme.dark')}</span>
                    </div>
                    <div className={`flex items-center ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      <span className="text-xs font-medium mr-2">{theme === "dark" ? "Dark" : "Light"}</span>
                    </div>
                  </button>
                </div>

                {/* Notifications Section */}
                <div className={`border-t ${theme === "dark" ? "border-gray-700/50" : "border-gray-200/50"}`}>
                  {!profile?.username && (
                    <div 
                      onClick={() => router.push('/settings')}
                      className={`p-3 cursor-pointer transition-colors
                        ${theme === "dark"
                          ? "bg-yellow-500/10 hover:bg-yellow-500/20"
                          : "bg-yellow-50 hover:bg-yellow-100/70"
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 flex items-center justify-center rounded-md ${
                          theme === "dark"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-yellow-100 text-yellow-600"
                        }`}>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${
                              theme === "dark" ? "text-yellow-100" : "text-yellow-800"
                            }`}>
                              {t('navbar.profile.setup')}
                            </p>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              theme === "dark"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-yellow-100 text-yellow-600"
                            }`}>
                              {t('navbar.profile.required')}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${
                            theme === "dark" ? "text-yellow-300/70" : "text-yellow-700/90"
                          }`}>
                            {t('navbar.profile.makeEasier')}
                          </p>
                        </div>
                        <div className={`flex items-center self-center ${
                          theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                        }`}>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Daily Reading Goals Progress */}
                  <div 
                    onClick={() => {
                      setShowProfile(false);
                      router.push('/settings?section=goals');
                    }}
                    className={`p-3 cursor-pointer transition-colors ${!profile?.username ? 'border-t border-gray-200/10' : ''} 
                      ${theme === "dark"
                        ? "hover:bg-gray-700/30"
                        : "hover:bg-gray-100/70"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 flex items-center justify-center rounded-md ${
                        theme === "dark"
                          ? "bg-gray-700/80 text-gray-300"
                          : "bg-gray-100 text-gray-600"
                        }`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${
                            theme === "dark" ? "text-gray-100" : "text-gray-900"
                          }`}>
                            {t('navbar.profile.readingGoals')}
                          </p>
                        </div>

                        {/* Articles Progress */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs ${
                              theme === "dark" ? "text-gray-400" : "text-gray-600"
                            }`}>
                              {t('navbar.profile.articles')}
                            </span>
                            <span className={`text-xs font-medium ${
                              stats.todayFinishedArticles > stats.dailyArticleGoal
                                ? theme === "dark" ? "text-purple-400" : "text-purple-600"
                                : theme === "dark" ? "text-gray-300" : "text-gray-700"
                            }`}>
                              {stats.todayFinishedArticles}/{stats.dailyArticleGoal}
                              {stats.todayFinishedArticles > stats.dailyArticleGoal && (
                                <span className="ml-1">
                                  (+{stats.todayFinishedArticles - stats.dailyArticleGoal})
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`absolute top-0 left-0 h-full transition-all duration-300 rounded-full ${
                                stats.todayFinishedArticles > stats.dailyArticleGoal
                                  ? theme === "dark" 
                                    ? "bg-gradient-to-r from-green-500 via-blue-500 to-purple-500" 
                                    : "bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"
                                  : "bg-green-500"
                              }`}
                              style={{ 
                                width: stats.todayFinishedArticles > stats.dailyArticleGoal 
                                  ? "100%" 
                                  : `${(stats.todayFinishedArticles / stats.dailyArticleGoal) * 100}%`,
                                opacity: theme === "dark" ? 0.8 : 0.9,
                                animation: stats.todayFinishedArticles > stats.dailyArticleGoal 
                                  ? "gradientShift 3s linear infinite" 
                                  : "none"
                              }}
                            />
                          </div>
                        </div>

                        {/* Reading Time Progress */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs ${
                              theme === "dark" ? "text-gray-400" : "text-gray-600"
                            }`}>
                              {t('navbar.profile.readingTime')}
                            </span>
                            <span className={`text-xs font-medium ${
                              Math.round(stats.totalReadingTime) > stats.dailyReadingTimeGoal
                                ? theme === "dark" ? "text-purple-400" : "text-purple-600"
                                : theme === "dark" ? "text-gray-300" : "text-gray-700"
                            }`}>
                              {Math.round(stats.totalReadingTime)}/{stats.dailyReadingTimeGoal} min
                              {Math.round(stats.totalReadingTime) > stats.dailyReadingTimeGoal && (
                                <span className="ml-1">
                                  (+{Math.round(stats.totalReadingTime - stats.dailyReadingTimeGoal)})
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`absolute top-0 left-0 h-full transition-all duration-300 rounded-full ${
                                Math.round(stats.totalReadingTime) > stats.dailyReadingTimeGoal
                                  ? theme === "dark" 
                                    ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" 
                                    : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ 
                                width: Math.round(stats.totalReadingTime) > stats.dailyReadingTimeGoal 
                                  ? "100%" 
                                  : `${(Math.round(stats.totalReadingTime) / stats.dailyReadingTimeGoal) * 100}%`,
                                opacity: theme === "dark" ? 0.8 : 0.9,
                                animation: Math.round(stats.totalReadingTime) > stats.dailyReadingTimeGoal 
                                  ? "gradientShift 3s linear infinite" 
                                  : "none"
                              }}
                            />
                          </div>
                        </div>

                        <style jsx>{`
                          @keyframes gradientShift {
                            0% {
                              background-position: 0% 50%;
                            }
                            50% {
                              background-position: 100% 50%;
                            }
                            100% {
                              background-position: 0% 50%;
                            }
                          }
                        `}</style>

                        {/* Status Message */}
                        <p className={`text-xs mt-3 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          {stats.todayFinishedArticles >= stats.dailyArticleGoal && Math.round(stats.totalReadingTime) >= stats.dailyReadingTimeGoal
                            ? stats.todayFinishedArticles > stats.dailyArticleGoal || Math.round(stats.totalReadingTime) > stats.dailyReadingTimeGoal
                              ? t('navbar.profile.goalExceeded')
                              : t('navbar.profile.goalComplete')
                            : stats.todayFinishedArticles >= stats.dailyArticleGoal
                            ? t('navbar.profile.almostThere', { remaining: Math.max(0, stats.dailyReadingTimeGoal - Math.round(stats.totalReadingTime)) })
                            : Math.round(stats.totalReadingTime) >= stats.dailyReadingTimeGoal
                            ? t('navbar.profile.keepGoing', { remaining: stats.dailyArticleGoal - stats.todayFinishedArticles })
                            : t('navbar.profile.todayTarget', { 
                                articles: stats.dailyArticleGoal - stats.todayFinishedArticles,
                                minutes: Math.max(0, stats.dailyReadingTimeGoal - Math.round(stats.totalReadingTime))
                              })}
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
                  </div>

                  {stats.todayFinishedArticles === 0 && (
                    <div 
                      onClick={() => {
                        setShowProfile(false);
                        router.push('/');
                      }}
                      className={`p-3 cursor-pointer transition-colors border-t border-gray-200/10
                        ${theme === "dark"
                          ? "hover:bg-gray-700/30"
                          : "hover:bg-gray-100/70"
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 flex items-center justify-center rounded-md ${
                          theme === "dark"
                            ? "bg-gray-700/80 text-gray-300"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          <FaFire className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${
                              theme === "dark" ? "text-gray-100" : "text-gray-900"
                            }`}>
                              {stats.currentStreak > 0 ? t('navbar.profile.extendStreak') : t('navbar.profile.startStreak')}
                            </p>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              theme === "dark"
                                ? "bg-orange-500/20 text-orange-400"
                                : "bg-orange-100 text-orange-600"
                            }`}>
                              {stats.currentStreak > 0 ? `${stats.currentStreak} ${t('navbar.profile.days')}` : t('navbar.profile.day1')}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>
                            {t('navbar.profile.keepStreak')}
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
                    </div>
                  )}
                </div>

                {/* Navigation Section */}
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      router.push('/');
                    }}
                    className={`w-full p-3 rounded-lg text-sm flex items-center gap-3 transition-colors
                      ${
                        theme === "dark"
                          ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                          : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                      }`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center">
                      <FaBookOpen className="w-[1.125rem] h-[1.125rem]" />
                    </div>
                    <span>{t('navbar.menu.allNews')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      router.push('/settings');
                    }}
                    className={`w-full p-3 rounded-lg text-sm flex items-center gap-3 transition-colors
                      ${
                        theme === "dark"
                          ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                          : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                      }`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center">
                      <svg className="w-[1.125rem] h-[1.125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c0.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span>{t('navbar.menu.settings')}</span>
                  </button>
                  {profile?.role_level >= 10 && (
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        router.push('/admin');
                      }}
                      className={`w-full p-3 rounded-lg text-sm flex items-center gap-3 transition-colors
                        ${
                          theme === "dark"
                            ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                            : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                        }`}
                    >
                      <div className="w-7 h-7 flex items-center justify-center">
                        <svg className="w-[1.125rem] h-[1.125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                      </div>
                      <span>{t('navbar.menu.admin')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      router.push('/download');
                    }}
                    className={`w-full p-3 rounded-lg text-sm flex items-center gap-3 transition-colors mt-1
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
                    <span>{t('navbar.menu.download')}</span>
                  </button>
                </div>

                {/* Divider */}
                <div className={`my-1 border-t ${theme === "dark" ? "border-gray-700/50" : "border-gray-200/50"}`} />

                {/* Version Info */}
                <div className="px-4 py-2">
                  <div 
                    onClick={() => {
                      setShowProfile(false);
                      router.push('/changelog');
                    }}
                    className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Version {version || '1.0.0'}
                  </div>
                </div>

                {/* Sign Out Button */}
                <div className="p-2">
                  <button
                    onClick={handleSignOut}
                    className={`w-full p-3 rounded-lg text-sm flex items-center gap-3 transition-colors
                      ${
                        theme === "dark"
                          ? "hover:bg-red-500/10 text-red-400 hover:text-red-300"
                          : "hover:bg-red-50 text-red-600 hover:text-red-700"
                      }`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center">
                      <svg className="w-[1.125rem] h-[1.125rem]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span>{t('navbar.menu.signOut')}</span>
                  </button>
                </div>

                {/* Update notification */}
                {showUpdatePrompt && (
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      applyUpdate();
                    }}
                    className={`w-full p-3 cursor-pointer transition-colors border-t border-gray-200/10
                      ${theme === "dark"
                        ? "hover:bg-gray-700/30"
                        : "hover:bg-gray-100/70"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 flex items-center justify-center rounded-md ${
                        theme === "dark"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-green-100 text-green-600"
                      }`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${
                            theme === "dark" ? "text-gray-100" : "text-gray-900"
                          }`}>
                            {t('navbar.update.available')}
                          </p>
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            theme === "dark"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-green-100 text-green-600"
                          }`}>
                            {t('navbar.update.new')}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          {t('navbar.update.install')}
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
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 