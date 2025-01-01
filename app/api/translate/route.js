import { v2 } from '@google-cloud/translate';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const translate = new v2.Translate({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}')
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { text, target, articleId, sentenceIndex } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!target || !SUPPORTED_LANGUAGES[target]) {
      return NextResponse.json({ error: 'Invalid target language' }, { status: 400 });
    }

    // Check for cached translation if articleId and sentenceIndex are provided
    if (articleId && sentenceIndex !== undefined) {
      const { data: cachedTranslation } = await supabase
        .from('translations')
        .select('translated_text')
        .eq('article_id', articleId)
        .eq('sentence_index', sentenceIndex)
        .eq('target_language', target)
        .eq('source_text', text)
        .single();

      if (cachedTranslation) {
        return NextResponse.json({ translation: cachedTranslation.translated_text, cached: true });
      }
    }

    // If no cache hit or missing article info, translate and cache if possible
    const [translation] = await translate.translate(text, target);

    // Cache the translation if we have article info
    if (articleId && sentenceIndex !== undefined) {
      await supabase
        .from('translations')
        .upsert({
          article_id: articleId,
          sentence_index: sentenceIndex,
          source_text: text,
          target_language: target,
          translated_text: translation,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'article_id,sentence_index,target_language'
        });
    }

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
} 