'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { FaUser, FaLanguage, FaGlobe, FaFlag, FaCheck } from 'react-icons/fa';
import Image from 'next/image';
import { SUPPORTED_LANGUAGES, JLPT_LEVELS } from '@/lib/constants';
import { useTranslation } from '@/lib/hooks/useTranslation';

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
  { id: 'N5', label: 'N5 (Beginner)' },
  { id: 'N4', label: 'N4 (Basic)' },
  { id: 'N3', label: 'N3 (Intermediate)' },
  { id: 'N2', label: 'N2 (Advanced)' },
  { id: 'N1', label: 'N1 (Expert)' }
];

const DAILY_GOALS = [
  { id: 5, label: '5 minutes' },
  { id: 10, label: '10 minutes' },
  { id: 15, label: '15 minutes' },
  { id: 30, label: '30 minutes' },
  { id: 60, label: '1 hour' }
];

const ARTICLE_GOALS = [
  { id: 1, label: '1 article' },
  { id: 3, label: '3 articles' },
  { id: 5, label: '5 articles' },
  { id: 10, label: '10 articles' }
];

const STEP_MAPPING = {
  'language': 1,
  'profile': 2,
  'level': 3,
  'goals': 4
};

const STEP_NAMES = {
  1: 'language',
  2: 'profile',
  3: 'level',
  4: 'goals'
};

export default function OnboardingPage() {
  const { t } = useTranslation('onboarding');
  const router = useRouter();
  const { user, profile, loading, updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    japanese_level: '',
    ui_language: '',
    daily_reading_time_goal: 15,
    daily_article_goal: 3
  });
  const [stepStatus, setStepStatus] = useState({
    1: { completed: false, saving: false },
    2: { completed: false, saving: false },
    3: { completed: false, saving: false },
    4: { completed: false, saving: false }
  });
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('light');

  // Load profile data
  useEffect(() => {
    if (profile) {
      console.log('Loading profile data:', profile);
      setFormData({
        username: profile.username || '',
        japanese_level: profile.japanese_level || '',
        ui_language: profile.ui_language || '',
        daily_reading_time_goal: profile.daily_reading_time_goal || 15,
        daily_article_goal: profile.daily_article_goal || 3
      });
      
      // Set completed status for steps based on profile data
      setStepStatus(prev => ({
        1: { ...prev[1], completed: !!profile.ui_language },
        2: { ...prev[2], completed: !!profile.username },
        3: { ...prev[3], completed: !!profile.japanese_level },
        4: { ...prev[4], completed: !!profile.daily_reading_time_goal && !!profile.daily_article_goal }
      }));
    }
  }, [profile]);

  // Handle URL parameters for steps
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get('step');
    if (stepParam && STEP_MAPPING[stepParam]) {
      setCurrentStep(STEP_MAPPING[stepParam]);
    }
  }, []);

  // Update URL when step changes
  useEffect(() => {
    const stepName = STEP_NAMES[currentStep];
    const newUrl = `${window.location.pathname}?step=${stepName}`;
    window.history.replaceState({}, '', newUrl);
  }, [currentStep]);

  // Update the step navigation functions
  const goToStep = (step) => {
    // Only allow navigation to completed steps or the current step
    if (step < currentStep || step === currentStep || stepStatus[step - 1]?.completed) {
      setCurrentStep(step);
    }
  };

  // Handle immediate save for each option
  const handleOptionSelect = async (field, value) => {
    console.log('Saving option:', field, value);
    setError('');
    
    try {
      const updates = { [field]: value };
      console.log('Updating profile with:', updates);
      
      // For language selection, update immediately
      if (field === 'ui_language') {
        console.log('Setting UI language to:', value);
        // Force a reload of translations
        const updatedProfile = await updateProfile(updates, user.id);
        if (!updatedProfile) throw new Error(t('errors.updateFailed'));
        
        // Update form data and step status
        setFormData(prev => ({ ...prev, ui_language: value }));
        setStepStatus(prev => ({
          ...prev,
          [currentStep]: { completed: true, saving: false }
        }));
        
        // Log the current state
        console.log('Updated profile:', updatedProfile);
        console.log('Current form data:', formData);
        console.log('Current step status:', stepStatus);
        return;
      }
      
      // For username, check if it's available
      if (field === 'username') {
        if (!value.trim()) {
          throw new Error(t('errors.username.required'));
        }
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', value)
          .neq('id', user.id)
          .single();

        if (existingUser) {
          throw new Error(t('errors.username.taken'));
        }
      }

      // For Japanese level, validate the value
      if (field === 'japanese_level' && !JAPANESE_LEVELS.some(level => level.id === value)) {
        throw new Error(t('errors.level.invalid'));
      }

      const updatedProfile = await updateProfile(updates, user.id);
      if (!updatedProfile) throw new Error(t('errors.updateFailed'));

      // Update form data and step status
      setFormData(prev => ({ ...prev, [field]: value }));
      setStepStatus(prev => ({
        ...prev,
        [currentStep]: { completed: true, saving: false }
      }));

    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      setError(err.message);
    }
  };

  // Handle final step completion
  const handleComplete = async () => {
    try {
      // If on the reading time step, mark all steps complete and go to explore
      if (currentStep === 4) {
        setStepStatus({
          1: { completed: true, saving: false },
          2: { completed: true, saving: false },
          3: { completed: true, saving: false },
          4: { completed: true, saving: false }
        });
        router.push("/explorer");
        return;
      }

      const updates = {
        onboarding_completed: true
      };
      
      const updatedProfile = await updateProfile(updates, user.id);
      if (!updatedProfile) throw new Error(t('errors.updateFailed'));
      
      router.push('/');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError(err.message);
    }
  };

  // Add debug logs
  console.log('Current profile:', profile);
  console.log('Current UI language:', profile?.ui_language);
  
  // Test translation
  useEffect(() => {
    console.log('Testing translations:');
    console.log('Reading Time Title:', t('goalsStep.readingTime.title'));
    console.log('Reading Time Description:', t('goalsStep.readingTime.description'));
    console.log('Articles Title:', t('goalsStep.articles.title'));
  }, [t, profile?.ui_language]);

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
              {t('welcome.title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {t('welcome.subtitle')}
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
                <div 
                  key={step} 
                  className="flex flex-col items-center relative z-10"
                  onClick={() => goToStep(step)}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      stepStatus[step].completed || currentStep === step
                        ? 'bg-green-500 text-white ring-2 ring-green-100 dark:ring-green-500/20 shadow-lg shadow-green-500/20 dark:shadow-green-500/10'
                        : 'bg-white text-gray-400 dark:bg-gray-800 dark:text-gray-500 ring-2 ring-gray-100 dark:ring-gray-700'
                    } hover:scale-105 active:scale-95 transition-transform`}
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
                    } hover:text-green-600 dark:hover:text-green-400`}
                  >
                    {t(`steps.${
                      step === 1 ? 'language' : 
                      step === 2 ? 'profile' : 
                      step === 3 ? 'level' : 
                      'goals'
                    }`)}
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
                  {t(`errors.${error}`)}
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
                      {t('languageStep.title')}
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    {t('languageStep.description')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {INTERFACE_LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => handleOptionSelect('ui_language', lang.id)}
                        className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 text-sm sm:text-base ${
                          formData.ui_language === lang.id
                            ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500/50 dark:bg-green-500/10 dark:border-green-400/30 dark:text-green-300 dark:ring-green-400/20'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Username */}
              {currentStep === 2 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-500/20 dark:to-green-500/10 ring-1 ring-green-100 dark:ring-green-500/20">
                      <FaUser className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {t('profileStep.title')}
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    {t('profileStep.description')}
                  </p>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    onBlur={() => handleOptionSelect('username', formData.username)}
                    placeholder={t('profileStep.username.placeholder')}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-500 bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 dark:bg-gray-800/60 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:ring-green-500/20 dark:focus:border-green-400 transition-colors"
                  />
                </div>
              )}

              {/* Step 3: Japanese Level */}
              {currentStep === 3 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-500/20 dark:to-green-500/10 ring-1 ring-green-100 dark:ring-green-500/20">
                      <FaLanguage className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {t('levelStep.title')}
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    {t('levelStep.description')}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {JAPANESE_LEVELS.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => handleOptionSelect('japanese_level', level.id)}
                        className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 text-sm sm:text-base ${
                          formData.japanese_level === level.id
                            ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500/50 dark:bg-green-500/10 dark:border-green-400/30 dark:text-green-300 dark:ring-green-400/20'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Daily Goals */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-500/20 dark:to-green-500/10 ring-1 ring-green-100 dark:ring-green-500/20">
                      <FaFlag className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {t('goalsStep.title')}
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    {t('goalsStep.description')}
                  </p>

                  {/* Daily Reading Time Goal */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('goalsStep.readingTime.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('goalsStep.readingTime.description')}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {DAILY_GOALS.map((goal) => (
                        <button
                          key={goal.id}
                          onClick={() => handleOptionSelect('daily_reading_time_goal', goal.id)}
                          className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 text-sm sm:text-base ${
                            formData.daily_reading_time_goal === goal.id
                              ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500/50 dark:bg-green-500/10 dark:border-green-400/30 dark:text-green-300 dark:ring-green-400/20'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          {t(`goalsStep.readingTime.${goal.id}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Daily Article Goal */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('goalsStep.articles.title')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('goalsStep.articles.description')}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {ARTICLE_GOALS.map((goal) => (
                        <button
                          key={goal.id}
                          onClick={() => handleOptionSelect('daily_article_goal', goal.id)}
                          className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 text-sm sm:text-base ${
                            formData.daily_article_goal === goal.id
                              ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500/50 dark:bg-green-500/10 dark:border-green-400/30 dark:text-green-300 dark:ring-green-400/20'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          {t(`goalsStep.articles.${goal.id}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {currentStep > 1 && (
              <button
                onClick={() => goToStep(currentStep - 1)}
                className="px-4 sm:px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700/50 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:border-gray-600 transition-colors text-sm sm:text-base whitespace-nowrap"
              >
                {t('buttons.back')}
              </button>
            )}
            <button
              onClick={currentStep === 4 ? handleComplete : () => goToStep(currentStep + 1)}
              className="flex-1 px-8 sm:px-10 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 dark:from-green-500 dark:to-green-400 dark:hover:from-green-600 dark:hover:to-green-500 text-white shadow-sm transition-all duration-200 text-sm sm:text-base font-medium whitespace-nowrap"
            >
              {currentStep === 4 ? t('buttons.finish') : t('buttons.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 