import './globals.css';
import { AuthProvider } from '../lib/AuthContext';

export const metadata = {
  title: 'Easy JP News',
  description: 'Read Japanese news easily',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
