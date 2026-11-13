// This Worker keeps the OpenAI API key on the server, never in the website.
export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN;
    const requestOrigin = request.headers.get("Origin");

    // Allow browser requests only from the site origin configured in Cloudflare.
    if (!allowedOrigin) {
      return jsonResponse({ error: "The Worker ALLOWED_ORIGIN setting is missing." }, 500);
    }

    if (requestOrigin !== allowedOrigin) {
      return jsonResponse({ error: "This website is not allowed to use the Worker." }, 403);
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Only POST requests are supported." }, 405, corsHeaders);
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse({ error: "The Worker OpenAI secret is not configured." }, 500, corsHeaders);
    }

    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).length > 256000) {
      return jsonResponse({ error: "The conversation is too large. Start a new chat and try again." }, 413, corsHeaders);
    }

    let userInput;
    try {
      userInput = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: "The request body must be valid JSON." }, 400, corsHeaders);
    }

    const messages = userInput?.messages;
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 81) {
      return jsonResponse({ error: "The request must include a valid conversation." }, 400, corsHeaders);
    }

    const hasInvalidMessage = messages.some((message) => {
      return (
        !message ||
        !["system", "user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        message.content.trim().length === 0 ||
        message.content.length > 4000
      );
    });

    if (hasInvalidMessage || !messages.some((message) => message.role === "user")) {
      return jsonResponse({ error: "The conversation contains an invalid message." }, 400, corsHeaders);
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages,
        max_completion_tokens: 500,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const status = response.status >= 500 ? 502 : response.status;
      return jsonResponse(
        { error: data.error?.message || "The AI service could not complete the request." },
        status,
        corsHeaders,
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};

// Use the same JSON response shape for Worker errors.
function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
