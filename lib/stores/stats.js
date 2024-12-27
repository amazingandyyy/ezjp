import { create } from 'zustand';
import { supabase } from '../supabase';

const STATS_TIMESTAMP_KEY = 'stats_last_updated';

const useStatsStore = create((set, get) => ({
  stats: {
    totalReadingTime: 0,
    totalArticlesRead: 0,
    totalSavedArticles: 0,
    totalFinishedArticles: 0,
    longestStreak: 0,
    currentStreak: 0,
    todayFinishedArticles: 0,
    dailyArticleGoal: 3,
    dailyReadingTimeGoal: 15
  },
  lastUpdated: null,
  isLoading: false,

  // Function to calculate streaks
  calculateStreaks: (finishedArticles) => {
    if (!finishedArticles?.length) return { longest: 0, current: 0 };

    const dates = finishedArticles.map(article => {
      const date = new Date(article.finished_at);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
    const uniqueDates = [...new Set(dates)].sort().reverse();

    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffTime = Math.abs(prevDate - currDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      currentStreak = 0;
    }

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(prevDate - currDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { longest: longestStreak, current: currentStreak };
  },

  // Function to fetch stats from the database
  fetchStats: async (userId) => {
    if (!userId) return;

    try {
      set({ isLoading: true });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const [
        readingStatsResponse,
        finishedArticlesResponse,
        finishedCountResponse,
        todayFinishedResponse,
        profileResponse
      ] = await Promise.all([
        supabase
          .from('reading_stats')
          .select('total_reading_time, total_articles_read')
          .eq('user_id', userId)
          .maybeSingle(),
        
        supabase
          .from('finished_articles')
          .select('finished_at')
          .eq('user_id', userId)
          .order('finished_at', { ascending: false }),
        
        supabase
          .from('finished_articles')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        
        supabase
          .from('finished_articles')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte('finished_at', todayStr),

        supabase
          .from('profiles')
          .select('daily_article_goal, daily_reading_time_goal')
          .eq('id', userId)
          .single()
      ]);

      const readingStats = readingStatsResponse.data;
      const finished = finishedArticlesResponse.data;
      const finishedCount = finishedCountResponse.count;
      const todayFinishedCount = todayFinishedResponse.count;
      const profileData = profileResponse.data;

      const streaks = get().calculateStreaks(finished || []);

      const newStats = {
        totalReadingTime: readingStats?.total_reading_time || 0,
        totalArticlesRead: readingStats?.total_articles_read || 0,
        totalFinishedArticles: finishedCount || 0,
        todayFinishedArticles: todayFinishedCount || 0,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        dailyArticleGoal: profileData?.daily_article_goal || 3,
        dailyReadingTimeGoal: profileData?.daily_reading_time_goal || 15
      };

      set({ 
        stats: newStats,
        lastUpdated: Date.now()
      });

      // Update localStorage timestamp
      localStorage.setItem(STATS_TIMESTAMP_KEY, Date.now().toString());

      // Dispatch event for cross-tab sync
      window.dispatchEvent(new CustomEvent('statsUpdated', {
        detail: { timestamp: Date.now() }
      }));

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Function to notify about stats changes
  notifyStatsChange: () => {
    const timestamp = Date.now();
    localStorage.setItem(STATS_TIMESTAMP_KEY, timestamp.toString());
    window.dispatchEvent(new CustomEvent('statsUpdated', {
      detail: { timestamp }
    }));
  }
}));

// Add storage event listener for cross-tab sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STATS_TIMESTAMP_KEY) {
      const newTimestamp = parseInt(e.newValue);
      const currentStore = useStatsStore.getState();
      
      // Only fetch if the new timestamp is more recent
      if (!currentStore.lastUpdated || newTimestamp > currentStore.lastUpdated) {
        const user = supabase.auth.user();
        if (user) {
          currentStore.fetchStats(user.id);
        }
      }
    }
  });
}

export default useStatsStore; 