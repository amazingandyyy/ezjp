'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaSun, FaMoon, FaUser, FaCheck, FaTimes, FaCheckCircle, FaIdBadge } from 'react-icons/fa';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSystemTheme, getCurrentTheme } from '@/lib/utils/theme';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import Navbar from '@/app/components/Navbar';
import useSystemStore from '@/lib/stores/system';
import { useTranslation } from '@/lib/hooks/useTranslation';
import MembershipSection from './components/MembershipSection';

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signOut, profile, updateProfile } = useAuth();
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [editState, setEditState] = useState({
    username: false,
    intro: false,
    duolingo: false
  });
  const { version, releaseDate, isLoading, fetchVersion } = useSystemStore();
  const { t } = useTranslation();

  // Add this helper function at the top of the component
  const getAccountTypeKey = (roleLevel) => {
    if (roleLevel >= 10) return 'superAdmin';
    if (roleLevel >= 1) return 'premiumUser';
    return 'normalUser';
  };

  // Initialize profile data state
  const [profileData, setProfileData] = useState(() => {
    const theme = profile?.theme || 'light';
    const currentTheme = typeof window !== 'undefined' && theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;

    return {
      theme,
      currentTheme,
      username: profile?.username || '',
      editedUsername: profile?.username || '',
      self_introduction: profile?.self_introduction || '',
      edited_self_introduction: profile?.self_introduction || '',
      japanese_level: profile?.japanese_level || '',
      duolingo_username: profile?.duolingo_username || '',
      edited_duolingo_username: profile?.duolingo_username || '',
      daily_article_goal: profile?.daily_article_goal || 3,
      daily_reading_time_goal: profile?.daily_reading_time_goal || 15,
      role_level: profile?.role_level || 0,
      preferred_translation_language: profile?.preferred_translation_language || 'en',
      ui_language: profile?.ui_language || 'en'
    };
  });

  // Update profile data when profile changes
  useEffect(() => {
    if (profile) {
      const theme = profile.theme || 'light';
      const currentTheme = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;

      setProfileData(prev => ({
        ...prev,
        theme,
        currentTheme,
        username: profile.username || '',
        editedUsername: profile.username || '',
        self_introduction: profile.self_introduction || '',
        edited_self_introduction: profile.self_introduction || '',
        japanese_level: profile.japanese_level || '',
        duolingo_username: profile.duolingo_username || '',
        edited_duolingo_username: profile.duolingo_username || '',
        daily_article_goal: profile.daily_article_goal || 3,
        daily_reading_time_goal: profile.daily_reading_time_goal || 15,
        role_level: profile.role_level || 0,
        preferred_translation_language: profile.preferred_translation_language || 'en',
        ui_language: profile.ui_language || 'en'
      }));
      setIsProfileLoaded(true);
    }
  }, [profile]);

  // Debug logs
  console.log('Profile Data:', profileData);
  console.log('Is Profile Loaded:', isProfileLoaded);
  console.log('User:', user);
  console.log('Profile:', profile);

  // Add separate useEffect for initial scroll
  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      // Add a small delay to ensure the DOM is ready
      setTimeout(() => {
        const element = document.getElementById(section);
        if (element) {
          const navHeight = 120;
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - navHeight;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          setActiveSection(section);
        }
      }, 100);
    }
  }, [searchParams]);

  // Add scroll tracking
  useEffect(() => {
    // Set up intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setActiveSection(entry.target.id);
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set("section", entry.target.id);
            const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
            window.history.replaceState({}, "", newUrl);
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: [0.5]
      }
    );

    // Observe all section elements
    const sections = document.querySelectorAll('[id="profile"], [id="membership"], [id="language"], [id="appearance"], [id="goals"], [id="data"], [id="software"]');
    sections.forEach((section) => observer.observe(section));

    // Cleanup observer
    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, [searchParams]); // Include searchParams in dependencies

  // Add debounce function
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Debounced update function
  const debouncedUpdate = debounce((value) => {
    const clampedValue = Math.min(240, Math.max(1, value));
    setProfileData(prev => ({
      ...prev,
      daily_reading_time_goal: clampedValue
    }));
    handleUpdate('daily_reading_time_goal', clampedValue);
  }, 1000);

  // Add handleSignOut function
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Handle avatar change
  const handleAvatarChange = async (e) => {
    try {
      setError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      // Create a consistent file name with user's folder
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage in user-contents bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-contents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-contents')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      updateProfile({ avatar_url: publicUrl });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Failed to upload image');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Watch for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (profileData.theme === 'system') {
        setProfileData(prev => ({ 
          ...prev, 
          currentTheme: mediaQuery.matches ? 'dark' : 'light'
        }));
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [profileData.theme]);

  // Return loading state if profile is not loaded
  if (!isProfileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={`text-sm ${profileData.currentTheme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
          Loading...
        </div>
      </div>
    );
  }

  // Return null if no user
  if (!user) {
    return null;
  }

  // Generic update handler
  const handleUpdate = async (field, value, editField = null) => {
    try {
      let updateData = {};
      switch (field) {
        case 'theme':
          const newTheme = value;
          const newCurrentTheme = value === 'system' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : value;
          updateData = { theme: newTheme };
          break;
        case 'username':
          if (!value.trim()) {
            setError(t('settings.profile.errors.emptyUsername'));
            return;
          }
          updateData = { username: value.trim() };
          break;
        case 'japanese_level':
          const normalizedLevel = value.toUpperCase();
          if (!['N5', 'N4', 'N3', 'N2', 'N1', 'NATIVE'].includes(normalizedLevel)) {
            setError(t('settings.profile.errors.invalidLevel'));
            return;
          }
          updateData = { japanese_level: normalizedLevel };
          break;
        case 'self_introduction':
          updateData = { self_introduction: value.trim() };
          break;
        case 'duolingo_username':
          updateData = { duolingo_username: value.trim() };
          break;
        case 'daily_article_goal':
          updateData = { daily_article_goal: value };
          break;
        case 'daily_reading_time_goal':
          updateData = { daily_reading_time_goal: value };
          break;
        case 'preferred_translation_language':
          updateData = { preferred_translation_language: value };
          break;
        case 'ui_language':
          updateData = { ui_language: value };
          break;
      }

      // Use AuthContext's updateProfile instead of direct Supabase call
      const updatedProfile = await updateProfile(updateData);
      if (!updatedProfile) throw new Error('Failed to update profile');

      // Update local state
      if (field === 'theme') {
        setProfileData(prev => ({
          ...prev,
          theme: value,
          currentTheme: value === 'system' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : value
        }));
        
      } else {
        setProfileData(prev => ({
          ...prev,
          ...updateData,
          [editField || field]: value
        }));
      }
      
      // Always exit edit mode after successful save
      const editStateKey = {
        username: 'username',
        self_introduction: 'intro',
        duolingo_username: 'duolingo'
      }[field];
      
      if (editStateKey) {
        setEditState(prev => ({
          ...prev,
          [editStateKey]: false
        }));
      }

      // Trigger a custom event when goals are updated
      if (field === 'daily_article_goal' || field === 'daily_reading_time_goal') {
        window.dispatchEvent(new CustomEvent('goalsUpdated', { 
          detail: { field, value } 
        }));
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      setError(t('settings.errors.updateFailed', { field: t(`settings.profile.fields.${field}`) }));
      setTimeout(() => setError(''), 3000);
    }
  };

  // Reset handlers
  const handleResetReadingHistory = async () => {
    if (!window.confirm(t('settings.data.readingHistory.warning'))) {
      return;
    }

    const confirmText = t('settings.data.readingHistory.confirmText');
    const userInput = window.prompt(t('settings.data.confirmPrompt', { confirmText }));
    
    if (!userInput) return;
    
    if (userInput !== confirmText) {
      setError(t('settings.data.confirmError'));
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      // Delete finished articles
      const { error: finishedError } = await supabase
        .from('finished_articles')
        .delete()
        .eq('user_id', user.id);
      
      if (finishedError) throw finishedError;

      // Reset reading stats by updating existing record
      const { error: statsError } = await supabase
        .from('reading_stats')
        .update({
          total_reading_time: 0,
          total_articles_read: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (statsError) throw statsError;
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        
      }, 1000);
    } catch (error) {
      console.error('Error resetting reading history:', error);
      setError(t('settings.data.readingHistory.error'));
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleResetSavedArticles = async () => {
    if (!window.confirm(t('settings.data.savedArticles.warning'))) {
      return;
    }

    const confirmText = t('settings.data.savedArticles.confirmText');
    const userInput = window.prompt(t('settings.data.confirmPrompt', { confirmText }));
    
    if (!userInput) return;
    
    if (userInput !== confirmText) {
      setError(t('settings.data.confirmError'));
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_articles')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        
      }, 1000);
    } catch (error) {
      console.error('Error resetting saved articles:', error);
      setError(t('settings.data.savedArticles.error'));
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        profileData.currentTheme === "dark"
          ? "bg-[rgb(19,31,36)]"
          : "bg-gray-50"
      }`}
    >
      {!isProfileLoaded && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-sm z-50" />
      )}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm ${
              profileData.currentTheme === "dark"
                ? "bg-gray-800/90 text-green-400 border border-gray-700/50 backdrop-blur-sm"
                : "bg-white text-green-600 border border-gray-200/50 shadow-sm"
            }`}
          >
            <FaCheckCircle className="w-4 h-4" />
            <span>{t("common.success")}</span>
          </div>
        </div>
      )}
      <Navbar theme={profileData.currentTheme} hideNewsListButton={true} />

      <div className="container mx-auto px-4 pt-24 pb-32 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {/* Settings Title */}
            <h1
              className={`text-3xl font-semibold ${
                profileData.currentTheme === "dark"
                  ? "text-gray-100"
                  : "text-[rgb(19,31,36)]"
              }`}
            >
              {t("settings.title")}
            </h1>

            {/* Settings Navigation */}
            <nav
              className={`sticky top-16 -mx-4 px-4 py-3 mb-10 z-10 backdrop-blur-md ${
                profileData.currentTheme === "dark"
                  ? "bg-[rgb(19,31,36)]/90 border-b border-gray-800/50"
                  : "bg-gray-50/90 border-b border-gray-200/50"
              }`}
            >
              <div className="flex gap-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {[
                  {
                    id: "profile",
                    label: t("settings.sections.profile"),
                    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
                  },
                  {
                    id: "membership",
                    label: t("settings.membership.title"),
                    icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
                  },
                  {
                    id: "language",
                    label: t("settings.sections.language"),
                    icon: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129",
                  },
                  {
                    id: "appearance",
                    label: t("settings.sections.appearance"),
                    icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
                  },
                  {
                    id: "goals",
                    label: t("settings.sections.goals"),
                    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
                  },
                  {
                    id: "data",
                    label: t("settings.sections.data"),
                    icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
                  },
                  {
                    id: "software",
                    label: t("settings.sections.software"),
                    icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
                  },
                ].map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      const element = document.getElementById(section.id);
                      const navHeight = 120;
                      const elementPosition =
                        element.getBoundingClientRect().top +
                        window.pageYOffset;
                      const offsetPosition = elementPosition - navHeight;

                      window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth",
                      });

                      // Update active section and URL when clicking navigation
                      setActiveSection(section.id);
                      const searchParams = new URLSearchParams(
                        window.location.search
                      );
                      searchParams.set("section", section.id);
                      const newUrl = `${
                        window.location.pathname
                      }?${searchParams.toString()}`;
                      window.history.replaceState({}, "", newUrl);
                    }}
                    className={`flex items-center gap-2 px-1 py-2 whitespace-nowrap text-sm font-medium transition-all duration-200 ${
                      activeSection === section.id
                        ? profileData.currentTheme === "dark"
                          ? "text-white"
                          : "text-gray-900 border-gray-900"
                        : profileData.currentTheme === "dark"
                        ? "text-gray-400 hover:text-gray-300 border-transparent"
                        : "text-gray-500 hover:text-gray-700 border-transparent"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 transition-colors ${
                        activeSection === section.id
                          ? profileData.currentTheme === "dark"
                            ? "text-white"
                            : "text-gray-900"
                          : "text-current"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={section.icon}
                      />
                    </svg>
                    {section.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Settings Sections */}
            <div className="space-y-6">
              {/* Profile Section */}
              <div
                id="profile"
                className={`overflow-hidden rounded-2xl shadow-sm border backdrop-blur-sm ${
                  profileData.currentTheme === "dark"
                    ? "bg-gray-800/80 border-gray-700/50"
                    : "bg-white border-gray-100"
                }`}
              >
                <div
                  className={`px-8 py-5 border-b ${
                    profileData.currentTheme === "dark"
                      ? "border-gray-700/50"
                      : "border-gray-100"
                  }`}
                >
                  <h2
                    className={`text-base font-medium ${
                      profileData.currentTheme === "dark"
                        ? "text-gray-200"
                        : "text-gray-900"
                    }`}
                  >
                    {t("settings.profile.title")}
                  </h2>
                </div>
                <div className="p-8 space-y-8">
                  {/* User info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="relative group">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile"
                          className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl object-cover border-2 border-gray-200/10 dark:border-gray-700/50 transition-all duration-200"
                        />
                      ) : (
                        <div
                          className={`w-16 sm:w-20 h-16 sm:h-20 rounded-2xl flex items-center justify-center border-2 border-gray-200/10 dark:border-gray-700/50 transition-all duration-200
                          ${
                            profileData.currentTheme === "dark"
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          <FaUser className="w-6 sm:w-8 h-6 sm:h-8" />
                        </div>
                      )}
                      <div
                        className={`absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                          profileData.currentTheme === "dark"
                            ? "bg-black/50"
                            : "bg-black/30"
                        }`}
                      >
                        <label
                          htmlFor="avatar-upload"
                          className="cursor-pointer p-2"
                        >
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </label>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800 ${
                          profileData.currentTheme === "dark"
                            ? "bg-gray-800"
                            : "bg-white"
                        }`}
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 48 48"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                          />
                          <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                          />
                          <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`flex flex-col gap-2 ${
                          profileData.currentTheme === "dark"
                            ? "text-gray-300"
                            : "text-gray-700"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-lg font-medium whitespace-nowrap">
                            {t("settings.profile.googleAccount")}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md ${
                              profileData.currentTheme === "dark"
                                ? "bg-green-500/10 text-green-400"
                                : "bg-green-50 text-green-600"
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span>{t("common.verified")}</span>
                            </div>
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span
                              className={`${
                                profileData.currentTheme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              } truncate`}
                            >
                              {user?.email}
                            </span>
                          </div>
                          <p
                            className={`text-xs ${
                              profileData.currentTheme === "dark"
                                ? "text-gray-500"
                                : "text-gray-500"
                            }`}
                          >
                            {t("settings.profile.accountSecured")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Username field */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label
                        className={`block text-sm font-medium ${
                          profileData.currentTheme === "dark"
                            ? "text-gray-300"
                            : "text-gray-700"
                        }`}
                      >
                        {t("settings.profile.username")}
                      </label>
                    </div>
                    {editState.username ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={profileData.editedUsername}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              editedUsername: e.target.value,
                            }))
                          }
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                            profileData.currentTheme === "dark"
                              ? "bg-gray-700 border-gray-600 text-gray-100"
                              : "bg-white border-gray-200 text-gray-900"
                          } focus:outline-none focus:ring-2 focus:ring-green-500`}
                          placeholder={t(
                            "settings.profile.usernamePlaceholder"
                          )}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleUpdate(
                                "username",
                                profileData.editedUsername
                              )
                            }
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              profileData.currentTheme === "dark"
                                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                            }`}
                          >
                            {t("common.save")}
                          </button>
                          <button
                            onClick={() => {
                              setEditState((prev) => ({
                                ...prev,
                                username: false,
                              }));
                              setProfileData((prev) => ({
                                ...prev,
                                editedUsername: prev.username,
                              }));
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              profileData.currentTheme === "dark"
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          profileData.currentTheme === "dark"
                            ? "bg-gray-800/80 border border-gray-700/50"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        <div
                          className={`flex items-center gap-3 ${
                            profileData.currentTheme === "dark"
                              ? "text-gray-300"
                              : "text-gray-700"
                          }`}
                        >
                          <FaIdBadge
                            className={`w-5 h-5 ${
                              profileData.currentTheme === "dark"
                                ? "text-gray-400"
                                : "text-gray-600"
                            }`}
                          />
                          {!isProfileLoaded ? (
                            <span
                              className={
                                profileData.currentTheme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }
                            >
                              Loading...
                            </span>
                          ) : profileData.username ? (
                            <div className="flex flex-col gap-1">
                              <div
                                className={`text-sm font-medium ${
                                  profileData.currentTheme === "dark"
                                    ? "text-gray-200"
                                    : "text-gray-900"
                                }`}
                              >
                                {profileData.username}
                              </div>
                              <div
                                className={`text-xs ${
                                  profileData.currentTheme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-600"
                                }`}
                              >
                                {getAccountTypeKey(profileData.role_level)}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm px-2 py-0.5 rounded-md ${
                                  profileData.currentTheme === "dark"
                                    ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                                    : "bg-red-50 text-red-600 ring-1 ring-red-500/20"
                                }`}
                              >
                                {t("common.required")}
                              </span>
                              <span
                                className={
                                  profileData.currentTheme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-600"
                                }
                              >
                                {t("common.noUsername")}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            setEditState((prev) => ({
                              ...prev,
                              username: true,
                            }))
                          }
                          disabled={!isProfileLoaded}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            !isProfileLoaded
                              ? profileData.currentTheme === "dark"
                                ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : !profileData.username
                              ? profileData.currentTheme === "dark"
                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                : "bg-red-50 text-red-600 hover:bg-red-100"
                              : profileData.currentTheme === "dark"
                              ? "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {!isProfileLoaded
                            ? t("common.loading")
                            : !profileData.username
                            ? t("common.setUsername")
                            : t("common.edit")}
                        </button>
                      </div>
                    )}
                    {error && (
                      <p
                        className={`text-sm ${
                          profileData.currentTheme === "dark"
                            ? "text-red-400"
                            : "text-red-600"
                        }`}
                      >
                        {error}
                      </p>
                    )}
                  </div>

                  {/* Japanese Level field */}
                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        profileData.currentTheme === "dark"
                          ? "text-gray-300"
                          : "text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {t("settings.profile.japaneseLevel")}
                        <a
                          href="https://www.jlpt.jp/e/about/levelsummary.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs transition-colors ${
                            profileData.currentTheme === "dark"
                              ? "text-gray-400 hover:text-gray-300"
                              : "text-gray-500 hover:text-gray-600"
                          }`}
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2v2c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8v-2c0-5.523-4.477-10-10-10z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      </div>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          level: "N5",
                          displayLevel: t("settings.profile.jlptLevels.n5"),
                          description: t(
                            "settings.profile.jlptLevels.descriptions.n5"
                          ),
                        },
                        {
                          level: "N4",
                          displayLevel: t("settings.profile.jlptLevels.n4"),
                          description: t(
                            "settings.profile.jlptLevels.descriptions.n4"
                          ),
                        },
                        {
                          level: "N3",
                          displayLevel: t("settings.profile.jlptLevels.n3"),
                          description: t(
                            "settings.profile.jlptLevels.descriptions.n3"
                          ),
                        },
                        {
                          level: "N2",
                          displayLevel: t("settings.profile.jlptLevels.n2"),
                          description: t(
                            "settings.profile.jlptLevels.descriptions.n2"
                          ),
                        },
                        {
                          level: "N1",
                          displayLevel: t("settings.profile.jlptLevels.n1"),
                          description: t(
                            "settings.profile.jlptLevels.descriptions.n1"
                          ),
                        },
                        {
                          level: "NATIVE",
                          displayLevel: t("settings.profile.jlptLevels.native"),
                          description: t(
                            "settings.profile.jlptLevels.descriptions.native"
                          ),
                        },
                      ].map(({ level, displayLevel, description }) => (
                        <div key={level}>
                          <button
                            onClick={() =>
                              handleUpdate("japanese_level", level)
                            }
                            className={`w-full h-full p-3 rounded-lg text-left transition-colors ${
                              profileData.japanese_level === level
                                ? profileData.currentTheme === "dark"
                                  ? "bg-green-500/10 text-green-400 border border-green-500"
                                  : "bg-green-50 text-green-600 border border-green-500"
                                : profileData.currentTheme === "dark"
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                            }`}
                          >
                            <div className="flex flex-col h-[120px]">
                              <div className="text-sm font-medium mb-2">
                                {displayLevel}
                              </div>
                              <div
                                className={`text-xs flex-1 ${
                                  profileData.japanese_level === level
                                    ? profileData.currentTheme === "dark"
                                      ? "text-green-400/80"
                                      : "text-green-600/80"
                                    : profileData.currentTheme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-500"
                                }`}
                              >
                                {description}
                              </div>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Self Introduction field */}
                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        profileData.currentTheme === "dark"
                          ? "text-gray-300"
                          : "text-gray-700"
                      }`}
                    >
                      {t("settings.profile.selfIntroduction")}
                    </label>
                    {editState.intro ? (
                      <div className="space-y-3">
                        <textarea
                          value={profileData.edited_self_introduction}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              edited_self_introduction: e.target.value,
                            }))
                          }
                          rows={4}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${
                            profileData.currentTheme === "dark"
                              ? "bg-gray-700 border-gray-600 text-gray-100"
                              : "bg-white border-gray-200 text-gray-900"
                          } focus:outline-none focus:ring-2 focus:ring-green-500`}
                          placeholder={t("settings.profile.introPlaceholder")}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleUpdate(
                                "self_introduction",
                                profileData.edited_self_introduction
                              )
                            }
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              profileData.currentTheme === "dark"
                                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                            }`}
                          >
                            {t("common.save")}
                          </button>
                          <button
                            onClick={() => {
                              setEditState((prev) => ({
                                ...prev,
                                intro: false,
                              }));
                              setProfileData((prev) => ({
                                ...prev,
                                edited_self_introduction:
                                  prev.self_introduction,
                              }));
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              profileData.currentTheme === "dark"
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div
                            className={`flex-1 p-4 rounded-lg ${
                              profileData.currentTheme === "dark"
                                ? "bg-gray-700/50"
                                : "bg-gray-50"
                            }`}
                          >
                            <p
                              className={`text-sm whitespace-pre-wrap ${
                                profileData.currentTheme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-700"
                              }`}
                            >
                              {profileData.self_introduction ||
                                t("settings.profile.noIntroduction")}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setEditState((prev) => ({ ...prev, intro: true }))
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              profileData.currentTheme === "dark"
                                ? "text-gray-300 hover:bg-gray-700"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {t("common.edit")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Duolingo Username field */}
                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-medium ${
                        profileData.currentTheme === "dark"
                          ? "text-gray-300"
                          : "text-gray-700"
                      }`}
                    >
                      {t("settings.profile.duolingoProfile")}
                    </label>
                    {editState.duolingo ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={profileData.edited_duolingo_username}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              edited_duolingo_username: e.target.value,
                            }))
                          }
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                            profileData.currentTheme === "dark"
                              ? "bg-gray-700 border-gray-600 text-gray-100"
                              : "bg-white border-gray-200 text-gray-900"
                          } focus:outline-none focus:ring-2 focus:ring-green-500`}
                          placeholder="Duolingo username"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleUpdate(
                                "duolingo_username",
                                profileData.edited_duolingo_username
                              )
                            }
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              profileData.currentTheme === "dark"
                                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                            }`}
                          >
                            {t("common.save")}
                          </button>
                          <button
                            onClick={() => {
                              setEditState((prev) => ({
                                ...prev,
                                duolingo: false,
                              }));
                              setProfileData((prev) => ({
                                ...prev,
                                edited_duolingo_username:
                                  prev.duolingo_username,
                              }));
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              profileData.currentTheme === "dark"
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex items-center gap-3 ${
                            profileData.currentTheme === "dark"
                              ? "text-gray-300"
                              : "text-gray-700"
                          }`}
                        >
                          <img
                            src="/icons/duolingo-app.svg"
                            alt="Duolingo"
                            className="w-5 h-5"
                          />
                          <span>
                            {profileData.duolingo_username ||
                              t("settings.profile.noDuolingo")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {profileData.duolingo_username && (
                            <a
                              href={`https://www.duolingo.com/profile/${encodeURIComponent(
                                profileData.duolingo_username
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                profileData.currentTheme === "dark"
                                  ? "text-gray-300 hover:bg-gray-700"
                                  : "text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              {t("common.viewProfile")}
                            </a>
                          )}
                          <button
                            onClick={() =>
                              setEditState((prev) => ({
                                ...prev,
                                duolingo: true,
                              }))
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              profileData.currentTheme === "dark"
                                ? "text-gray-300 hover:bg-gray-700"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {t("common.edit")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* End translation language preference */}
                </div>
              </div>
            </div>

            {/* Premium and Membership Sections */}
            <div className="space-y-6">
              <MembershipSection theme={profileData.currentTheme} />
            </div>

            {/* Language Settings Section */}
            <div
              id="language"
              className={`overflow-hidden rounded-2xl shadow-sm border backdrop-blur-sm ${
                profileData.currentTheme === "dark"
                  ? "bg-gray-800/80 border-gray-700/50"
                  : "bg-white border-gray-100"
              }`}
            >
              <div
                className={`px-8 py-5 border-b ${
                  profileData.currentTheme === "dark"
                    ? "border-gray-700/50"
                    : "border-gray-100"
                }`}
              >
                <h2
                  className={`text-base font-medium ${
                    profileData.currentTheme === "dark"
                      ? "text-gray-200"
                      : "text-gray-900"
                  }`}
                >
                  {t("settings.language.title")}
                </h2>
              </div>
              <div className="p-8 space-y-8">
                {/* Interface Language */}
                <div className="space-y-2">
                  <label
                    htmlFor="ui-language"
                    className={`block text-sm font-medium ${
                      profileData.currentTheme === "dark"
                        ? "text-gray-300"
                        : "text-gray-700"
                    }`}
                  >
                    {t("settings.language.interface")}
                  </label>
                  <select
                    id="ui-language"
                    value={profileData.ui_language}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setProfileData((prev) => ({
                        ...prev,
                        ui_language: newValue,
                      }));
                      handleUpdate("ui_language", newValue);
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-sm ${
                      profileData.currentTheme === "dark"
                        ? "bg-gray-700 border-gray-600 text-gray-100"
                        : "bg-white border-gray-200 text-gray-900"
                    } border focus:outline-none focus:ring-2 focus:ring-green-500`}
                  >
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <p
                    className={`text-xs ${
                      profileData.currentTheme === "dark"
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}
                  >
                    {t("settings.language.interfaceDescription")}
                  </p>
                </div>

                {/* Translation Language */}
                <div className="space-y-2">
                  <label
                    htmlFor="translation-language"
                    className={`block text-sm font-medium ${
                      profileData.currentTheme === "dark"
                        ? "text-gray-300"
                        : "text-gray-700"
                    }`}
                  >
                    {t("settings.language.translation")}
                  </label>
                  <select
                    id="translation-language"
                    value={profileData.preferred_translation_language}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setProfileData((prev) => ({
                        ...prev,
                        preferred_translation_language: newValue,
                      }));
                      handleUpdate("preferred_translation_language", newValue);
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-sm ${
                      profileData.currentTheme === "dark"
                        ? "bg-gray-700 border-gray-600 text-gray-100"
                        : "bg-white border-gray-200 text-gray-900"
                    } border focus:outline-none focus:ring-2 focus:ring-green-500`}
                  >
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <p
                    className={`text-xs ${
                      profileData.currentTheme === "dark"
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}
                  >
                    {t("settings.language.translationDescription")}
                  </p>
                </div>
              </div>
            </div>

            {/* Appearance Section */}
            <div
              id="appearance"
              className={`overflow-hidden rounded-2xl shadow-sm border backdrop-blur-sm ${
                profileData.currentTheme === "dark"
                  ? "bg-gray-800/80 border-gray-700/50"
                  : "bg-white border-gray-100"
              }`}
            >
              <div
                className={`px-8 py-5 border-b ${
                  profileData.currentTheme === "dark"
                    ? "border-gray-700/50"
                    : "border-gray-100"
                }`}
              >
                <h2
                  className={`text-base font-medium ${
                    profileData.currentTheme === "dark"
                      ? "text-gray-200"
                      : "text-gray-900"
                  }`}
                >
                  {t("settings.appearance.title")}
                </h2>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleUpdate("theme", "light")}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                      profileData.theme === "light"
                        ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                        : profileData.currentTheme === "dark"
                        ? "border-gray-700/50 hover:border-gray-600 text-gray-400 hover:bg-gray-700/50"
                        : "border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <FaSun className="w-6 h-6" />
                      <span className="text-sm font-medium">
                        {t("settings.appearance.theme.light")}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleUpdate("theme", "dark")}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                      profileData.theme === "dark"
                        ? "border-green-500 bg-green-500/10 text-green-400 shadow-sm"
                        : profileData.currentTheme === "dark"
                        ? "border-gray-700/50 hover:border-gray-600 text-gray-400 hover:bg-gray-700/50"
                        : "border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <FaMoon className="w-6 h-6" />
                      <span className="text-sm font-medium">
                        {t("settings.appearance.theme.dark")}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Reader's Goals Section */}
            <div
              id="goals"
              className={`overflow-hidden rounded-2xl shadow-sm border backdrop-blur-sm ${
                profileData.currentTheme === "dark"
                  ? "bg-gray-800/80 border-gray-700/50"
                  : "bg-white border-gray-100"
              }`}
            >
              <div
                className={`px-8 py-5 border-b ${
                  profileData.currentTheme === "dark"
                    ? "border-gray-700/50"
                    : "border-gray-100"
                }`}
              >
                <div className="space-y-1">
                  <h2
                    className={`text-base font-medium mb-1 ${
                      profileData.currentTheme === "dark"
                        ? "text-gray-200"
                        : "text-gray-800"
                    }`}
                  >
                    {t("settings.goals.title")}
                  </h2>
                  <div
                    className={`text-sm ${
                      profileData.currentTheme === "dark"
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}
                  >
                    {t("settings.goals.description")}
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-8">
                {/* Daily Articles Goal */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        className={`block text-sm font-medium ${
                          profileData.currentTheme === "dark"
                            ? "text-gray-300"
                            : "text-gray-700"
                        }`}
                      >
                        {t("settings.goals.articles.title")}
                      </label>
                      <div
                        className={`text-sm px-3 py-1 rounded-md ${
                          profileData.currentTheme === "dark"
                            ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                            : "bg-green-50 text-green-600 ring-1 ring-green-500/20"
                        }`}
                      >
                        {profileData.daily_article_goal}{" "}
                        {t("settings.goals.articles.current")}
                      </div>
                    </div>
                    <p
                      className={`text-xs ${
                        profileData.currentTheme === "dark"
                          ? "text-gray-400"
                          : "text-gray-600"
                      }`}
                    >
                      {t("settings.goals.articles.description")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 3, 5, 10].map((value) => (
                        <button
                          key={value}
                          onClick={() => {
                            setProfileData((prev) => ({
                              ...prev,
                              daily_article_goal: value,
                            }));
                            handleUpdate("daily_article_goal", value);
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.daily_article_goal === value
                              ? profileData.currentTheme === "dark"
                                ? "bg-green-500/10 text-green-400 border border-green-500"
                                : "bg-green-50 text-green-600 border border-green-500"
                              : profileData.currentTheme === "dark"
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Daily Reading Time Goal */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        className={`block text-sm font-medium ${
                          profileData.currentTheme === "dark"
                            ? "text-gray-300"
                            : "text-gray-700"
                        }`}
                      >
                        {t("settings.goals.time.title")}
                      </label>
                      <div
                        className={`text-sm px-3 py-1 rounded-md ${
                          profileData.currentTheme === "dark"
                            ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                            : "bg-green-50 text-green-600 ring-1 ring-green-500/20"
                        }`}
                      >
                        {profileData.daily_reading_time_goal}{" "}
                        {t("settings.goals.time.current")}
                      </div>
                    </div>
                    <p
                      className={`text-xs ${
                        profileData.currentTheme === "dark"
                          ? "text-gray-400"
                          : "text-gray-600"
                      }`}
                    >
                      {t("settings.goals.time.description")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="col-span-2 sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[3, 10, 30, 60].map((value) => (
                          <button
                            key={value}
                            onClick={() => {
                              setIsCustomInput(false);
                              setInputValue("");
                              setProfileData((prev) => ({
                                ...prev,
                                daily_reading_time_goal: value,
                              }));
                              handleUpdate("daily_reading_time_goal", value);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              !isCustomInput &&
                              profileData.daily_reading_time_goal === value
                                ? profileData.currentTheme === "dark"
                                  ? "bg-green-500/10 text-green-400 ring-1 ring-green-500"
                                  : "bg-green-50 text-green-600 ring-1 ring-green-500"
                                : profileData.currentTheme === "dark"
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <div className="relative col-span-2 sm:col-span-1">
                        <input
                          type="number"
                          min="1"
                          max="240"
                          value={
                            isCustomInput
                              ? inputValue
                              : ![3, 10, 30, 60].includes(
                                  profileData.daily_reading_time_goal
                                )
                              ? profileData.daily_reading_time_goal
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            setIsCustomInput(true);
                            setInputValue(value);

                            if (value === "") {
                              return;
                            }

                            const numValue = parseInt(value);
                            if (!isNaN(numValue)) {
                              debouncedUpdate(numValue);
                            }
                          }}
                          onFocus={() => {
                            setIsCustomInput(true);
                          }}
                          onBlur={() => {
                            if (inputValue === "") {
                              if (
                                ![3, 10, 30, 60].includes(
                                  profileData.daily_reading_time_goal
                                )
                              ) {
                                setInputValue(
                                  profileData.daily_reading_time_goal.toString()
                                );
                              } else {
                                setIsCustomInput(false);
                              }
                            }
                          }}
                          className={`w-full px-4 pr-8 py-2 rounded-lg text-sm font-medium transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            isCustomInput ||
                            ![3, 10, 30, 60].includes(
                              profileData.daily_reading_time_goal
                            )
                              ? profileData.currentTheme === "dark"
                                ? "bg-green-500/10 text-green-400 ring-1 ring-green-500"
                                : "bg-green-50 text-green-600 ring-1 ring-green-500"
                              : profileData.currentTheme === "dark"
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          placeholder={t("settings.goals.time.custom")}
                        />
                        <div
                          className={`absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none ${
                            ![3, 10, 30, 60].includes(
                              profileData.daily_reading_time_goal
                            )
                              ? profileData.currentTheme === "dark"
                                ? "text-green-400"
                                : "text-green-600"
                              : profileData.currentTheme === "dark"
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Management Section */}
            <div
              id="data"
              className={`overflow-hidden rounded-2xl shadow-sm border ${
                profileData.currentTheme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-100"
              }`}
            >
              <div
                className={`px-8 py-5 border-b ${
                  profileData.currentTheme === "dark"
                    ? "border-gray-700"
                    : "border-gray-100"
                }`}
              >
                <h2
                  className={`text-base font-medium ${
                    profileData.currentTheme === "dark"
                      ? "text-gray-200"
                      : "text-gray-900"
                  }`}
                >
                  {t("settings.data.title")}
                </h2>
              </div>
              <div
                className={`divide-y ${
                  profileData.currentTheme === "dark"
                    ? "divide-gray-700/50"
                    : "divide-gray-100"
                }`}
              >
                {/* Reset Reading History */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3
                        className={`text-base font-medium mb-1 ${
                          profileData.currentTheme === "dark"
                            ? "text-gray-200"
                            : "text-gray-800"
                        }`}
                      >
                        {t("settings.data.readingHistory.title")}
                      </h3>
                      <p
                        className={`text-sm ${
                          profileData.currentTheme === "dark"
                            ? "text-gray-400"
                            : "text-gray-600"
                        }`}
                      >
                        {t("settings.data.readingHistory.description")}
                      </p>
                    </div>
                    <button
                      onClick={handleResetReadingHistory}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        profileData.currentTheme === "dark"
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      {t("settings.data.readingHistory.button")}
                    </button>
                  </div>
                </div>

                {/* Reset Saved Articles */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3
                        className={`text-base font-medium mb-1 ${
                          profileData.currentTheme === "dark"
                            ? "text-gray-200"
                            : "text-gray-800"
                        }`}
                      >
                        {t("settings.data.savedArticles.title")}
                      </h3>
                      <p
                        className={`text-sm ${
                          profileData.currentTheme === "dark"
                            ? "text-gray-400"
                            : "text-gray-600"
                        }`}
                      >
                        {t("settings.data.savedArticles.description")}
                      </p>
                    </div>
                    <button
                      onClick={handleResetSavedArticles}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        profileData.currentTheme === "dark"
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      {t("settings.data.savedArticles.button")}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="px-6 py-4">
                    <p
                      className={`text-sm ${
                        profileData.currentTheme === "dark"
                          ? "text-red-400"
                          : "text-red-600"
                      }`}
                    >
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Software Information Section */}
            <div
              id="software"
              className={`overflow-hidden rounded-2xl shadow-sm border ${
                profileData.currentTheme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-100"
              }`}
            >
              <div
                className={`px-8 py-5 border-b ${
                  profileData.currentTheme === "dark"
                    ? "border-gray-700"
                    : "border-gray-100"
                }`}
              >
                <h2
                  className={`text-base font-medium ${
                    profileData.currentTheme === "dark"
                      ? "text-gray-200"
                      : "text-gray-900"
                  }`}
                >
                  {t("settings.software.title")}
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <p
                      className={`text-sm ${
                        profileData.currentTheme === "dark"
                          ? "text-gray-400"
                          : "text-gray-600"
                      }`}
                    >
                      {t("settings.software.description")}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-lg ${
                      profileData.currentTheme === "dark"
                        ? "bg-gray-700/50"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 flex items-center justify-center rounded-xl ${
                            profileData.currentTheme === "dark"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {isLoading ? (
                            <svg
                              className="w-5 h-5 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 22C17.5228 22 22 17.5228 22 12H20C20 16.4183 16.4183 20 12 20V22Z"
                                fill="currentColor"
                              />
                              <path
                                d="M2 12C2 6.47715 6.47715 2 12 2V4C7.58172 4 4 7.58172 4 12H2Z"
                                fill="currentColor"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              profileData.currentTheme === "dark"
                                ? "text-gray-200"
                                : "text-gray-800"
                            }`}
                          >
                            {isLoading
                              ? t("common.checkingUpdates")
                              : t("common.upToDate")}
                          </p>
                          <div className="space-y-1">
                            <p
                              className={`text-xs ${
                                profileData.currentTheme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }`}
                            >
                              {isLoading ? (
                                <span className="inline-flex items-center">
                                  <span className="animate-pulse">
                                    {t("settings.software.fetchingVersion")}
                                  </span>
                                </span>
                              ) : (
                                <>
                                  {t("settings.software.version")}{" "}
                                  {version || "1.0.0"}
                                  {releaseDate && ` (${releaseDate})`}
                                </>
                              )}
                            </p>
                            <p
                              className={`text-xs ${
                                profileData.currentTheme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }`}
                            >
                              <a
                                href="/changelog"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {t("common.viewReleaseNotes")}
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          fetchVersion();
                          setTimeout(() => {
                            if (isLoading) {
                              setIsLoading(false);
                            }
                          }, 3000);
                        }}
                        disabled={isLoading}
                        className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isLoading
                            ? profileData.currentTheme === "dark"
                              ? "bg-gray-700/50 text-gray-400 cursor-not-allowed"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : profileData.currentTheme === "dark"
                            ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                            : "bg-green-50 text-green-600 hover:bg-green-100"
                        }`}
                      >
                        {isLoading
                          ? t("common.checking")
                          : t("common.checkForUpdates")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleSignOut}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  profileData.currentTheme === "dark"
                    ? "text-red-400 hover:bg-gray-800"
                    : "text-red-600 hover:bg-gray-100"
                }`}
              >
                {t("common.signOut")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
} 