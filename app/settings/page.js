'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaSun, FaMoon, FaUser, FaCheck, FaTimes, FaCheckCircle, FaIdBadge } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import { useUpdate } from '@/app/sw-register';
import { supabase } from '../../lib/supabase';
import { getSystemTheme, getCurrentTheme } from '../../lib/utils/theme';
import Navbar from '../components/Navbar';
import useSystemStore from '@/lib/stores/system';

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signOut, profile, updateProfile } = useAuth();
  const { showUpdatePrompt, applyUpdate } = useUpdate();
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

  // Handle URL section parameter
  useEffect(() => {
    const section = searchParams.get('section');
    console.log('Section from searchParams:', section);
    
    if (section && ['profile', 'appearance', 'goals', 'data', 'software'].includes(section)) {
      console.log('Valid section found:', section);
      setActiveSection(section);
      
      const scrollToSection = () => {
        const element = document.getElementById(section);
        console.log('Looking for element:', section);
        
        if (element) {
          console.log('Element found, scrolling...');
          const offset = element.offsetTop - 120;
          window.scrollTo({
            top: offset,
            behavior: 'instant'
          });
        }
      };

      // Try scrolling after a delay to ensure the page is rendered
      setTimeout(scrollToSection, 100);
    }
  }, [searchParams]);

  // Add scroll tracking
  useEffect(() => {
    const updateActiveSection = () => {
      const sections = document.querySelectorAll('#profile, #appearance, #goals, #data, #software');
      const navHeight = 120;
      const fromTop = window.scrollY + navHeight;

      let currentSection = 'profile';
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (fromTop >= sectionTop) {
          currentSection = section.id;
        }
      });

      setActiveSection(currentSection);
    };

    // Initial check
    updateActiveSection();

    // Add scroll listener
    window.addEventListener('scroll', updateActiveSection, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
    };
  }, []);

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

  const [profileData, setProfileData] = useState({
    theme: 'light',
    username: '',
    editedUsername: '',
    self_introduction: '',
    edited_self_introduction: '',
    japanese_level: '',
    duolingo_username: '',
    edited_duolingo_username: '',
    daily_article_goal: 3,
    daily_reading_time_goal: 15
  });

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

  // Add effect to reload profile when page becomes visible
  useEffect(() => {
    if (typeof document === 'undefined' || !user) return;

    const reloadProfile = async () => {
      try {
        // Directly fetch the latest profile from database
        const { data: latestProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;

        const theme = latestProfile.theme || 'light';
        const currentTheme = theme === 'system' 
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;

        setProfileData({
          theme: theme,
          currentTheme: currentTheme,
          username: latestProfile.username || '',
          editedUsername: latestProfile.username || '',
          self_introduction: latestProfile.self_introduction || '',
          edited_self_introduction: latestProfile.self_introduction || '',
          japanese_level: latestProfile.japanese_level || '',
          duolingo_username: latestProfile.duolingo_username || '',
          edited_duolingo_username: latestProfile.duolingo_username || '',
          daily_article_goal: latestProfile.daily_article_goal || 3,
          daily_reading_time_goal: latestProfile.daily_reading_time_goal || 15
        });
        setIsProfileLoaded(true);
      } catch (error) {
        console.error('Error reloading profile:', error);
      }
    };

    // Initial load
    reloadProfile();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadProfile();
      }
    };

    const handleFocus = () => {
      reloadProfile();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

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
            setError('Username cannot be empty');
            return;
          }
          updateData = { username: value.trim() };
          break;
        case 'japanese_level':
          updateData = { japanese_level: value };
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
      }

      // Update database directly using supabase
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      if (field === 'theme') {
        setProfileData(prev => ({
          ...prev,
          theme: value,
          currentTheme: value === 'system' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : value
        }));
        window.location.reload();
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
      setError(`Failed to update ${field.replace('_', ' ')}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Reset handlers
  const handleResetReadingHistory = async () => {
    if (!window.confirm('Warning: You are about to delete all your reading history.\n\nThis includes:\n- All articles marked as finished\n- Your reading progress tracking\n- Your streak records (both best and current streak)\n\nThis action is PERMANENT and CANNOT be undone. Are you sure you want to proceed?')) {
      return;
    }

    const confirmText = 'reset reading history';
    const userInput = window.prompt(`To confirm this irreversible action, please type "${confirmText}" below:`);
    
    if (!userInput) return;
    
    if (userInput !== confirmText) {
      setError('Text did not match. Reset cancelled.');
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
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error resetting reading history:', error);
      setError('Failed to reset reading history');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleResetSavedArticles = async () => {
    if (!window.confirm('Warning: You are about to delete all your saved articles.\n\nThis includes:\n- All articles you have saved for later\n- Your saved articles\n\nThis action is PERMANENT and CANNOT be undone. Are you sure you want to proceed?')) {
      return;
    }

    const confirmText = 'reset saved articles';
    const userInput = window.prompt(`To confirm this irreversible action, please type "${confirmText}" below:`);
    
    if (!userInput) return;
    
    if (userInput !== confirmText) {
      setError('Text did not match. Reset cancelled.');
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
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error resetting saved articles:', error);
      setError('Failed to reset saved articles');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Return null if no user
  if (!user) {
    return null;
  }

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
            <span>Changes saved</span>
          </div>
        </div>
      )}
      <Navbar theme={profileData.currentTheme} hideNewsListButton={true} />

      <div className="container mx-auto px-4 pt-24 pb-32 flex-1">
        <div className="max-w-2xl mx-auto">
          <h1
            className={`text-3xl font-semibold mb-10 ${
              profileData.currentTheme === "dark"
                ? "text-gray-100"
                : "text-[rgb(19,31,36)]"
            }`}
          >
            Account Settings
          </h1>

          {/* Settings Navigation */}
          <nav className={`sticky top-16 -mx-4 px-4 py-3 mb-10 z-10 backdrop-blur-md bg-opacity-80 ${
            profileData.currentTheme === "dark"
              ? "bg-[rgb(19,31,36)]/90 border-b border-gray-800/50"
              : "bg-white/90 border-b border-gray-200/50"
          }`}>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                { id: 'appearance', label: 'Appearance', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
                { id: 'goals', label: 'Reader\'s Goals', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                { id: 'data', label: 'Data Management', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
                { id: 'software', label: 'Software Information', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => {
                    const element = document.getElementById(section.id);
                    const navHeight = 120;
                    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                    const offsetPosition = elementPosition - navHeight;

                    window.scrollTo({
                      top: offsetPosition,
                      behavior: 'smooth'
                    });
                    
                    setActiveSection(section.id);
                    const searchParams = new URLSearchParams(window.location.search);
                    searchParams.set('section', section.id);
                    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
                    window.history.replaceState({}, '', newUrl);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap text-sm font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? profileData.currentTheme === "dark"
                        ? "text-white"
                        : "text-gray-900"
                      : profileData.currentTheme === "dark"
                      ? "text-gray-400 hover:text-gray-300"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <svg className={`w-4 h-4 transition-colors ${
                    activeSection === section.id
                      ? profileData.currentTheme === "dark"
                        ? "text-white"
                        : "text-gray-900"
                      : "text-current"
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
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
                profileData.currentTheme === "dark" ? "bg-gray-800/80 border-gray-700/50" : "bg-white border-gray-100"
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
                  Profile Information
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
                      <div className={`w-16 sm:w-20 h-16 sm:h-20 rounded-2xl flex items-center justify-center border-2 border-gray-200/10 dark:border-gray-700/50 transition-all duration-200
                        ${profileData.currentTheme === "dark"
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <FaUser className="w-6 sm:w-8 h-6 sm:h-8" />
                      </div>
                    )}
                    <div className={`absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                      profileData.currentTheme === "dark"
                        ? "bg-black/50"
                        : "bg-black/30"
                    }`}>
                      <label htmlFor="avatar-upload" className="cursor-pointer p-2">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800 ${
                      profileData.currentTheme === "dark" ? "bg-gray-800" : "bg-white"
                    }`}>
                      <svg className="w-4 h-4" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`flex flex-col gap-2 ${
                      profileData.currentTheme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-lg font-medium whitespace-nowrap">Google Account</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md ${
                          profileData.currentTheme === "dark" 
                            ? "bg-green-500/10 text-green-400" 
                            : "bg-green-50 text-green-600"
                        }`}>
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Verified</span>
                          </div>
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`${
                            profileData.currentTheme === "dark" ? "text-gray-400" : "text-gray-600"
                          } truncate`}>{user?.email}</span>
                        </div>
                        <p className={`text-xs ${
                          profileData.currentTheme === "dark" ? "text-gray-500" : "text-gray-500"
                        }`}>
                          Your account is secured with Google Sign In
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
                      Username
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
                        placeholder="Enter username"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleUpdate("username", profileData.editedUsername)
                          }
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === "dark"
                              ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                          }`}
                        >
                          Save
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
                          Cancel
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
                            "No Duolingo profile linked"}
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
                            View Profile
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
                          Edit
                        </button>
                      </div>
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
                      Japanese Level
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
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2v2c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8v-2c0-5.523-4.477-10-10-10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </div>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        level: "N5",
                        displayLevel: "N5 or below",
                        description:
                          "Being very new to Japanese. Can understand and use familiar everyday expressions and very basic phrases.",
                      },
                      {
                        level: "N4",
                        displayLevel: "N4",
                        description:
                          "Basic understanding of Japanese used in everyday situations. Can read simple passages and follow slow conversations.",
                      },
                      {
                        level: "N3",
                        displayLevel: "N3",
                        description:
                          "Understanding of Japanese used in everyday situations to some degree. Can read newspapers with basic vocabulary.",
                      },
                      {
                        level: "N2",
                        displayLevel: "N2",
                        description:
                          "Ability to understand Japanese used in everyday situations and in a variety of circumstances. Can read newspapers and follow TV news.",
                      },
                      {
                        level: "N1",
                        displayLevel: "N1",
                        description:
                          "Ability to understand Japanese used in a variety of circumstances. Can read newspapers and magazines fluently.",
                      },
                      {
                        level: "Native",
                        displayLevel: "Native",
                        description:
                          "Native or near-native proficiency in Japanese.",
                      },
                    ].map(({ level, displayLevel, description }) => (
                      <div key={level}>
                        <button
                          onClick={() => handleUpdate("japanese_level", level)}
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
                            <div className="text-sm font-medium mb-2">{displayLevel}</div>
                            <div className={`text-xs flex-1 ${
                              profileData.japanese_level === level
                                ? profileData.currentTheme === "dark"
                                  ? "text-green-400/80"
                                  : "text-green-600/80"
                                : profileData.currentTheme === "dark"
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}>
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
                    Self Introduction
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
                        placeholder="Write a brief introduction about yourself..."
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
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditState((prev) => ({ ...prev, intro: false }));
                            setProfileData((prev) => ({
                              ...prev,
                              edited_self_introduction: prev.self_introduction,
                            }));
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === "dark"
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Cancel
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
                              "No introduction set"}
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
                          Edit
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
                    Duolingo Profile
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
                        placeholder="Enter Duolingo username"
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
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditState((prev) => ({
                              ...prev,
                              duolingo: false,
                            }));
                            setProfileData((prev) => ({
                              ...prev,
                              edited_duolingo_username: prev.duolingo_username,
                            }));
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === "dark"
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Cancel
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
                            "No Duolingo profile linked"}
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
                            View Profile
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
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Appearance Section */}
            <div
              id="appearance"
              className={`overflow-hidden rounded-2xl shadow-sm border backdrop-blur-sm ${
                profileData.currentTheme === "dark" ? "bg-gray-800/80 border-gray-700/50" : "bg-white border-gray-100"
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
                  Appearance
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
                      <span className="text-sm font-medium">Light</span>
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
                      <span className="text-sm font-medium">Dark</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Reader's Goals Section */}
            <div
              id="goals"
              className={`overflow-hidden rounded-2xl shadow-sm border backdrop-blur-sm ${
                profileData.currentTheme === "dark" ? "bg-gray-800/80 border-gray-700/50" : "bg-white border-gray-100"
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
                    className={`text-base font-medium ${
                      profileData.currentTheme === "dark"
                        ? "text-gray-200"
                        : "text-gray-800"
                    }`}
                  >
                    Reader's Goals
                  </h2>
                  <p className={`text-sm ${
                    profileData.currentTheme === "dark"
                      ? "text-gray-400"
                      : "text-gray-600"
                  }`}>
                    Set your daily reading targets and track your progress
                  </p>
                </div>
              </div>
              <div className="p-8 space-y-8">
                {/* Daily Articles Goal */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`block text-sm font-medium ${
                        profileData.currentTheme === "dark"
                          ? "text-gray-300"
                          : "text-gray-700"
                      }`}>
                        Daily Articles Goal
                      </label>
                      <div className={`text-sm px-3 py-1 rounded-md ${
                        profileData.currentTheme === "dark"
                          ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                          : "bg-green-50 text-green-600 ring-1 ring-green-500/20"
                      }`}>
                        {profileData.daily_article_goal} articles
                      </div>
                    </div>
                    <p className={`text-xs ${
                      profileData.currentTheme === "dark"
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}>
                      Challenge yourself to read a specific number of articles each day. Start small and increase gradually as you build confidence.
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 3, 5, 10].map((value) => (
                        <button
                          key={value}
                          onClick={() => {
                            setProfileData(prev => ({
                              ...prev,
                              daily_article_goal: value
                            }));
                            handleUpdate('daily_article_goal', value);
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
                      <label className={`block text-sm font-medium ${
                        profileData.currentTheme === "dark"
                          ? "text-gray-300"
                          : "text-gray-700"
                      }`}>
                        Daily Reading Time Goal
                      </label>
                      <div className={`text-sm px-3 py-1 rounded-md ${
                        profileData.currentTheme === "dark"
                          ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                          : "bg-green-50 text-green-600 ring-1 ring-green-500/20"
                      }`}>
                        {profileData.daily_reading_time_goal} minutes
                      </div>
                    </div>
                    <p className={`text-xs ${
                      profileData.currentTheme === "dark"
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}>
                      Set aside dedicated time for reading practice. Even a few minutes of focused reading each day can significantly improve your comprehension.
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
                              setInputValue('');
                              setProfileData(prev => ({
                                ...prev,
                                daily_reading_time_goal: value
                              }));
                              handleUpdate('daily_reading_time_goal', value);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              !isCustomInput && profileData.daily_reading_time_goal === value
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
                          value={isCustomInput ? inputValue : ![3, 10, 30, 60].includes(profileData.daily_reading_time_goal) ? profileData.daily_reading_time_goal : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setIsCustomInput(true);
                            setInputValue(value);
                            
                            if (value === '') {
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
                            if (inputValue === '') {
                              if (![3, 10, 30, 60].includes(profileData.daily_reading_time_goal)) {
                                setInputValue(profileData.daily_reading_time_goal.toString());
                              } else {
                                setIsCustomInput(false);
                              }
                            }
                          }}
                          className={`w-full px-4 pr-8 py-2 rounded-lg text-sm font-medium transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            isCustomInput || ![3, 10, 30, 60].includes(profileData.daily_reading_time_goal)
                              ? profileData.currentTheme === "dark"
                                ? "bg-green-500/10 text-green-400 ring-1 ring-green-500"
                                : "bg-green-50 text-green-600 ring-1 ring-green-500"
                              : profileData.currentTheme === "dark"
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          placeholder="Custom"
                        />
                        <div className={`absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none ${
                          ![3, 10, 30, 60].includes(profileData.daily_reading_time_goal)
                            ? profileData.currentTheme === "dark"
                              ? "text-green-400"
                              : "text-green-600"
                            : profileData.currentTheme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
                profileData.currentTheme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
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
                  Data Management
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
                        Reset Reading History
                      </h3>
                      <p
                        className={`text-sm ${
                          profileData.currentTheme === "dark"
                            ? "text-gray-400"
                            : "text-gray-600"
                        }`}
                      >
                        Remove all your finished articles history and reset
                        reading stats. This action cannot be undone.
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
                      Reset Reading History
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
                        Reset Saved Articles
                      </h3>
                      <p
                        className={`text-sm ${
                          profileData.currentTheme === "dark"
                            ? "text-gray-400"
                            : "text-gray-600"
                        }`}
                      >
                          Remove all your saved articles. This action cannot be
                          undone.
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
                      Reset Saved Articles
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
                profileData.currentTheme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
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
                  Software Information
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
                        Information about your installed version and available updates.
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    profileData.currentTheme === "dark"
                      ? "bg-gray-700/50"
                      : "bg-gray-50"
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${
                          showUpdatePrompt
                            ? profileData.currentTheme === "dark"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-blue-100 text-blue-600"
                            : profileData.currentTheme === "dark"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-green-100 text-green-600"
                        }`}>
                          {isLoading ? (
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 22C17.5228 22 22 17.5228 22 12H20C20 16.4183 16.4183 20 12 20V22Z" fill="currentColor"/>
                              <path d="M2 12C2 6.47715 6.47715 2 12 2V4C7.58172 4 4 7.58172 4 12H2Z" fill="currentColor"/>
                            </svg>
                          ) : showUpdatePrompt ? (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${
                            profileData.currentTheme === "dark"
                              ? "text-gray-200"
                              : "text-gray-800"
                          }`}>
                            {isLoading ? 'Checking for Updates...' : showUpdatePrompt ? 'Update Available' : 'Up to Date'}
                          </p>
                          <div className="space-y-1">
                            <p className={`text-xs ${
                              profileData.currentTheme === "dark"
                                ? "text-gray-400"
                                : "text-gray-600"
                            }`}>
                              {isLoading ? (
                                <span className="inline-flex items-center">
                                  <span className="animate-pulse">Fetching version information...</span>
                                </span>
                              ) : (
                                <>
                                  Version {version || '1.0.0'}
                                  {releaseDate && ` (${releaseDate})`}
                                </>
                              )}
                            </p>
                            <p className={`text-xs ${
                              profileData.currentTheme === "dark"
                                ? "text-gray-400"
                                : "text-gray-600"
                            }`}>
                              <a 
                                href="/changelog" 
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                View release notes
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (showUpdatePrompt) {
                            applyUpdate();
                          } else {
                            fetchVersion();
                            setTimeout(() => {
                              if (isLoading) {
                                setIsLoading(false);
                              }
                            }, 3000);
                          }
                        }}
                        disabled={isLoading}
                        className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isLoading 
                            ? profileData.currentTheme === "dark"
                              ? "bg-gray-700/50 text-gray-400 cursor-not-allowed"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : showUpdatePrompt
                              ? profileData.currentTheme === "dark"
                                ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              : profileData.currentTheme === "dark"
                                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                        }`}
                      >
                        {isLoading ? 'Checking...' : showUpdatePrompt ? 'Install Update' : 'Check for Updates'}
                      </button>
                    </div>
                    {showUpdatePrompt && (
                      <div className={`mt-4 p-3 rounded-lg ${
                        profileData.currentTheme === "dark"
                          ? "bg-blue-500/10 border border-blue-500/20"
                          : "bg-blue-50 border border-blue-200"
                      }`}>
                        <div className="flex items-start gap-2">
                          <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            profileData.currentTheme === "dark"
                              ? "text-blue-400"
                              : "text-blue-600"
                          }`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 16h-1v-4h-1m1-4h.01M21 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2v2c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8v-2c0-5.523-4.477-10-10-10z" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <div>
                            <p className={`text-sm font-medium ${
                              profileData.currentTheme === "dark"
                                ? "text-blue-400"
                                : "text-blue-700"
                            }`}>
                              A new version is available
                            </p>
                            <p className={`text-xs mt-1 ${
                              profileData.currentTheme === "dark"
                                ? "text-blue-400/80"
                                : "text-blue-600/80"
                            }`}>
                              Update now to get the latest features, improvements, and bug fixes.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
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
                Sign Out
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