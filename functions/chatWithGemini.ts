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

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-3.1-pro-preview'}:generateContent?key=${apiKey}`, {
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
        const { userText, locationContext, model = 'gemini-3.1-pro-preview' } = body;
        
        // Fetch recent history
        const rawHistory = await base44.entities.GeminiMessage.list('-created_date', 10);
        const contents = rawHistory.reverse().map(m => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
        }));

        contents.push({ role: 'user', parts: [{ text: userText }] });

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