import fs from 'fs';
import path from 'path';

// Clean HTML content to prevent hydration mismatches
function cleanHtmlContent(content) {
  return content
    .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
    .replace(/>\s+</g, '><')  // Remove whitespace between tags
    .trim();  // Remove leading/trailing whitespace
}

// Get the document content
async function getDocument(slug) {
  const filePath = path.join(process.cwd(), 'public', 'documents', `${slug}.html`);
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return cleanHtmlContent(content);
  } catch (error) {
    console.error('Error reading document:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const title = params.slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${title} | EZJP`,
    description: `${title} for EZJP - Learn Japanese Through News`,
  };
}

export default async function DocumentPage({ params }) {
  const content = await getDocument(params.slug);

  if (!content) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Document Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          The requested document could not be found.
        </p>
      </div>
    );
  }

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: content }}
      suppressHydrationWarning={true}
      className="[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-2 [&_a]:text-blue-600 [&_a:hover]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_pre]:bg-gray-100 [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-4 [&_code]:font-mono [&_code]:text-sm [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 dark:[&_h1]:text-white dark:[&_h2]:text-gray-100 dark:[&_h3]:text-gray-200 dark:[&_p]:text-gray-300 dark:[&_li]:text-gray-300 dark:[&_a]:text-blue-400 dark:[&_blockquote]:border-gray-600 dark:[&_pre]:bg-gray-700 dark:[&_th]:bg-gray-700 dark:[&_th]:border-gray-600 dark:[&_td]:border-gray-600"
    />
  );
} 