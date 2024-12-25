import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/AuthContext';

const inter = Inter({ subsets: ['latin'] });

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
      { url: '/images/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/logo.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/images/icon.png',
    apple: [
      { url: '/images/logo.png', sizes: '512x512', type: 'image/png' }
    ],
    other: [
      { rel: 'mask-icon', url: '/images/logo.png' }
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
        url: '/images/logo.png',
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
    images: ['/og-image.png', '/images/logo.png'],
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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
