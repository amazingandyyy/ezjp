import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const client = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
});

// Map of voice names to common Japanese names
const voiceNameMap = {
  // Standard voices
  "ja-JP-Standard-A": "Sakura (桜)", // Female
  "ja-JP-Standard-B": "Yumi (弓子)", // Female
  "ja-JP-Standard-C": "Nakayama (中山)", // Male
  "ja-JP-Standard-D": "Kenji (健二)", // Male
  // Neural2 voices
  "ja-JP-Neural2-B": "Hina (陽菜)", // Female
  "ja-JP-Neural2-C": "Takuya (拓也)", // Male
  "ja-JP-Neural2-D": "Mei (芽衣)", // Female
  // Wavenet voices
  "ja-JP-Wavenet-A": "Kaori (香織)", // Female
  "ja-JP-Wavenet-B": "Rin (凛)", // Female
  "ja-JP-Wavenet-C": "Daiki (大輝)", // Male
  "ja-JP-Wavenet-D": "Sora (空)", // Male
};

export async function GET() {
  try {
    const [result] = await client.listVoices({
      languageCode: 'ja-JP',
    });

    const voices = result.voices
      .filter(voice => voice.languageCodes.includes('ja-JP'))
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