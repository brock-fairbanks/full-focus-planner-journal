import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const apiKey = Deno.env.get("GEMINI_API_KEY");

const fetchWeather = async (lat, lon) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    const codeMap = {
        0: 'Clear sky',
        1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
        95: 'Thunderstorm'
    };
    if (data.current && data.current.weather_code !== undefined) {
        data.current.weather_description = codeMap[data.current.weather_code] || 'Unknown';
    }
    return data;
};

async function generateContent(contents, systemInstruction) {
    const tools = [
        {
            functionDeclarations: [
                {
                    name: "getWeather",
                    description: "Get the current weather for a location",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            lat: { type: "NUMBER", description: "Latitude" },
                            lon: { type: "NUMBER", description: "Longitude" },
                        },
                        required: ["lat", "lon"],
                    },
                },
            ],
        },
    ];

    const body = {
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        contents: contents,
        tools: tools
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent?key=${apiKey}`, {
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
        const { userText, locationContext } = body;
        
        // Fetch recent history
        const rawHistory = await base44.entities.GeminiMessage.list('-created_date', 10);
        const contents = rawHistory.reverse().map(m => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
        }));

        contents.push({ role: 'user', parts: [{ text: userText }] });

        const systemInstruction = "You are a helpful planner assistant. Current Date/Time: " + new Date().toLocaleString() + ". " + (locationContext || "");

        let result = await generateContent(contents, systemInstruction);
        
        const candidate = result.candidates?.[0];
        if (!candidate) {
            throw new Error("No response from Gemini");
        }

        let functionCall = null;
        for (const part of candidate.content.parts) {
            if (part.functionCall) {
                functionCall = part.functionCall;
                break;
            }
        }

        let finalResponseText = "";

        if (functionCall) {
            if (functionCall.name === 'getWeather') {
                const { lat, lon } = functionCall.args;
                try {
                    const weatherData = await fetchWeather(lat, lon);
                    
                    // Append the assistant's function call message to contents
                    contents.push(candidate.content);
                    
                    // Append the function response
                    contents.push({
                        role: 'function',
                        parts: [{
                            functionResponse: {
                                name: 'getWeather',
                                response: weatherData
                            }
                        }]
                    });
                    
                    const secondResult = await generateContent(contents, systemInstruction);
                    const secondCandidate = secondResult.candidates?.[0];
                    for (const part of secondCandidate.content.parts) {
                        if (part.text) {
                            finalResponseText += part.text;
                        }
                    }
                } catch (e) {
                    finalResponseText = "Sorry, I couldn't fetch the weather right now.";
                }
            }
        } else {
            for (const part of candidate.content.parts) {
                if (part.text) {
                    finalResponseText += part.text;
                }
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