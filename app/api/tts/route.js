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
    // Split text into manageable chunks if it's too long
    const maxChunkLength = 500;
    const textChunks = [];
    let currentChunk = '';

    for (const sentence of text.split(/([。！？])/)) {
      if (currentChunk.length + sentence.length > maxChunkLength) {
        if (currentChunk) textChunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk) textChunks.push(currentChunk);

    // Process each chunk and combine the audio
    const audioBuffers = [];
    for (const chunk of textChunks) {
      // Generate audio query for chunk
      const queryResponse = await axios.post(
        `${VOICEVOX_API}/audio_query`,
        null,
        {
          params: {
            text: chunk,
            speaker: NANAMI_SPEAKER_ID
          }
        }
      );

      const audioQuery = queryResponse.data;
      audioQuery.speedScale = Math.max(0.6, Math.min(1.2, speed));

      // Synthesize voice for chunk
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

      audioBuffers.push(Buffer.from(synthesisResponse.data));
    }

    // Combine all audio buffers
    const combinedBuffer = Buffer.concat(audioBuffers);

    return new NextResponse(combinedBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': combinedBuffer.length.toString()
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