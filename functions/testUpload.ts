const apiKey = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
    try {
        const text = "hello world";
        const res = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
            method: "POST",
            headers: {
                "X-Goog-Upload-Protocol": "raw",
                "X-Goog-Upload-Header-Content-Type": "text/plain",
                "Content-Type": "text/plain"
            },
            body: new TextEncoder().encode(text)
        });
        const data = await res.text();
        return Response.json({ status: res.status, data });
    } catch(e) {
        return Response.json({ error: e.message });
    }
});