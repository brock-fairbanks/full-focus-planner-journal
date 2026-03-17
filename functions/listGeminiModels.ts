const apiKey = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    return Response.json(await res.json());
});