import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';
import { toFile } from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const base64Audio = body.audioBase64;

        if (!base64Audio) {
            return Response.json({ error: 'No audio provided' }, { status: 400 });
        }

        const buffer = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
        const file = await toFile(buffer, 'audio.webm', { type: 'audio/webm' });

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
        });

        return Response.json({ text: transcription.text });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});