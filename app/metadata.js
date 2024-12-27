export const metadata = {
  metadataBase: new URL('https://easy-jp-news.vercel.app'),
  title: {
    template: '%s | EZJP',
    default: 'EZJP - Learn Japanese Through News',
  },
  description: 'Improve your Japanese reading skills with AI-powered news articles. Practice with real Japanese content, get instant translations, and track your progress.',
  keywords: ['japanese learning', 'news in japanese', 'japanese reading practice', 'learn japanese', 'japanese study', 'japanese news', 'japanese articles'],
  authors: [{ name: 'EZJP' }],
  icons: {
    icon: [
      { url: '/icons/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/ezjp-app.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/icons/favicon.png',
    apple: [
      { url: '/icons/ezjp-app.png', sizes: '512x512', type: 'image/png' }
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/ezjp-app.png' }
    ]
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'EZJP - Learn Japanese Through News',
    description: 'Improve your Japanese reading skills with AI-powered news articles. Practice with real Japanese content, get instant translations, and track your progress.',
    url: 'https://easy-jp-news.vercel.app',
    siteName: 'EZJP',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EZJP - Learn Japanese Through News',
      },
      {
        url: '/icons/ezjp-app.png',
        width: 512,
        height: 512,
        alt: 'EZJP Logo',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EZJP - Learn Japanese Through News',
    description: 'Improve your Japanese reading skills with AI-powered news articles. Practice with real Japanese content, get instant translations, and track your progress.',
    images: ['/og-image.png', '/icons/ezjp-app.png'],
    creator: '@ezjpnews',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification',
  },
}; 