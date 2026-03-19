import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const apiKey = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { action } = body;

        if (action === "transcribe") {
            const { fileUrl, mimeType, prompt } = body;
            
            const fileRes = await fetch(fileUrl);
            if (!fileRes.ok) throw new Error("Failed to download file: " + fileUrl);
            
            const arrayBuffer = await fileRes.arrayBuffer();

            const uploadRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'X-Goog-Upload-Protocol': 'raw',
                    'X-Goog-Upload-Header-Content-Type': mimeType || 'audio/webm',
                    'Content-Type': mimeType || 'audio/webm',
                    'Content-Length': arrayBuffer.byteLength.toString()
                },
                body: arrayBuffer
            });
            
            if (!uploadRes.ok) {
                const err = await uploadRes.text();
                throw new Error(`Gemini File Upload error: ${err}`);
            }

            const uploadData = await uploadRes.json();
            const fileUri = uploadData.file.uri;

            const payload = {
                contents: [{
                    parts: [
                        { text: prompt },
                        { fileData: { mimeType: mimeType || 'audio/webm', fileUri: fileUri } }
                    ]
                }]
            };

            const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!generateRes.ok) {
                const err = await generateRes.text();
                throw new Error(`Gemini Generate error: ${err}`);
            }

            const result = await generateRes.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

            return Response.json({ text });
        } else if (action === "summarize") {
            const { transcription, recordingType } = body;

            let prompt = "";
            if (recordingType === 'lecture') {
                prompt = `Please provide a highly detailed, in-depth summary of the following lecture transcription. Include key concepts, comprehensive explanations, important examples or case studies, and a structured outline of the topics covered. CRITICAL: Explicitly exclude and ignore any advertisements, sponsor segments, or overtly promotional content:\n\n${transcription}`;
            } else if (recordingType === 'dialog') {
                prompt = `Please summarize the following dialog transcription. Highlight the main topics discussed, the flow of the conversation, and any key takeaways or conclusions reached by the speakers. CRITICAL: If this is a product review or podcast, explicitly exclude and ignore any advertisements, sponsor segments, promotional reads, or calls to action:\n\n${transcription}`;
            } else {
                prompt = `Please summarize the following meeting transcription concisely, highlighting the main points, decisions, and action items. Exclude any advertisements or sponsored content:\n\n${transcription}`;
            }

            const text = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: prompt,
                model: "gemini_3_pro"
            });

            return Response.json({ text });
        }

        return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});