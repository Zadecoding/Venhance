# ─── Stage 1: Build the Next.js app ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage 2: Production image with FFmpeg ───────────────────────────────────
FROM node:20-alpine AS runner

# Install FFmpeg from Alpine packages
RUN apk add --no-cache ffmpeg

WORKDIR /app

ENV NODE_ENV=production

# Copy built app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# FFmpeg is at /usr/bin/ffmpeg in Alpine
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
ENV FFMPEG_MOCK_MODE=false

CMD ["node", "server.js"]
