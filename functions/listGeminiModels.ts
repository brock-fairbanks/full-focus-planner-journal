const apiKey = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    return Response.json(data.models.map(m => m.name));
});