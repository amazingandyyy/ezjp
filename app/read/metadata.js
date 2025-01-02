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

    return {
      title: `${article.title} | EZJP News`,
      description: article.description,
      openGraph: {
        title: article.title,
        description: article.description,
        images: [
          {
            url: '/images/ezjp-homepage.png',
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
        images: ['/images/ezjp-homepage.png'],
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {};
  }
} 