import { v2 } from '@google-cloud/translate';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { NextResponse } from 'next/server';

const translate = new v2.Translate({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}')
});

export async function POST(req) {
  try {
    const { text, target } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!target || !SUPPORTED_LANGUAGES[target]) {
      return NextResponse.json({ error: 'Invalid target language' }, { status: 400 });
    }

    const [translation] = await translate.translate(text, target);

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
} 