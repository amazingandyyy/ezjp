'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSun, FaMoon, FaUser, FaCheck, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import Navbar from '../components/Navbar';

export default function Settings() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) {
        router.push('/');
        return;
      }

      try {
        setIsLoading(true);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, theme')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (profile) {
          setUsername(profile.username || '');
          setTheme(profile.theme || 'light');
          setEditedUsername(profile.username || '');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user, router]);

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
          <div className="flex items-center justify-between mb-8">
            <h1 className={`pl-2 text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
              Settings
            </h1>
            {showSuccess && (
              <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                <FaCheckCircle className="w-4 h-4" />
                <span>Saved</span>
              </div>
            )}
          </div>

          {/* Settings Sections */}
          <div className="space-y-6">
            {/* Username Section */}
            <div className={`p-6 rounded-xl shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
                Username
              </h2>
              <div className="space-y-4">
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedUsername}
                      onChange={(e) => setEditedUsername(e.target.value)}
                      className={`flex-1 px-3 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-gray-100'
                          : 'bg-white border-gray-200 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Enter username"
                    />
                    <button
                      onClick={handleUsernameSubmit}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'text-green-400 hover:bg-gray-700'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      <FaCheck className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingUsername(false);
                        setEditedUsername(username);
                        setError(null);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'text-red-400 hover:bg-gray-700'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <FaTimes className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      <FaUser className="w-5 h-5 text-gray-400" />
                      <span>{username || 'No username set'}</span>
                    </div>
                    <button
                      onClick={() => setIsEditingUsername(true)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'text-blue-400 hover:bg-gray-700'
                          : 'text-blue-600 hover:bg-gray-100'
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
            </div>

            {/* Theme Section */}
            <div className={`p-6 rounded-xl shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-[rgb(19,31,36)]'}`}>
                Appearance
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : theme === 'dark'
                      ? 'border-gray-700 hover:border-gray-600 text-gray-400'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FaSun className="w-6 h-6" />
                    <span className="text-sm font-medium">Light</span>
                  </div>
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : theme === 'dark'
                      ? 'border-gray-700 hover:border-gray-600 text-gray-400'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FaMoon className="w-6 h-6" />
                    <span className="text-sm font-medium">Dark</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="flex justify-end">
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