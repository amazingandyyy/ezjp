'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';

const ChangelogPage = () => {
  const { profile, user } = useAuth();
  const [changelog, setChangelog] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = profile?.theme || 'light';
  const [activeTab, setActiveTab] = useState('changelog');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState({ title: '', description: '' });
  const [showNewSuggestionForm, setShowNewSuggestionForm] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState(null);

  // Fetch suggestions
  useEffect(() => {
    if (activeTab === 'suggestions') {
      fetchSuggestions();
    }
  }, [activeTab]);

  const fetchSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const { data, error } = await supabase
        .from('suggestions')
        .select(`
          *,
          profiles (
            username,
            avatar_url
          ),
          suggestion_votes (
            user_id
          )
        `)
        .order('votes_count', { ascending: false });

      if (error) throw error;
      setSuggestions(data);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleVote = async (suggestionId, hasVoted) => {
    if (!user) return;

    try {
      if (hasVoted) {
        await supabase
          .from('suggestion_votes')
          .delete()
          .match({ suggestion_id: suggestionId, user_id: user.id });
      } else {
        await supabase
          .from('suggestion_votes')
          .insert({ suggestion_id: suggestionId, user_id: user.id });
      }
      fetchSuggestions();
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleSubmitSuggestion = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingSuggestion) {
        const { error } = await supabase
          .from('suggestions')
          .update({
            title: newSuggestion.title,
            description: newSuggestion.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSuggestion.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('suggestions')
          .insert({
            title: newSuggestion.title,
            description: newSuggestion.description,
            user_id: user.id
          });

        if (error) throw error;
      }
      setNewSuggestion({ title: '', description: '' });
      setShowNewSuggestionForm(false);
      setEditingSuggestion(null);
      fetchSuggestions();
    } catch (err) {
      console.error('Error submitting suggestion:', err);
    }
  };

  const handleEditSuggestion = (suggestion) => {
    if (suggestion.votes_count > 2) {
      // Could add a toast notification here if you have a notification system
      console.warn('Cannot edit suggestions with more than 2 votes');
      return;
    }
    setNewSuggestion({
      title: suggestion.title,
      description: suggestion.description
    });
    setEditingSuggestion(suggestion);
    setShowNewSuggestionForm(true);
  };

  const handleCancelEdit = () => {
    setNewSuggestion({ title: '', description: '' });
    setShowNewSuggestionForm(false);
    setEditingSuggestion(null);
  };

  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const response = await fetch('https://raw.githubusercontent.com/amazingandyyy/ezjp/refs/heads/main/CHANGELOG.md');
        if (!response.ok) throw new Error('Failed to fetch changelog');
        const text = await response.text();
        setChangelog(text);
      } catch (err) {
        console.error('Error fetching changelog:', err);
        setError('Failed to load changelog. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchChangelog();
  }, []);

  // Helper function to parse markdown links into JSX
  const parseMarkdownLinks = (text) => {
    const parts = [];
    let lastIndex = 0;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the link
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-purple-500 hover:underline ${
            theme === 'dark' ? 'hover:text-purple-400' : 'hover:text-purple-600'
          }`}
        >
          {match[1]}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  // Function to parse and format version sections
  const formatChangelog = (content) => {
    if (!content) return [];

    const sections = content.split(/(?=# \[\d+\.\d+\.\d+\])/);
    return sections.filter(Boolean).map(section => {
      const versionMatch = section.match(/# \[(\d+\.\d+\.\d+)\]/);
      const version = versionMatch ? versionMatch[1] : '';
      
      // Extract date - format is (YYYY-MM-DD)
      const dateMatch = section.match(/\((\d{4}-\d{2}-\d{2})\)/);
      const date = dateMatch ? dateMatch[1] : '';

      // Split content into features and fixes
      const features = [];
      const fixes = [];
      
      section.split('\n').forEach(line => {
        if (line.startsWith('* ')) {
          const item = line.replace('* ', '').trim();
          if (section.includes('### Features') && !section.includes('### Bug Fixes')) {
            features.push(item);
          } else if (section.includes('### Bug Fixes')) {
            fixes.push(item);
          }
        }
      });

      return {
        version,
        date,
        features,
        fixes
      };
    });
  };

  const parsedChangelog = formatChangelog(changelog);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[rgb(19,31,36)]' : 'bg-gray-50'}`}>
      <div className={`sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-[rgb(19,31,36)]/70 border-b ${
        theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <Navbar theme={theme} hideNewsListButton={true} />
      </div>
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="mb-12 sm:mb-16">
          <h1 className={`text-3xl sm:text-4xl font-bold mb-3 tracking-tight ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Changelog
          </h1>
          <p className={`text-base sm:text-lg max-w-2xl ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Track all the updates and improvements to EZJP
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('changelog')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === 'changelog'
                  ? theme === 'dark'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-purple-500 text-purple-600'
                  : theme === 'dark'
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Changelog
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === 'suggestions'
                  ? theme === 'dark'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-purple-500 text-purple-600'
                  : theme === 'dark'
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Suggestions
            </button>
          </div>
        </div>

        {activeTab === 'changelog' ? (
          // Existing changelog content
          loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className={`w-7 h-7 border-2 rounded-full animate-spin ${
                theme === 'dark' ? 'border-purple-400 border-t-transparent' : 'border-purple-600 border-t-transparent'
              }`} />
              <p className={`mt-3 text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading changelog...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className={`p-3 rounded-lg ${
                theme === 'dark' ? 'bg-red-900/30 text-red-200' : 'bg-red-50 text-red-600'
              }`}>
                <p className="flex items-center text-base">
                  <span className="mr-2">⚠️</span>
                  {error}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative space-y-0">
              {/* Main timeline line */}
              <div className={`absolute left-[15px] sm:left-[19px] top-0 bottom-0 w-[2px] ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
              }`} />
              
              {parsedChangelog.map((release, index) => (
                <div 
                  key={index}
                  className="relative pl-8 sm:pl-10 pb-10"
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-[11px] sm:left-[15px] top-[29px] w-[10px] h-[10px] sm:w-[12px] sm:h-[12px] rounded-full border-[2.5px] ${
                    theme === 'dark' 
                      ? 'bg-[rgb(19,31,36)] border-gray-600' 
                      : 'bg-white border-gray-300'
                  }`} />

                  {/* Date label */}
                  <time className={`block text-xs sm:text-sm mb-2 font-medium tracking-wide ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {new Date(release.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>

                  <div className={`space-y-4 ${
                    theme === 'dark' ? 'bg-gray-800/20' : 'bg-white'
                  } px-5 py-4 sm:px-6 sm:py-5 rounded-xl border ${
                    theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                  } shadow-sm`}>
                    {/* Version header */}
                    <div>
                      <a 
                        href={`https://github.com/amazingandyyy/ezjp/releases/tag/v${release.version}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group text-lg sm:text-xl font-bold tracking-tight transition-colors duration-200 ${
                          theme === 'dark' ? 'text-gray-100 hover:text-purple-400' : 'text-gray-900 hover:text-purple-600'
                        }`}
                      >
                        Version {release.version}
                        <span className="inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          →
                        </span>
                      </a>
                    </div>

                    {/* Features */}
                    {release.features.length > 0 && (
                      <div className="space-y-3">
                        <h3 className={`text-sm font-semibold tracking-wide uppercase flex items-center ${
                          theme === 'dark' ? 'text-green-400/90' : 'text-green-600/90'
                        }`}>
                          <span className="mr-2">✨</span>
                          Features
                        </h3>
                        <ul className="space-y-2.5">
                          {release.features.map((feature, i) => (
                            <li 
                              key={i}
                              className={`text-base sm:text-lg pl-4 relative group leading-relaxed ${
                                theme === 'dark' ? 'text-gray-300 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                              } transition-colors duration-200`}
                            >
                              <span className={`absolute left-0 top-[0.4em] w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                                theme === 'dark' ? 'bg-gray-600 group-hover:bg-gray-500' : 'bg-gray-300 group-hover:bg-gray-400'
                              }`} />
                              {parseMarkdownLinks(feature)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Bug Fixes */}
                    {release.fixes.length > 0 && (
                      <div className="space-y-3">
                        <h3 className={`text-sm font-semibold tracking-wide uppercase flex items-center ${
                          theme === 'dark' ? 'text-blue-400/90' : 'text-blue-600/90'
                        }`}>
                          <span className="mr-2">🐛</span>
                          Bug Fixes
                        </h3>
                        <ul className="space-y-2.5">
                          {release.fixes.map((fix, i) => (
                            <li 
                              key={i}
                              className={`text-base sm:text-lg pl-4 relative group leading-relaxed ${
                                theme === 'dark' ? 'text-gray-300 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                              } transition-colors duration-200`}
                            >
                              <span className={`absolute left-0 top-[0.4em] w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                                theme === 'dark' ? 'bg-gray-600 group-hover:bg-gray-500' : 'bg-gray-300 group-hover:bg-gray-400'
                              }`} />
                              {parseMarkdownLinks(fix)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Suggestions content
          <div className="space-y-6">
            {/* New suggestion button */}
            {user ? (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowNewSuggestionForm(true)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'bg-purple-500 hover:bg-purple-600 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  New Suggestion
                </button>
              </div>
            ) : (
              <div className={`p-4 rounded-lg text-sm ${
                theme === 'dark' ? 'bg-gray-800/50 text-gray-300' : 'bg-gray-50 text-gray-600'
              }`}>
                Please sign in to submit suggestions and vote.
              </div>
            )}

            {/* New suggestion form */}
            {showNewSuggestionForm && (
              <div className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <form onSubmit={handleSubmitSuggestion} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={newSuggestion.title}
                      onChange={(e) => setNewSuggestion(prev => ({ ...prev, title: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-900/50 border-gray-700 text-gray-200'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Description
                    </label>
                    <textarea
                      value={newSuggestion.description}
                      onChange={(e) => setNewSuggestion(prev => ({ ...prev, description: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-900/50 border-gray-700 text-gray-200'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                        theme === 'dark'
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                        theme === 'dark'
                          ? 'bg-purple-500 hover:bg-purple-600 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {editingSuggestion ? 'Update' : 'Submit'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Suggestions list */}
            {loadingSuggestions ? (
              <div className="flex justify-center py-12">
                <div className={`w-7 h-7 border-2 rounded-full animate-spin ${
                  theme === 'dark' ? 'border-purple-400 border-t-transparent' : 'border-purple-600 border-t-transparent'
                }`} />
              </div>
            ) : suggestions.length === 0 ? (
              <div className={`text-center py-12 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No suggestions yet. Be the first to suggest a feature!
              </div>
            ) : (
              <div className="space-y-4">
                {suggestions.map((suggestion) => {
                  const hasVoted = suggestion.suggestion_votes.some(vote => vote.user_id === user?.id);
                  const canEdit = user?.id === suggestion.user_id && suggestion.votes_count <= 2;
                  return (
                    <div
                      key={suggestion.id}
                      className={`p-4 rounded-lg border ${
                        theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => handleVote(suggestion.id, hasVoted)}
                          disabled={!user}
                          className={`flex flex-col items-center px-2 py-1 rounded transition-colors duration-200 ${
                            hasVoted
                              ? theme === 'dark'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-purple-100 text-purple-600'
                              : theme === 'dark'
                                ? 'bg-gray-900/50 text-gray-400 hover:text-purple-400'
                                : 'bg-gray-50 text-gray-500 hover:text-purple-600'
                          }`}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                          <span className="text-sm font-medium">{suggestion.votes_count}</span>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className={`text-base font-medium ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                            }`}>
                              {suggestion.title}
                            </h3>
                            {canEdit && (
                              <button
                                onClick={() => handleEditSuggestion(suggestion)}
                                className={`shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}
                                title={suggestion.votes_count > 2 ? "Can't edit suggestions with more than 2 votes" : "Edit suggestion"}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <p className={`mt-1 text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {suggestion.description}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className={`text-xs ${
                              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              Suggested by {suggestion.profiles.username}
                            </div>
                            <span className={`text-xs ${
                              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                            }`}>•</span>
                            <div className={`text-xs ${
                              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {new Date(suggestion.created_at).toLocaleDateString()}
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              suggestion.status === 'open'
                                ? theme === 'dark'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-green-100 text-green-600'
                                : suggestion.status === 'in_progress'
                                  ? theme === 'dark'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-blue-100 text-blue-600'
                                  : theme === 'dark'
                                    ? 'bg-gray-800 text-gray-400'
                                    : 'bg-gray-100 text-gray-600'
                            }`}>
                              {suggestion.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ChangelogPage; 