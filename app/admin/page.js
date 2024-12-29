'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Navbar from '../components/Navbar';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from('tts_sessions')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('TTS Data:', { data, error });
        
        if (error) {
          console.error('Error fetching TTS data:', error);
          return;
        }
        
        setStats(data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [supabase]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="p-4 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Admin Dashboard</h1>
          {loading ? (
            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm">
              <div className="animate-pulse text-gray-600 dark:text-gray-400">Loading TTS data...</div>
            </div>
          ) : stats && stats.length > 0 ? (
            <pre className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm overflow-auto text-gray-900 dark:text-gray-100">
              {JSON.stringify(stats, null, 2)}
            </pre>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm">
              <p className="text-gray-600 dark:text-gray-400">No TTS data available</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
} 