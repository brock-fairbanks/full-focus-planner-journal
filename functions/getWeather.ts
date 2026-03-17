import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { lat, lon } = body;

        if (!lat || !lon) {
            return Response.json({ error: 'Missing lat or lon' }, { status: 400 });
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto`;
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`Open-Meteo API error: ${res.statusText}`);
        }
        
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
        
        if (data.daily && data.daily.weather_code) {
            data.daily.weather_description = data.daily.weather_code.map(code => codeMap[code] || 'Unknown');
        }

        return Response.json({ weather: data });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});