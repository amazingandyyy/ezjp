import { NextResponse } from 'next/server';
import { v2 } from '@google-cloud/translate';

// Initialize the Translation client
const translate = new v2.Translate({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
});

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Translate text to English
    const [translation] = await translate.translate(text, {
      from: 'ja',
      to: 'en',
    });

    return NextResponse.json({
      translation,
      source: 'ja',
      target: 'en'
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    );
  }
} 