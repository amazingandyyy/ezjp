import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBook, FaUserCircle, FaHeart } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';

export default function Navbar({ 
  showSidebar, 
  onSidebarToggle,
  theme,
  hideNewsListButton = false
}) {
  const router = useRouter();
  const { user, profile, signInWithGoogle, signOut } = useAuth();
  const profileRef = useRef(null);
  const [showProfile, setShowProfile] = useState(false);

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }

    // Only add the event listener if the profile dropdown is open
    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProfile]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16">
      {/* Left side - Menu button */}
      <div className="fixed top-4 left-4">
        {!hideNewsListButton && (
          <button
            onClick={() => onSidebarToggle(!showSidebar)}
            className={`p-3 rounded-lg shadow-lg border flex items-center justify-center 
              transition-colors duration-150
              ${theme === 'dark'
                ? 'bg-gray-800/95 hover:bg-gray-700/95 border-gray-700 backdrop-blur-sm'
                : '[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200 backdrop-blur-sm'
              }`}
            title={showSidebar ? "Hide News List" : "Show News List"}
          >
            <svg 
              className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" 
              />
            </svg>
          </button>
        )}
      </div>

      {/* Center - Logo */}
      <div className="flex justify-center items-center h-full">
        <div
          onClick={() => router.push("/")}
          className={`cursor-pointer p-3 px-4 rounded-full border flex items-center justify-center 
            letter-spacing-wide duration-150 border-none text-2xl hover:opacity-80 active:scale-95 transition-all
            ${theme === 'dark'
              ? 'bg-gray-[19,31,36] bg-opacity-90 backdrop-blur-sm text-white'
              : '[color-scheme:light] bg-white bg-opacity-70 backdrop-blur-sm text-black'
            }`}
          title="EZJP News"
        >
          <span className="pl-1 font-extrabold flex items-center">
            EZ
            <FaBook
              className={`px-1 w-8 h-8 ${
                theme === 'dark' ? 'text-green-700' : 'text-green-600'
              }`}
            />
            JP
          </span>
        </div>
      </div>

      {/* Right side - Profile button */}
      <div className="fixed top-4 right-4">
        <div ref={profileRef}>
          <button
            onClick={() => {
              if (!user) {
                signInWithGoogle();
              } else {
                setShowProfile(!showProfile);
              }
            }}
            className={`p-3 rounded-lg shadow-lg border flex items-center justify-center transition-colors duration-150 ${
              theme === "dark"
                ? showProfile
                  ? "bg-gray-700/95 border-gray-700 backdrop-blur-sm"
                  : "bg-gray-800/95 hover:bg-gray-700/95 border-gray-700 backdrop-blur-sm"
                : showProfile
                ? "[color-scheme:light] bg-gray-50/95 border-gray-200 backdrop-blur-sm"
                : "[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200 backdrop-blur-sm"
            }`}
            title={user ? "Profile" : "Sign In"}
          >
            <FaUserCircle
              className={`w-5 h-5 ${
                theme === "dark"
                  ? "text-gray-300"
                  : "[color-scheme:light] text-gray-600"
              }`}
            />
          </button>

          {/* Profile panel - only shown when user is logged in and panel is open */}
          {user && showProfile && (
            <div
              className={`absolute top-full right-0 mt-2 p-4 rounded-lg shadow-xl border w-72
              ${theme === "dark"
                ? "bg-gray-800/95 border-gray-700/50 backdrop-blur-sm"
                : "[color-scheme:light] bg-white/95 border-gray-200/50 backdrop-blur-sm"
              }`}
            >
              <div className="space-y-6">
                {/* User info section */}
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200/10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                    ${theme === "dark" 
                      ? "bg-gray-700 text-gray-300" 
                      : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${theme === "dark" ? "text-gray-100" : "text-[rgb(19,31,36)]"}`}>
                      {profile?.username || user.email}
                    </p>
                    <p className={`text-sm truncate ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      {profile?.username ? user.email : 'No username set'}
                    </p>
                  </div>
                </div>

                {/* Navigation section */}
                <div className="space-y-2">
                  <button
                    onClick={() => router.push(`/user/${encodeURIComponent(profile?.username || user.email)}`)}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors
                      ${theme === "dark"
                        ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                        : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                      }`}
                  >
                    <FaUserCircle className="w-4 h-4" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => router.push('/saved')}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors
                      ${theme === "dark"
                        ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                        : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                      }`}
                  >
                    <FaHeart className="w-4 h-4" />
                    <span>Saved News</span>
                  </button>
                </div>

                {/* Sign out section */}
                <div className="pt-4 border-t border-gray-200/10">
                  <button
                    onClick={signOut}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors
                      ${theme === "dark"
                        ? "hover:bg-red-500/10 text-red-400 hover:text-red-300"
                        : "hover:bg-red-50 text-red-600 hover:text-red-700"
                      }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 