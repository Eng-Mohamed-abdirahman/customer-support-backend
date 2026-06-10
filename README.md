# customer-support-backend

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file at the project root and set required environment variables.

Minimum required values for local testing:

```bash
MONGO_URI=mongodb://localhost:27017/support-saas
JWT_SECRET=your-jwt-secret
B2_ACCESS_KEY_ID=your-b2-access-key-id
B2_SECRET_ACCESS_KEY=your-b2-secret-access-key
B2_S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_BUCKET_NAME=your-b2-bucket-name
B2_PUBLIC_URL_BASE=https://f004.backblazeb2.com/file
FRONTEND_URL=http://localhost:3000
```

3. Start the server in development mode:

```bash
npm run dev
```

4. Optionally build the project:

```bash
npm run build
```

## Manual Testing

### Health check

Request:

```bash
curl http://localhost:5000/api/health
```

Expected response: a JSON health status.

### Authenticate

Use your existing authentication endpoints to obtain a valid JWT access token. Example:

```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "your-user@example.com",
  "password": "your-password"
}
```

Then include the token in the `Authorization` header for protected endpoints.

### Generate a Backblaze B2 presigned upload URL

Request:

```bash
curl "http://localhost:5000/api/v1/storage/presign?filename=apex_logo.png&contentType=image/png&type=logo" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response contains:

- `uploadUrl` — direct upload URL for Backblaze B2
- `publicUrl` — accessible public file URL

### Upload a logo directly to Backblaze B2

Using the returned `uploadUrl`, perform a PUT request with the raw image bytes and matching `Content-Type` header.

### Save or update brand identity

Request:

```bash
curl -X POST http://localhost:5000/api/v1/brands \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Apex Wellness Corp",
    "primaryColor": "#2E7D32",
    "secondaryColor": "#C8E6C9",
    "fontStyle": "Inter, Sans-Serif",
    "logoUrl": "https://f004.backblazeb2.com/file/brand-assets/logos/apex_logo.png"
  }'
```

Expected response: success message and saved brand object.

### Fetch current brand identity

Request:

```bash
curl http://localhost:5000/api/v1/brands/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response: the saved brand identity object, or `null` if none exists.

## Notes

- The API uses JWT-based authentication for brand and storage routes.
- The brand payload validates hex colors with strict regex and requires a valid logo URL.
- Frontend upload requests should be limited to image files and kept below 5MB.
