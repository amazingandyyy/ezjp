import { NextResponse } from 'next/server';
import axios from 'axios';

const VOICEVOX_API = 'http://localhost:50021';
const NANAMI_SPEAKER_ID = 14;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  const speed = parseFloat(searchParams.get('speed')) || 1.0;

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  try {
    // Step 1: Generate audio query
    const queryResponse = await axios.post(
      `${VOICEVOX_API}/audio_query`,
      null,
      {
        params: {
          text,
          speaker: NANAMI_SPEAKER_ID
        }
      }
    );

    // Step 2: Modify speed in query parameters
    const audioQuery = queryResponse.data;
    audioQuery.speedScale = Math.max(0.6, Math.min(1.5, speed)); // Clamp between 0.6 and 1.5

    // Step 3: Synthesize voice with modified parameters
    const synthesisResponse = await axios.post(
      `${VOICEVOX_API}/synthesis`,
      audioQuery,
      {
        params: {
          speaker: NANAMI_SPEAKER_ID
        },
        responseType: 'arraybuffer'
      }
    );

    return new NextResponse(synthesisResponse.data, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': synthesisResponse.data.length.toString()
      }
    });

  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
} 