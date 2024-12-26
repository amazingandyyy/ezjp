'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSun, FaMoon, FaUser, FaCheck, FaTimes, FaCheckCircle, FaIdBadge } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { getSystemTheme, getCurrentTheme } from '../../lib/utils/theme';
import Navbar from '../components/Navbar';

export default function Settings() {
  const router = useRouter();
  const { user, signOut, profile, updateProfile } = useAuth();
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editState, setEditState] = useState({
    username: false,
    intro: false,
    duolingo: false
  });
  const [profileData, setProfileData] = useState({
    theme: 'light',
    username: '',
    editedUsername: '',
    self_introduction: '',
    edited_self_introduction: '',
    japanese_level: '',
    duolingo_username: '',
    edited_duolingo_username: ''
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
          edited_duolingo_username: latestProfile.duolingo_username || ''
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
      }

      const updatedProfile = await updateProfile(updateData);
      if (updatedProfile) {
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

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      setError(`Failed to update ${field.replace('_', ' ')}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Reset handlers
  const handleResetReadingHistory = async () => {
    if (!window.confirm('Warning: You are about to delete all your reading history.\n\nThis includes:\n- All articles marked as finished\n- Your reading progress tracking\n\nThis action is PERMANENT and CANNOT be undone. Are you sure you want to proceed?')) {
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
    if (!window.confirm('Warning: You are about to delete all your saved articles.\n\nThis includes:\n- All articles you have saved for later\n- Your bookmarked articles\n\nThis action is PERMANENT and CANNOT be undone. Are you sure you want to proceed?')) {
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
                ? "bg-gray-800 text-green-400 border border-gray-700"
                : "bg-white text-green-600 border border-gray-200"
            }`}
          >
            <FaCheckCircle className="w-4 h-4" />
            <span>Changes saved</span>
          </div>
        </div>
      )}
      <Navbar theme={profileData.currentTheme} hideNewsListButton={true} />

      <div className="container mx-auto p-4 pt-24 pb-32">
        <div className="max-w-2xl mx-auto">
          <h1
            className={`text-2xl font-semibold mb-8 ${
              profileData.currentTheme === "dark"
                ? "text-gray-100"
                : "text-[rgb(19,31,36)]"
            }`}
          >
            Account Settings
          </h1>

          {/* Settings Sections */}
          <div className="space-y-6">
            {/* Profile Section */}
            <div
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
                        className="w-16 sm:w-20 h-16 sm:h-20 rounded-full object-cover ring-2 ring-offset-2 ring-gray-200 dark:ring-gray-700 dark:ring-offset-gray-800"
                      />
                    ) : (
                      <div className={`w-16 sm:w-20 h-16 sm:h-20 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-gray-200 dark:ring-gray-700 dark:ring-offset-gray-800
                        ${profileData.currentTheme === "dark"
                          ? "bg-gray-800 text-gray-200"
                          : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <FaUser className="w-6 sm:w-8 h-6 sm:h-8" />
                      </div>
                    )}
                    <div className={`absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
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
                          <span className={`text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 ${
                            profileData.currentTheme === "dark" 
                              ? "bg-blue-500/10 text-blue-400" 
                              : "bg-blue-50 text-blue-600"
                          }`}>
                            <svg className="w-3 h-3 relative top-[0.5px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 15a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm0-4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm0-4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm0 12a7 7 0 100-14 7 7 0 000 14z" fill="currentColor"/>
                            </svg>
                            <span className="relative top-px">2FA Enabled</span>
                          </span>
                        </div>
                        <p className={`text-xs ${
                          profileData.currentTheme === "dark" ? "text-gray-500" : "text-gray-500"
                        }`}>
                          Your account is protected by Google's advanced security features
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
                    {!profileData.username && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                        profileData.currentTheme === "dark"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-yellow-50 text-yellow-600"
                      }`}>
                        Missing
                      </span>
                    )}
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
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>{profileData.username || "No username set"}</span>
                      </div>
                      <button
                        onClick={() =>
                          setEditState((prev) => ({ ...prev, username: true }))
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
                          <path d="M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M22.126 12.348c0 5.06-4.104 9.165-9.164 9.165-5.06 0-9.164-4.104-9.164-9.165 0-5.06 4.104-9.164 9.164-9.164 5.06 0 9.164 4.104 9.164 9.164z"
                            fill="#58CC02"
                          />
                          <path
                            d="M12.962 7.815c0 .662-.537 1.2-1.2 1.2-.662 0-1.2-.538-1.2-1.2 0-.663.538-1.2 1.2-1.2.663 0 1.2.537 1.2 1.2z"
                            fill="white"
                          />
                          <path
                            d="M15.586 12.348c0 1.457-1.182 2.639-2.639 2.639-1.457 0-2.639-1.182-2.639-2.639 0-1.457 1.182-2.639 2.639-2.639 1.457 0 2.639 1.182 2.639 2.639z"
                            fill="white"
                          />
                          <path
                            d="M12.947 13.486c-.625 0-1.133-.508-1.133-1.133 0-.625.508-1.133 1.133-1.133.625 0 1.133.508 1.133 1.133 0 .625-.508 1.133-1.133 1.133z"
                            fill="#58CC02"
                          />
                          <path
                            d="M9.338 7.815c0 .662-.538 1.2-1.2 1.2-.663 0-1.2-.538-1.2-1.2 0-.663.537-1.2 1.2-1.2.662 0 1.2.537 1.2 1.2z"
                            fill="white"
                          />
                        </svg>
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
              className={`overflow-hidden rounded-xl shadow-sm ${
                profileData.currentTheme === "dark" ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div
                className={`px-6 py-4 border-b ${
                  profileData.currentTheme === "dark"
                    ? "border-gray-700"
                    : "border-gray-100"
                }`}
              >
                <h2
                  className={`text-sm font-medium ${
                    profileData.currentTheme === "dark"
                      ? "text-gray-300"
                      : "text-gray-900"
                  }`}
                >
                  Appearance
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleUpdate("theme", "light")}
                    className={`p-4 rounded-lg border transition-colors ${
                      profileData.theme === "light"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : profileData.currentTheme === "dark"
                        ? "border-gray-700 hover:border-gray-600 text-gray-400"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FaSun className="w-5 h-5" />
                      <span className="text-sm font-medium">Light</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleUpdate("theme", "dark")}
                    className={`p-4 rounded-lg border transition-colors ${
                      profileData.theme === "dark"
                        ? "border-green-500 bg-green-500/10 text-green-400"
                        : profileData.currentTheme === "dark"
                        ? "border-gray-700 hover:border-gray-600 text-gray-400"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FaMoon className="w-5 h-5" />
                      <span className="text-sm font-medium">Dark</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Data Management Section */}
            <div
              className={`overflow-hidden rounded-xl shadow-sm ${
                profileData.currentTheme === "dark" ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div
                className={`px-6 py-4 border-b ${
                  profileData.currentTheme === "dark"
                    ? "border-gray-700"
                    : "border-gray-100"
                }`}
              >
                <h2
                  className={`text-sm font-medium ${
                    profileData.currentTheme === "dark"
                      ? "text-gray-300"
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
                        className={`text-sm font-medium mb-1 ${
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
                        className={`text-sm font-medium mb-1 ${
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

            {/* Sign Out Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={signOut}
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