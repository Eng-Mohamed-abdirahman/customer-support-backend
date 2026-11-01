# Postman Testing Guide — Design Generator

This file shows quick Postman tests you can run locally for the Design Generator endpoints.

Prerequisites
- Node.js and npm installed
- Project dependencies installed: `npm install`
- Fill required env vars in `.env` (see example in repo): `REPLICATE_API_TOKEN`, Backblaze B2 creds, optional `INNGEST_API_KEY`.

Start services
- Start API server (in one terminal):

```bash
npm run dev
```

- Start local Inngest runner (optional; used to simulate Inngest events):

```bash
npm run inngest:run
```

Postman environment
- Create an environment with variables:
  - `baseUrl` = `http://localhost:5000`
  - `xApiKey` = your API key value used by `validateApiKey` middleware

Common headers for requests
- `Content-Type: application/json`
- `x-api-key: {{xApiKey}}` (for protected endpoints)

1) Optimize Prompt
- URL: `{{baseUrl}}/api/designs/optimize-prompt`
- Method: POST
- Headers: common headers
- Body (raw JSON):

```json
{
  "rawIntention": "make a summer clearance sale flyer for our natural health shop",
  "referencePhotoUrl": "https://example.com/ref.png"
}
```
- Expected: 200 OK, JSON with `optimizedPrompt` string.

2) Generate Design (async)
- URL: `{{baseUrl}}/api/designs/generate`
- Method: POST
- Headers: common headers
- Body (raw JSON):

```json
{
  "designType": "flyer",
  "promptText": "A minimalist organic health store flyer highlighting summer clearance discounts...",
  "referenceImageUrl": "https://example.com/layout.png"
}
```
- Expected: 202 Accepted, JSON containing `designId`.
- After request: check MongoDB `DesignHistory` document for that `designId`. `status` will move from `pending` → `processing` → `completed` and `generatedImageUrl` will be set when finished. If you run the local Inngest runner (`npm run inngest:run`), processing happens immediately.

3) Regenerate Design
- URL: `{{baseUrl}}/api/designs/regenerate`
- Method: POST
- Headers: common headers
- Body (raw JSON):

```json
{
  "previousDesignId": "<existing-design-id>",
  "useUpdatedBrand": true
}
```
- Expected: 201 Created with the new design record in `data`.

4) Replicate webhook (simulate)
- If you need to simulate a Replicate callback to our webhook handler, POST to:

`{{baseUrl}}/api/designs/webhook/replicate`

- Body (example):

```json
{
  "prediction": {
    "id": "pred_abc123",
    "status": "succeeded",
    "output": ["https://.../prediction-output.png"],
    "meta": { "designHistoryId": "<your-design-id>" }
  }
}
```

5) Inngest webhook (simulate)
- If using remote Inngest or the local runner, POST an event to `/api/inngest/webhook` or the runner's `/event` path.
- Example payload for the runner (`http://localhost:4001/event`):

```json
{
  "name": "design.generate",
  "data": {
    "designHistoryId": "<id>",
    "designType": "flyer",
    "promptText": "...",
    "referenceImageUrl": null,
    "orgId": "<org>"
  }
}
```

Troubleshooting
- If processing never completes:
  - Confirm API logs for errors during `processDesignJob`.
  - Ensure `REPLICATE_API_TOKEN` and Backblaze credentials are correct.
  - For local testing, confirm `npm run inngest:run` is running if relying on the runner.
- If you used Redis previously, ensure no leftover `REDIS_*` env is interfering (we migrated to Inngest locally).

Extras
- Want a ready-to-import Postman collection? Tell me and I will export a collection JSON including these requests.
