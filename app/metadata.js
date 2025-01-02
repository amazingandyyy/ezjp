export const metadata = {
  metadataBase: new URL('https://ezjp.amazyyy.com'),
  title: {
    template: '%s | EZJP',
    default: 'EZJP News',
  },
  description: 'Learn Japanese Through EZJP News articles',
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
    title: 'EZJP News',
    description: 'Learn Japanese Through EZJP News articles',
    url: 'https://ezjp.amazyyy.com',
    siteName: 'EZJP',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EZJP - Learn Japanese Through EZJP News',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EZJP News',
    description: 'Learn Japanese Through EZJP News articles',
    images: ['/images/og-image.png'],
    creator: '@amazingandyyy',
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
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}; 