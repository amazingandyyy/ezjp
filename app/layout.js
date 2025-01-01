import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import ServiceWorkerRegistration from './sw-register';
import Script from 'next/script';
import Footer from './components/Footer';
import { getCurrentTheme } from '@/lib/utils/theme';

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
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  const currentTheme = theme === 'system' ? systemTheme : theme || 'light';
                  
                  if (currentTheme === 'dark') {
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
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-YWB00W1EMG"
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-YWB00W1EMG');
              `}
            </Script>
          </>
        )}
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="72fee403-5be8-4238-80c4-c099815f73d8"
          data-domains="easy-jp-news.vercel.app"
          strategy="afterInteractive"
        />
      </head>
      <body suppressHydrationWarning className="flex flex-col min-h-screen bg-gray-50 dark:bg-[rgb(19,31,36)] transition-colors duration-300">
        <AuthProvider>
          <ServiceWorkerRegistration>
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </ServiceWorkerRegistration>
        </AuthProvider>
      </body>
    </html>
  );
} 