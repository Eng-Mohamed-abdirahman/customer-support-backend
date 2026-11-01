# Frontend Integration Guide

This document explains how to build a simple frontend that connects to this backend, including recommended stack, environment variables, common workflows, and example code snippets.

**Recommended stack**
- **Framework:** React with TypeScript (Vite) or Next.js (TypeScript) — pick one.
- **HTTP client:** fetch or axios
- **State & auth:** React Context or Zustand + localStorage for JWTs
- **Styling:** Tailwind CSS or CSS modules

**Quick scaffold (Vite + React + TS)**
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

**Environment variables**
- Create `.env` or `.env.local` at the frontend root.
- Example variables:
```
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=10000
```
Use `import.meta.env.VITE_API_URL` in your code.

**Discovering backend routes**
- Inspect the backend `src/routes` folder to see available endpoints and route prefixes.
- Typical patterns used by this backend include authentication, organization/brand endpoints, design generation, and webhooks.

**API Routes (exact paths)**

Auth
- POST `/api/auth/signup` — Register new user (no auth).
- POST `/api/auth/login` — Login; returns JWT (no auth).
- GET `/api/auth/me` — Get current user (protected, `Authorization: Bearer <token>`).
- PATCH `/api/auth/me` — Update current user (protected).

Health
- GET `/api/health` — Health check (no auth).

Designs / AI assets
- POST `/api/designs/optimize-prompt` — Optimize prompt (requires `x-api-key`).
- POST `/api/designs/generate` — Trigger design generation (requires `x-api-key`).
- POST `/api/designs/regenerate` — Regenerate a previous design (requires `x-api-key`).
- POST `/api/designs/webhook/replicate` — Replicate webhook receiver (webhook; no API key expected).

AI chat
- POST `/api/ai/chat` — Chat with AI (rate-limited; requires `x-api-key`).

Conversations
- POST `/api/conversations/ask` — Customer-facing ask (requires `x-api-key`).
- POST `/api/conversations/preview` — Preview conversation (protected).
- GET `/api/conversations/` — List org conversations (protected).
- GET `/api/conversations/:id/messages` — List messages (protected).
- POST `/api/conversations/:id/messages` — Send agent message (protected).
- PUT/POST `/api/conversations/:id/takeover` — Agent takeover (protected).
- PUT/POST `/api/conversations/:id/return-to-ai` — Return conversation to AI (protected).

Tickets
- POST `/api/tickets/` — Create ticket (requires `x-api-key`).
- GET `/api/tickets/` — List tickets (protected).
- PATCH `/api/tickets/:id/status` — Update ticket status (protected).

Organizations
- GET `/api/organizations/` — List organizations (protected).
- POST `/api/organizations/` — Create organization (protected).
- GET `/api/organizations/my-users` — List users in your org (protected).
- PATCH `/api/organizations/my-profile` — Update org profile (protected).
- API key management endpoints: `/api/organizations/my-api-keys`, `/api/organizations/my-api-keys/:apiKeyId/revoke`, `/api/organizations/my-api-keys/:apiKeyId/reveal`, `/api/organizations/my-api-key/rotate` (protected).

Knowledge (documents)
- POST `/api/knowledge/upload` — Upload document (file upload; protected).
- GET `/api/knowledge/documents` — List documents (protected).
- GET `/api/knowledge/documents/:id` — Get a document (protected).
- DELETE `/api/knowledge/documents/:id` — Delete document (protected).

Contacts
- GET `/api/contacts/` — List contacts (protected).
- GET `/api/contacts/by-phone/:phone` — Lookup contact by phone (protected).
- POST `/api/contacts/` — Create contact (protected).
- PATCH `/api/contacts/:id` — Update contact (protected).
- DELETE `/api/contacts/:id` — Delete contact (protected).

Orders
- GET `/api/orders/` — List orders (protected).
- PATCH `/api/orders/:orderId/status` — Update order status (protected).

Invitations
- POST `/api/invitations/` — Create/send invitation (protected).
- POST `/api/invitations/accept` — Accept invitation (rate-limited).

WhatsApp & Webhooks
- GET `/api/whatsapp/webhook` — Verify WhatsApp webhook (no auth).
- POST `/api/whatsapp/webhook` — WhatsApp webhook receiver (signed by Meta; no JWT).
- Alternate webhook mounts: `/api/webhooks/whatsapp` and `/api/webhook/whatsapp` are also registered.
- WhatsApp management (protected): `/api/whatsapp/connect`, `/api/whatsapp/status`, `/api/whatsapp/webhook/setup`, `/api/whatsapp/webhook/diagnose`, `/api/whatsapp/disconnect/:phoneNumberId`.

Inngest
- POST `/api/inngest/webhook` — Inngest webhook receiver.

Notes
- Protected endpoints require the JWT in the `Authorization: Bearer <token>` header.
- Endpoints that require an API key expect the `x-api-key` header (some customer-facing endpoints use this instead of JWT).

Example: login request
```bash
POST /api/auth/login
Content-Type: application/json

{ "email": "you@example.com", "password": "secret" }
```

Example: trigger design generation (authenticated or with API key)
```ts
fetch(`${import.meta.env.VITE_API_URL}/api/designs/generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'x-api-key': '<your-api-key-if-used>'
  },
  body: JSON.stringify({ designType: 'poster', promptText: 'Black Friday sale', referenceImageUrl: '' })
});
```

**Auth flow (recommended)**
- POST credentials to the backend auth endpoint (e.g., `/api/auth/login`) and receive a JWT.
- Store token in `localStorage` (or secure http-only cookie if server supports it).
- Send `Authorization: Bearer <token>` with secured requests.

Example `login` function (using fetch):
```ts
async function login(email: string, password: string) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data?.token) localStorage.setItem('token', data.token);
  return data;
}
```

Example helper for authenticated requests:
```ts
function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) } as any;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${import.meta.env.VITE_API_URL}${path}`, { ...opts, headers });
}
```

**Design generation example**
- Use the design endpoints to trigger generation. The backend expects brand settings to be configured per organization; the `design.controller` reads a `BrandIdentity` model.
- Example request to trigger design generation:
```ts
await apiFetch('/api/design/generate', {
  method: 'POST',
  body: JSON.stringify({ designType: 'poster', promptText: 'Sale - 50% off', referenceImageUrl: '' })
});
```

**Uploading images**
- For file uploads, use `FormData` and do not set `Content-Type` manually.

```ts
const fd = new FormData();
fd.append('file', fileInput.files[0]);
await fetch(`${import.meta.env.VITE_API_URL}/api/uploads`, { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } });
```

**Handling webhooks**
- This backend exposes webhooks (e.g., replicate callbacks). For development you can use `ngrok` to expose your frontend or a worker endpoint if needed. Typically the backend listens for webhooks and updates `DesignHistory` records.

**CORS & proxy**
- During development, either enable CORS on the backend or configure the Vite dev server proxy in `vite.config.ts`:

```ts
export default defineConfig({
  server: { proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } } }
});
```

**UX suggestions**
- Show status updates for design generation: poll `DesignHistory` or use sockets if backend exposes them.
- Provide a brand setup page that maps to `BrandIdentity`/organization settings so `design.generate` can use the configured brand.

**Production & deployment**
- Build with `npm run build` (Vite) or `next build` (Next.js), and serve static assets from a CDN or the same server behind a reverse proxy.
- Set `VITE_API_URL` to the production backend base URL.

**Where to look in this repo**
- Backend routes: [src/routes](src/routes)
- Design controller and model usage: [src/controllers/design.controller.ts](src/controllers/design.controller.ts#L1-L240)
- Design history model: [src/models/DesignHistory.ts](src/models/DesignHistory.ts#L1-L200)

If you'd like, I can scaffold a minimal React app in `frontend/` with auth and a design form wired to the API — would you like that next?
