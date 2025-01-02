import Link from 'next/link';

export const metadata = {
  title: 'Legal Documents | EZJP',
  description: 'Legal documents and policies for EZJP - Learn Japanese Through News',
};

const DOCUMENTS = [
  {
    title: 'Privacy Policy',
    description: 'Learn how we collect, use, and protect your personal information.',
    href: '/documents/privacy-policy',
  },
  {
    title: 'Terms of Service',
    description: 'The rules and guidelines for using EZJP.',
    href: '/documents/terms-of-service',
  },
];

export default function DocumentsPage() {
  return (
    <div className="grid gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Legal Documents
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Important information about your rights and our policies
        </p>
      </div>
      <div className="grid gap-4">
        {DOCUMENTS.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {doc.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {doc.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
} 