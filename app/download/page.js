'use client';
import { useEffect, useState } from 'react';
import { FaDownload, FaBook, FaDesktop, FaMobile, FaCheck, FaExternalLinkAlt, FaChrome, FaEdge, FaSafari, FaWindows, FaApple, FaAndroid, FaEllipsisV, FaShareAlt, FaSync } from 'react-icons/fa';
import { useAuth } from '../../lib/AuthContext';
import Navbar from '../components/Navbar';

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600" />
  );
}

// iOS Share icon component
function IosShareIcon() {
  return (
    <svg 
      className="inline-block w-5 h-5 -mt-0.5 ml-0.5" 
      viewBox="0 0 50 50" 
      fill="currentColor"
      style={{ transform: 'scale(1.2)' }}
    >
      <path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z" strokeWidth="0.5" />
      <path d="M24 7h2v21h-2z" strokeWidth="0.5" />
      <path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z" strokeWidth="0.5" />
    </svg>
  );
}

// Horizontal dots menu icon
function MenuDotsIcon() {
  return (
    <svg 
      className="inline-block w-3.5 h-3.5" 
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M3.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
    </svg>
  );
}

// Combined mobile and desktop icon
function MobileDesktopIcon({ className }) {
  return (
    <div className={`relative ${className}`}>
      <FaDesktop className="w-full h-full opacity-30" />
      <FaMobile className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4" />
    </div>
  );
}

export default function Download() {
  const { profile } = useAuth();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const theme = profile?.theme || 'system';

  // Check if app is installed
  useEffect(() => {
    const checkInstallation = () => {
      // Check if running as standalone PWA
      const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone || // iOS Safari
        document.referrer.includes('android-app://'); // Android TWA
      
      setIsStandalone(isRunningStandalone);
    };

    // Initial check
    checkInstallation();

    // Listen for changes in display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e) => {
      setIsStandalone(e.matches);
    };
    
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsLoading(false);
      setShowContent(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // If no install prompt after a short delay, we're probably installed
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setShowContent(true);
    }, 800);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timeout);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      console.log(`User ${outcome} the installation`);
    }
  };

  const handleOpenApp = () => {
    // For Edge/Chrome PWA
    if (window.chrome && window.chrome.app) {
      window.location.replace('/');
    } else if (window.navigator.standalone) {
      // For iOS PWA
      window.location.replace('/');
    } else {
      // General fallback
      window.location.href = '/';
    }
  };

  const features = [
    {
      title: 'Easier Access',
      description: 'Launch EZJP directly from your desktop or home screen',
      icon: FaBook,
    },
    {
      title: 'Progress Synced',
      description: 'Your reading history and saved articles sync across all devices',
      icon: FaSync,
    },
    {
      title: 'Native Experience',
      description: 'Enjoy a smooth, app-like experience on any device',
      icon: MobileDesktopIcon,
    },
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[rgb(19,31,36)]' : 'bg-gray-50'}`}>
      <Navbar theme={theme} hideNewsListButton />
      
      <div className="container mx-auto px-4 pt-24 pb-32">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className={`text-center mb-16 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            <div className="mb-8">
              <img
                src="/icons/ezjp-app.png"
                alt="EZJP App"
                className="w-24 h-24 mx-auto mb-6"
              />
              <h1 className="text-4xl font-bold mb-4">
                Download EZJP
              </h1>
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Learn Japanese through news articles, anytime, anywhere
              </p>
            </div>

            <div className="h-[88px] mb-16">
              {/* Loading State */}
              {!showContent ? (
                <div className="flex flex-col items-center gap-3">
                  <LoadingSpinner />
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Checking installation status...
                  </p>
                </div>
              ) : (
                <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-opacity duration-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
                  <button
                    onClick={handleInstall}
                    disabled={!installPrompt || isLoading}
                    className={`px-8 py-4 rounded-lg text-lg font-medium transition-all duration-300 min-w-[200px] ${
                      isLoading
                        ? theme === 'dark'
                          ? 'bg-gray-800 text-gray-400'
                          : 'bg-gray-100 text-gray-500'
                        : installPrompt
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 justify-center">
                      {isLoading ? (
                        <>
                          <LoadingSpinner />
                          <span>Checking...</span>
                        </>
                      ) : installPrompt ? (
                        <>
                          <FaDownload className="w-5 h-5" />
                          <span>Install App</span>
                        </>
                      ) : (
                        <>
                          <FaCheck className="w-5 h-5" />
                          <span>Already Installed</span>
                        </>
                      )}
                    </div>
                  </button>

                  {(!installPrompt && !isLoading) && (
                    <button
                      onClick={handleOpenApp}
                      className={`px-8 py-4 rounded-lg text-lg font-medium transition-all duration-300 min-w-[200px]
                        ${theme === 'dark'
                          ? 'bg-green-600 hover:bg-green-500 text-white'
                          : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        <FaExternalLinkAlt className="w-5 h-5" />
                        <span>Open App</span>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`p-6 rounded-xl ${
                  theme === 'dark'
                    ? 'bg-gray-800/50 hover:bg-gray-800'
                    : 'bg-white hover:bg-gray-50'
                } transition-colors shadow-sm`}
              >
                <feature.icon
                  className={`w-8 h-8 mb-4 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`}
                />
                <h3 className={`text-lg font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {feature.title}
                </h3>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Installation Instructions */}
          <div className={`mt-16 p-8 rounded-xl ${
            theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'
          } shadow-sm`}>
            <div className="text-center mb-12">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <FaDownload className={`w-7 h-7 ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`} />
              </div>
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>
                Installation Guide
              </h2>
            </div>

            <div className={`space-y-8 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {/* Desktop Instructions */}
              <div>
                <h3 className={`text-lg font-medium mb-4 flex items-center gap-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  <FaDesktop className="w-5 h-5" />
                  Desktop Installation
                </h3>
                
                <div className="space-y-6">
                  {/* Chrome */}
                  <div className="flex items-start gap-3">
                    <FaChrome className={`w-6 h-6 mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                    <div>
                      <p className="font-medium mb-2">Chrome</p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Click the install button <FaDownload className="inline w-3 h-3" /> in the address bar, or</li>
                        <li>Click the menu icon <FaEllipsisV className="inline w-3 h-3" /> and select "Install EZJP"</li>
                      </ol>
                    </div>
                  </div>

                  {/* Edge */}
                  <div className="flex items-start gap-3">
                    <FaEdge className={`w-6 h-6 mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                    <div>
                      <p className="font-medium mb-2">Microsoft Edge</p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Click the install button <FaDownload className="inline w-3 h-3" /> in the address bar, or</li>
                        <li>Click the menu icon <MenuDotsIcon /> and select "Apps" → "Install EZJP News"</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Instructions */}
              <div>
                <h3 className={`text-lg font-medium mb-4 flex items-center gap-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  <FaMobile className="w-5 h-5" />
                  Mobile Installation
                </h3>

                <div className="space-y-6">
                  {/* iOS */}
                  <div className="flex items-start gap-3">
                    <FaApple className={`w-6 h-6 mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                    <div>
                      <p className="font-medium mb-2">iOS Safari</p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Tap the Share button <IosShareIcon /></li>
                        <li>Scroll down and tap "Add to Home Screen"</li>
                        <li>Tap "Add" to install</li>
                      </ol>
                    </div>
                  </div>

                  {/* Android */}
                  <div className="flex items-start gap-3">
                    <FaAndroid className={`w-6 h-6 mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                    <div>
                      <p className="font-medium mb-2">Android Chrome</p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Tap the install button <FaDownload className="inline w-3 h-3" /> in the address bar, or</li>
                        <li>Tap the menu icon <FaEllipsisV className="inline w-3 h-3" /> and select "Install app"</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>Note: If you see the "Install App" button at the top of this page, you can click it for a simpler installation.</p>
              </div>
            </div>
          </div>

          {/* Uninstallation Instructions */}
          <div className={`mt-8 p-8 rounded-xl ${
            theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'
          } shadow-sm`}>
            <div className="text-center mb-12">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <svg 
                  className={`w-7 h-7 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                  />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
              }`}>
                Uninstallation Guide
              </h2>
            </div>

            <div className={`space-y-6 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {/* Desktop Uninstall */}
              <div className="flex items-start gap-3">
                <FaDesktop className={`w-6 h-6 mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`} />
                <div>
                  <p className="font-medium mb-2">Desktop (Chrome/Edge)</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Click the menu icon <MenuDotsIcon /> in the app window</li>
                    <li>Select "Uninstall EZJP News"</li>
                    <li>Click "Remove" to confirm</li>
                  </ol>
                </div>
              </div>

              {/* Mobile Uninstall */}
              <div className="flex items-start gap-3">
                <FaMobile className={`w-6 h-6 mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`} />
                <div>
                  <p className="font-medium mb-2">Mobile</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Press and hold the EZJP app icon</li>
                    <li>Select "Remove App" or "Uninstall"</li>
                    <li>Confirm the uninstallation</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 