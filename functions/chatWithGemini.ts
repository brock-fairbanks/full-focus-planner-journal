import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';

const apiKey = Deno.env.get("GEMINI_API_KEY");
const genAI = new GoogleGenerativeAI(apiKey);

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

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { userText, locationContext } = body;
        
        // Fetch recent history
        const rawHistory = await base44.entities.GeminiMessage.list('-created_date', 10);
        const history = rawHistory.reverse().map(m => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }]
        }));

        const tools = [
          {
            functionDeclarations: [
              {
                name: "getWeather",
                description: "Get the current weather for a location",
                parameters: {
                  type: "object",
                  properties: {
                    lat: { type: "number", description: "Latitude" },
                    lon: { type: "number", description: "Longitude" },
                  },
                  required: ["lat", "lon"],
                },
              },
            ],
          },
        ];

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro",
            systemInstruction: "You are a helpful planner assistant. Current Date/Time: " + new Date().toLocaleString() + ". " + (locationContext || ""),
            tools: tools
        });

        const chat = model.startChat({
            history: history,
        });

        let result = await chat.sendMessage(userText);
        let call = result.response.functionCalls();
        let toolResponses = [];

        if (call && call.length > 0) {
            for (const c of call) {
                if (c.name === 'getWeather') {
                    const { lat, lon } = c.args;
                    try {
                        const weatherData = await fetchWeather(lat, lon);
                        toolResponses.push({
                            functionResponse: {
                                name: 'getWeather',
                                response: weatherData
                            }
                        });
                    } catch (e) {
                         toolResponses.push({
                            functionResponse: {
                                name: 'getWeather',
                                response: { error: e.message }
                            }
                        });
                    }
                }
            }
            result = await chat.sendMessage(toolResponses);
        }

        const text = result.response.text();
        
        // Save to DB
        const userMsg = await base44.entities.GeminiMessage.create({ role: 'user', content: userText });
        const aiMsg = await base44.entities.GeminiMessage.create({ role: 'model', content: text });

        return Response.json({ text, userMsg, aiMsg });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});