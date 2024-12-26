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
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Left Side - Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div
              onClick={() => window.location.href = '/'}
              className="cursor-pointer flex items-center justify-center text-2xl hover:opacity-80 active:scale-95 transition-all text-gray-900 dark:text-white"
              title="EZJP News"
            >
              <span className="font-extrabold flex items-center">
                EZ
                <Image
                  src="/icons/ezjp-app.png"
                  alt="EZJP Logo"
                  width={32}
                  height={32}
                  className="mx-1"
                />
                JP
              </span>
            </div>
          </div>

          {/* Testimonial Quote */}
          <div className="mb-16 relative">
            <div className="relative p-8 bg-gradient-to-br from-white via-white/95 to-gray-50/90 dark:from-gray-800/95 dark:via-gray-800/90 dark:to-gray-800/80 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] backdrop-blur-sm border border-gray-100/50 dark:border-gray-700/30">
              <div className="absolute top-4 left-4 text-6xl text-green-500/10 dark:text-green-400/10 font-serif">"</div>
              <div className="relative">
                <p className="text-lg text-gray-600 dark:text-gray-300 italic space-y-4 leading-relaxed">
                  <span className="block">"Hey, I'm Andy! 2024 has been incredible - I dove deep into Duolingo and hit 
                  <a 
                    href="https://www.duolingo.com/profile/amazingandyyy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 font-medium"
                  > 160K+ XP in the first 8 months</a>! 
                  Learning new language is great, but I needed a way to prove I can actually use it!</span>

                  <span className="block">I panicked and desperately tried everything - random news sites, browsing Amazon 
                  for more books, Netflix subtitles, comic books, short story collections... I missed the simplicity of Duolingo's structured learning, but I also needed something 
                  to show that all these XP points meant something in the real world.</span>

                  <span className="block">Looking at Japanese news readers got me super excited - I saw so much potential! 
                  That's when inspiration struck - let's create something amazing that combines Duolingo's magic with 
                  real Japanese news. Learn, read, get excited about understanding more, and feel inspired to learn even more!</span>

                  <span className="block">And that's how EZJP News was born - turning this dream into reality for all of us! ✨</span>
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
          <div className="mb-16">
            <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white mb-8">
              My Goal with EZJP
            </h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5">
                  <span className="text-green-600 dark:text-green-400 text-sm">1</span>
                </div>
                <p className="flex-1 text-lg text-gray-600 dark:text-gray-300">
                  Make <span className="font-bold text-gray-900 dark:text-white">using Japanese fun</span> with fresh and useful content that matters today
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5">
                  <span className="text-green-600 dark:text-green-400 text-sm">2</span>
                </div>
                <p className="flex-1 text-lg text-gray-600 dark:text-gray-300">
                  We'll stay <span className="font-bold text-gray-900 dark:text-white">inspired together</span> by tracking our progress and celebrating every win
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5">
                  <span className="text-green-600 dark:text-green-400 text-sm">3</span>
                </div>
                <p className="flex-1 text-lg text-gray-600 dark:text-gray-300">
                  Together, we'll build a <span className="font-bold text-gray-900 dark:text-white">daily reading habit</span> with fresh, interesting content we love
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5">
                  <span className="text-green-600 dark:text-green-400 text-sm">4</span>
                </div>
                <p className="flex-1 text-lg text-gray-600 dark:text-gray-300">
                  We'll naturally <span className="font-bold text-gray-900 dark:text-white">discover Japanese culture</span> through daily news that connects us
                </p>
              </div>
            </div>
          </div>

          {/* The Solution */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white sm:text-6xl mb-2">
              Here's The Better Routine
            </h1>
            <div className="mt-6 flex justify-center gap-8 items-center">
              <div className="text-center">
                <Image
                  src="/icons/duolingo-app.svg"
                  alt="Duolingo App"
                  width={64}
                  height={64}
                  className="mx-auto mb-3 rounded-2xl"
                />
                <h3 className="font-black text-xl text-gray-900 dark:text-white">Duolingo</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Daily Practice</p>
              </div>
              <div className="text-2xl font-medium text-gray-400">+</div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white dark:bg-transparent rounded-xl shadow-xl mx-auto mb-3">
                  <Image
                    src="/icons/ezjp-app.png"
                    alt="EZJP App"
                    width={64}
                    height={64}
                    className="w-full h-full"
                  />
                </div>
                <h3 className="font-black text-xl text-gray-900 dark:text-white">EZJP News</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Daily News</p>
              </div>
            </div>
            <p className="mt-8 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Learning Japanese is great, but using it is even better. I've designed EZJP to help you read real Japanese content 
              that matters today. Let's make your Duolingo skills shine in the real world.
              <a 
                href="https://blog.duolingo.com/how-your-brain-finds-patterns/"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-3 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
              >
                See why learning together works so well →
              </a>
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 gap-8 mb-16">
            <div className="relative p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
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

            <div className="relative p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
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
          <div className="mb-16">
            <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white mb-8">
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
          <div className="text-center mb-16">
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
      <div className="lg:w-[400px] w-full bg-white dark:bg-gray-800 flex flex-col justify-center items-center p-8 lg:border-l border-t lg:border-t-0 border-gray-200 dark:border-gray-700">
        <div className="w-full max-w-sm space-y-6 lg:space-y-8">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white">
              Let's Continue
            </h2>
            <div className="mt-2 space-y-2">
              <p className="text-base text-gray-600 dark:text-gray-300">
                Sustain the rewarding language learning routine
              </p>
              <p className="text-sm font-medium text-green-600 dark:text-green-500">
                Reading should be a free right
              </p>
            </div>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent 
              text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
              transition-colors duration-150"
          >
            <FaGoogle className="w-5 h-5 mr-2" />
            Continue with Google
          </button>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
} 