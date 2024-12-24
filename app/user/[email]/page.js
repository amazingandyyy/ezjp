'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaHeart, FaBook, FaClock, FaEdit, FaCheck, FaTimes, FaUser, FaEgg } from 'react-icons/fa';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthContext';

// Helper function to format time duration
const formatDuration = (minutes) => {
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours} hour${hours > 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${remainingMinutes} min` : ''}`;
};

// Helper function to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  if (diffDays === 0) {
    return ['Today at ' + timeStr, '- saved news'];
  } else if (diffDays === 1) {
    return ['Yesterday at ' + timeStr, '- saved news'];
  } else if (diffDays < 7) {
    return [`${diffDays} days ago at ${timeStr}`, '- saved news'];
  } else {
    return [
      date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      }) + ' at ' + timeStr,
      '- saved news'
    ];
  }
};

export default function UserProfile() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, updateProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [savedNews, setSavedNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('light');
  const [stats, setStats] = useState({
    totalReadingTime: 0,
    totalArticlesRead: 0,
    totalSavedArticles: 0
  });

  // Add new state for username editing
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
          setError(profileError.message);
          return;
        }
        if (!profiles) {
          setError('User not found');
          return;
        }

        setProfile(profiles);
        setTheme(profiles.theme || 'light');

        // If viewing by email and user has a username, redirect to username URL
        if (identifier.includes('@') && profiles.username) {
          router.replace(`/user/${profiles.username}`);
          return;
        }

        // Fetch user's saved news
        const { data: saved, error: savedError } = await supabase
          .from('saved_news')
          .select('*')
          .eq('user_id', profiles.id)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (savedError) {
          console.error('Error fetching saved news:', savedError);
          return;
        }

        // Fetch user's reading stats
        const { data: readingStats, error: statsError } = await supabase
          .from('reading_stats')
          .select('total_reading_time, total_articles_read')
          .eq('user_id', profiles.id)
          .maybeSingle();

        if (!isMounted) return;

        if (statsError && statsError.code !== 'PGRST116') {
          console.error('Error fetching reading stats:', statsError);
        }

        setSavedNews(saved || []);
        setStats({
          totalReadingTime: readingStats?.total_reading_time || 0,
          totalArticlesRead: readingStats?.total_articles_read || 0,
          totalSavedArticles: saved?.length || 0
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching user profile:', error);
        setError(error.message);
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
  }, [params.email, router]);

  // Add function to validate username
  const validateUsername = (username) => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Username can only contain letters, numbers, underscores, and hyphens';
    return '';
  };

  // Add function to check username availability
  const checkUsernameAvailability = async (username) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', profile.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No data found means username is available
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  };

  // Add function to handle username save
  const handleSaveUsername = async () => {
    try {
      setUsernameError('');
      setIsSaving(true);

      // Validate username
      const validationError = validateUsername(newUsername);
      if (validationError) {
        setUsernameError(validationError);
        return;
      }

      // Check availability
      const isAvailable = await checkUsernameAvailability(newUsername);
      if (!isAvailable) {
        setUsernameError('Username is already taken');
        return;
      }

      // Update profile
      await updateProfile({
        username: newUsername
      });

      // Update local state
      setProfile(prev => ({ ...prev, username: newUsername }));
      setIsEditingUsername(false);

      // Redirect to new username URL
      router.replace(`/user/${newUsername}`);
    } catch (error) {
      console.error('Error saving username:', error);
      setUsernameError('Failed to save username');
    } finally {
      setIsSaving(false);
    }
  };

  // Add function to start editing username
  const startEditingUsername = () => {
    setNewUsername(profile.username || '');
    setUsernameError('');
    setIsEditingUsername(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const RubyText = ({ kanji, reading, showReading = true }) => (
    <ruby className="group">
      {kanji}
      <rt className={`${showReading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        {reading}
      </rt>
    </ruby>
  );

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
              kanji={part.kanji}
              reading={part.reading}
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
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto p-4 pt-24 pb-32">
        <div className="max-w-4xl mx-auto">
          {/* Profile header */}
          <div className={`mb-8 p-8 rounded-2xl shadow-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${
                theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                {profile?.username?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                {isEditingUsername && currentUser?.id === profile?.id ? (
                  <div className="space-y-2">
                    <div className={`flex items-center gap-2 ${
                      theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Enter username"
                        className={`text-3xl font-bold px-2 py-0.5 rounded focus:outline-none ${
                          theme === 'dark' 
                            ? 'bg-gray-700/50 placeholder-gray-600 focus:bg-gray-700' 
                            : 'bg-gray-100/50 placeholder-gray-400 focus:bg-gray-100'
                        }`}
                        disabled={isSaving}
                      />
                      <button
                        onClick={handleSaveUsername}
                        disabled={isSaving}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-gray-700 text-green-400 hover:text-green-300'
                            : 'hover:bg-gray-100 text-green-600 hover:text-green-700'
                        } disabled:opacity-50`}
                        title="Save username"
                      >
                        <FaCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsEditingUsername(false)}
                        disabled={isSaving}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-gray-700 text-red-400 hover:text-red-300'
                            : 'hover:bg-gray-100 text-red-600 hover:text-red-700'
                        } disabled:opacity-50`}
                        title="Cancel"
                      >
                        <FaTimes className="w-4 h-4" />
                      </button>
                    </div>
                    {usernameError && (
                      <p className="text-sm text-red-500">{usernameError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className={`text-3xl font-bold ${
                      theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {profile?.username || 'Anonymous User'}
                    </h1>
                    {currentUser?.id === profile?.id && (
                      <button
                        onClick={startEditingUsername}
                        className={`p-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                        title="Edit username"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                <p className={`mt-1 text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Joined {new Date(profile?.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Stats Section */}
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8 pt-8 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`p-4 rounded-xl ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className={`text-2xl sm:text-3xl font-bold mb-1 ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {stats.totalArticlesRead}
                </div>
                <div className={`text-sm flex items-center gap-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <FaBook className="w-4 h-4" />
                  Articles Read
                </div>
              </div>
              <div className={`p-4 rounded-xl ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className={`text-2xl sm:text-3xl font-bold mb-1 ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {formatDuration(stats.totalReadingTime)}
                </div>
                <div className={`text-sm flex items-center gap-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <FaClock className="w-4 h-4" />
                  Total Reading Time
                </div>
              </div>
              <div className={`p-4 rounded-xl ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className={`text-2xl sm:text-3xl font-bold mb-1 ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {stats.totalSavedArticles}
                </div>
                <div className={`text-sm flex items-center gap-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <FaHeart className="w-4 h-4" />
                  Saved Articles
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-2xl font-bold mb-6 ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Activity
          </h2>

          <div className="relative">
            {/* Timeline line */}
            <div className={`absolute left-0 top-0 bottom-0 w-px ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
            }`} />

            <div className="space-y-6">
              {/* Saved news items */}
              {savedNews.map((article) => (
                <div key={article.id} className="relative flex gap-4">
                  {/* Timeline dot and date */}
                  <div className="relative">
                    <div className={`absolute left-0 top-6 w-3 h-3 -ml-1.5 rounded-full border-2 ${
                      theme === 'dark' ? 'border-gray-800' : 'border-white'
                    } bg-red-500`} />
                    <div className={`pl-4 text-sm whitespace-nowrap ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatDate(article.created_at).map((text, i) => (
                        <div key={i} className={i === 1 ? 'text-xs opacity-75 flex items-center gap-1' : ''}>
                          {text}
                          {i === 1 && <FaHeart className="w-3 h-3 text-red-500" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Article content */}
                  <button
                    onClick={() => router.push(`/read?source=${encodeURIComponent(article.url)}`)}
                    className={`flex-1 ml-4 p-4 rounded-lg transition-opacity duration-200 hover:opacity-70`}
                  >
                    <div className="flex gap-4">
                      {article.image && (
                        <div className="hidden sm:block w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                          <img
                            src={article.image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-medium mb-2 text-left ${
                          theme === 'dark' 
                            ? 'text-gray-100' 
                            : 'text-gray-900'
                        }`}>
                          {(() => {
                            try {
                              const parsedTitle = typeof article.title === 'string' 
                                ? JSON.parse(article.title)
                                : article.title;
                              
                              return Array.isArray(parsedTitle)
                                ? processForDisplay(parsedTitle).map((part, i) => {
                                    if (part.type === "ruby") {
                                      return (
                                        <RubyText
                                          key={i}
                                          kanji={part.kanji}
                                          reading={part.reading}
                                          showReading={true}
                                        />
                                      );
                                    }
                                    return <span key={i}>{part.content}</span>;
                                  })
                                : parsedTitle || 'Untitled Article';
                            } catch (e) {
                              return article.title || 'Untitled Article';
                            }
                          })()}
                        </h3>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>{article.date}</p>
                          {article.reading_time > 0 && (
                            <div className={`flex items-center gap-2 text-sm ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              <FaClock className="w-3.5 h-3.5" />
                              <span>Read for {formatDuration(article.reading_time)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              ))}

              {/* Joined timeline item */}
              <div className="relative flex gap-4">
                <div className="relative">
                  <div className={`absolute left-0 top-6 w-3 h-3 -ml-1.5 rounded-full border-2 ${
                    theme === 'dark' ? 'border-gray-800 bg-gray-600' : 'border-white bg-gray-400'
                  }`} />
                  <div className={`pl-4 text-sm whitespace-nowrap ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {(() => {
                      const date = new Date(profile?.created_at);
                      return [
                        date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        }) + ' at ' + date.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        }),
                        '- joined Easy JP News as Reader'
                      ];
                    })().map((text, i) => (
                      <div key={i} className={i === 1 ? 'text-xs opacity-75 flex items-center gap-1' : ''}>
                        {text}
                        {i === 1 && <FaEgg className="w-3 h-3" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 ml-4" />
              </div>

              {savedNews.length === 0 && (
                <div className={`text-center py-12 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <FaHeart className={`w-12 h-12 mx-auto mb-4 ${
                    theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <p>No saved articles yet</p>
                  <p className="text-sm mt-2">Articles you save will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 