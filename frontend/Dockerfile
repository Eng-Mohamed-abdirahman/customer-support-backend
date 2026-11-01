# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
# NEXT_PUBLIC_* values are baked into the browser bundle at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ARG NEXT_PUBLIC_META_APP_ID=
ARG NEXT_PUBLIC_WHATSAPP_CONFIG_ID=
ARG NEXT_PUBLIC_WHATSAPP_REDIRECT_URI=
ARG NEXT_PUBLIC_WEBHOOK_PUBLIC_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_META_APP_ID=$NEXT_PUBLIC_META_APP_ID \
    NEXT_PUBLIC_WHATSAPP_CONFIG_ID=$NEXT_PUBLIC_WHATSAPP_CONFIG_ID \
    NEXT_PUBLIC_WHATSAPP_REDIRECT_URI=$NEXT_PUBLIC_WHATSAPP_REDIRECT_URI \
    NEXT_PUBLIC_WEBHOOK_PUBLIC_URL=$NEXT_PUBLIC_WEBHOOK_PUBLIC_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
