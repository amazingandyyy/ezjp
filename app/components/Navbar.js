import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBook, FaUserCircle, FaHeart, FaDownload } from 'react-icons/fa';
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
  const [installPrompt, setInstallPrompt] = useState(null);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle install click
  const handleInstallClick = async () => {
    if (installPrompt) {
      // Show the install prompt
      installPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await installPrompt.userChoice;
      // Clear the saved prompt since it can't be used again
      setInstallPrompt(null);
      // Optionally track the outcome
      console.log(`User ${outcome} the installation`);
    } else {
      // Fallback for browsers that don't support install prompt
      window.location.href = '/manifest.json';
    }
  };

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
      <div
        className={`w-full h-full flex items-center justify-between px-4
        border-b-2 transition-all
        ${
          theme === "dark"
            ? "bg-gray-800 border-gray-600/50"
            : "[color-scheme:light] bg-white border-gray-200"
        }`}
      >
        {/* Left side - Menu button and Logo */}
        <div className="flex items-center gap-4">
          {!hideNewsListButton && (
            <button
              onClick={() => onSidebarToggle(!showSidebar)}
              className={`p-3 rounded-lg shadow-lg border flex items-center justify-center 
                transition-colors duration-150
                ${
                  theme === "dark"
                    ? "bg-gray-800/95 hover:bg-gray-700/95 border-gray-700"
                    : "[color-scheme:light] bg-white/95 hover:bg-gray-50/95 border-gray-200"
                }`}
              title={showSidebar ? "Hide News List" : "Show News List"}
            >
              <svg
                className={`w-5 h-5 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
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

          {/* Logo */}
          <div
            onClick={() => window.location.href = '/'}
            className={`cursor-pointer flex items-center justify-center 
              letter-spacing-wide text-2xl hover:opacity-80 active:scale-95 transition-all
              ${
                theme === "dark"
                  ? "text-white"
                  : "[color-scheme:light] text-black"
              }`}
            title="EZJP News"
          >
            <span className="font-extrabold flex items-center">
              EZ
              <FaBook
                className={`px-1 w-8 h-8 ${
                  theme === "dark" ? "text-green-500" : "text-green-600"
                }`}
              />
              JP
            </span>
          </div>
        </div>

        {/* Right side - Profile button */}
        <div>
          <div ref={profileRef}>
            <button
              onClick={() => {
                if (!user) {
                  router.push('/join');
                } else {
                  setShowProfile(!showProfile);
                }
              }}
              className={`p-2 px-4 rounded-lg flex items-center justify-center transition-all duration-150 
                ${
                user ? (
                  theme === "dark"
                    ? showProfile
                      ? "bg-gray-700/95 border-gray-700 backdrop-blur-sm"
                      : "bg-gray-800/95 hover:bg-gray-700/95 border-gray-700 backdrop-blur-sm"
                    : showProfile
                    ? "[color-scheme:light] bg-gray-50/95 border-gray-200 backdrop-blur-sm"
                    : "[color-scheme:light] bg-white/100 hover:bg-gray-50/95 border-gray-200 backdrop-blur-sm"
                ) : (
                  theme === "dark"
                    ? "bg-green-600 hover:bg-green-500 text-white shadow-sm"
                    : "bg-green-600 hover:bg-green-500 text-white shadow-sm"
                )
              }`}
              title={user ? "Profile" : "Join Now"}
            >
              {user ? (
                <FaUserCircle
                  className={`w-5 h-5 ${
                    theme === "dark"
                      ? "text-gray-300"
                      : "[color-scheme:light] text-gray-600"
                  }`}
                />
              ) : (
                <div className="text-sm font-medium flex items-center gap-1.5">
                  <FaUserCircle className="w-4 h-4" />
                  Join Now
                </div>
              )}
            </button>

            {/* Profile panel - only shown when user is logged in and panel is open */}
            {user && showProfile && (
              <div
                className={`absolute top-full right-4 mt-2 p-3 rounded-lg shadow-xl border w-72
                ${
                  theme === "dark"
                    ? "bg-gray-800/95 border-gray-700/50 backdrop-blur-sm"
                    : "[color-scheme:light] bg-white/95 border-gray-200/50 backdrop-blur-sm"
                }`}
              >
                <div className="space-y-4">
                  {/* User info section */}
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200/10">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                      ${
                        theme === "dark"
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {profile?.username?.[0]?.toUpperCase() ||
                        user.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          theme === "dark"
                            ? "text-gray-100"
                            : "text-[rgb(19,31,36)]"
                        }`}
                      >
                        {profile?.username || user.email}
                      </p>
                      <p
                        className={`text-sm truncate ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {profile?.username ? user.email : "No username set"}
                      </p>
                    </div>
                  </div>

                  {/* Navigation section */}
                  <div className="space-y-1">
                    <button
                      onClick={() =>
                        router.push(
                          `/user/${encodeURIComponent(
                            profile?.username || user.email
                          )}`
                        )
                      }
                      className={`w-full px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors
                        ${
                          theme === "dark"
                            ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                            : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                        }`}
                    >
                      <FaUserCircle className="w-4 h-4" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => router.push('/settings')}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors
                        ${
                          theme === "dark"
                            ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                            : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                        }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => router.push('/download')}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors
                        ${
                          theme === "dark"
                            ? "hover:bg-gray-700/50 text-gray-200 hover:text-white"
                            : "hover:bg-gray-100/50 text-gray-700 hover:text-gray-900"
                        }`}
                    >
                      <FaDownload className="w-4 h-4" />
                      <span>Download App</span>
                    </button>
                  </div>

                  {/* Sign out section */}
                  <div className="pt-3 border-t border-gray-200/10">
                    <button
                      onClick={signOut}
                      className={`w-full px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors
                        ${
                          theme === "dark"
                            ? "hover:bg-red-500/10 text-red-400 hover:text-red-300"
                            : "hover:bg-red-50 text-red-600 hover:text-red-700"
                        }`}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 