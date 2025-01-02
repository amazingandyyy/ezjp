import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function generateMetadata({ searchParams }) {
  try {
    const sourceUrl = searchParams.source;
    if (!sourceUrl) {
      return {};
    }

    const supabase = createServerComponentClient({ cookies });
    const { data: article } = await supabase
      .from('articles')
      .select('title, description')
      .eq('url', sourceUrl)
      .single();

    if (!article) {
      return {};
    }

    const ogImageUrl = new URL(`/read/opengraph-image`, 'https://easy-jp-news.vercel.app');
    ogImageUrl.searchParams.set('source', encodeURIComponent(sourceUrl));

    return {
      title: `${article.title} | EZJP News`,
      description: article.description,
      openGraph: {
        title: article.title,
        description: article.description,
        images: [
          {
            url: ogImageUrl.toString(),
            width: 1200,
            height: 630,
            alt: article.title,
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description: article.description,
        images: [ogImageUrl.toString()],
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {};
  }
} 