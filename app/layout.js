import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import ServiceWorkerRegistration from './sw-register';
import Script from 'next/script';

export const metadata = {
  title: 'EZJP News',
  description: 'Learn Japanese through news articles',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Check localStorage first
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.backgroundColor = 'rgb(19,31,36)';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.backgroundColor = 'rgb(249,250,251)';
                  }
                } catch (e) {
                  console.error('Error accessing localStorage:', e);
                }
              })();
            `,
          }}
        />
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="72fee403-5be8-4238-80c4-c099815f73d8"
          data-domains="easy-jp-news.vercel.app"
          strategy="afterInteractive"
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ServiceWorkerRegistration>
            {children}
          </ServiceWorkerRegistration>
        </AuthProvider>
      </body>
    </html>
  );
} 