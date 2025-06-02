
# Dockerfile
# Stage 1: Build the Next.js application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Copy the rest of the application code
COPY . .

# Set build-time arguments for Next.js telemetry
ARG NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone Next.js output
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# The .sqlite database will be created in /app/data/momentumspark.sqlite
# if NODE_ENV is production and not on Vercel (which our Dockerfile sets).
# The db.ts script will attempt to create the 'data' directory if it doesn't exist.

USER nextjs

EXPOSE 3000

ENV PORT 3000
# Next.js standalone output starts the server with `node server.js`
CMD ["node", "server.js"]
