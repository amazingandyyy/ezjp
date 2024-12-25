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
              className={`absolute top-full right-0 mt-2 p-4 rounded-lg shadow-lg border w-72
              ${theme === "dark"
                ? "bg-gray-800 border-gray-700 text-gray-100"
                : "[color-scheme:light] bg-white border-gray-200 text-[rgb(19,31,36)]"
              }`}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    Signed in as
                  </p>
                  <p className={`font-medium ${theme === "dark" ? "text-gray-100" : "text-[rgb(19,31,36)]"}`}>
                    {profile?.username || user.email}
                  </p>
                  <button
                    onClick={() => router.push(`/user/${encodeURIComponent(profile?.username || user.email)}`)}
                    className={`w-full px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2 ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    <FaUserCircle className="w-4 h-4" />
                    My Profile
                  </button>
                  <button
                    onClick={() => router.push('/saved')}
                    className={`w-full px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2 ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    <FaHeart className="w-4 h-4" />
                    Saved News
                  </button>
                  <button
                    onClick={signOut}
                    className={`w-full px-3 py-1.5 rounded text-sm ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    Sign Out
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