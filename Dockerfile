FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat


WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml*  ./


RUN npm i

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN apk update

# Set working directory
WORKDIR /app
# install node modules
COPY package.json /app/package.json
RUN npm install
# Copy all files from current directory to working dir in image
COPY . .
# Build the assets
RUN yarn build

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV NEXT_INTERNAL_URL="http://127.0.0.1:3099"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy proxy server and related files
COPY --from=builder --chown=nextjs:nodejs /app/proxy ./proxy
COPY --from=builder --chown=nextjs:nodejs /app/constants ./constants
COPY --from=builder --chown=nextjs:nodejs /app/utils ./utils

# Copy node_modules for proxy server dependencies
# The standalone Next.js build doesn't include proxy server dependencies
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT 3000

# Start both Next.js server and proxy gateway
# server.js is created by next build from the standalone output
# Next.js runs on port 3099, proxy gateway listens on PORT (default 3000)
CMD ["sh", "-c", "PORT=3099 node server.js & sleep 5 && PORT=${PORT:-3000} node proxy/server.js"]
