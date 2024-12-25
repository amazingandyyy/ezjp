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
    theme: 'system',
    currentTheme: getSystemTheme(),
    username: '',
    editedUsername: '',
    self_introduction: '',
    edited_self_introduction: '',
    japanese_level: '',
    duolingo_username: '',
    edited_duolingo_username: ''
  });

  // Set initial theme from system preference
  useEffect(() => {
    const systemTheme = getSystemTheme();
    setProfileData(prev => ({ 
      ...prev, 
      theme: prev.theme || 'system',
      currentTheme: getCurrentTheme(prev.theme || 'system')
    }));
  }, []);

  // Watch for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (profileData.theme === 'system') {
        setProfileData(prev => ({ 
          ...prev, 
          currentTheme: getSystemTheme()
        }));
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [profileData.theme]);

  // Load user settings from profile
  useEffect(() => {
    if (!profile) {
      setIsProfileLoaded(false);
      return;
    }
    
    const theme = profile.theme || 'system';
    setProfileData({
      theme: theme,
      currentTheme: getCurrentTheme(theme),
      username: profile.username || '',
      editedUsername: profile.username || '',
      self_introduction: profile.self_introduction || '',
      edited_self_introduction: profile.self_introduction || '',
      japanese_level: profile.japanese_level || '',
      duolingo_username: profile.duolingo_username || '',
      edited_duolingo_username: profile.duolingo_username || ''
    });
    setIsProfileLoaded(true);
  }, [profile]);

  // Generic update handler
  const handleUpdate = async (field, value, editField = null) => {
    try {
      let updateData = {};
      switch (field) {
        case 'theme':
          updateData = { theme: value };
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
        setProfileData(prev => ({
          ...prev,
          ...updateData,
          [editField || field]: value
        }));
        
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
    <div className={`min-h-screen ${profileData.currentTheme === 'dark' ? 'bg-[rgb(19,31,36)]' : 'bg-gray-50'}`}>
      {!isProfileLoaded && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-sm z-50" />
      )}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm ${
            profileData.currentTheme === 'dark' 
              ? 'bg-gray-800 text-green-400 border border-gray-700'
              : 'bg-white text-green-600 border border-gray-200'
          }`}>
            <FaCheckCircle className="w-4 h-4" />
            <span>Changes saved</span>
          </div>
        </div>
      )}
      <Navbar theme={profileData.currentTheme} />
      
      <div className="container mx-auto p-4 pt-24 pb-32">
        <div className="max-w-2xl mx-auto">
          <h1 className={`text-xl font-semibold mb-6 ${profileData.currentTheme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
            Account Settings
          </h1>

          {/* Settings Sections */}
          <div className="space-y-4">
            {/* Profile Section */}
            <div className={`overflow-hidden rounded-xl shadow-sm ${profileData.currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${profileData.currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <h2 className={`text-sm font-medium ${profileData.currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                  Profile Information
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Username field */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${profileData.currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Username
                  </label>
                  {editState.username ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={profileData.editedUsername}
                        onChange={(e) => setProfileData(prev => ({ ...prev, editedUsername: e.target.value }))}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                          profileData.currentTheme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-200 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-green-500`}
                        placeholder="Enter username"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate('username', profileData.editedUsername)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === 'dark'
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditState(prev => ({ ...prev, username: false }));
                            setProfileData(prev => ({ ...prev, editedUsername: prev.username }));
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === 'dark'
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-3 ${profileData.currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{profileData.username || 'No username set'}</span>
                      </div>
                      <button
                        onClick={() => setEditState(prev => ({ ...prev, username: true }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          profileData.currentTheme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  {error && (
                    <p className={`text-sm ${profileData.currentTheme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                      {error}
                    </p>
                  )}
                </div>

                {/* Japanese Level field */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${profileData.currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Japanese Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { level: 'N5', description: 'Basic understanding of everyday Japanese. Can read basic phrases and understand simple conversations.' },
                      { level: 'N4', description: 'Basic understanding of Japanese used in everyday situations. Can read simple passages and follow slow conversations.' },
                      { level: 'N3', description: 'Understanding of Japanese used in everyday situations to some degree. Can read newspapers with basic vocabulary.' },
                      { level: 'N2', description: 'Ability to understand Japanese used in everyday situations and in a variety of circumstances. Can read newspapers and follow TV news.' },
                      { level: 'N1', description: 'Ability to understand Japanese used in a variety of circumstances. Can read newspapers and magazines fluently.' },
                      { level: 'Native', description: 'Native or near-native proficiency in Japanese.' }
                    ].map(({ level, description }) => (
                      <div key={level} className="group relative">
                        <button
                          onClick={() => handleUpdate('japanese_level', level)}
                          className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.japanese_level === level
                              ? profileData.currentTheme === 'dark'
                                ? 'bg-green-500/10 text-green-400 border border-green-500'
                                : 'bg-green-50 text-green-600 border border-green-500'
                              : profileData.currentTheme === 'dark'
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                          }`}
                        >
                          {level}
                        </button>
                        <div className={`absolute bottom-full left-0 mb-2 w-64 p-2 rounded-lg text-xs transform scale-0 group-hover:scale-100 transition-transform origin-bottom z-10 ${
                          profileData.currentTheme === 'dark'
                            ? 'bg-gray-800 text-gray-300 border border-gray-700'
                            : 'bg-white text-gray-600 border border-gray-200 shadow-lg'
                        }`}>
                          {description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Self Introduction field */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${profileData.currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Self Introduction
                  </label>
                  {editState.intro ? (
                    <div className="space-y-3">
                      <textarea
                        value={profileData.edited_self_introduction}
                        onChange={(e) => setProfileData(prev => ({ ...prev, edited_self_introduction: e.target.value }))}
                        rows={4}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          profileData.currentTheme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-200 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-green-500`}
                        placeholder="Write a brief introduction about yourself..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate('self_introduction', profileData.edited_self_introduction)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === 'dark'
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditState(prev => ({ ...prev, intro: false }));
                            setProfileData(prev => ({ ...prev, edited_self_introduction: prev.self_introduction }));
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === 'dark'
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div className={`flex-1 p-4 rounded-lg ${
                          profileData.currentTheme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                        }`}>
                          <p className={`text-sm whitespace-pre-wrap ${
                            profileData.currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {profileData.self_introduction || 'No introduction set'}
                          </p>
                        </div>
                        <button
                          onClick={() => setEditState(prev => ({ ...prev, intro: true }))}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === 'dark'
                              ? 'text-gray-300 hover:bg-gray-700'
                              : 'text-gray-600 hover:bg-gray-100'
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
                  <label className={`block text-sm font-medium ${profileData.currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Duolingo Profile
                  </label>
                  {editState.duolingo ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={profileData.edited_duolingo_username}
                        onChange={(e) => setProfileData(prev => ({ ...prev, edited_duolingo_username: e.target.value }))}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                          profileData.currentTheme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-200 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-green-500`}
                        placeholder="Enter Duolingo username"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate('duolingo_username', profileData.edited_duolingo_username)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === 'dark'
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditState(prev => ({ ...prev, duolingo: false }));
                            setProfileData(prev => ({ ...prev, edited_duolingo_username: prev.duolingo_username }));
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === 'dark'
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-3 ${profileData.currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.126 12.348c0 5.06-4.104 9.165-9.164 9.165-5.06 0-9.164-4.104-9.164-9.165 0-5.06 4.104-9.164 9.164-9.164 5.06 0 9.164 4.104 9.164 9.164z" fill="#58CC02"/>
                          <path d="M12.962 7.815c0 .662-.537 1.2-1.2 1.2-.662 0-1.2-.538-1.2-1.2 0-.663.538-1.2 1.2-1.2.663 0 1.2.537 1.2 1.2z" fill="white"/>
                          <path d="M15.586 12.348c0 1.457-1.182 2.639-2.639 2.639-1.457 0-2.639-1.182-2.639-2.639 0-1.457 1.182-2.639 2.639-2.639 1.457 0 2.639 1.182 2.639 2.639z" fill="white"/>
                          <path d="M12.947 13.486c-.625 0-1.133-.508-1.133-1.133 0-.625.508-1.133 1.133-1.133.625 0 1.133.508 1.133 1.133 0 .625-.508 1.133-1.133 1.133z" fill="#58CC02"/>
                          <path d="M9.338 7.815c0 .662-.538 1.2-1.2 1.2-.663 0-1.2-.538-1.2-1.2 0-.663.537-1.2 1.2-1.2.662 0 1.2.537 1.2 1.2z" fill="white"/>
                        </svg>
                        <span>{profileData.duolingo_username || 'No Duolingo profile linked'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {profileData.duolingo_username && (
                          <a
                            href={`https://www.duolingo.com/profile/${encodeURIComponent(profileData.duolingo_username)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              profileData.currentTheme === 'dark'
                                ? 'text-gray-300 hover:bg-gray-700'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            View Profile
                          </a>
                        )}
                        <button
                          onClick={() => setEditState(prev => ({ ...prev, duolingo: true }))}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            profileData.currentTheme === 'dark'
                              ? 'text-gray-300 hover:bg-gray-700'
                              : 'text-gray-600 hover:bg-gray-100'
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
            <div className={`overflow-hidden rounded-xl shadow-sm ${profileData.currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${profileData.currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <h2 className={`text-sm font-medium ${profileData.currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                  Appearance
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleUpdate('theme', 'light')}
                    className={`p-4 rounded-lg border transition-colors ${
                      profileData.theme === 'light'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : profileData.currentTheme === 'dark'
                        ? 'border-gray-700 hover:border-gray-600 text-gray-400'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FaSun className="w-5 h-5" />
                      <span className="text-sm font-medium">Light</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleUpdate('theme', 'dark')}
                    className={`p-4 rounded-lg border transition-colors ${
                      profileData.theme === 'dark'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : profileData.currentTheme === 'dark'
                        ? 'border-gray-700 hover:border-gray-600 text-gray-400'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FaMoon className="w-5 h-5" />
                      <span className="text-sm font-medium">Dark</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleUpdate('theme', 'system')}
                    className={`p-4 rounded-lg border transition-colors ${
                      profileData.theme === 'system'
                        ? profileData.currentTheme === 'dark'
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-green-500 bg-green-50 text-green-700'
                        : profileData.currentTheme === 'dark'
                        ? 'border-gray-700 hover:border-gray-600 text-gray-400'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 16a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-sm font-medium">System</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Data Management Section */}
            <div className={`overflow-hidden rounded-xl shadow-sm ${profileData.currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${profileData.currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <h2 className={`text-sm font-medium ${profileData.currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                  Data Management
                </h2>
              </div>
              <div className={`divide-y ${profileData.currentTheme === 'dark' ? 'divide-gray-700/50' : 'divide-gray-100'}`}>
                {/* Reset Reading History */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className={`text-sm font-medium mb-1 ${profileData.currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        Reset Reading History
                      </h3>
                      <p className={`text-sm ${profileData.currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Remove all your finished articles history and reset reading stats. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={handleResetReadingHistory}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        profileData.currentTheme === 'dark'
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
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
                      <h3 className={`text-sm font-medium mb-1 ${profileData.currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        Reset Saved Articles
                      </h3>
                      <p className={`text-sm ${profileData.currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Remove all your saved articles. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={handleResetSavedArticles}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        profileData.currentTheme === 'dark'
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      Reset Saved Articles
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="px-6 py-4">
                    <p className={`text-sm ${profileData.currentTheme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
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
                  profileData.currentTheme === 'dark'
                    ? 'text-red-400 hover:bg-gray-800'
                    : 'text-red-600 hover:bg-gray-100'
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