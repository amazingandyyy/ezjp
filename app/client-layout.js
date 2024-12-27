'use client';

import { AuthProvider } from '../lib/AuthContext';
import ServiceWorkerRegistration from './sw-register';

export default function ClientLayout({ children }) {
  return (
    <AuthProvider>
      {children}
      <ServiceWorkerRegistration />
    </AuthProvider>
  );
} 