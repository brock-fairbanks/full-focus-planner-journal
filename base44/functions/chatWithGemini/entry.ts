import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const apiKey = Deno.env.get("GEMINI_API_KEY");

async function generateContent(contents, systemInstruction, model) {
    const tools = [
        { googleSearch: {} }
    ];

    const body = {
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        contents: contents,
        tools: tools
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-3-flash-preview'}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error: ${err}`);
    }

    return await res.json();
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { userText, locationContext, model = 'gemini-3-flash-preview', files = [] } = body;
        
        // Fetch recent history
        const rawHistory = await base44.entities.GeminiMessage.list('-created_date', 10);
        const contents = rawHistory.reverse().map(m => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
        }));

        let fileParts = [];
        for (const file of files) {
            try {
                const fileRes = await fetch(file.url);
                if (!fileRes.ok) continue;
                const contentLength = fileRes.headers.get('content-length');
                const uploadHeaders = {
                    'X-Goog-Upload-Protocol': 'raw',
                    'X-Goog-Upload-Header-Content-Type': file.mimeType || 'application/octet-stream',
                    'Content-Type': file.mimeType || 'application/octet-stream'
                };
                if (contentLength) uploadHeaders['Content-Length'] = contentLength;

                const uploadRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
                    method: 'POST',
                    headers: uploadHeaders,
                    body: fileRes.body,
                    duplex: 'half'
                });
                
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    const fileName = uploadData.file.name;
                    
                    // Poll until active
                    let fileState = uploadData.file?.state;
                    let attempts = 0;
                    while (fileState !== 'ACTIVE' && attempts < 30) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        const statusRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
                        if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            fileState = statusData.state;
                        }
                        attempts++;
                    }

                    if (fileState === 'ACTIVE') {
                        fileParts.push({ fileData: { mimeType: file.mimeType || 'application/octet-stream', fileUri: uploadData.file.uri } });
                    } else {
                        console.error(`File processing failed or timed out for ${fileName}`);
                    }
                }
            } catch (e) {
                console.error("File upload failed", e);
            }
        }

        const userParts = [{ text: userText }];
        userParts.push(...fileParts);
        contents.push({ role: 'user', parts: userParts });

        const userFirstName = user?.full_name ? user.full_name.split(' ')[0] : 'User';
        
        const systemInstruction = `You are a helpful planner assistant. Always address the user by their first name: ${userFirstName}.
        
Current Date/Time: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} (America/Chicago).
${locationContext || ""}`;

        const resolvedModel = model === 'meeting' ? 'gemini-3.1-pro-preview' : model;

        let result = await generateContent(contents, systemInstruction, resolvedModel);
        
        const candidate = result.candidates?.[0];
        if (!candidate) {
            throw new Error("No response from Gemini");
        }

        let finalResponseText = "";

        for (const part of candidate.content.parts) {
            if (part.text) {
                finalResponseText += part.text;
            }
        }

        // Save to DB
        const userMsg = await base44.entities.GeminiMessage.create({ role: 'user', content: userText });
        const aiMsg = await base44.entities.GeminiMessage.create({ role: 'model', content: finalResponseText });

        return Response.json({ text: finalResponseText, userMsg, aiMsg });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});