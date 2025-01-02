import Link from 'next/link';

export default function DocumentLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="mb-8">
          <Link 
            href="/"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
        </nav>
        <main className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          <article className="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-img:rounded-lg">
            {children}
          </article>
        </main>
        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <div className="mb-2">© 2025 EZJP. All rights reserved.</div>
          <div className="flex justify-center gap-4">
            <Link href="/documents/privacy-policy" className="hover:text-gray-900 dark:hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/documents/terms-of-service" className="hover:text-gray-900 dark:hover:text-white">
              Terms of Service
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
} 