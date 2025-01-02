import { ImageResponse } from 'next/og';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceUrl = searchParams.get('source');

    if (!sourceUrl) {
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 48,
              background: 'white',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            EZJP News
          </div>
        ),
        {
          width: 1200,
          height: 630,
        },
      );
    }

    const supabase = createServerComponentClient({ cookies });
    const { data: article } = await supabase
      .from('articles')
      .select('title, description')
      .eq('url', sourceUrl)
      .single();

    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
          }}
        >
          <div style={{ fontSize: 32, color: '#22c55e', marginBottom: '20px' }}>
            EZJP News
          </div>
          <div style={{ fontSize: 40, textAlign: 'center', marginBottom: '20px' }}>
            {article?.title || 'Learn Japanese through news articles'}
          </div>
          <div style={{ fontSize: 24, color: '#666', textAlign: 'center' }}>
            {article?.description || 'Improve your Japanese reading skills with AI-powered news articles'}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return new Response('Error generating image', { status: 500 });
  }
} 