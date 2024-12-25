'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSun, FaMoon, FaUser, FaCheck, FaTimes, FaCheckCircle, FaIdBadge } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import Navbar from '../components/Navbar';

export default function Settings() {
  const router = useRouter();
  const { user, signOut, authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selfIntro, setSelfIntro] = useState('');
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [editedIntro, setEditedIntro] = useState('');
  const [japaneseLevel, setJapaneseLevel] = useState('');
  const [duolingoUsername, setDuolingoUsername] = useState('');
  const [isEditingDuolingo, setIsEditingDuolingo] = useState(false);
  const [editedDuolingoUsername, setEditedDuolingoUsername] = useState('');

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (authLoading) return;
      
      if (!user?.id) {
        router.replace('/');
        return;
      }

      try {
        setIsLoading(true);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, theme, self_introduction, japanese_level, duolingo_username')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (profile) {
          setUsername(profile.username || '');
          setTheme(profile.theme || 'light');
          setEditedUsername(profile.username || '');
          setSelfIntro(profile.self_introduction || '');
          setEditedIntro(profile.self_introduction || '');
          setJapaneseLevel(profile.japanese_level || '');
          setDuolingoUsername(profile.duolingo_username || '');
          setEditedDuolingoUsername(profile.duolingo_username || '');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user, router, authLoading]);

  // Update theme
  const handleThemeChange = async (newTheme) => {
    try {
      setTheme(newTheme);
      const { error } = await supabase
        .from('profiles')
        .update({ theme: newTheme })
        .eq('id', user.id);

      if (error) throw error;

      // Show subtle success indicator
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  // Update username
  const handleUsernameSubmit = async () => {
    if (!editedUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: editedUsername.trim() })
        .eq('id', user.id);

      if (error) throw error;

      setUsername(editedUsername.trim());
      setIsEditingUsername(false);
      
      // Show subtle success indicator
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating username:', error);
      setError('Failed to update username');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Update Japanese level
  const handleJapaneseLevelChange = async (newLevel) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ japanese_level: newLevel })
        .eq('id', user.id);

      if (error) throw error;

      setJapaneseLevel(newLevel);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error updating Japanese level:', error);
      setError('Failed to update Japanese level');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Update self introduction
  const handleIntroSubmit = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ self_introduction: editedIntro.trim() })
        .eq('id', user.id);

      if (error) throw error;

      setSelfIntro(editedIntro.trim());
      setIsEditingIntro(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error updating self introduction:', error);
      setError('Failed to update self introduction');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Update Duolingo username
  const handleDuolingoSubmit = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ duolingo_username: editedDuolingoUsername.trim() })
        .eq('id', user.id);

      if (error) throw error;

      setDuolingoUsername(editedDuolingoUsername.trim());
      setIsEditingDuolingo(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error updating Duolingo username:', error);
      setError('Failed to update Duolingo username');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Don't show loading spinner if we're not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[rgb(19,31,36)]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[rgb(19,31,36)]"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[rgb(19,31,36)]' : 'bg-gray-50'}`}>
      <Navbar theme={theme} />
      
      <div className="container mx-auto p-4 pt-24 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
              Account Settings
            </h1>
            {showSuccess && (
              <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                <FaCheckCircle className="w-4 h-4" />
                <span>Changes saved</span>
              </div>
            )}
          </div>

          {/* Settings Sections */}
          <div className="space-y-4">
            {/* Profile Section */}
            <div className={`overflow-hidden rounded-xl shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <h2 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                  Profile Information
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Username field */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Username
                  </label>
                  {isEditingUsername ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedUsername}
                        onChange={(e) => setEditedUsername(e.target.value)}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-200 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-green-500`}
                        placeholder="Enter username"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleUsernameSubmit}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            theme === 'dark'
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingUsername(false);
                            setEditedUsername(username);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            theme === 'dark'
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
                      <div className={`flex items-center gap-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{username || 'No username set'}</span>
                      </div>
                      <button
                        onClick={() => setIsEditingUsername(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  {error && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                      {error}
                    </p>
                  )}
                </div>

                {/* Japanese Level field */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Japanese Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['N5', 'N4', 'N3', 'N2', 'N1', 'Native'].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleJapaneseLevelChange(level)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          japaneseLevel === level
                            ? theme === 'dark'
                              ? 'bg-green-500/10 text-green-400 border border-green-500'
                              : 'bg-green-50 text-green-600 border border-green-500'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Self Introduction field */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Self Introduction
                  </label>
                  {isEditingIntro ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedIntro}
                        onChange={(e) => setEditedIntro(e.target.value)}
                        rows={4}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-200 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-green-500`}
                        placeholder="Write a brief introduction about yourself..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleIntroSubmit}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            theme === 'dark'
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingIntro(false);
                            setEditedIntro(selfIntro);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                      }`}>
                        <p className={`text-sm whitespace-pre-wrap ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {selfIntro || 'No introduction set'}
                        </p>
                      </div>
                      <button
                        onClick={() => setIsEditingIntro(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Duolingo Username field */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Duolingo Profile
                  </label>
                  {isEditingDuolingo ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedDuolingoUsername}
                        onChange={(e) => setEditedDuolingoUsername(e.target.value)}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-200 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-green-500`}
                        placeholder="Enter Duolingo username"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleDuolingoSubmit}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            theme === 'dark'
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingDuolingo(false);
                            setEditedDuolingoUsername(duolingoUsername);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            theme === 'dark'
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
                      <div className={`flex items-center gap-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.126 12.348c0 5.06-4.104 9.165-9.164 9.165-5.06 0-9.164-4.104-9.164-9.165 0-5.06 4.104-9.164 9.164-9.164 5.06 0 9.164 4.104 9.164 9.164z" fill="#58CC02"/>
                          <path d="M12.962 7.815c0 .662-.537 1.2-1.2 1.2-.662 0-1.2-.538-1.2-1.2 0-.663.538-1.2 1.2-1.2.663 0 1.2.537 1.2 1.2z" fill="white"/>
                          <path d="M15.586 12.348c0 1.457-1.182 2.639-2.639 2.639-1.457 0-2.639-1.182-2.639-2.639 0-1.457 1.182-2.639 2.639-2.639 1.457 0 2.639 1.182 2.639 2.639z" fill="white"/>
                          <path d="M12.947 13.486c-.625 0-1.133-.508-1.133-1.133 0-.625.508-1.133 1.133-1.133.625 0 1.133.508 1.133 1.133 0 .625-.508 1.133-1.133 1.133z" fill="#58CC02"/>
                          <path d="M9.338 7.815c0 .662-.538 1.2-1.2 1.2-.663 0-1.2-.538-1.2-1.2 0-.663.537-1.2 1.2-1.2.662 0 1.2.537 1.2 1.2z" fill="white"/>
                        </svg>
                        <span>{duolingoUsername || 'No Duolingo profile linked'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {duolingoUsername && (
                          <a
                            href={`https://www.duolingo.com/profile/${encodeURIComponent(duolingoUsername)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              theme === 'dark'
                                ? 'text-gray-300 hover:bg-gray-700'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            View Profile
                          </a>
                        )}
                        <button
                          onClick={() => setIsEditingDuolingo(true)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            theme === 'dark'
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
            <div className={`overflow-hidden rounded-xl shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <h2 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                  Appearance
                </h2>
              </div>
              <div className="p-6">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 p-4 rounded-lg border transition-colors ${
                      theme === 'light'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : theme === 'dark'
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
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 p-4 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : theme === 'dark'
                        ? 'border-gray-700 hover:border-gray-600 text-gray-400'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
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
            <div className={`overflow-hidden rounded-xl shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <h2 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                  Data Management
                </h2>
              </div>
              <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700/10' : 'divide-gray-100/50'}`}>
                {/* Reset Reading History */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        Reset Reading History
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Remove all your finished articles history. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm('Warning: You are about to delete all your reading history.\n\nThis includes:\n- All articles marked as finished\n- Your reading progress tracking\n\nThis action is PERMANENT and CANNOT be undone. Are you sure you want to proceed?')) {
                          const confirmText = 'reset reading history';
                          const userInput = window.prompt(`To confirm this irreversible action, please type "${confirmText}" below:`);
                          
                          if (userInput === confirmText) {
                            try {
                              const { error } = await supabase
                                .from('finished_articles')
                                .delete()
                                .eq('user_id', user.id);
                              
                              if (error) throw error;
                              
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
                          } else if (userInput !== null) {
                            setError('Text did not match. Reset cancelled.');
                            setTimeout(() => setError(''), 3000);
                          }
                        }
                      }}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      Reset Reading History
                    </button>
                  </div>
                </div>
                    {error}
                {/* Reset Saved Articles */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        Reset Saved Articles
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Remove all your saved articles. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm('Warning: You are about to delete all your saved articles.\n\nThis includes:\n- All articles you have saved for later\n- Your bookmarked articles\n\nThis action is PERMANENT and CANNOT be undone. Are you sure you want to proceed?')) {
                          const confirmText = 'reset saved articles';
                          const userInput = window.prompt(`To confirm this irreversible action, please type "${confirmText}" below:`);
                          
                          if (userInput === confirmText) {
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
                          } else if (userInput !== null) {
                            setError('Text did not match. Reset cancelled.');
                            setTimeout(() => setError(''), 3000);
                          }
                        }
                      }}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      Reset Saved Articles
                    </button>
                  </div>
                </div>
                {error && (
                  <p className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    {error}
                  </p>
                )}
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={signOut}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === 'dark'
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