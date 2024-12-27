import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import ServiceWorkerRegistration from './sw-register';

export const metadata = {
  title: 'EZJP News',
  description: 'Learn Japanese through news articles',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ServiceWorkerRegistration>
            {children}
          </ServiceWorkerRegistration>
        </AuthProvider>
      </body>
    </html>
  );
} 