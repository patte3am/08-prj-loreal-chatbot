# L'Oréal Smart Beauty Advisor

A responsive beauty advisor for skincare, makeup, haircare, fragrance, and
personalized routines.

## Run locally

Open `index.html` in a browser or use VS Code Live Server. The interface and
conversation controls work without a backend; real AI responses require the
Cloudflare Worker.

## Cloudflare Worker

The frontend sends a `POST` with a `messages` array to:
`https://08-prj-loreal-chatbot.aliviapatt03.workers.dev/`.

The repository includes `wrangler.jsonc`, which identifies
`RESOURCE_cloudflare-worker.js` as the Worker entry point and configures the
allowed browser origin. The existing Cloudflare Workers Build is connected to
the `main` branch, so pushing this configuration deploys the request handler
instead of serving the repository as static assets.

After the Worker code is deployed, add `OPENAI_API_KEY` under Cloudflare
**Workers & Pages → the Worker → Settings → Variables and Secrets** as a
secret. The key must not be added to this repository, frontend code, or a
message. `ALLOWED_ORIGIN` is configured in `wrangler.jsonc` as
`https://patte3am.github.io` (origin only, with no repository path or trailing
slash).

Verify that an `OPTIONS` preflight succeeds and that an authorized `POST`
returns JSON with `choices[0].message.content`. A real AI response also
requires the Cloudflare secret to be configured.

The Worker returns the OpenAI chat-completions response shape and uses the
`gpt-4.1` model. Conversation context is stored in browser memory and reset by
**New chat**.

## GitHub Pages

The repository is `patte3am/08-prj-loreal-chatbot`, with default branch
`main`. The published site is
`https://patte3am.github.io/08-prj-loreal-chatbot/`; the Worker CORS origin is
`https://patte3am.github.io` because browser origins do not include paths.

The site includes the L'Oréal logo at `img/loreal-logo.png`, linked styles in
`style.css`, and browser behavior in `script.js`.

## Conversation features

- Conversation history is sent with each question so the advisor can remember
  details from earlier turns.
- The latest question is shown above the chat.
- Customer and advisor messages use separate chat bubbles.
- Category buttons and suggested questions cover skincare, makeup, haircare,
  and fragrance.
