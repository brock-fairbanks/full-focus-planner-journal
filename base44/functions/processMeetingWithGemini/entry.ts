import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const apiKey = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        console.log("Received body:", JSON.stringify(body));
        const { action } = body;

        if (action === "transcribe_start") {
            const { fileUrl, mimeType } = body;
            
            const authHeader = req.headers.get('Authorization');
            const fetchOptions = authHeader ? { headers: { 'Authorization': authHeader } } : {};
            
            const fileRes = await fetch(fileUrl, fetchOptions);
            if (!fileRes.ok) {
                const text = await fileRes.text();
                throw new Error(`Failed to download file (${fileRes.status}): ${text.substring(0, 100)}`);
            }
            const contentLength = fileRes.headers.get('content-length');

            const uploadHeaders = {
                'X-Goog-Upload-Protocol': 'raw',
                'X-Goog-Upload-Header-Content-Type': mimeType || 'audio/webm',
                'Content-Type': mimeType || 'audio/webm'
            };
            if (contentLength) uploadHeaders['Content-Length'] = contentLength;

            const uploadRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
                method: 'POST',
                headers: uploadHeaders,
                body: fileRes.body,
                duplex: 'half'
            });
            
            if (!uploadRes.ok) {
                const err = await uploadRes.text();
                throw new Error(`Gemini File Upload error: ${err}`);
            }

            const uploadData = await uploadRes.json();
            return Response.json({ fileName: uploadData.file.name, fileUri: uploadData.file.uri });
        } else if (action === "transcribe_poll") {
            const { fileName, fileUri, prompt, mimeType, model = "gemini-3-flash-preview" } = body;
            
            const statusRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
            if (!statusRes.ok) {
                return Response.json({ status: 'processing' });
            }
            
            const statusData = await statusRes.json();
            const fileState = statusData.state;
            
            if (fileState === 'PROCESSING') {
                return Response.json({ status: 'processing' });
            } else if (fileState === 'FAILED') {
                return Response.json({ status: 'failed', error: 'Gemini failed to process the file' });
            }

            const payload = {
                contents: [{
                    parts: [
                        { text: prompt },
                        { fileData: { mimeType: mimeType || 'audio/webm', fileUri: fileUri } }
                    ]
                }]
            };

            const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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

            return Response.json({ status: 'completed', text });
        } else if (action === "summarize") {
            const { transcription, recordingType, model = "gemini-3-flash-preview" } = body;

            let prompt = "";
            if (recordingType === 'lecture') {
                prompt = `Please provide a highly detailed, in-depth summary of the following lecture transcription. Include key concepts, comprehensive explanations, important examples or case studies, and a structured outline of the topics covered. CRITICAL: Explicitly exclude and ignore any advertisements, sponsor segments, or overtly promotional content:\n\n${transcription}`;
            } else if (recordingType === 'dialog') {
                prompt = `Please summarize the following dialog transcription. Highlight the main topics discussed, the flow of the conversation, and any key takeaways or conclusions reached by the speakers. CRITICAL: If this is a product review or podcast, explicitly exclude and ignore any advertisements, sponsor segments, promotional reads, or calls to action:\n\n${transcription}`;
            } else {
                prompt = `Please summarize the following meeting transcription concisely, highlighting the main points, decisions, and action items. Exclude any advertisements or sponsored content:\n\n${transcription}`;
            }

            const invokeModel = model === 'gemini-3.1-pro-preview' ? 'gemini_3_pro' : 'gemini_3_flash';
            const text = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: prompt,
                model: invokeModel
            });

            return Response.json({ text });
        }

        return Response.json({ error: `Invalid action received: ${action}. Body keys: ${Object.keys(body).join(', ')}` }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});