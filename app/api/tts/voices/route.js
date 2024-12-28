import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const client = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
});

// Map of voice names to common Japanese names
const voiceNameMap = {
  "ja-JP-Standard-A": "Sakura (桜)", // Female
  "ja-JP-Standard-B": "Yumi (弓子)", // Female
  "ja-JP-Standard-C": "Nakayama (中山)", // Male
  "ja-JP-Standard-D": "Kenji (健二)", // Male
};

export async function GET() {
  try {
    const [result] = await client.listVoices({
      languageCode: 'ja-JP',
    });

    const voices = result.voices
      .filter(voice => voice.languageCodes.includes('ja-JP') && voice.name.includes('Standard'))
      .map(voice => ({
        name: voice.name,
        ssmlGender: voice.ssmlGender,
        naturalSampleRateHertz: voice.naturalSampleRateHertz,
        displayName: voiceNameMap[voice.name],
        gender: voice.ssmlGender.toLowerCase()
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ voices }, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json({
      error: 'Failed to fetch voices',
      details: error.message
    }, { status: 500 });
  }
} 