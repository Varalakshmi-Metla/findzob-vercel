import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// NOTE: This route requires Google credentials set in the environment, e.g.:
// export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
// or set the JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON and write to a temp file in startup.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = body.text || '';
    const voice: string = body.voice || 'algenib';
    const format: string = body.format || 'MP3';

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    // Lazy import the Google client so local dev without the package won't break unrelated pages
    const { TextToSpeechClient } = await import('@google-cloud/text-to-speech');

    const client = new TextToSpeechClient();

    // Map a minimal voice selection; 'algenib' will be used as a name if available.
    const request = {
      input: { text },
      // Use 'en-US' as default language code; adjust if you need other languages
      voice: { languageCode: 'en-US', name: voice },
      audioConfig: { audioEncoding: format },
    } as any;

    const [response] = await client.synthesizeSpeech(request);
    if (!response || !response.audioContent) {
      return NextResponse.json({ error: 'Empty audio content from TTS' }, { status: 502 });
    }

    // response.audioContent is a Buffer (Node). Return as binary
    const audioBuffer = Buffer.isBuffer(response.audioContent) ? response.audioContent : Buffer.from(response.audioContent as any);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('TTS API error', err);
    const message = err?.message || 'TTS error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
