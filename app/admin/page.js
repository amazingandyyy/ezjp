'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import Navbar from '@/app/components/Navbar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FaChartBar, FaUsers, FaNewspaper, FaMicrophone, FaPlay, FaExternalLinkAlt, FaFileAlt, FaDollarSign, FaChartLine, FaComments, FaClock } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Voice costs per character (Google Cloud TTS pricing)
const VOICE_COSTS = {
  'Standard': 0.000004,  // $4 per 1 million characters
  'Neural2': 0.000016,   // $16 per 1 million characters
  'Wavenet': 0.000016    // $16 per 1 million characters
};

// Add quota constants after VOICE_COSTS
const MONTHLY_QUOTA = {
  'Standard': 1000000,  // 1 million characters
  'Neural2': 300000,    // 300K characters
  'Wavenet': 300000     // 300K characters
};

// Add voice name mapping
const voiceNameMap = {
  // Standard voices
  "ja-JP-Standard-A": "Sakura (桜)", // Female
  "ja-JP-Standard-B": "Yumi (弓子)", // Female
  "ja-JP-Standard-C": "Nakayama (中山)", // Male
  "ja-JP-Standard-D": "Kenji (健二)", // Male
  // Neural2 voices
  "ja-JP-Neural2-B": "Hina (陽菜)", // Female
  "ja-JP-Neural2-C": "Takuya (拓也)", // Male
  "ja-JP-Neural2-D": "Mei (芽衣)", // Female
  // Wavenet voices
  "ja-JP-Wavenet-A": "Kaori (香織)", // Female
  "ja-JP-Wavenet-B": "Rin (凛)", // Female
  "ja-JP-Wavenet-C": "Daiki (大輝)", // Male
  "ja-JP-Wavenet-D": "Sora (空)", // Male
};

// Add gender mapping after voiceNameMap
const voiceGenderMap = {
  // Standard voices
  "ja-JP-Standard-A": "female",
  "ja-JP-Standard-B": "female",
  "ja-JP-Standard-C": "male",
  "ja-JP-Standard-D": "male",
  // Neural2 voices
  "ja-JP-Neural2-B": "female",
  "ja-JP-Neural2-C": "male",
  "ja-JP-Neural2-D": "female",
  // Wavenet voices
  "ja-JP-Wavenet-A": "female",
  "ja-JP-Wavenet-B": "female",
  "ja-JP-Wavenet-C": "male",
  "ja-JP-Wavenet-D": "male"
};

// Add color constants at the top
const COLORS = {
  light: {
    primary: '#2563EB',    // Blue 600
    secondary: '#4F46E5',  // Indigo 600
    success: '#059669',    // Emerald 600
    warning: '#D97706',    // Amber 600
    info: '#0284C7',       // Sky 600
    accent1: '#7C3AED',    // Violet 600
    accent2: '#DB2777',    // Pink 600
    charts: {
      primary: '#3B82F6',  // Blue 500
      secondary: '#6366F1', // Indigo 500
      success: '#10B981',  // Emerald 500
      accent1: '#8B5CF6',  // Violet 500
      accent2: '#EC4899',  // Pink 500
    }
  },
  dark: {
    primary: '#60A5FA',    // Blue 400 (brighter)
    secondary: '#818CF8',  // Indigo 400
    success: '#34D399',    // Emerald 400
    warning: '#FBBF24',    // Amber 400
    info: '#38BDF8',       // Sky 400
    accent1: '#A78BFA',    // Violet 400
    accent2: '#F472B6',    // Pink 400
    charts: {
      primary: '#93C5FD',  // Blue 300
      secondary: '#A5B4FC', // Indigo 300
      success: '#6EE7B7',  // Emerald 300
      accent1: '#C4B5FD',  // Violet 300
      accent2: '#F9A8D4',  // Pink 300
    }
  }
};

const ArticleIdWrapper = ({ articleId, showHeatmap = false, heatmapData = {}, maxPlays = 0, theme }) => {
  const router = useRouter();

  const handleClick = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('url')
        .eq('id', articleId)
        .single();

      if (error) {
        console.error('Error fetching article URL:', error);
        return;
      }

      if (data?.url) {
        window.location.href = `/read?source=${encodeURIComponent(data.url)}`;
      } else {
        console.error('No URL found for article:', articleId);
      }
    } catch (error) {
      console.error('Error handling click:', error);
    }
  };

  return (
    <div className="flex flex-col">
      <Link 
        href="#"
        onClick={handleClick}
        className={`group inline-flex items-center gap-1 ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
      >
        {articleId}
        <FaExternalLinkAlt className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
      </Link>
      {showHeatmap && (
        <div className="mt-2">
          <div className="flex gap-0.5 h-3">
            {Object.entries(heatmapData)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([index, count]) => {
                const intensity = Math.min((count / maxPlays) * 100, 100);
                return (
                  <div
                    key={index}
                    className="w-2 rounded-sm transition-all duration-200 hover:scale-y-110"
                    style={{ 
                      backgroundColor: theme === 'dark' 
                        ? `rgba(147, 197, 253, ${Math.max(intensity / 100, 0.15)})` // blue-300 with minimum opacity
                        : `rgba(59, 130, 246, ${Math.max(intensity / 100, 0.1)})`, // blue-500 with minimum opacity
                      height: '12px',
                      transform: 'translateY(0)',
                      cursor: 'pointer'
                    }}
                    title={`Sentence ${index}: ${count} plays`}
                  />
                );
              })}
          </div>
          
        </div>
      )}
    </div>
  );
};

const UserIdWrapper = ({ userId, theme }) => {
  const router = useRouter();

  const handleClick = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return;
      }

      if (data) {
        const profilePath = data.username || data.email;
        if (profilePath) {
          window.location.href = `/profile/${encodeURIComponent(profilePath)}`;
        } else {
          console.error('No username or email found for user:', userId);
        }
      } else {
        console.error('No user found for ID:', userId);
      }
    } catch (error) {
      console.error('Error handling click:', error);
    }
  };

  return (
    <div className="flex items-center">
      <FaUsers className={`mr-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
      {userId === 'anonymous' ? (
        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} italic`}>
          Anonymous User
        </span>
      ) : (
        <Link 
          href="#"
          onClick={handleClick}
          className={`group inline-flex items-center gap-1 ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
        >
          {userId}
          <FaExternalLinkAlt className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
        </Link>
      )}
    </div>
  );
};

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [ttsStats, setTtsStats] = useState(null);
  const [aiTutorStats, setAiTutorStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [theme, setTheme] = useState('light');

  // Get theme from profile
  useEffect(() => {
    if (profile?.theme) {
      setTheme(profile.theme);
    }
  }, [profile]);

  const processStats = (data) => {
    const stats = {
      totalCharacters: 0,
      totalCost: 0,
      totalRequests: 0,
      totalPlays: 0,
      byVoiceType: {},
      byDate: {},
      voiceUsage: {},
      // Add new stats categories
      byArticle: {},
      byUser: {},
      uniqueArticles: new Set(),
      uniqueUsers: new Set(),
      topArticles: [],
      topUsers: [],
      // Add quota tracking
      quotaUsage: {
        'Standard': 0,
        'Neural2': 0,
        'Wavenet': 0
      },
      // Add new analytics
      sentenceRepetition: {
        mostRepeated: [],
        averageRepeats: 0
      },
      readingPatterns: {
        sequentialReads: 0,
        jumpReads: 0,
        averageSessionLength: 0
      },
      timeAnalysis: {
        hourlyDistribution: {},
        averageTimeSpent: 0
      },
      voiceTypeDistribution: {
        Standard: { count: 0, percentage: 0 },
        Neural2: { count: 0, percentage: 0 },
        Wavenet: { count: 0, percentage: 0 }
      },
      voiceGenderDistribution: {
        female: { count: 0, percentage: 0 },
        male: { count: 0, percentage: 0 }
      }
    };

    // Group sessions by article and sort by timestamp
    const articleSessions = {};
    data.forEach(session => {
      if (!articleSessions[session.article_id]) {
        articleSessions[session.article_id] = [];
      }
      articleSessions[session.article_id].push({
        index: session.sentence_index,
        timestamp: new Date(session.created_at),
        count: session.count
      });
    });

    // Analyze reading patterns
    Object.values(articleSessions).forEach(sessions => {
      sessions.sort((a, b) => a.timestamp - b.timestamp);
      let sequential = 0;
      for (let i = 1; i < sessions.length; i++) {
        if (sessions[i].index === sessions[i-1].index + 1) {
          sequential++;
        }
      }
      stats.readingPatterns.sequentialReads += sequential;
      stats.readingPatterns.jumpReads += sessions.length - sequential - 1;
    });

    // Analyze time patterns
    data.forEach(session => {
      const hour = new Date(session.created_at).getHours();
      if (!stats.timeAnalysis.hourlyDistribution[hour]) {
        stats.timeAnalysis.hourlyDistribution[hour] = 0;
      }
      stats.timeAnalysis.hourlyDistribution[hour] += session.count;
    });

    // Find most repeated sentences
    const sentenceCounts = {};
    data.forEach(session => {
      const key = `${session.article_id}-${session.sentence_index}`;
      if (!sentenceCounts[key]) {
        sentenceCounts[key] = {
          article_id: session.article_id,
          sentence_index: session.sentence_index,
          count: 0,
          characters: session.character_count
        };
      }
      sentenceCounts[key].count += session.count;
    });

    stats.sentenceRepetition.mostRepeated = Object.values(sentenceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    stats.sentenceRepetition.averageRepeats = 
      Object.values(sentenceCounts).reduce((sum, s) => sum + s.count, 0) / 
      Object.keys(sentenceCounts).length;

    // Voice type distribution
    let totalVoiceUses = 0;
    data.forEach(session => {
      const voiceType = session.voice_name.includes('Neural2') ? 'Neural2' :
                       session.voice_name.includes('Wavenet') ? 'Wavenet' : 
                       'Standard';
      stats.voiceTypeDistribution[voiceType].count += session.count;
      totalVoiceUses += session.count;
    });

    // Calculate percentages
    Object.keys(stats.voiceTypeDistribution).forEach(type => {
      stats.voiceTypeDistribution[type].percentage = 
        (stats.voiceTypeDistribution[type].count / totalVoiceUses) * 100;
    });

    data.forEach(session => {
      // Calculate cost based on voice type
      const voiceType = session.voice_name.includes('Neural2') ? 'Neural2' :
                       session.voice_name.includes('Wavenet') ? 'Wavenet' : 
                       'Standard';
      const costPerChar = VOICE_COSTS[voiceType];
      const cost = session.character_count * costPerChar * session.count;

      // Track quota usage
      stats.quotaUsage[voiceType] += session.character_count * session.count;

      // Update totals
      stats.totalCharacters += session.character_count * session.count;
      stats.totalCost += cost;
      stats.totalRequests += session.count;
      stats.totalPlays += session.count;

      // Track unique articles and users
      if (session.article_id) {
        stats.uniqueArticles.add(session.article_id);
        // Group by article
        if (!stats.byArticle[session.article_id]) {
          stats.byArticle[session.article_id] = {
            plays: 0,
            characters: 0,
            cost: 0,
            sentences: new Set()
          };
        }
        stats.byArticle[session.article_id].plays += session.count;
        stats.byArticle[session.article_id].characters += session.character_count * session.count;
        stats.byArticle[session.article_id].cost += cost;
        stats.byArticle[session.article_id].sentences.add(session.sentence_index);
      }

      // Track user usage
      const userId = session.user_id || 'anonymous';
      if (!stats.byUser[userId]) {
        stats.byUser[userId] = {
          plays: 0,
          characters: 0,
          cost: 0,
          articles: new Set(),
          isAnonymous: !session.user_id
        };
      }
      stats.byUser[userId].plays += session.count;
      stats.byUser[userId].characters += session.character_count * session.count;
      stats.byUser[userId].cost += cost;
      if (session.article_id) {
        stats.byUser[userId].articles.add(session.article_id);
      }

      // Group by voice type
      if (!stats.byVoiceType[voiceType]) {
        stats.byVoiceType[voiceType] = {
          characters: 0,
          cost: 0,
          plays: 0
        };
      }
      stats.byVoiceType[voiceType].characters += session.character_count * session.count;
      stats.byVoiceType[voiceType].cost += cost;
      stats.byVoiceType[voiceType].plays += session.count;

      // Track individual voice usage
      if (!stats.voiceUsage[session.voice_name]) {
        stats.voiceUsage[session.voice_name] = {
          plays: 0,
          characters: 0
        };
      }
      stats.voiceUsage[session.voice_name].plays += session.count;
      stats.voiceUsage[session.voice_name].characters += session.character_count * session.count;

      // Group by date
      const date = new Date(session.created_at).toLocaleDateString();
      if (!stats.byDate[date]) {
        stats.byDate[date] = {
          characters: 0,
          cost: 0,
          plays: 0
        };
      }
      stats.byDate[date].characters += session.character_count * session.count;
      stats.byDate[date].cost += cost;
      stats.byDate[date].plays += session.count;

      // Process sentence heatmap data
      if (!stats.byArticle[session.article_id].heatmap) {
        stats.byArticle[session.article_id].heatmap = {};
      }
      if (!stats.byArticle[session.article_id].heatmap[session.sentence_index]) {
        stats.byArticle[session.article_id].heatmap[session.sentence_index] = 0;
      }
      stats.byArticle[session.article_id].heatmap[session.sentence_index] += session.count;

      // Add gender analysis in the data.forEach loop
      const gender = voiceGenderMap[session.voice_name] || 'unknown';
      if (gender !== 'unknown') {
        stats.voiceGenderDistribution[gender].count += session.count;
      }
    });

    // Process top articles
    stats.topArticles = Object.entries(stats.byArticle)
      .map(([id, data]) => ({
        id,
        plays: data.plays,
        characters: data.characters,
        cost: data.cost,
        uniqueSentences: data.sentences.size,
        heatmap: data.heatmap,
        maxPlays: Math.max(...Object.values(data.heatmap || {}))
      }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);

    // Process top users
    stats.topUsers = Object.entries(stats.byUser)
      .map(([id, data]) => ({
        id,
        plays: data.plays,
        characters: data.characters,
        cost: data.cost,
        uniqueArticles: data.articles.size
      }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);

    // Calculate gender percentages
    const totalGenderUses = Object.values(stats.voiceGenderDistribution).reduce((sum, g) => sum + g.count, 0);
    Object.keys(stats.voiceGenderDistribution).forEach(gender => {
      stats.voiceGenderDistribution[gender].percentage = 
        (stats.voiceGenderDistribution[gender].count / totalGenderUses) * 100;
    });

    return stats;
  };

  const processAiTutorStats = (data) => {
    const stats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      byArticle: {},
      uniqueArticles: new Set(),
      topArticles: [],
      byDate: {},
      sessions: data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10),
      sentenceHeatmap: {},
      analytics: {
        followUpRate: 0,
        avgTokensPerSession: {
          initial: { input: 0, output: 0, total: 0 },
          followUp: { input: 0, output: 0, total: 0 }
        },
        modelUsage: {},
        timeAnalysis: {
          hourlyDistribution: Array(24).fill(0),
          avgResponseTime: 0,
          responseTimeCount: 0,
          conversations: new Map() // Track sessions by conversation
        },
        costAnalysis: {
          initialVsFollowUp: { initial: 0, followUp: 0 },
          costPerToken: 0,
          trendByDate: {}
        },
        userEngagement: {
          sessionsPerUser: {},
          followUpDepth: {}
        }
      }
    };

    // First pass: group sessions by conversation
    const conversations = new Map();
    data.forEach(session => {
      const conversationKey = `${session.article_id}-${session.sentence_index}-${session.user_id || 'anonymous'}`;
      if (!conversations.has(conversationKey)) {
        conversations.set(conversationKey, []);
      }
      conversations.get(conversationKey).push(session);
    });

    // Sort sessions within each conversation by time
    conversations.forEach(sessions => {
      sessions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });

    // Calculate response times within conversations
    let totalResponseTime = 0;
    let responseCount = 0;

    conversations.forEach(sessions => {
      for (let i = 1; i < sessions.length; i++) {
        const timeDiff = new Date(sessions[i].created_at) - new Date(sessions[i-1].created_at);
        if (timeDiff > 0 && timeDiff < 300000) { // Only count if less than 5 minutes
          totalResponseTime += timeDiff;
          responseCount++;
        }
      }
    });

    // Calculate average response time
    if (responseCount > 0) {
      stats.analytics.timeAnalysis.avgResponseTime = totalResponseTime / responseCount;
      stats.analytics.timeAnalysis.responseTimeCount = responseCount;
    }

    // Rest of the data processing
    let initialSessions = 0;
    let followUpSessions = 0;

    data.forEach(session => {
      // Existing stats processing
      stats.totalInputTokens += session.input_tokens;
      stats.totalOutputTokens += session.output_tokens;
      stats.totalTokens += session.total_tokens;
      stats.totalCost += session.total_cost;

      // Track model usage
      stats.analytics.modelUsage[session.model_name] = (stats.analytics.modelUsage[session.model_name] || 0) + 1;

      // Track session types and calculate averages
      if (session.is_follow_up) {
        followUpSessions++;
        stats.analytics.avgTokensPerSession.followUp.input += session.input_tokens;
        stats.analytics.avgTokensPerSession.followUp.output += session.output_tokens;
        stats.analytics.avgTokensPerSession.followUp.total += session.total_tokens;
        stats.analytics.costAnalysis.initialVsFollowUp.followUp += session.total_cost;
      } else {
        initialSessions++;
        stats.analytics.avgTokensPerSession.initial.input += session.input_tokens;
        stats.analytics.avgTokensPerSession.initial.output += session.output_tokens;
        stats.analytics.avgTokensPerSession.initial.total += session.total_tokens;
        stats.analytics.costAnalysis.initialVsFollowUp.initial += session.total_cost;
      }

      // Time analysis
      const sessionTime = new Date(session.created_at);
      const localHour = sessionTime.getHours();
      stats.analytics.timeAnalysis.hourlyDistribution[localHour]++;

      // User engagement
      if (session.user_id) {
        stats.analytics.userEngagement.sessionsPerUser[session.user_id] = 
          (stats.analytics.userEngagement.sessionsPerUser[session.user_id] || 0) + 1;
      }
    });

    // Calculate final analytics
    const totalSessions = initialSessions + followUpSessions;
    stats.analytics.followUpRate = (followUpSessions / totalSessions) * 100;

    // Average tokens per session type
    if (initialSessions > 0) {
      stats.analytics.avgTokensPerSession.initial.input /= initialSessions;
      stats.analytics.avgTokensPerSession.initial.output /= initialSessions;
      stats.analytics.avgTokensPerSession.initial.total /= initialSessions;
    }
    if (followUpSessions > 0) {
      stats.analytics.avgTokensPerSession.followUp.input /= followUpSessions;
      stats.analytics.avgTokensPerSession.followUp.output /= followUpSessions;
      stats.analytics.avgTokensPerSession.followUp.total /= followUpSessions;
    }

    // Calculate average response time
    if (stats.analytics.timeAnalysis.responseTimeCount > 0) {
      stats.analytics.timeAnalysis.avgResponseTime /= stats.analytics.timeAnalysis.responseTimeCount;
    }

    return stats;
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Wait for auth to be ready
        if (authLoading) return;

        // Check if user is logged in
        if (!user) {
          window.location.href = '/';
          return;
        }

        // Check if profile is loaded and has admin role
        if (!profile) {
          throw new Error('Unable to verify permissions');
        }

        // Check admin role
        if (profile.role_level < 10) {
          window.location.href = '/';
          return;
        }

        // Fetch TTS stats
        const ttsResponse = await supabase
          .from('tts_sessions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (ttsResponse.error) throw ttsResponse.error;

        // Fetch AI Tutor stats
        const aiTutorResponse = await supabase
          .from('ai_tutor_sessions')
          .select('*')
          .order('created_at', { ascending: false });

        if (aiTutorResponse.error) throw aiTutorResponse.error;

        // Process the data
        const ttsProcessedStats = processStats(ttsResponse.data);
        const aiTutorProcessedStats = processAiTutorStats(aiTutorResponse.data);
        setTtsStats(ttsProcessedStats);
        setAiTutorStats(aiTutorProcessedStats);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, profile, authLoading]);

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error states
  if (error) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Access Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              {!user && (
                <div className="mt-4">
                  <a href="/join" className="text-sm font-medium text-red-800 hover:text-red-700">
                    Go to Login →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!ttsStats || !aiTutorStats) return null;

  const chartData = Object.entries(ttsStats.byDate)
    .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
    .map(([date, stats]) => ({
      date,
      characters: stats.characters,
      cost: parseFloat(stats.cost.toFixed(4)),
      plays: stats.plays
    }));

  const voiceData = Object.entries(ttsStats.voiceUsage)
    .sort((a, b) => b[1].plays - a[1].plays) // Sort by plays in descending order
    .map(([voice, stats]) => ({
      voice: `${voiceNameMap[voice] || 'Unknown'} • ${voice}`,
      voiceType: voice.includes('Neural2') ? 'Neural2' : 
                 voice.includes('Wavenet') ? 'Wavenet' : 
                 'Standard',
      plays: stats.plays,
      characters: stats.characters
    }));

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <Navbar
        showSidebar={showSidebar}
        onSidebarToggle={setShowSidebar}
        theme={theme}
        hideNewsListButton={true}
      />

      <main className="pt-20 pb-8">
        <div className="px-4 sm:px-6 max-w-[1600px] mx-auto">
          {/* AI Tutor Analytics Section */}
          <div className="mb-12 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
              <div className="mb-4 sm:mb-0">
                <h1
                  className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  AI Tutor Analytics
                </h1>
                <p
                  className={`mt-1 sm:mt-2 text-sm sm:text-base ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  AI Tutor usage and cost metrics
                </p>
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg ${
                  theme === "dark"
                    ? "bg-gray-800 text-gray-300"
                    : "bg-white text-gray-600"
                } shadow-sm text-xs sm:text-sm`}
              >
                <FaChartBar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium">
                  Last updated: {new Date().toLocaleString()}
                </span>
              </div>
            </div>

            {/* AI Tutor Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Total Cost Card */}
              <div
                className={`p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                  theme === "dark"
                    ? "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                    : "bg-white border border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p
                      className={`text-sm font-medium ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Total Cost
                    </p>
                    <p
                      className={`text-2xl font-bold tracking-tight ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      ${aiTutorStats.totalCost.toFixed(4)}
                    </p>
                    <div
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      All-time spending
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${
                      theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50"
                    }`}
                  >
                    <FaDollarSign
                      className={
                        theme === "dark"
                          ? "text-emerald-400 w-6 h-6"
                          : "text-emerald-600 w-6 h-6"
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Total Tokens Card */}
              <div
                className={`p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                  theme === "dark"
                    ? "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                    : "bg-white border border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p
                      className={`text-sm font-medium ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Total Tokens
                    </p>
                    <p
                      className={`text-2xl font-bold tracking-tight ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {aiTutorStats.totalTokens.toLocaleString()}
                    </p>
                    <div
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      Input: {aiTutorStats.totalInputTokens.toLocaleString()} /
                      Output: {aiTutorStats.totalOutputTokens.toLocaleString()}
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${
                      theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"
                    }`}
                  >
                    <FaFileAlt
                      className={
                        theme === "dark"
                          ? "text-blue-400 w-6 h-6"
                          : "text-blue-600 w-6 h-6"
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Total Sessions Card */}
              <div
                className={`p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                  theme === "dark"
                    ? "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                    : "bg-white border border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p
                      className={`text-sm font-medium ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Total Sessions
                    </p>
                    <p
                      className={`text-2xl font-bold tracking-tight ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {aiTutorStats.sessions.length.toLocaleString()}
                    </p>
                    <div
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      Tutor interactions
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${
                      theme === "dark" ? "bg-indigo-500/10" : "bg-indigo-50"
                    }`}
                  >
                    <FaChartLine
                      className={
                        theme === "dark"
                          ? "text-indigo-400 w-6 h-6"
                          : "text-indigo-600 w-6 h-6"
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Average Cost Per Session Card */}
              <div
                className={`p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                  theme === "dark"
                    ? "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                    : "bg-white border border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p
                      className={`text-sm font-medium ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Avg Cost/Session
                    </p>
                    <p
                      className={`text-2xl font-bold tracking-tight ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      $
                      {(
                        aiTutorStats.totalCost / aiTutorStats.sessions.length
                      ).toFixed(4)}
                    </p>
                    <div
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      USD per session
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${
                      theme === "dark" ? "bg-purple-500/10" : "bg-purple-50"
                    }`}
                  >
                    <FaChartLine
                      className={
                        theme === "dark"
                          ? "text-purple-400 w-6 h-6"
                          : "text-purple-600 w-6 h-6"
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Sessions Table */}
            <div
              className={`p-6 rounded-xl shadow-md ${
                theme === "dark"
                  ? "bg-gray-800/50 border border-gray-700/50"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className={`text-lg font-bold tracking-tight ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Recent AI Tutor Sessions (Last 10)
                  </h2>
                  <p
                    className={`mt-1 text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Latest tutor interactions with detailed token and cost
                    breakdown
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Article & Sentence
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Tokens (In/Out/Total)
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Cost
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Model
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Created At
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      theme === "dark"
                        ? "divide-gray-700/50"
                        : "divide-gray-200"
                    }`}
                  >
                    {aiTutorStats.sessions.map((session) => (
                      <tr
                        key={session.id}
                        className={`transition-colors duration-200 ${
                          theme === "dark"
                            ? "hover:bg-gray-700/70"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td
                          className={`py-4 px-4 text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          <div className="flex items-start">
                            <FaNewspaper
                              className={`mr-2 mt-1 ${
                                theme === "dark"
                                  ? "text-gray-500"
                                  : "text-gray-400"
                              }`}
                            />
                            <div className="flex-1">
                              <ArticleIdWrapper
                                articleId={session.article_id}
                                theme={theme}
                              />
                              <div
                                className={`text-xs mt-1 ${
                                  theme === "dark"
                                    ? "text-gray-400"
                                    : "text-gray-500"
                                }`}
                              >
                                Sentence {session.sentence_index}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td
                          className={`py-4 px-4 text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  theme === "dark"
                                    ? "text-blue-400"
                                    : "text-blue-600"
                                }
                              >
                                {session.input_tokens}
                              </span>
                              <span
                                className={
                                  theme === "dark"
                                    ? "text-green-400"
                                    : "text-green-600"
                                }
                              >
                                {session.output_tokens}
                              </span>
                              <span
                                className={
                                  theme === "dark"
                                    ? "text-purple-400"
                                    : "text-purple-600"
                                }
                              >
                                {session.total_tokens}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td
                          className={`py-4 px-4 text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          ${session.total_cost.toFixed(4)}
                        </td>
                        <td
                          className={`py-4 px-4 text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {session.model_name || "gpt-3.5-turbo-1106"}
                        </td>
                        <td
                          className={`py-4 px-4 text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {new Date(session.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Advanced Analytics Section */}
              {aiTutorStats && (
                <div className="mt-8">
                  <h2
                    className={`text-lg font-bold tracking-tight mb-4 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Advanced Analytics
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Follow-up Rate Card */}
                    <div
                      className={`p-6 rounded-xl ${
                        theme === "dark"
                          ? "bg-gray-800/50 border border-gray-700/50"
                          : "bg-white border border-gray-100"
                      }`}
                    >
                      <h3
                        className={`text-sm font-medium mb-2 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Follow-up Engagement
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className={`text-2xl font-bold ${
                              theme === "dark" ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {aiTutorStats?.analytics?.followUpRate?.toFixed(
                              1
                            ) || "0.0"}
                            %
                          </p>
                          <p
                            className={`text-sm ${
                              theme === "dark"
                                ? "text-gray-500"
                                : "text-gray-400"
                            }`}
                          >
                            Questions with follow-ups
                          </p>
                        </div>
                        <div
                          className={`p-3 rounded-xl ${
                            theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"
                          }`}
                        >
                          <FaComments
                            className={
                              theme === "dark"
                                ? "text-blue-400 w-6 h-6"
                                : "text-blue-600 w-6 h-6"
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Token & Cost Analysis Card */}
                    <div
                      className={`p-6 rounded-xl ${
                        theme === "dark"
                          ? "bg-gray-800/50 border border-gray-700/50"
                          : "bg-white border border-gray-100"
                      }`}
                    >
                      <h3
                        className={`text-sm font-medium mb-4 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Token & Cost Analysis
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span
                            className={
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-600"
                            }
                          >
                            Initial Questions
                          </span>
                          <div className="flex items-center gap-4">
                            <span
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              {Math.round(aiTutorStats?.analytics?.avgTokensPerSession?.initial?.total || 0)} tokens
                            </span>
                            <span
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              ${aiTutorStats?.analytics?.costAnalysis?.initialVsFollowUp?.initial.toFixed(4)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span
                            className={
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-600"
                            }
                          >
                            Follow-ups
                          </span>
                          <div className="flex items-center gap-4">
                            <span
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              {Math.round(aiTutorStats?.analytics?.avgTokensPerSession?.followUp?.total || 0)} tokens
                            </span>
                            <span
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              ${aiTutorStats?.analytics?.costAnalysis?.initialVsFollowUp?.followUp.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Model Distribution Card */}
                    <div
                      className={`p-6 rounded-xl ${
                        theme === "dark"
                          ? "bg-gray-800/50 border border-gray-700/50"
                          : "bg-white border border-gray-100"
                      }`}
                    >
                      <h3
                        className={`text-sm font-medium mb-2 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Model Usage Distribution
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(
                          aiTutorStats?.analytics?.modelUsage || {}
                        ).map(([model, count]) => (
                          <div key={model} className="flex justify-between">
                            <span
                              className={
                                theme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }
                            >
                              {model}
                            </span>
                            <span
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              {((count / Object.values(aiTutorStats?.analytics?.modelUsage || {}).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Response Time Card */}
                    <div
                      className={`p-6 rounded-xl ${
                        theme === "dark"
                          ? "bg-gray-800/50 border border-gray-700/50"
                          : "bg-white border border-gray-100"
                      }`}
                    >
                      <h3
                        className={`text-sm font-medium mb-2 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Average Time Between Messages
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className={`text-2xl font-bold ${
                              theme === "dark" ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {(
                              (aiTutorStats?.analytics?.timeAnalysis?.avgResponseTime || 0) /
                              1000
                            ).toFixed(3)}s
                          </p>
                          <p
                            className={`text-sm ${
                              theme === "dark"
                                ? "text-gray-500"
                                : "text-gray-400"
                            }`}
                          >
                            Within conversations
                          </p>
                        </div>
                        <div
                          className={`p-3 rounded-xl ${
                            theme === "dark" ? "bg-green-500/10" : "bg-green-50"
                          }`}
                        >
                          <FaClock
                            className={
                              theme === "dark"
                                ? "text-green-400 w-6 h-6"
                                : "text-green-600 w-6 h-6"
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Usage Pattern Card */}
                    <div
                      className={`p-6 rounded-xl ${
                        theme === "dark"
                          ? "bg-gray-800/50 border border-gray-700/50"
                          : "bg-white border border-gray-100"
                      }`}
                    >
                      <h3
                        className={`text-sm font-medium mb-2 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Usage Pattern
                      </h3>
                      <div className="h-32 pt-4">
                        <div className="flex h-[75%] items-end gap-1 mb-6">
                          {(
                            aiTutorStats?.analytics?.timeAnalysis
                              ?.hourlyDistribution || Array(24).fill(0)
                          ).map((count, hour) => {
                            const maxCount = Math.max(
                              ...(aiTutorStats?.analytics?.timeAnalysis
                                ?.hourlyDistribution || [0])
                            );
                            const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            return (
                              <div key={hour} className="relative flex-1 min-w-[8px] h-full">
                                <div
                                  className={`absolute bottom-0 w-full ${
                                    theme === "dark"
                                      ? "bg-blue-500/20 hover:bg-blue-500/30"
                                      : "bg-blue-100 hover:bg-blue-200"
                                  } rounded-t transition-colors duration-200`}
                                  style={{ height: `${heightPercent}%` }}
                                  title={`${hour}:00 - ${count} sessions`}
                                />
                                <div className={`absolute -bottom-6 w-full text-[8px] text-center ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                                }`}>
                                  {hour.toString().padStart(2, '0')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-12">
            <div className="mb-4 sm:mb-0">
              <h1
                className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                TTS Analytics
              </h1>
              <p
                className={`mt-1 sm:mt-2 text-sm sm:text-base ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Text-to-Speech usage metrics
              </p>
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg ${
                theme === "dark"
                  ? "bg-gray-800 text-gray-300"
                  : "bg-white text-gray-600"
              } shadow-sm text-xs sm:text-sm`}
            >
              <FaChartBar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium">
                Last updated: {new Date().toLocaleString()}
              </span>
            </div>
          </div>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Total Cost Card - Moved to first position */}
            <div
              className={`p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                theme === "dark"
                  ? "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Total Cost
                  </p>
                  <div className="flex flex-col">
                    <p
                      className={`text-sm line-through ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      ${ttsStats?.totalCost.toFixed(2)}
                    </p>
                    <p
                      className={`text-2xl font-bold tracking-tight ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      $
                      {(
                        Math.max(
                          0,
                          (ttsStats.quotaUsage.Neural2 -
                            MONTHLY_QUOTA.Neural2) *
                            VOICE_COSTS.Neural2
                        ) +
                        Math.max(
                          0,
                          (ttsStats.quotaUsage.Wavenet -
                            MONTHLY_QUOTA.Wavenet) *
                            VOICE_COSTS.Wavenet
                        ) +
                        Math.max(
                          0,
                          (ttsStats.quotaUsage.Standard -
                            MONTHLY_QUOTA.Standard) *
                            VOICE_COSTS.Standard
                        )
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div
                    className={`text-xs ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    After free tier deduction
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50"
                  }`}
                >
                  <FaDollarSign
                    className={
                      theme === "dark"
                        ? "text-emerald-400 w-6 h-6"
                        : "text-emerald-600 w-6 h-6"
                    }
                  />
                </div>
              </div>
            </div>

            {/* Total Characters Card */}
            <div
              className={`p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                theme === "dark"
                  ? "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Total Characters
                  </p>
                  <p
                    className={`text-2xl font-bold tracking-tight ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {ttsStats?.totalCharacters.toLocaleString()}
                  </p>
                  <div
                    className={`text-xs ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Processed through TTS API
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"
                  }`}
                >
                  <FaFileAlt
                    className={
                      theme === "dark"
                        ? "text-blue-400 w-6 h-6"
                        : "text-blue-600 w-6 h-6"
                    }
                  />
                </div>
              </div>
            </div>

            {/* Total Plays Card */}
            <div
              className={`p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                theme === "dark"
                  ? "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Total Plays
                  </p>
                  <p
                    className={`text-2xl font-bold tracking-tight ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {ttsStats?.totalPlays.toLocaleString()}
                  </p>
                  <div
                    className={`text-xs ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Including repeated plays
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    theme === "dark" ? "bg-indigo-500/10" : "bg-indigo-50"
                  }`}
                >
                  <FaPlay
                    className={
                      theme === "dark"
                        ? "text-indigo-400 w-6 h-6"
                        : "text-indigo-600 w-6 h-6"
                    }
                  />
                </div>
              </div>
            </div>

            {/* Average Cost Per Play Card - New */}
            <div
              className={`p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                theme === "dark"
                  ? "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Avg Cost/Play
                  </p>
                  <p
                    className={`text-2xl font-bold tracking-tight ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    ${(ttsStats?.totalCost / ttsStats?.totalPlays).toFixed(4)}
                  </p>
                  <div
                    className={`text-xs ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    USD per play
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    theme === "dark" ? "bg-purple-500/10" : "bg-purple-50"
                  }`}
                >
                  <FaChartLine
                    className={
                      theme === "dark"
                        ? "text-purple-400 w-6 h-6"
                        : "text-purple-600 w-6 h-6"
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown and Quota Combined */}
          <div
            className={`p-6 rounded-xl shadow-md mb-6 ${
              theme === "dark"
                ? "bg-gray-800/50 border border-gray-700/50"
                : "bg-white border border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2
                  className={`text-lg font-bold tracking-tight ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  Voice Cost Breakdown
                </h2>
                <p
                  className={`mt-1 text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Cost analysis and quota usage by voice type
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Neural2 Stats */}
              <div
                className={`p-4 rounded-lg ${
                  theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Neural2
                  </span>
                  <div
                    className={`px-2 py-1 rounded text-xs ${
                      theme === "dark"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-purple-100 text-purple-600"
                    }`}
                  >
                    $
                    {(
                      ttsStats.quotaUsage.Neural2 * VOICE_COSTS.Neural2
                    ).toFixed(2)}
                  </div>
                </div>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    >
                      Characters Used
                    </span>
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      {ttsStats.quotaUsage.Neural2?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    >
                      Rate
                    </span>
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      $0.000016/char
                    </span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2 mt-2">
                    <div
                      className="h-2 rounded-full bg-purple-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          (ttsStats.quotaUsage.Neural2 /
                            MONTHLY_QUOTA.Neural2) *
                            100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span
                      className={
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }
                    >
                      Monthly free quota
                    </span>
                    <span
                      className={`font-medium ${
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {(
                        (ttsStats.quotaUsage.Neural2 / MONTHLY_QUOTA.Neural2) *
                        100
                      ).toFixed(1)}
                      % used
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    >
                      Remaining
                    </span>
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      {(
                        MONTHLY_QUOTA.Neural2 - ttsStats.quotaUsage.Neural2
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div
                    className={`mt-3 pt-2 border-t ${
                      theme === "dark" ? "border-gray-600" : "border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span
                        className={
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }
                      >
                        After Free Tier
                      </span>
                      <span
                        className={
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }
                      >
                        $
                        {Math.max(
                          0,
                          (ttsStats.quotaUsage.Neural2 -
                            MONTHLY_QUOTA.Neural2) *
                            VOICE_COSTS.Neural2
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wavenet Stats */}
              <div
                className={`p-4 rounded-lg ${
                  theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Wavenet
                  </span>
                  <div
                    className={`px-2 py-1 rounded text-xs ${
                      theme === "dark"
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    $
                    {(
                      ttsStats.quotaUsage.Wavenet * VOICE_COSTS.Wavenet
                    ).toFixed(2)}
                  </div>
                </div>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    >
                      Characters Used
                    </span>
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      {ttsStats.quotaUsage.Wavenet?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    >
                      Rate
                    </span>
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      $0.000016/char
                    </span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2 mt-2">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          (ttsStats.quotaUsage.Wavenet /
                            MONTHLY_QUOTA.Wavenet) *
                            100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span
                      className={
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }
                    >
                      Monthly free quota
                    </span>
                    <span
                      className={`font-medium ${
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {(
                        (ttsStats.quotaUsage.Wavenet / MONTHLY_QUOTA.Wavenet) *
                        100
                      ).toFixed(1)}
                      % used
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    >
                      Remaining
                    </span>
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      {(
                        MONTHLY_QUOTA.Wavenet - ttsStats.quotaUsage.Wavenet
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div
                    className={`mt-3 pt-2 border-t ${
                      theme === "dark" ? "border-gray-600" : "border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span
                        className={
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }
                      >
                        After Free Tier
                      </span>
                      <span
                        className={
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }
                      >
                        $
                        {Math.max(
                          0,
                          (ttsStats.quotaUsage.Wavenet -
                            MONTHLY_QUOTA.Wavenet) *
                            VOICE_COSTS.Wavenet
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Standard Stats */}
              <div
                className={`p-4 rounded-lg ${
                  theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Standard
                  </span>
                  <div
                    className={`px-2 py-1 rounded text-xs ${
                      theme === "dark"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    $
                    {(
                      ttsStats.quotaUsage.Standard * VOICE_COSTS.Standard
                    ).toFixed(2)}
                  </div>
                </div>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    >
                      Characters Used
                    </span>
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      {ttsStats.quotaUsage.Standard?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    >
                      Rate
                    </span>
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      $0.000004/char
                    </span>
                  </div>
                  <div className="w-full bg-gray-700/30 rounded-full h-2 mt-2">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          (ttsStats.quotaUsage.Standard /
                            MONTHLY_QUOTA.Standard) *
                            100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span
                      className={
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }
                    >
                      Monthly free quota
                    </span>
                    <span
                      className={`font-medium ${
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {(
                        (ttsStats.quotaUsage.Standard /
                          MONTHLY_QUOTA.Standard) *
                        100
                      ).toFixed(1)}
                      % used
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    >
                      Remaining
                    </span>
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      {(
                        MONTHLY_QUOTA.Standard - ttsStats.quotaUsage.Standard
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div
                    className={`mt-3 pt-2 border-t ${
                      theme === "dark" ? "border-gray-600" : "border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span
                        className={
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }
                      >
                        After Free Tier
                      </span>
                      <span
                        className={
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }
                      >
                        $
                        {Math.max(
                          0,
                          (ttsStats.quotaUsage.Standard -
                            MONTHLY_QUOTA.Standard) *
                            VOICE_COSTS.Standard
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Usage Analytics and Voice Usage Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Usage Analytics */}
            <div
              className={`p-6 rounded-xl shadow-md ${
                theme === "dark"
                  ? "bg-gray-800/50 border border-gray-700/50"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className={`text-lg font-bold tracking-tight ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Daily Usage Analytics
                  </h2>
                  <p
                    className={`mt-1 text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Daily trends for character and play usage
                  </p>
                </div>
              </div>

              {/* Character Usage Chart */}
              <div className="mb-6">
                <h3
                  className={`text-sm font-medium mb-4 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Character Usage
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
                      />
                      <XAxis
                        dataKey="date"
                        stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                        fontSize={12}
                      />
                      <YAxis
                        stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                        fontSize={12}
                      />
                      <Tooltip
                        cursor={{
                          fill:
                            theme === "dark"
                              ? "rgba(255, 255, 255, 0.05)"
                              : "rgba(0, 0, 0, 0.05)",
                        }}
                        contentStyle={{
                          backgroundColor:
                            theme === "dark" ? "#1F2937" : "white",
                          border: "none",
                          borderRadius: "0.5rem",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        labelStyle={{
                          color: theme === "dark" ? "#E5E7EB" : "#374151",
                          fontWeight: "bold",
                          marginBottom: "4px",
                        }}
                        itemStyle={{
                          color: theme === "dark" ? "#E5E7EB" : "#374151",
                          padding: "2px 0",
                        }}
                        formatter={(value) => [
                          value.toLocaleString(),
                          "Characters",
                        ]}
                      />
                      <Bar
                        dataKey="characters"
                        fill={
                          theme === "dark"
                            ? COLORS.dark.charts.primary
                            : COLORS.light.charts.primary
                        }
                        name="Characters"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Play Usage Chart */}
              <div>
                <h3
                  className={`text-sm font-medium mb-4 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Play Usage
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
                      />
                      <XAxis
                        dataKey="date"
                        stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                        fontSize={12}
                      />
                      <YAxis
                        stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                        fontSize={12}
                      />
                      <Tooltip
                        cursor={{
                          fill:
                            theme === "dark"
                              ? "rgba(255, 255, 255, 0.05)"
                              : "rgba(0, 0, 0, 0.05)",
                        }}
                        contentStyle={{
                          backgroundColor:
                            theme === "dark" ? "#1F2937" : "white",
                          border: "none",
                          borderRadius: "0.5rem",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        labelStyle={{
                          color: theme === "dark" ? "#E5E7EB" : "#374151",
                          fontWeight: "bold",
                          marginBottom: "4px",
                        }}
                        itemStyle={{
                          color: theme === "dark" ? "#E5E7EB" : "#374151",
                          padding: "2px 0",
                        }}
                        formatter={(value) => [value.toLocaleString(), "Plays"]}
                      />
                      <Bar
                        dataKey="plays"
                        fill={
                          theme === "dark"
                            ? COLORS.dark.charts.success
                            : COLORS.light.charts.success
                        }
                        name="Plays"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Voice Usage Analytics */}
            <div
              className={`p-6 rounded-xl shadow-md ${
                theme === "dark"
                  ? "bg-gray-800/50 border border-gray-700/50"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className={`text-lg font-bold tracking-tight ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Voice Usage Analytics
                  </h2>
                  <p
                    className={`mt-1 text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Voice usage distribution and type breakdown
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {/* Voice Usage Distribution */}
                <div>
                  <h3
                    className={`text-sm font-medium mb-4 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Voice Usage Distribution
                  </h3>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      >
                        <Pie
                          data={voiceData}
                          cx="50%"
                          cy="45%"
                          labelLine={true}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="plays"
                          nameKey="voice"
                          label={({ name, percent }) => {
                            const [humanName] = name.split(" • ");
                            return `${humanName} (${(percent * 100).toFixed(
                              0
                            )}%)`;
                          }}
                          labelStyle={{
                            fill: theme === "dark" ? "#E5E7EB" : "#374151",
                          }}
                          activeShape={{ outline: "none" }}
                          activeIndex={[]}
                          isAnimationActive={false}
                        >
                          {voiceData.map((entry, index) => {
                            let color;
                            switch (entry.voiceType) {
                              case "Neural2":
                                color =
                                  theme === "dark" ? "#A855F7" : "#9333EA"; // Purple
                                break;
                              case "Wavenet":
                                color =
                                  theme === "dark" ? "#3B82F6" : "#2563EB"; // Blue
                                break;
                              default:
                                color =
                                  theme === "dark" ? "#10B981" : "#059669"; // Emerald
                            }
                            return <Cell key={index} fill={color} />;
                          })}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => {
                            const [humanName, modelName] = name.split(" • ");
                            const total = voiceData.reduce(
                              (sum, item) => sum + item.plays,
                              0
                            );
                            const percentage = ((value / total) * 100).toFixed(
                              1
                            );
                            return [
                              <div key="tooltip" className="space-y-2">
                                <div
                                  className={`font-semibold text-base ${
                                    theme === "dark"
                                      ? "text-white"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {humanName}
                                </div>
                                <div
                                  className={`font-mono text-xs ${
                                    theme === "dark"
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {modelName}
                                </div>
                                <div
                                  className={`text-sm font-medium ${
                                    theme === "dark"
                                      ? "text-gray-300"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {value.toLocaleString()} plays ({percentage}%)
                                </div>
                              </div>,
                            ];
                          }}
                          contentStyle={{
                            backgroundColor:
                              theme === "dark" ? "#1E293B" : "white",
                            border:
                              theme === "dark" ? "1px solid #475569" : "none",
                            borderRadius: "0.75rem",
                            boxShadow:
                              theme === "dark"
                                ? "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)"
                                : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
                            padding: "1rem",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          content={() => (
                            <div
                              className={`flex justify-center gap-4 mt-4 text-sm ${
                                theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-600"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full bg-purple-500`}
                                ></div>
                                <span>Neural2</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full bg-blue-500`}
                                ></div>
                                <span>Wavenet</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full bg-emerald-500`}
                                ></div>
                                <span>Standard</span>
                              </div>
                            </div>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gender Distribution */}
                <div>
                  <h3
                    className={`text-sm font-medium mb-4 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Voice Gender Distribution
                  </h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Female",
                              value:
                                ttsStats.voiceGenderDistribution.female.count,
                            },
                            {
                              name: "Male",
                              value:
                                ttsStats.voiceGenderDistribution.male.count,
                            },
                          ]}
                          cx="50%"
                          cy="45%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => {
                            const [humanName] = name.split(" • ");
                            return `${humanName} (${(percent * 100).toFixed(
                              0
                            )}%)`;
                          }}
                          labelStyle={{
                            fill: theme === "dark" ? "#E5E7EB" : "#374151",
                          }}
                          activeShape={{ outline: "none" }}
                          activeIndex={[]}
                          isAnimationActive={false}
                        >
                          <Cell fill="#EC4899" /> {/* Pink-500 for Female */}
                          <Cell fill="#6366F1" /> {/* Indigo-500 for Male */}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            <div key="tooltip" className="space-y-1">
                              <div className="font-medium">
                                {value.toLocaleString()} plays
                              </div>
                              <div className="text-xs opacity-80">
                                {name} voices
                              </div>
                            </div>,
                          ]}
                          contentStyle={{
                            backgroundColor:
                              theme === "dark" ? "#1F2937" : "white",
                            border: "none",
                            borderRadius: "0.5rem",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            padding: "0.75rem",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          content={() => (
                            <div
                              className={`flex justify-center gap-4 mt-4 text-sm ${
                                theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-600"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full bg-pink-500`}
                                ></div>
                                <span>Female</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full bg-indigo-500`}
                                ></div>
                                <span>Male</span>
                              </div>
                            </div>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Article Analytics */}
            <div
              className={`p-6 rounded-xl shadow-md ${
                theme === "dark"
                  ? "bg-gray-800/50 border border-gray-700/50"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className={`text-lg font-bold tracking-tight ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Article Analytics
                  </h2>
                  <p
                    className={`mt-1 text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Top 10 most accessed articles with sentence-level engagement
                    heatmap
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ttsStats.uniqueArticles.size} unique articles
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Article ID & Heatmap
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Plays
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Characters
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Cost
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Sentences
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      theme === "dark"
                        ? "divide-gray-700/50"
                        : "divide-gray-200"
                    }`}
                  >
                    {ttsStats.topArticles.map((article, index) => (
                      <tr
                        key={article.id}
                        className={`transition-colors duration-200 ${
                          theme === "dark"
                            ? "hover:bg-gray-700/70"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td
                          className={`py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          <div className="flex items-start">
                            <FaNewspaper
                              className={`mr-2 mt-1 ${
                                theme === "dark"
                                  ? "text-gray-500"
                                  : "text-gray-400"
                              }`}
                            />
                            <div className="flex-1">
                              <ArticleIdWrapper
                                articleId={article.id}
                                theme={theme}
                              />
                            </div>
                          </div>
                        </td>
                        <td
                          className={`py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {article.plays.toLocaleString()}
                        </td>
                        <td
                          className={`py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {article.characters.toLocaleString()}
                        </td>
                        <td
                          className={`py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          ${article.cost.toFixed(4)}
                        </td>
                        <td
                          className={`py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {article.uniqueSentences}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Usage Stats */}
            <div
              className={`p-6 rounded-xl shadow-md ${
                theme === "dark"
                  ? "bg-gray-800/50 border border-gray-700/50"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className={`text-lg font-bold tracking-tight ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    User Analytics
                  </h2>
                  <p
                    className={`mt-1 text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Top 10 most active users
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ttsStats.uniqueUsers.size} unique users
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        User ID
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Plays
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Characters
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Cost
                      </th>
                      <th
                        scope="col"
                        className={`px-4 py-3.5 text-left text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-900"
                        }`}
                      >
                        Articles
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      theme === "dark"
                        ? "divide-gray-700/50"
                        : "divide-gray-200"
                    }`}
                  >
                    {ttsStats.topUsers.map((user, index) => (
                      <tr
                        key={user.id}
                        className={`transition-colors duration-200 ${
                          theme === "dark"
                            ? "hover:bg-gray-700/70"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td
                          className={`py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          <UserIdWrapper userId={user.id} theme={theme} />
                        </td>
                        <td
                          className={`py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {user.plays.toLocaleString()}
                        </td>
                        <td
                          className={`py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {user.characters.toLocaleString()}
                        </td>
                        <td
                          className={`py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          ${user.cost.toFixed(4)}
                        </td>
                        <td
                          className={`py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-900"
                          }`}
                        >
                          {user.uniqueArticles}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Reading Patterns Analysis */}
          <div
            className={`p-6 rounded-xl shadow-md mt-6 ${
              theme === "dark"
                ? "bg-gray-800/50 border border-gray-700/50"
                : "bg-white border border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2
                  className={`text-lg font-bold tracking-tight ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  Reading Behavior Analysis
                </h2>
                <p
                  className={`mt-1 text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  User interaction patterns and sentence repetition metrics
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-6">
              <div
                className={`p-4 rounded-lg ${
                  theme === "dark"
                    ? "bg-gray-700/50 hover:bg-gray-700/70"
                    : "bg-gray-50"
                }`}
              >
                <h3
                  className={`text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Reading Pattern
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      Sequential Reads
                    </span>
                    <span
                      className={`font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      {ttsStats.readingPatterns.sequentialReads}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      Jump Reads
                    </span>
                    <span
                      className={`font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      {ttsStats.readingPatterns.jumpReads}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg ${
                  theme === "dark"
                    ? "bg-gray-700/50 hover:bg-gray-700/70"
                    : "bg-gray-50"
                }`}
              >
                <h3
                  className={`text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Repetition Analysis
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span
                      className={
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }
                    >
                      Avg. Repeats
                    </span>
                    <span
                      className={`font-medium ${
                        theme === "dark" ? "text-gray-200" : "text-gray-900"
                      }`}
                    >
                      {ttsStats.sentenceRepetition.averageRepeats.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="">
              <h3
                className={`text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Most Repeated Sentences
              </h3>
              <div className="space-y-2">
                {ttsStats.sentenceRepetition.mostRepeated.map(
                  (sentence, index) => (
                    <div
                      key={`${sentence.article_id}-${sentence.sentence_index}`}
                      className={`p-2 sm:p-3 rounded-lg ${
                        theme === "dark"
                          ? "bg-gray-700/50 hover:bg-gray-700/70"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <ArticleIdWrapper
                            articleId={sentence.article_id}
                            theme={theme}
                          />
                          <span
                            className={`text-xs ${
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
                          >
                            Sentence {sentence.sentence_index}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm">
                          <span
                            className={`font-bold ${
                              theme === "dark"
                                ? "text-gray-200"
                                : "text-gray-900"
                            }`}
                          >
                            {sentence.count}
                          </span>
                          <span
                            className={`ml-1 ${
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
                          >
                            plays
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 