# Design Generator — Postman Test Guide

This guide shows quick Postman tests for the Design Generator endpoints: prompt optimization, generation, regeneration, and Replicate webhook handling.

Prerequisites
- Clone and install dependencies:

```bash
npm install
```

- Add required environment variables to your `.env` (see the project's `.env` for names). Key vars:
  - `REPLICATE_API_TOKEN`
  - `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_ID`, `B2_BUCKET_NAME`
  - `INNGEST_API_KEY` (optional) and `INNGEST_WEBHOOK_SECRET` for secure webhooks

- Start services:

```bash
# start app in dev mode
npm run dev

# (No separate worker needed — background jobs are handled via Inngest events)
```

- If testing webhooks locally, expose your server with `ngrok` and set `PUBLIC_API_URL` to the forwarded URL.

Endpoints

1) Optimize Prompt — POST /api/designs/optimize-prompt

- URL: `http://localhost:5000/api/designs/optimize-prompt`
- Method: POST
- Headers:
  - `Content-Type: application/json`
  - `x-api-key: <your-api-key>` (project uses `validateApiKey` middleware)
- Body (JSON):

```json
{
  "rawIntention": "make a summer clearance sale flyer for our natural health shop",
  "referencePhotoUrl": "https://f004.backblazeb2.com/file/brand-assets/reference/photo_912.png"
}
```

- Expected 200 response:

```json
{
  "success": true,
  "optimizedPrompt": "A minimalist organic health store flyer highlighting summer clearance discounts. Centered bold text overlay with natural sunlight accents and herbal leaves framing the border."
}
```

Notes:
- This endpoint calls Replicate (LLM) to refine the prompt. See implementation in [src/controllers/design.controller.ts](src/controllers/design.controller.ts#L1-L400).

2) Generate Design (enqueue) — POST /api/designs/generate

- URL: `http://localhost:5000/api/designs/generate`
- Method: POST
- Headers:
  - `Content-Type: application/json`
  - `x-api-key: <your-api-key>`
- Body (JSON):

```json
{
  "designType": "flyer",
  "promptText": "A minimalist organic health store flyer highlighting summer clearance discounts...",
  "referenceImageUrl": "https://f004.backblazeb2.com/file/brand-assets/reference/layout_template.png"
}
```

- Expected response: 202 Accepted

```json
{
  "success": true,
  "designId": "<mongodb-document-id>"
}
```

Notes:
- The API now dispatches an Inngest event which triggers the background processing (image generation and B2 upload). The processing updates the `generatedImageUrl` and `status` fields on the design record in MongoDB. Check the document in your database to retrieve the final URL.

3) Regenerate Design — POST /api/designs/regenerate

- URL: `http://localhost:5000/api/designs/regenerate`
- Method: POST
- Headers:
  - `Content-Type: application/json`
  - `x-api-key: <your-api-key>`
- Body (JSON):

```json
{
  "previousDesignId": "65f884a29a21e400a2211bb1",
  "useUpdatedBrand": true
}
```

- Expected response: 201 Created (new design entry)

```json
{
  "success": true,
  "data": {
    "designId": "<new-id>",
    "designType": "flyer",
    "generatedImageUrl": "https://f004.backblazeb2.com/file/brand-assets/outputs/gen_flyer_123.png"
  }
}
```

4) Replicate Webhook (manual test)

- If you want to simulate Replicate calling your webhook (for models that post callbacks), forward a test payload to:

`POST http://localhost:5000/api/designs/webhook/replicate`

- Example webhook JSON (structure depends on Replicate model; controller expects `prediction` object):

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

- Expected response: 200 OK. The webhook handler downloads the image and updates the corresponding `DesignHistory` document.

Useful Postman tips
- Save a Postman environment with `baseUrl` (e.g. `http://localhost:5000`) and your `x-api-key`.
- Use the `raw` JSON body tab for requests above.
- For webhooks, use Postman's `Send and Download` to verify image is reachable.

Troubleshooting
- If processing doesn't occur: ensure your Inngest webhook endpoint is reachable (if using Inngest service) or check server logs for processing errors.
- Replicate calls failing: verify `REPLICATE_API_TOKEN` and check server logs for errors. The Replicate wrapper is in [src/services/replicate.service.ts](src/services/replicate.service.ts#L1-L200).
- B2 upload errors: verify B2 credentials and `B2_BUCKET_ID`. Backblaze helper: [src/services/backblaze.service.ts](src/services/backblaze.service.ts#L1-L200).

Quick curl examples

Optimize prompt:

```bash
curl -X POST "http://localhost:5000/api/designs/optimize-prompt" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <key>" \
  -d '{"rawIntention":"summer sale flyer","referencePhotoUrl":"https://...png"}'
```

Generate design (enqueue):

```bash
curl -X POST "http://localhost:5000/api/designs/generate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <key>" \
  -d '{"designType":"flyer","promptText":"...","referenceImageUrl":"https://...png"}'
```

Where to look in code
- Controller and API routes: [src/controllers/design.controller.ts](src/controllers/design.controller.ts#L1-L400) and [src/routes/design.routes.ts](src/routes/design.routes.ts#L1-L200).
- Design processor: [src/services/design.processor.ts](src/services/design.processor.ts#L1-L200).
- Design history schema: [src/models/DesignHistory.ts](src/models/DesignHistory.ts#L1-L200).

If you want, I can also export a Postman collection JSON for direct import — tell me which endpoints to include and I'll add it to `docs/`.
