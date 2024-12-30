'use client';
import { useEffect, useState } from 'react';
import { FaDownload, FaBook, FaDesktop, FaMobile, FaCheck, FaExternalLinkAlt, FaChrome, FaEdge, FaSafari, FaWindows, FaApple, FaAndroid, FaEllipsisV, FaShareAlt, FaSync } from 'react-icons/fa';
import { useAuth } from '@/lib/AuthContext';
import Navbar from '@/app/components/Navbar';

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
  const [isMobile, setIsMobile] = useState(false);
  const [showOpenAppHint, setShowOpenAppHint] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const theme = profile?.theme || 'system';

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobileDevice = /iphone|ipad|ipod|android/.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    checkIfMobile();
  }, []);

  // Check if app is installed
  useEffect(() => {
    const checkInstallation = () => {
      // Check if running as standalone PWA
      const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone || // iOS Safari
        document.referrer.includes('android-app://'); // Android TWA
      
      setIsStandalone(isRunningStandalone);

      // If we're in a regular browser tab, try to detect installed PWA
      if (!isRunningStandalone) {
        // Chrome & Edge on Android
        if ('getInstalledRelatedApps' in navigator) {
          navigator.getInstalledRelatedApps().then(apps => {
            const isPWAInstalled = apps.some(app => app.platform === 'webapp');
            setIsAppInstalled(isPWAInstalled);
          }).catch(console.error);
        }
      }
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
    
    // If no install prompt after a short delay, show content anyway
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
    if (isMobile) {
      // For iOS Safari, just show a message to use the native share button
      const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
      if (isIOS) {
        alert('Please tap the share button (square with arrow) in your Safari browser menu, then scroll down and tap "Add to Home Screen"');
        return;
      }
      // For other mobile devices, use share API
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Install EZJP News',
            text: 'Install EZJP News for easy access to Japanese news articles',
            url: window.location.href
          });
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error sharing:', error);
          }
        }
      }
    } else if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      console.log(`User ${outcome} the installation`);
    }
  };

  const handleOpenApp = () => {
    setShowOpenAppHint(true);
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
      
      <div className="container mx-auto px-4 pt-32 pb-32">
        <div className="max-w-4xl mx-auto space-y-24">
          {/* Hero Section */}
          <div className={`text-center ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            <div className="mb-8">
              <div className={`w-24 h-24 mx-auto mb-6 rounded-2xl shadow-lg overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <img
                  src="/icons/ezjp-app.png"
                  alt="EZJP App"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-4xl font-bold mb-4">
                Download EZJP News
              </h1>
              <p className={`text-lg max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Access Japanese news articles anytime, anywhere. Install our app for a seamless reading experience.
              </p>
            </div>

            <div>
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
                    disabled={(!installPrompt && !isMobile) || isLoading}
                    className={`px-8 py-4 rounded-lg text-lg font-medium transition-all duration-300 min-w-[200px] ${
                      isLoading
                        ? theme === 'dark'
                          ? 'bg-gray-800 text-gray-400'
                          : 'bg-gray-100 text-gray-500'
                        : (installPrompt || isMobile)
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
                      ) : (installPrompt || isMobile) ? (
                        <>
                          {isMobile ? <IosShareIcon /> : <FaDownload className="w-5 h-5" />}
                          <span>{isMobile ? 'Add to Home Screen' : 'Install App'}</span>
                        </>
                      ) : (
                        <>
                          <FaCheck className="w-5 h-5" />
                          <span>Already Installed</span>
                        </>
                      )}
                    </div>
                  </button>

                  {(!installPrompt && !isLoading && !isStandalone) && (
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
                        <span>How to Open App</span>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Features Section */}
          <section>
            <div className="text-center mb-12">
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                Why Install EZJP News?
              </h2>
              <p className={`text-lg max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Enhance your Japanese learning experience with our app
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className={`p-6 rounded-xl border backdrop-blur-sm ${
                    theme === 'dark'
                      ? 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'
                      : 'bg-white/50 border-gray-200 hover:bg-white'
                  } transition-colors shadow-sm hover:shadow-md`}
                >
                  <feature.icon
                    className={`w-10 h-10 mb-4 ${
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
          </section>

          {/* Installation Guide Section */}
          <section>
            <div className={`rounded-2xl border backdrop-blur-sm ${
              theme === 'dark' ? 'bg-gray-800/30 border-gray-700' : 'bg-white/50 border-gray-200'
            } shadow-sm overflow-hidden`}>
              <div className="text-center p-8 border-b border-gray-200/5 dark:border-gray-800">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                  theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                } ring-1 ring-gray-900/5 shadow-md`}>
                  <FaDownload className={`w-8 h-8 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  Installation Guide
                </h2>
                <p className={`text-sm max-w-md mx-auto ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Follow the instructions below based on your device and browser
                </p>
              </div>

              <div className={`p-8 space-y-12 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {/* Desktop Instructions */}
                <div className="hidden md:block">
                  <h3 className={`text-lg font-medium mb-6 flex items-center gap-3 ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    <div className={`p-2 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <FaDesktop className="w-5 h-5" />
                    </div>
                    <span>Desktop Installation</span>
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Chrome */}
                    <div className={`p-5 rounded-xl border ${
                      theme === 'dark' 
                        ? 'bg-gray-900/30 border-gray-700 hover:bg-gray-900/50' 
                        : 'bg-gray-50 border-gray-200 hover:bg-white'
                    } transition-colors duration-300`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${
                          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                        }`}>
                          <FaChrome className={`w-6 h-6 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`} />
                        </div>
                        <p className="font-medium text-lg">Google Chrome</p>
                      </div>
                      <ol className="space-y-3 ml-4 list-none">
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>1</span>
                          <span>Click the install button <FaDownload className="inline w-3.5 h-3.5 ml-1" /> in the address bar</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>2</span>
                          <span>Or click the menu <MenuDotsIcon className="inline mx-1" /> and select "Install EZJP News"</span>
                        </li>
                      </ol>
                    </div>

                    {/* Edge */}
                    <div className={`p-5 rounded-xl border ${
                      theme === 'dark' 
                        ? 'bg-gray-900/30 border-gray-700 hover:bg-gray-900/50' 
                        : 'bg-gray-50 border-gray-200 hover:bg-white'
                    } transition-colors duration-300`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${
                          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                        }`}>
                          <FaEdge className={`w-6 h-6 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`} />
                        </div>
                        <p className="font-medium text-lg">Microsoft Edge</p>
                      </div>
                      <ol className="space-y-3 ml-4 list-none">
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>1</span>
                          <span>Click the install button <FaDownload className="inline w-3.5 h-3.5 ml-1" /> in the address bar</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>2</span>
                          <span>Or click the menu <MenuDotsIcon className="inline mx-1" /> and select "Apps" → "Install EZJP News"</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Mobile Instructions */}
                <div className="md:mt-0">
                  <h3 className={`text-lg font-medium mb-6 flex items-center gap-3 ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    <div className={`p-2 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <FaMobile className="w-5 h-5" />
                    </div>
                    <span>Mobile Installation</span>
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* iOS */}
                    <div className={`p-5 rounded-xl border ${
                      theme === 'dark' 
                        ? 'bg-gray-900/30 border-gray-700 hover:bg-gray-900/50' 
                        : 'bg-gray-50 border-gray-200 hover:bg-white'
                    } transition-colors duration-300`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${
                          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                        }`}>
                          <FaApple className={`w-6 h-6 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`} />
                        </div>
                        <p className="font-medium text-lg">iOS Safari</p>
                      </div>
                      <ol className="space-y-3 ml-4 list-none">
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>1</span>
                          <span>Tap the Share button <IosShareIcon className="inline" /></span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>2</span>
                          <span>Scroll down and tap "Add to Home Screen"</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>3</span>
                          <span>Tap "Add" to install</span>
                        </li>
                      </ol>
                    </div>

                    {/* Android */}
                    <div className={`p-5 rounded-xl border ${
                      theme === 'dark' 
                        ? 'bg-gray-900/30 border-gray-700 hover:bg-gray-900/50' 
                        : 'bg-gray-50 border-gray-200 hover:bg-white'
                    } transition-colors duration-300`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${
                          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                        }`}>
                          <FaAndroid className={`w-6 h-6 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`} />
                        </div>
                        <p className="font-medium text-lg">Android Chrome</p>
                      </div>
                      <ol className="space-y-3 ml-4 list-none">
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>1</span>
                          <span>Tap the install button <FaDownload className="inline w-3.5 h-3.5 ml-1" /> in the address bar</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>2</span>
                          <span>Or tap the menu <FaEllipsisV className="inline w-3.5 h-3.5 mx-1" /> and select "Install app"</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className={`text-sm text-center mt-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p className="max-w-lg mx-auto">
                    <span className="font-medium">Tip:</span> If you see the "Install App" button at the top of this page, you can click it for a simpler installation.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Uninstallation Guide Section */}
          <section>
            <div className={`rounded-2xl border backdrop-blur-sm ${
              theme === 'dark' ? 'bg-gray-800/30 border-gray-700' : 'bg-white/50 border-gray-200'
            } shadow-sm overflow-hidden`}>
              <div className="text-center p-8 border-b border-gray-200/5 dark:border-gray-800">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                  theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                } ring-1 ring-gray-900/5 shadow-md`}>
                  <svg 
                    className={`w-8 h-8 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                    />
                  </svg>
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  Uninstallation Guide
                </h2>
                <p className={`text-sm max-w-md mx-auto ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Follow these steps if you need to remove the app from your device
                </p>
              </div>

              <div className={`p-8 space-y-12 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {/* Desktop Uninstall */}
                <div className="hidden md:block">
                  <h3 className={`text-lg font-medium mb-6 flex items-center gap-3 ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    <div className={`p-2 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <FaDesktop className="w-5 h-5" />
                    </div>
                    <span>Desktop Uninstallation</span>
                  </h3>

                  <div className={`p-5 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-gray-900/30 border-gray-700 hover:bg-gray-900/50' 
                      : 'bg-gray-50 border-gray-200 hover:bg-white'
                  } transition-colors duration-300`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                      }`}>
                        <FaChrome className={`w-6 h-6 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`} />
                      </div>
                      <p className="font-medium text-lg">Chrome & Edge</p>
                    </div>
                    <ol className="space-y-3 ml-4 list-none">
                      <li className="flex items-start gap-3">
                        <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                          theme === 'dark' 
                            ? 'bg-gray-800 text-gray-300' 
                            : 'bg-white text-gray-700'
                        }`}>1</span>
                        <span>Click the menu icon <MenuDotsIcon className="inline mx-1" /> in the app window</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                          theme === 'dark' 
                            ? 'bg-gray-800 text-gray-300' 
                            : 'bg-white text-gray-700'
                        }`}>2</span>
                        <span>Select "Uninstall EZJP News"</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                          theme === 'dark' 
                            ? 'bg-gray-800 text-gray-300' 
                            : 'bg-white text-gray-700'
                        }`}>3</span>
                        <span>Click "Remove" to confirm</span>
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Mobile Uninstall */}
                <div className="md:mt-0">
                  <h3 className={`text-lg font-medium mb-6 flex items-center gap-3 ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    <div className={`p-2 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <FaMobile className="w-5 h-5" />
                    </div>
                    <span>Mobile Uninstallation</span>
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* iOS */}
                    <div className={`p-5 rounded-xl border ${
                      theme === 'dark' 
                        ? 'bg-gray-900/30 border-gray-700 hover:bg-gray-900/50' 
                        : 'bg-gray-50 border-gray-200 hover:bg-white'
                    } transition-colors duration-300`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${
                          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                        }`}>
                          <FaApple className={`w-6 h-6 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`} />
                        </div>
                        <p className="font-medium text-lg">iOS</p>
                      </div>
                      <ol className="space-y-3 ml-4 list-none">
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>1</span>
                          <span>Press and hold the EZJP News icon</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>2</span>
                          <span>Tap "Remove App"</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>3</span>
                          <span>Tap "Delete App" to confirm</span>
                        </li>
                      </ol>
                    </div>

                    {/* Android */}
                    <div className={`p-5 rounded-xl border ${
                      theme === 'dark' 
                        ? 'bg-gray-900/30 border-gray-700 hover:bg-gray-900/50' 
                        : 'bg-gray-50 border-gray-200 hover:bg-white'
                    } transition-colors duration-300`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${
                          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                        }`}>
                          <FaAndroid className={`w-6 h-6 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`} />
                        </div>
                        <p className="font-medium text-lg">Android</p>
                      </div>
                      <ol className="space-y-3 ml-4 list-none">
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>1</span>
                          <span>Press and hold the EZJP News icon</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>2</span>
                          <span>Drag to "Uninstall" or tap "Uninstall"</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className={`inline-flex items-center justify-center min-w-[24px] min-h-[24px] w-6 h-6 rounded-full text-sm font-medium shrink-0 ${
                            theme === 'dark' 
                              ? 'bg-gray-800 text-gray-300' 
                              : 'bg-white text-gray-700'
                          }`}>3</span>
                          <span>Tap "OK" to confirm</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Add hint message */}
      {showOpenAppHint && (
        <div className={`fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50`}>
          <div className={`relative max-w-md w-full p-8 rounded-2xl shadow-2xl ${
            theme === 'dark' 
              ? 'bg-gray-800/95 text-gray-200 border border-gray-700' 
              : 'bg-white/95 text-gray-800'
          }`}>
            {/* Close button */}
            <button 
              onClick={() => setShowOpenAppHint(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Close"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-6">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <FaExternalLinkAlt className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Open EZJP News</h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Follow these steps to open your installed app
                </p>
              </div>

              <div className="space-y-4">
                {isMobile ? (
                  <div className={`p-5 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-gray-900/50 border-gray-700' 
                      : 'bg-gray-50 border-gray-100'
                  }`}>
                    <p className="font-medium text-lg mb-4 flex items-center gap-2">
                      <span className="text-xl">📱</span>
                      <span>On Your Device</span>
                    </p>
                    <ol className="space-y-3 ml-6 list-decimal marker:text-green-500">
                      <li className="pl-2">Exit your current browser</li>
                      <li className="pl-2">Go to your device's home screen</li>
                      <li className="pl-2">Find and tap the EZJP News icon</li>
                    </ol>
                  </div>
                ) : /edg/i.test(navigator.userAgent) ? (
                  <div className={`p-5 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-gray-900/50 border-gray-700' 
                      : 'bg-gray-50 border-gray-100'
                  }`}>
                    <p className="font-medium text-lg mb-4 flex items-center gap-2">
                      <FaEdge className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                      <span>In Microsoft Edge</span>
                    </p>
                    <ol className="space-y-3 ml-6 list-decimal marker:text-green-500">
                      <li className="pl-2">Look for the <span className={`font-medium px-1 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>⋯</span> menu in the top-right corner</li>
                      <li className="pl-2">Click <span className="font-medium">Apps</span> from the dropdown menu</li>
                      <li className="pl-2">Select <span className="font-medium">EZJP News</span> from your installed apps</li>
                    </ol>
                  </div>
                ) : /chrome/i.test(navigator.userAgent) ? (
                  <div className={`p-5 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-gray-900/50 border-gray-700' 
                      : 'bg-gray-50 border-gray-100'
                  }`}>
                    <p className="font-medium text-lg mb-4 flex items-center gap-2">
                      <FaChrome className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
                      <span>In Google Chrome</span>
                    </p>
                    <ol className="space-y-3 ml-6 list-decimal marker:text-green-500">
                      <li className="pl-2">Find the <span className={`font-medium px-1 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>⋮</span> menu in the top-right corner</li>
                      <li className="pl-2">Look for <span className="font-medium">EZJP News</span> in the menu</li>
                      <li className="pl-2">Click <span className="font-medium">Open in EZJP News</span></li>
                    </ol>
                  </div>
                ) : (
                  <div className={`p-5 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-gray-900/50 border-gray-700' 
                      : 'bg-gray-50 border-gray-100'
                  }`}>
                    <p className="font-medium text-lg mb-4 flex items-center gap-2">
                      <span className="text-xl">🌐</span>
                      <span>In Your Browser</span>
                    </p>
                    <p className="ml-6">Look for EZJP News in your browser's apps menu or shortcuts</p>
                  </div>
                )}

                <div className={`text-sm text-center pt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p>After following these steps, the app will open in a separate window</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 