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
        let file;

        if (body.audioBase64) {
            const buffer = Uint8Array.from(atob(body.audioBase64), c => c.charCodeAt(0));
            file = await toFile(buffer, 'audio.webm', { type: 'audio/webm' });
        } else if (body.fileUrl) {
            const authHeader = req.headers.get('Authorization');
            const fetchOptions = authHeader ? { headers: { 'Authorization': authHeader } } : {};
            const res = await fetch(body.fileUrl, fetchOptions);
            if (!res.ok) throw new Error("Failed to fetch file");
            const blob = await res.blob();
            const fileName = body.fileUrl.split('/').pop().split('?')[0] || 'audio.webm';
            file = await toFile(await blob.arrayBuffer(), fileName, { type: blob.type || body.mimeType || 'audio/webm' });
        } else {
            return Response.json({ error: 'No audio provided' }, { status: 400 });
        }

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
        });

        return Response.json({ text: transcription.text });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});