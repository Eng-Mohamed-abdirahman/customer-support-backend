# Design Generation API

This document lists the design-related HTTP endpoints, required headers, request payloads, and example responses. These routes are implemented in the backend under `src/routes/design.routes.ts` and handled by `src/controllers/design.controller.ts`.

## Shared headers
- `Content-Type: application/json` for JSON requests.
- `x-api-key: <your-api-key>` — required for most public design endpoints (see each endpoint). These endpoints use the `validateApiKey` middleware.
- `Authorization: Bearer <token>` — not required for the public design endpoints, but may be used for other protected endpoints.

## 1) Optimize Prompt

- Method: POST
- Path: `/api/designs/optimize-prompt`
- Headers: `Content-Type: application/json`, `x-api-key: <your-api-key>`

Request payload:

```json
{
  "rawIntention": "short user idea or brief",
  "referencePhotoUrl": "https://example.com/reference.jpg" // optional
}
```

Example response (200):

```json
{
  "success": true,
  "optimizedPrompt": "A descriptive, polished, multi-sentence prompt suitable for image generation..."
}
```

Notes:
- The controller uses an LLM refiner to convert a short user intention into a richer prompt. Send `referencePhotoUrl` when you want the style or mood to reference an image.

## 2) Trigger Design Generation

- Method: POST
- Path: `/api/designs/generate`
- Headers: `Content-Type: application/json`, `x-api-key: <your-api-key>`

Request payload:

```json
{
  "designType": "poster",            // allowed values: poster, flyer, brochure, social_media_post, banner
  "promptText": "Black Friday sale ad copy and composition",
  "referenceImageUrl": "https://example.com/ref.png" // optional
}
```

Example response (202 — accepted):

```json
{
  "success": true,
  "designId": "60b7f1c2a7c6b7d3e4a9e123"
}
```

Notes:
- The server looks up the organization brand using `BrandIdentity` (based on the requesting user's org or API key mapping) to fill brand-guideline placeholders in the compiled prompt.
- A `DesignHistory` entry is created in `pending` status and a background job (Inngest) is triggered to perform image generation.
- The response is 202 Accepted; image generation is asynchronous. Poll `DesignHistory` (internal model) or listen for webhooks/socket updates to know when the asset is ready.

## 3) Regenerate Design

- Method: POST
- Path: `/api/designs/regenerate`
- Headers: `Content-Type: application/json`, `x-api-key: <your-api-key>`

Request payload:

```json
{
  "previousDesignId": "60b7f1c2a7c6b7d3e4a9e123",
  "useUpdatedBrand": true // boolean — if true, use the current brand settings, otherwise reuse previous brandSnapshot
}
```

Example response (201):

```json
{
  "success": true,
  "data": {
    "_id": "60b7f3d8a7c6b7d3e4a9e456",
    "organizationId": "...",
    "designType": "poster",
    "promptText": "...",
    "generatedImageUrl": "https://.../outputs/design_...png",
    "brandSnapshot": { "brandName": "Acme", "primaryColor": "#FF0000", "secondaryColor": "#00FF00", "fontStyle": "Inter", "logoUrl": "https://..." }
  }
}
```

Notes:
- The endpoint loads the previous `DesignHistory` entry and either uses its `brandSnapshot` or fetches the current `BrandIdentity` depending on `useUpdatedBrand`.
- The controller performs image generation synchronously in the background worker; the API returns the newly created `DesignHistory` record when generation completes (or a pending entry if asynchronous in your configuration).

## 4) Replicate Webhook (image generation callbacks)

- Method: POST
- Path: `/api/designs/webhook/replicate`
- Headers: Varies (webhook sender); do not expect `x-api-key`. The route accepts raw JSON (body size limit 1mb in the router).

Example webhook payload (structure varies by provider). The controller attempts to read `prediction`, `prediction.output`, and `prediction.meta.designHistoryId` or `payload.designHistoryId`:

```json
{
  "prediction": {
    "status": "succeeded",
    "output": ["https://cdn.example.com/prediction-output-1.png"],
    "meta": { "designHistoryId": "60b7f1c2a7c6b7d3e4a9e123" }
  }
}
```

What the endpoint does:
- If `prediction.status === 'succeeded'` and `prediction.output` contains image URLs, the controller downloads the first output, uploads it to Backblaze B2, and updates the corresponding `DesignHistory` record's `generatedImageUrl` and status to `completed`.
- If `prediction.status === 'failed'`, it marks the `DesignHistory` record as `failed`.

Security note:
- This webhook does not require `x-api-key`, so secure it by validating a signature or a shared secret if your image provider supports it. The current router uses `express.json({ limit: '1mb' })` for this endpoint.

## Tips for the frontend
- When calling `optimize-prompt`, send the user's raw intention and optionally a reference photo URL; display the returned `optimizedPrompt` to the user for confirmation.
- When calling `generate`, show an intermediate UI state (queued/processing) after receiving the 202 response and then poll an endpoint (or use socket events) to fetch the completed `DesignHistory` record.
- Ensure your client includes `x-api-key` for calls that require it.

## Where to inspect code
- Router: [src/routes/design.routes.ts](src/routes/design.routes.ts#L1-L40)
- Controller: [src/controllers/design.controller.ts](src/controllers/design.controller.ts#L1-L240)
- Design history model: [src/models/DesignHistory.ts](src/models/DesignHistory.ts#L1-L200)

If you want, I can also add a ready-to-import JSON mapping of these endpoints or generate small fetch wrappers for `optimize-prompt`, `generate`, and `regenerate`.
