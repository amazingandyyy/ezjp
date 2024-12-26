'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaGoogle, FaCheck, FaNewspaper, FaLanguage, FaHeart, FaSync, FaMoon } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import Image from 'next/image';

export default function JoinPage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [expandedBenefit, setExpandedBenefit] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const themeParam = params.get('theme');
      if (themeParam === 'dark' || themeParam === 'light') {
        setTheme(themeParam);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(themeParam);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkIfDesktop();
    window.addEventListener('resize', checkIfDesktop);
    
    return () => window.removeEventListener('resize', checkIfDesktop);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
    
    // Update URL parameter without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('theme', newTheme);
    window.history.replaceState({}, '', url);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Left Side - Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-gray-50/50 to-gray-100/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900/30 pb-[calc(200px+env(safe-area-inset-bottom,24px))] lg:pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-12">
          {/* Logo */}
          <div className="flex justify-center mb-8 lg:mb-12">
            <div
              onClick={() => window.location.href = '/'}
              className="cursor-pointer flex items-center justify-center text-2xl hover:opacity-90 active:scale-95 transition-all duration-300 text-gray-900 dark:text-white"
              title="EZJP News"
            >
              <span className="font-extrabold flex items-center tracking-tight">
                EZ
                <Image
                  src="/icons/ezjp-app.png"
                  alt="EZJP Logo"
                  width={32}
                  height={32}
                  className="mx-1.5"
                />
                JP
              </span>
            </div>
          </div>

          {/* Testimonial Quote */}
          <div className="mb-12 lg:mb-20 relative">
            <div className="relative p-10 bg-gradient-to-br from-white/95 via-white/90 to-gray-50/80 dark:from-gray-800/95 dark:via-gray-800/90 dark:to-gray-800/80 rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)] backdrop-blur-sm border border-gray-100/50 dark:border-gray-700/30 transition-all duration-300">
              <div className="absolute top-6 left-6 text-7xl text-green-500/10 dark:text-green-400/10 font-serif select-none">"</div>
              <div className="relative">
                <p className="text-lg text-gray-600 dark:text-gray-300 italic space-y-4 leading-relaxed">
                  <span className="block">"I'm Andy. In 2024, I've been immersed in learning Japanese, reaching
                  <a 
                    href="https://www.duolingo.com/profile/amazingandyyy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 font-medium"
                  > 160K+ XP on Duolingo</a> in 9 months. The joy of understanding a new language inspires me to practice daily, and I wanted to complement this learning with real Japanese content.</span>

                  <span className="block">I tried various resources - news sites, books, Netflix, manga - searching for a way to apply what I've learned. 
                  Yet I found myself wanting a more refined approach to reading practice that would naturally fit into my daily routine.</span>

                  <span className="block">Looking at existing Japanese news readers left me unsatisfied - they are simply too greedy and hard to use. 
                  As a software engineer, I knew I could build something better.</span>

                  <span className="block">So I built EZJP News with love - a simple way to read Japanese news that just works. 
                  Let's build our confidence in Japanese, one article at a time (with continuing Duolingo daily streak of course).</span>
                </p>
                <div className="mt-6 flex justify-end items-center">
                  <div className="text-right">
                    <div className="text-base font-semibold text-gray-900 dark:text-white tracking-wide">
                      <a 
                        href="https://amazingandyyy.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-green-600 dark:hover:text-green-400 transition-colors duration-200"
                      >
                        Andy Chen
                      </a>
                    </div>
                    <div className="text-sm text-gray-500/90 dark:text-gray-400/90">Creator of EZJP News</div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className="p-0.5 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/30 rounded-full">
                      <Image
                        src="/icons/amazingandyyy-duolingo-profile.png"
                        alt="Andy Chen"
                        width={40}
                        height={40}
                        className="rounded-full ring-2 ring-white dark:ring-gray-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Why EZJP */}
          <div className="mb-12 lg:mb-20">
            <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white mb-10 tracking-tight">
              My Goal with EZJP
            </h2>
            <div className="space-y-5">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center mt-0.5 shadow-sm">
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">1</span>
                </div>
                <p className="flex-1 text-lg text-gray-600 dark:text-gray-300">
                  Make <span className="font-bold text-gray-900 dark:text-white">using Japanese fun</span> with fresh and useful content that matters today
                </p>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center mt-0.5 shadow-sm">
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">2</span>
                </div>
                <p className="flex-1 text-lg text-gray-600 dark:text-gray-300">
                  We'll stay <span className="font-bold text-gray-900 dark:text-white">inspired together</span> by tracking our progress and celebrating every win
                </p>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center mt-0.5 shadow-sm">
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">3</span>
                </div>
                <p className="flex-1 text-lg text-gray-600 dark:text-gray-300">
                  Together, we'll build a <span className="font-bold text-gray-900 dark:text-white">daily reading habit</span> with fresh, interesting content we love
                </p>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center mt-0.5 shadow-sm">
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">4</span>
                </div>
                <p className="flex-1 text-lg text-gray-600 dark:text-gray-300">
                  Read <span className="font-bold text-gray-900 dark:text-white">real Japanese news</span> that matters to Japanese people today
                </p>
              </div>
            </div>
          </div>

          {/* The Solution */}
          <div className="text-center mb-12 lg:mb-20">
            <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 sm:text-6xl mb-3">
              The New Routine
            </h1>
            <div className="mt-8 flex justify-center gap-10 items-center">
              <div className="text-center transform hover:scale-105 transition-transform duration-300">
                <Image
                  src="/icons/duolingo-app.svg"
                  alt="Duolingo App"
                  width={72}
                  height={72}
                  className="mx-auto mb-4 rounded-2xl shadow-lg"
                />
                <h3 className="font-black text-xl text-gray-900 dark:text-white tracking-tight">Duolingo</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Daily Practice</p>
              </div>
              <div className="text-2xl font-medium text-gray-400">+</div>
              <div className="text-center transform hover:scale-105 transition-transform duration-300">
                <div className="w-[72px] h-[72px] bg-white dark:bg-transparent rounded-2xl shadow-lg mx-auto mb-4 p-1">
                  <Image
                    src="/icons/ezjp-app.png"
                    alt="EZJP App"
                    width={72}
                    height={72}
                    className="w-full h-full"
                  />
                </div>
                <h3 className="font-black text-xl text-gray-900 dark:text-white tracking-tight">EZJP News</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Daily News</p>
              </div>
            </div>
            <p className="mt-8 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Reading authentic Japanese content is the key to natural language acquisition. By exposing yourself to real Japanese news daily, 
              you'll start recognizing patterns, understanding context, and thinking in Japanese naturally.
              <a 
                href="https://blog.duolingo.com/how-your-brain-finds-patterns/"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-3 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
              >
                Learn about the science of language immersion →
              </a>
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 gap-6 lg:gap-8 mb-12 lg:mb-20">
            <div className="relative p-8 bg-gradient-to-br from-white via-white/95 to-gray-50/90 dark:from-gray-800/95 dark:via-gray-800/90 dark:to-gray-800/80 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/30 transition-all duration-300 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <FaLanguage className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    Daily Duolingo
                  </h3>
                  <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                    Keep your streak alive with daily lessons. Consistent practice is crucial – but it's just the first step.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative p-8 bg-gradient-to-br from-white via-white/95 to-gray-50/90 dark:from-gray-800/95 dark:via-gray-800/90 dark:to-gray-800/80 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/30 transition-all duration-300 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <FaNewspaper className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    Read More News
                  </h3>
                  <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                    Make reading Japanese news your daily joy. Discover Japanese culture through fresh, engaging content while naturally improving your language skills.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mb-12 lg:mb-20">
            <h2 className="text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 mb-10 tracking-tight">
              Features to Keep Us Going
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {[
                {
                  icon: (
                    <FaMoon className="h-6 w-6 text-indigo-500/90 dark:text-indigo-400/90 group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
                  ),
                  title: "Dark Mode",
                  description:
                    "Toggle between light and dark mode for comfortable reading day and night",
                  longDescription:
                    "Protect your eyes with our carefully crafted dark mode. Perfect for late-night reading sessions and reducing eye strain. Click anywhere on this card to try it out!",
                  bgColor: "bg-indigo-50/30 dark:bg-indigo-900/20",
                  iconBg: "bg-indigo-100/50 dark:bg-indigo-900/30",
                  hoverBg: "hover:bg-indigo-100/50 dark:hover:bg-indigo-800/30",
                  onClick: () => {
                    toggleTheme();
                    setExpandedBenefit(0);
                  }
                },
                {
                  icon: (
                    <FaHeart className="h-6 w-6 text-rose-500/90 dark:text-rose-400/90 group-hover:text-rose-600 dark:group-hover:text-rose-300" />
                  ),
                  title: "Save Articles",
                  description:
                    "Bookmark interesting articles to read later and continue where you left off",
                  longDescription: 
                    "Save articles that match your interests and reading level. Pick up exactly where you left off with automatic progress tracking. Create custom reading lists for different topics or difficulty levels, making it easy to organize your learning journey.",
                  bgColor: "bg-rose-50/30 dark:bg-rose-900/20",
                  iconBg: "bg-rose-100/50 dark:bg-rose-900/30",
                  hoverBg: "hover:bg-rose-100/50 dark:hover:bg-rose-800/30"
                },
                {
                  icon: (
                    <FaCheck className="h-6 w-6 text-emerald-500/90 dark:text-emerald-400/90 group-hover:text-emerald-600 dark:group-hover:text-emerald-300" />
                  ),
                  title: "Learning Statistics",
                  description:
                    "Track your reading progress with detailed statistics and learning history",
                  longDescription:
                    "Monitor your learning journey with comprehensive statistics. Track the number of articles read, time spent reading, and vocabulary exposure. Visualize your progress over time and identify areas where you're improving most rapidly.",
                  bgColor: "bg-emerald-50/30 dark:bg-emerald-900/20",
                  iconBg: "bg-emerald-100/50 dark:bg-emerald-900/30",
                  hoverBg: "hover:bg-emerald-100/50 dark:hover:bg-emerald-800/30"
                },
                {
                  icon: (
                    <FaSync className="h-6 w-6 text-sky-500/90 dark:text-sky-400/90 group-hover:text-sky-600 dark:group-hover:text-sky-300" />
                  ),
                  title: "Sync Across Devices",
                  description:
                    "Access your bookmarks, preferences, and progress on device, any time",
                  longDescription:
                    "Seamlessly switch between your phone, tablet, or computer. Your reading progress, bookmarks, and preferences automatically sync across all your devices. Start reading on your phone during commute and continue on your computer at home, any time.",
                  bgColor: "bg-sky-50/30 dark:bg-sky-900/20",
                  iconBg: "bg-sky-100/50 dark:bg-sky-900/30",
                  hoverBg: "hover:bg-sky-100/50 dark:hover:bg-sky-800/30"
                }
              ].map((benefit, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (benefit.onClick) {
                      benefit.onClick();
                    } else {
                      setExpandedBenefit(expandedBenefit === index ? null : index);
                    }
                  }}
                  className={`p-6 ${benefit.bgColor} ${benefit.hoverBg} rounded-lg transition-all duration-300 ease-in-out group cursor-pointer overflow-hidden`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 ${benefit.iconBg} rounded-lg transition-all duration-300 ease-in-out flex-shrink-0 sticky top-0`}>
                      {benefit.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        {benefit.title}
                      </h3>
                      <div className="relative">
                        <p className={`mt-1 text-sm font-medium text-gray-600 dark:text-gray-400 transition-all duration-500 ease-in-out overflow-hidden ${
                          expandedBenefit === index ? 'line-clamp-none' : 'line-clamp-1'
                        }`}>
                          {expandedBenefit === index || isDesktop ? benefit.longDescription : benefit.description}
                        </p>
                        {expandedBenefit !== index && !isDesktop && (
                          <button className="text-sm text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 mt-1 transition-colors duration-200">
                            Read more...
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Follow Note */}
          <div className="text-center mb-8 lg:mb-16">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ✨ At minimum... Follow my 
              <a 
                href="https://www.duolingo.com/profile/amazingandyyy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 font-medium mx-1"
              >
                Duolingo
              </a>
              because streaks 🔥 are better with friends! 🤓 😉 ✨
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Fixed Sign In */}
      <div className="lg:w-[450px] w-full fixed lg:sticky lg:top-0 bottom-0 left-0 right-0 bg-gradient-to-br from-white via-white to-gray-50/90 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/90 flex flex-col justify-center items-center lg:p-12 p-6 pb-[calc(2rem+env(safe-area-inset-bottom,24px))] lg:pb-12 lg:border-l border-t lg:border-t-0 border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] lg:shadow-none">
        <div className="w-full max-w-sm flex flex-col min-h-[120px] lg:min-h-fit">
          <div className="flex-1">
            <div className="flex flex-col lg:flex-col items-center text-center">
              <div className="flex-1 mb-4 lg:mb-8">
                <h2 className="text-2xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 tracking-tight">
                  Let's Continue
                </h2>
                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300 mt-1 lg:mt-2">
                  Sustain the rewarding language learning routine
                </p>
                <p className="text-sm font-medium text-green-600 dark:text-green-500 mt-1 hidden lg:block">
                  Reading should be a free right
                </p>
              </div>
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center px-6 py-3 lg:py-4 border border-transparent 
                  text-base font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
                  transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <FaGoogle className="w-5 h-5 mr-2 lg:mr-3" />
                <span className="sm:hidden">Sign in</span>
                <span className="hidden sm:inline">Continue with </span>
                <span className='pl-1'>Google</span>
              </button>
            </div>
          </div>
          <p className="text-[9px] lg:text-sm text-center text-gray-500/70 dark:text-gray-400/70 mt-auto pt-4 leading-tight">
            By signing up, you agree to the Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
} 