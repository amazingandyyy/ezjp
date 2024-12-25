'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaGoogle, FaBook, FaNewspaper, FaLanguage, FaStar, FaBookmark, FaUserCircle, FaFire, FaUsers } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';

export default function JoinPage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Left Side - Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Logo and Hero Section */}
          <div className="text-center mb-16">
            <div className="flex justify-center items-center mb-6">
              <span className="text-4xl font-extrabold flex items-center">
                EZ
                <FaBook className="px-2 w-12 h-12 text-green-600 dark:text-green-500" />
                JP
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              The Best Way to Learn Japanese
            </h1>
            <p className="mt-3 text-xl text-gray-500 dark:text-gray-300">
              Combine Duolingo with real Japanese news for the perfect learning experience
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
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Start with Duolingo
                  </h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Use Duolingo to build your foundation in Japanese. Learn essential grammar,
                    vocabulary, and basic reading skills through structured lessons.
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
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Level Up with News
                  </h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Connect with Japanese culture through real news. Expose yourself to authentic
                    language and stay updated with Japan's latest stories.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Perfect Learning Combination
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              While Duolingo teaches you the basics, reading news helps you understand real Japanese
              context and culture. This combination is the key to true language mastery and have FUN!
              Learning Japanese shouldn't feel like a chore.
            </p>
          </div>

          {/* Benefits Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
              With an Account, You Can
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {/* Benefits cards... */}
              {[
                {
                  icon: <FaBookmark className="h-6 w-6 text-green-600 dark:text-green-500" />,
                  title: "Saved Articles",
                  description: "Save interesting articles to read later and track your reading progress"
                },
                {
                  icon: <FaUserCircle className="h-6 w-6 text-green-600 dark:text-green-500" />,
                  title: "Reader Profile",
                  description: "Create your profile and track your reading journey and achievements"
                },
                {
                  icon: <FaUsers className="h-6 w-6 text-green-600 dark:text-green-500" />,
                  title: "Learn Together",
                  description: "Connect with fellow Japanese learners, share progress, and motivate each other"
                },
                {
                  icon: <FaFire className="h-6 w-6 text-green-600 dark:text-green-500" />,
                  title: "Daily Streaks",
                  description: "Build a reading habit with daily streaks and compete with friends"
                },
                {
                  icon: <FaStar className="h-6 w-6 text-green-600 dark:text-green-500" />,
                  title: "Achievements",
                  description: "Unlock achievements and share your milestones with the community"
                }
              ].map((benefit, index) => (
                <div key={index} className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {benefit.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Fixed Sign In */}
      <div className="lg:w-[400px] w-full bg-white dark:bg-gray-800 flex flex-col justify-center items-center p-8 lg:border-l border-t lg:border-t-0 border-gray-200 dark:border-gray-700">
        <div className="w-full max-w-sm space-y-6 lg:space-y-8">
          <div className="text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Join Now - It's Free
            </h2>
            <div className="mt-2 space-y-2">
              <p className="text-gray-600 dark:text-gray-300">
                Start your Japanese learning journey today
              </p>
              <p className="text-sm font-medium text-green-600 dark:text-green-500">
                Free Forever • No Credit Card Required
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