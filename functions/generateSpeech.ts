import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';
import { Buffer } from 'node:buffer';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { text, voice = 'echo' } = body; 

        if (!text) {
            return Response.json({ error: 'Text is required' }, { status: 400 });
        }

        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text.substring(0, 4096), // Truncate to avoid exceeding max limit
            response_format: "aac",
        });

        const arrayBuffer = await mp3.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        return Response.json({ audioContent: base64Audio });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});