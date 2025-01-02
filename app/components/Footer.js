'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { FaUser, FaCrown } from 'react-icons/fa';
import { useEffect, useState } from 'react';

export default function Footer() {
  const { profile } = useAuth();
  const theme = profile?.theme || 'light';
  const [year, setYear] = useState('');

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  return (
    <footer className={`w-full py-4 px-4 mt-auto border-t ${
      theme === 'dark' 
        ? 'bg-[rgb(19,31,36)] border-gray-800' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-center items-center gap-3 text-sm">
        <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}>
          © {year} EZJP News. All rights reserved.
        </span>
        <div className="flex items-center gap-3">
          <a 
            href="/documents/privacy-policy" 
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-colors duration-200 ${
              theme === 'dark'
                ? 'text-gray-500 hover:text-gray-400'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Privacy Policy
          </a>
          <span className={theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}>•</span>
          <a 
            href="/documents/terms-of-service" 
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-colors duration-200 ${
              theme === 'dark'
                ? 'text-gray-500 hover:text-gray-400'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Terms of Use
          </a>
        </div>
      </div>
    </footer>
  );
} 