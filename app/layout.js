import './globals.css';
import { AuthProvider } from '../lib/AuthContext';

export const metadata = {
  title: 'EZJP',
  description: 'Read Japanese news easily',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
