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
            const { fileUrl, mimeType, prompt, model = "gemini-3-flash-preview" } = body;
            console.log(`[Transcribe] Started for URL: ${fileUrl.substring(0, 70)}...`);
            
            const authHeader = req.headers.get('Authorization');
            const fetchOptions = authHeader ? { headers: { 'Authorization': authHeader } } : {};
            
            console.log(`[Transcribe] Fetching file from storage...`);
            const fileRes = await fetch(fileUrl, fetchOptions);
            
            if (!fileRes.ok) {
                const text = await fileRes.text();
                console.error(`[Transcribe] Failed to download file from storage: ${fileRes.status}`);
                throw new Error(`Failed to download file (${fileRes.status}): ${text.substring(0, 100)}`);
            }
            
            const contentLength = fileRes.headers.get('content-length');
            console.log(`[Transcribe] File fetched. Content-Length: ${contentLength}`);

            const uploadHeaders = {
                'X-Goog-Upload-Protocol': 'raw',
                'X-Goog-Upload-Header-Content-Type': mimeType || 'audio/webm',
                'Content-Type': mimeType || 'audio/webm'
            };
            if (contentLength) uploadHeaders['Content-Length'] = contentLength;

            console.log(`[Transcribe] Uploading to Gemini Files API...`);
            const uploadRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
                method: 'POST',
                headers: uploadHeaders,
                body: fileRes.body,
                duplex: 'half'
            });
            
            if (!uploadRes.ok) {
                const err = await uploadRes.text();
                console.error(`[Transcribe] Gemini File Upload failed: ${uploadRes.status} ${err}`);
                throw new Error(`Gemini File Upload error: ${err}`);
            }

            const uploadData = await uploadRes.json();
            const fileUri = uploadData.file.uri;
            const fileName = uploadData.file.name;
            console.log(`[Transcribe] Uploaded to Gemini successfully. URI: ${fileUri}, Name: ${fileName}`);

            // Poll until the file is active
            let fileState = uploadData.file?.state;
            let attempts = 0;
            // The upload API might not always return a state initially, or it might be PROCESSING.
            // We want to wait until it is explicitly 'ACTIVE'.
            while (fileState !== 'ACTIVE' && attempts < 100) {
                console.log(`[Transcribe] File state is ${fileState || 'unknown'}. Waiting... (attempt ${attempts + 1})`);
                await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 seconds
                const statusRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    // GET /v1beta/files/id returns the File object directly
                    fileState = statusData.state;
                    console.log(`[Transcribe] File state is now: ${fileState}`);
                    if (fileState === 'FAILED') {
                        throw new Error(`Gemini failed to process the uploaded file.`);
                    }
                } else {
                    console.warn(`[Transcribe] Failed to check file status: ${statusRes.status}`);
                }
                attempts++;
            }

            if (fileState !== 'ACTIVE') {
                 throw new Error(`File processing timed out after 500 seconds. Last state: ${fileState}. Please try again later.`);
            }

            const payload = {
                contents: [{
                    parts: [
                        { text: prompt },
                        { fileData: { mimeType: mimeType || 'audio/webm', fileUri: fileUri } }
                    ]
                }]
            };

            console.log(`[Transcribe] Calling Gemini Generate API with model: ${model}...`);
            const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!generateRes.ok) {
                const err = await generateRes.text();
                console.error(`[Transcribe] Gemini Generate API failed: ${generateRes.status} ${err}`);
                throw new Error(`Gemini Generate error: ${err}`);
            }

            console.log(`[Transcribe] Gemini Generate API successful.`);
            const result = await generateRes.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

            return Response.json({ text });
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

        return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});