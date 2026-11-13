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

The endpoint was reachable when checked, but returned **405 Method Not
Allowed** to both `OPTIONS` and chat `POST` requests. The deployed Worker must
be updated before AI chat can work:

1. In Cloudflare **Workers & Pages**, open the Worker for the URL above and
   replace its deployed code with `RESOURCE_cloudflare-worker.js`. Deploy it
   as the request handler, not a static HTML site.
2. In Worker **Settings → Variables and Secrets**, add the `ALLOWED_ORIGIN`
   text variable with value `https://patte3am.github.io`. Use only the origin:
   no repository path or trailing slash.
3. Ensure `OPENAI_API_KEY` is configured as a Cloudflare **secret**. Never
   put an API key in this repository, frontend code, or a message.
4. Deploy the Worker. Verify that a browser `OPTIONS` preflight succeeds and
   that a `POST` returns JSON with `choices[0].message.content`.

The Worker returns the OpenAI chat-completions response shape and uses the
`gpt-4.1` model. Conversation context is stored in browser memory and reset by
**New chat**.

## GitHub Pages

The repository is `patte3am/08-prj-loreal-chatbot`, with default branch
`main`. When checked, GitHub Pages was not enabled. To publish, open repository
**Settings → Pages**, choose **Deploy from a branch**, select `main` and the
`/(root)` folder, then save. The expected site URL is
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
