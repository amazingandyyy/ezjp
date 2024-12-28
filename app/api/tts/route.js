import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize the client with credentials from environment variable
const client = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
});

export async function POST(req) {
  try {
    const { text, speed = 1.0, voice = 'ja-JP-Standard-A' } = await req.json();
    
    if (!text) {
      return NextResponse.json({ 
        error: 'Text is required',
        details: 'The text parameter is missing or empty'
      }, { status: 400 });
    }

    // Validate and clamp speed between 0.25 and 4.0 (Google's limits)
    const validSpeed = Math.max(0.25, Math.min(4.0, parseFloat(speed) || 1.0));

    try {
      const [response] = await client.synthesizeSpeech({
        input: { text },
        voice: { 
          languageCode: 'ja-JP',
          name: voice
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: validSpeed,
          pitch: 0,
          // Optimize for mobile playback
          effectsProfileId: ['handset-class-device'],
        },
      });

      if (!response?.audioContent) {
        throw new Error('No audio content received from Google TTS');
      }

      return new NextResponse(response.audioContent, {
        headers: {
          'Content-Type': 'audio/mp3',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } catch (googleError) {
      console.error('Google TTS API error:', googleError);
      
      // Check if it's a credentials error
      if (googleError.message?.includes('credentials')) {
        return NextResponse.json({
          error: 'TTS service configuration error',
          details: 'The TTS service is not properly configured'
        }, { status: 500 });
      }
      
      // Check if it's a quota error
      if (googleError.message?.includes('quota')) {
        return NextResponse.json({
          error: 'TTS service quota exceeded',
          details: 'The service quota has been exceeded. Please try again later.'
        }, { status: 429 });
      }

      // Check if it's an invalid voice error
      if (googleError.message?.includes('voice')) {
        return NextResponse.json({
          error: 'Invalid voice selected',
          details: 'The selected voice is not available'
        }, { status: 400 });
      }

      throw googleError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({
      error: 'Failed to generate speech',
      details: error.message
    }, { status: 500 });
  }
} 