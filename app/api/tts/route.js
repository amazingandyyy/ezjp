import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { createClient } from '@supabase/supabase-js';

// Voice costs per character (Google Cloud TTS pricing)
const VOICE_COSTS = {
  'Standard': 0.000004,  // $4 per 1 million characters
  'Neural2': 0.000016,   // $16 per 1 million characters
  'Wavenet': 0.000016    // $16 per 1 million characters
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize the client with credentials from environment variable
const client = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
});

async function trackTTSUsage(userId, voiceName, articleId, sentenceIndex, characterCount) {
  try {
    // Ensure voiceName is valid
    const validVoiceName = voiceName || 'ja-JP-Standard-A';

    console.log('Attempting to insert/update TTS session:', {
      userId,
      voiceName: validVoiceName,
      articleId,
      sentenceIndex,
      characterCount
    });

    // Try to update existing record
    const { data: existingSession } = await supabase
      .from('tts_sessions')
      .select()
      .eq('article_id', articleId)
      .eq('sentence_index', sentenceIndex)
      .single();

    if (existingSession) {
      // Update existing session
      const { error: updateError } = await supabase
        .from('tts_sessions')
        .update({ count: existingSession.count + 1 })
        .eq('article_id', articleId)
        .eq('sentence_index', sentenceIndex);

      if (updateError) {
        console.error('Error updating TTS session:', updateError);
      } else {
        console.log('Successfully updated TTS session count');
      }
    } else {
      // Insert new session
      const { error: insertError } = await supabase
        .from('tts_sessions')
        .insert({
          article_id: articleId,
          sentence_index: sentenceIndex,
          user_id: userId,
          voice_name: validVoiceName,
          character_count: characterCount,
          count: 1
        });

      if (insertError) {
        console.error('Error inserting TTS session:', insertError);
      } else {
        console.log('Successfully inserted TTS session');
      }
    }
  } catch (error) {
    console.error('Error in trackTTSUsage:', error);
  }
}

export async function POST(req) {
  try {
    const { text, speed = 1.0, voice = 'ja-JP-Standard-A', userId = null, articleId, sentenceIndex } = await req.json();
    
    if (!text) {
      return NextResponse.json({ 
        error: 'Text is required',
        details: 'The text parameter is missing or empty'
      }, { status: 400 });
    }

    if (!articleId || sentenceIndex === undefined) {
      return NextResponse.json({
        error: 'Article ID and sentence index are required',
        details: 'The articleId and sentenceIndex parameters are missing'
      }, { status: 400 });
    }

    // Validate and clamp speed between 0.25 and 4.0 (Google's limits)
    const validSpeed = Math.max(0.25, Math.min(4.0, parseFloat(speed) || 1.0));

    try {
      // Track usage first to ensure it's recorded
      await trackTTSUsage(userId, voice, articleId, sentenceIndex, text.length);

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