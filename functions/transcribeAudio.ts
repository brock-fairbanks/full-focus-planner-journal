import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await req.formData();
        const audioFile = formData.get('audio');

        if (!audioFile) {
            return Response.json({ error: 'No audio file provided' }, { status: 400 });
        }

        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
        });

        return Response.json({ text: transcription.text });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});