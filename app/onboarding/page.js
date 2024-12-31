'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { FaUser, FaLanguage, FaGlobe, FaFlag, FaCheck } from 'react-icons/fa';
import Image from 'next/image';
import { SUPPORTED_LANGUAGES, JLPT_LEVELS } from '@/lib/constants';

// Convert SUPPORTED_LANGUAGES object to array format
const INTERFACE_LANGUAGES = Object.entries(SUPPORTED_LANGUAGES)
  .map(([id, label]) => ({ id, label }))
  .sort((a, b) => {
    // Keep English first, then sort others alphabetically
    if (a.id === 'en') return -1;
    if (b.id === 'en') return 1;
    return a.label.localeCompare(b.label);
  });

const JAPANESE_LEVELS = [
  { id: 'n5', label: 'N5 (Beginner)' },
  { id: 'n4', label: 'N4 (Basic)' },
  { id: 'n3', label: 'N3 (Intermediate)' },
  { id: 'n2', label: 'N2 (Advanced)' },
  { id: 'n1', label: 'N1 (Expert)' }
];

const DAILY_GOALS = [
  { id: 5, label: '5 minutes' },
  { id: 10, label: '10 minutes' },
  { id: 15, label: '15 minutes' },
  { id: 30, label: '30 minutes' },
  { id: 60, label: '1 hour' }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    japanese_level: '',
    interface_language: 'en',
    daily_goal_minutes: 15
  });
  const [stepStatus, setStepStatus] = useState({
    1: { completed: false, saving: false },
    2: { completed: false, saving: false },
    3: { completed: false, saving: false },
    4: { completed: false, saving: false }
  });
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (profile?.theme) {
      setTheme(profile.theme);
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/join');
    }
    if (profile?.onboarding_completed) {
      router.push('/');
    }
  }, [loading, user, profile, router]);

  const handleStepSave = async (step) => {
    setStepStatus(prev => ({
      ...prev,
      [step]: { ...prev[step], saving: true }
    }));
    setError('');

    try {
      const updates = {};
      switch (step) {
        case 1:
          if (!formData.username.trim()) {
            throw new Error('Username is required');
          }
          // Check if username is available
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', formData.username)
            .neq('id', user.id)
            .single();

          if (existingUser) {
            throw new Error('Username is already taken');
          }
          updates.username = formData.username;
          break;
        case 2:
          if (!formData.japanese_level) {
            throw new Error('Please select your Japanese level');
          }
          updates.japanese_level = formData.japanese_level;
          break;
        case 3:
          updates.interface_language = formData.interface_language;
          break;
        case 4:
          updates.daily_goal_minutes = formData.daily_goal_minutes;
          updates.onboarding_completed = true;
          break;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      setStepStatus(prev => ({
        ...prev,
        [step]: { completed: true, saving: false }
      }));

      if (step < 4) {
        setCurrentStep(step + 1);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err.message);
      setStepStatus(prev => ({
        ...prev,
        [step]: { ...prev[step], saving: false }
      }));
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div
            onClick={() => window.location.href = '/'}
            className="cursor-pointer flex items-center justify-center text-2xl hover:opacity-90 active:scale-95 transition-all duration-300"
            title="EZJP News"
          >
            <span className="font-extrabold flex items-center tracking-tight text-gray-900 dark:text-white">
              EZ
              <Image
                src="/icons/ezjp-app.png"
                alt="EZJP Logo"
                width={32}
                height={32}
                className="mx-1.5 dark:brightness-[100]"
              />
              JP
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
        <div className="flex-1 pt-20 pb-32">
          {/* Welcome Text */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2 sm:mb-3">
              Ready for Japanese News? 🎯
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              No more Google Translate adventures - let's make reading Japanese news fun! ✨
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-5">
            <div className="flex justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-4 sm:top-5 left-0 right-0 h-[2px] bg-gray-100 dark:bg-gray-800/60">
                <div
                  className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-green-600 to-green-500 dark:from-green-500 dark:to-green-400"
                  style={{ width: `${((currentStep - 1) * 100) / 3}%` }}
                />
              </div>

              {/* Progress Steps */}
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      stepStatus[step].completed || currentStep === step
                        ? 'bg-green-500 text-white ring-2 ring-green-100 dark:ring-green-500/20 shadow-lg shadow-green-500/20 dark:shadow-green-500/10'
                        : 'bg-white text-gray-400 dark:bg-gray-800 dark:text-gray-500 ring-2 ring-gray-100 dark:ring-gray-700'
                    }`}
                  >
                    {stepStatus[step].completed ? (
                      <FaCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold">{step}</span>
                    )}
                  </div>
                  <div 
                    className={`mt-2 text-[10px] sm:text-xs font-medium transition-colors duration-200 ${
                      stepStatus[step].completed || currentStep === step
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {step === 1 ? 'Language' : 
                     step === 2 ? 'Profile' : 
                     step === 3 ? 'Level' : 
                     'Goals'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="rounded-2xl shadow-sm p-6 sm:p-8 bg-white dark:bg-gray-800/40 dark:backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white/0 dark:from-gray-800/50 dark:to-gray-800/0 pointer-events-none"></div>
            <div className="relative">
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300 dark:border dark:border-red-500/20 text-sm">
                  {error}
                </div>
              )}

              {/* Step 1: Interface Language */}
              {currentStep === 1 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-500/20 dark:to-green-500/10 ring-1 ring-green-100 dark:ring-green-500/20">
                      <FaGlobe className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                      First Things First! 🌈
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    Before we dive into the exciting world of Japanese news, let's make sure you're comfy with the navigation. Pick your preferred language - we promise not to use any kanji here! 😉
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {INTERFACE_LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setFormData({ ...formData, interface_language: lang.id })}
                        className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 text-sm sm:text-base ${
                          formData.interface_language === lang.id
                            ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500/50 dark:bg-green-500/10 dark:border-green-400/30 dark:text-green-300 dark:ring-green-400/20'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        } flex items-center justify-center text-center min-h-[48px] sm:min-h-[56px]`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Buttons - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 sm:px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700/50 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:border-gray-600 transition-colors text-sm sm:text-base whitespace-nowrap"
              >
                ← Go Back
              </button>
            )}
            <button
              onClick={() => handleStepSave(currentStep)}
              disabled={stepStatus[currentStep].saving}
              className={`px-8 sm:px-10 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 dark:from-green-500 dark:to-green-400 dark:hover:from-green-600 dark:hover:to-green-500 text-white shadow-sm transition-all duration-200 text-sm sm:text-base font-medium whitespace-nowrap ${
                currentStep === 1 ? 'ml-auto' : ''
              } ${stepStatus[currentStep].saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {stepStatus[currentStep].saving 
                ? 'Working on it... 🚀' 
                : currentStep === 4 
                  ? "Time to Read! 🎉" 
                  : "Next Step! →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 