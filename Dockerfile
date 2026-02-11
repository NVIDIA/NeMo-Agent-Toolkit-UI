# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Production dependencies only (excluding dev dependencies)
FROM base AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build the application
FROM base AS builder
WORKDIR /app

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_NAT_WORKFLOW="NeMo Agent Toolkit"
ARG NEXT_PUBLIC_NAT_GREETING_TITLE="Hi, I'm NeMo Agent Toolkit"
ARG NEXT_PUBLIC_NAT_GREETING_SUBTITLE="How can I assist you today?"
ARG NEXT_PUBLIC_NAT_INPUT_PLACEHOLDER="Unlock NeMo Agent Toolkit knowledge and expertise"
ARG NEXT_PUBLIC_NAT_WELCOME_MESSAGE_ON="false"
ARG NEXT_PUBLIC_NAT_WEB_SOCKET_DEFAULT_ON="false"
ARG NEXT_PUBLIC_NAT_CHAT_HISTORY_DEFAULT_ON="false"
ARG NEXT_PUBLIC_NAT_RIGHT_MENU_OPEN="false"
ARG NEXT_PUBLIC_NAT_ENABLE_INTERMEDIATE_STEPS="true"
ARG NEXT_PUBLIC_NAT_SHOW_DATA_STREAM_DEFAULT_ON="false"
ARG NEXT_PUBLIC_NAT_ADDITIONAL_VIZ_DEFAULT_ON="false"

COPY . .
COPY --from=deps /app/node_modules ./node_modules

RUN npm run build

# Production image, minimal runtime image with standalone build and proxy server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV NEXT_INTERNAL_URL="http://127.0.0.1:3099"
ENV PORT 3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone Next.js build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy proxy server and related files
COPY --from=builder --chown=nextjs:nodejs /app/proxy ./proxy
COPY --from=builder --chown=nextjs:nodejs /app/constants ./constants
COPY --from=builder --chown=nextjs:nodejs /app/utils ./utils

# Copy node_modules for proxy server dependencies
# Use production-only dependencies to reduce image size
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

# Start both Next.js server and proxy gateway
# server.js is created by next build from the standalone output
# Next.js runs on port 3099, proxy gateway listens on PORT (default 3000)
CMD ["npx", "concurrently", "--kill-others", "--raw", \
     "PORT=3099 node server.js", \
     "PORT=${PORT:-3000} node proxy/server.js"]
