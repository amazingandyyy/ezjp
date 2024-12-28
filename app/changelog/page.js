'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaCheck, FaSpinner, FaHourglassHalf } from 'react-icons/fa';

const ChangelogPage = () => {
  const { profile, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [changelog, setChangelog] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = profile?.theme || 'light';
  const [activeTab, setActiveTab] = useState(searchParams.get('section') === 'suggestions' ? 'suggestions' : 'changelog');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState({ title: '', description: '' });
  const [showNewSuggestionForm, setShowNewSuggestionForm] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const userLevel = profile?.level || 0;
  const canManageSuggestions = userLevel >= 10;

  // Handle voting
  const handleVote = async (suggestionId, hasVoted) => {
    if (!user) return;

    try {
      if (hasVoted) {
        // Remove vote
        await supabase
          .from('suggestion_votes')
          .delete()
          .eq('suggestion_id', suggestionId)
          .eq('user_id', user.id);
      } else {
        // Add vote
        await supabase
          .from('suggestion_votes')
          .insert([{ suggestion_id: suggestionId, user_id: user.id }]);
      }

      // Refresh suggestions to update vote count
      fetchSuggestions();
    } catch (err) {
      console.error('Error handling vote:', err);
    }
  };

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update URL without refreshing the page
    const url = new URL(window.location);
    if (tab === 'suggestions') {
      url.searchParams.set('section', 'suggestions');
    } else {
      url.searchParams.delete('section');
    }
    router.replace(url.pathname + url.search);
  };

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

  // Add function to handle status update
  const handleStatusUpdate = async (suggestionId, newStatus) => {
    if (!canManageSuggestions) return;

    try {
      const { error } = await supabase
        .from('suggestions')
        .update({ status: newStatus })
        .eq('id', suggestionId);

      if (error) throw error;
      fetchSuggestions();
    } catch (err) {
      console.error('Error updating suggestion status:', err);
    }
  };

  // Update the suggestions rendering to include status controls for high level users
  const renderSuggestionStatus = (suggestion) => {
    const statusColors = {
      pending: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
      in_progress: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600',
      done: theme === 'dark' ? 'text-green-400' : 'text-green-600'
    };

    const statusIcons = {
      pending: <FaHourglassHalf className="w-4 h-4" />,
      in_progress: <FaSpinner className="w-4 h-4" />,
      done: <FaCheck className="w-4 h-4" />
    };

    if (canManageSuggestions) {
      return (
        <div className="flex items-center gap-2">
          <select
            value={suggestion.status}
            onChange={(e) => handleStatusUpdate(suggestion.id, e.target.value)}
            className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700 text-gray-200' 
                : 'bg-white border-gray-200 text-gray-700'
            } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${statusColors[suggestion.status]}`}>
        {statusIcons[suggestion.status]}
        <span>{suggestion.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
      </div>
    );
  };

  // Add function to get suggestion stats
  const getSuggestionStats = () => {
    const stats = {
      pending: suggestions.filter(s => s.status === 'pending').length,
      in_progress: suggestions.filter(s => s.status === 'in_progress').length,
      done: suggestions.filter(s => s.status === 'done').length
    };
    return stats;
  };

  // Update the suggestions list rendering
  const renderSuggestions = () => {
    if (loadingSuggestions) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className={`w-7 h-7 border-2 rounded-full animate-spin ${
            theme === 'dark' ? 'border-purple-400 border-t-transparent' : 'border-purple-600 border-t-transparent'
          }`} />
          <p className={`mt-3 text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading suggestions...
          </p>
        </div>
      );
    }

    const stats = getSuggestionStats();

    return (
      <div className="space-y-6">
        {/* Stats section */}
        <div className="flex flex-wrap gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            theme === 'dark' ? 'bg-gray-800/80' : 'bg-gray-100'
          }`}>
            <FaHourglassHalf className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {stats.pending} Pending
            </span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50'
          }`}>
            <FaSpinner className={`w-4 h-4 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}>
              {stats.in_progress} In Progress
            </span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'
          }`}>
            <FaCheck className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
              {stats.done} Completed
            </span>
          </div>
        </div>

        {/* Suggestions list */}
        {suggestions.map((suggestion) => {
          const hasVoted = suggestion.suggestion_votes.some(vote => vote.user_id === user?.id);
          const isDone = suggestion.status === 'done';
          const isInProgress = suggestion.status === 'in_progress';
          
          return (
            <div
              key={suggestion.id}
              className={`p-6 rounded-xl ${
                isDone
                  ? theme === 'dark'
                    ? 'bg-green-900/20 border-green-800/30'
                    : 'bg-green-50 border-green-200/50'
                  : isInProgress
                    ? theme === 'dark'
                      ? 'bg-yellow-900/20 border-yellow-800/30'
                      : 'bg-yellow-50/80 border-yellow-200/50'
                    : theme === 'dark'
                      ? 'bg-gray-800/80 border border-gray-700/50'
                      : 'bg-white border border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Vote button */}
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
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                        {suggestion.title}
                      </h3>
                      {isDone && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          theme === 'dark'
                            ? 'bg-green-900/40 text-green-400'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          Completed
                        </span>
                      )}
                      {isInProgress && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          theme === 'dark'
                            ? 'bg-yellow-900/40 text-yellow-400'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          In Progress
                        </span>
                      )}
                    </div>
                    {renderSuggestionStatus(suggestion)}
                  </div>
                  <p className={`mt-2 text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {suggestion.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      Suggested by {suggestion.profiles.username}
                    </div>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>•</span>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(suggestion.created_at).toLocaleDateString()}
                    </div>
                    {suggestion.user_id === user?.id && suggestion.votes_count <= 2 && (
                      <>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>•</span>
                        <button
                          onClick={() => handleEditSuggestion(suggestion)}
                          className={`text-xs ${
                            theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
                          }`}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[rgb(19,31,36)]' : 'bg-gray-50'}`}>
      <div className={`sticky top-0 z-50 ${
        theme === 'dark' ? 'bg-[rgb(19,31,36)] border-gray-800' : 'bg-white border-gray-200'
      } border-b`}>
        <Navbar theme={theme} hideNewsListButton={true} />
      </div>
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="mb-12 sm:mb-16">
          <h1 className={`text-3xl sm:text-4xl font-bold mb-3 tracking-tight ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Changelog & Suggestions
          </h1>
          <p className={`text-base sm:text-lg max-w-2xl ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Track updates and improvements to EZJP. Have an idea? Switch to the suggestions tab to share your thoughts!
          </p>
        </div>

        {/* Tabs */}
        <nav className={`sticky top-16 -mx-4 px-4 py-3 mb-10 z-10 backdrop-blur-md ${
          theme === 'dark'
            ? 'bg-[rgb(19,31,36)]/90 border-b border-gray-800/50'
            : 'bg-gray-50/90 border-b border-gray-200/50'
        }`}>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => handleTabChange('changelog')}
              className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap text-sm font-medium transition-all duration-200 ${
                activeTab === 'changelog'
                  ? theme === 'dark'
                    ? 'text-white'
                    : 'text-gray-900'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className={`w-4 h-4 transition-colors ${
                activeTab === 'changelog'
                  ? theme === 'dark'
                    ? 'text-white'
                    : 'text-gray-900'
                  : 'text-current'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Changelog
            </button>
            <button
              onClick={() => handleTabChange('suggestions')}
              className={`flex items-center gap-2 px-4 py-2 rounded whitespace-nowrap text-sm font-medium transition-all duration-200 ${
                activeTab === 'suggestions'
                  ? theme === 'dark'
                    ? 'text-white'
                    : 'text-gray-900'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className={`w-4 h-4 transition-colors ${
                activeTab === 'suggestions'
                  ? theme === 'dark'
                    ? 'text-white'
                    : 'text-gray-900'
                  : 'text-current'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Suggestions
            </button>
          </div>
        </nav>

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
            {renderSuggestions()}
          </div>
        )}
      </main>
    </div>
  );
};

export default ChangelogPage; 