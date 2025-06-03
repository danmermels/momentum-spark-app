# Dockerfile

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy necessary source files and configuration
COPY package.json .
COPY next.config.ts .
COPY tsconfig.json .
COPY public ./public
COPY src ./src
# If you have other root-level config files needed for build (e.g., postcss.config.js, tailwind.config.ts), copy them too.
# COPY tailwind.config.ts .
# COPY components.json .

# Set ARGS for build if needed, e.g., NEXT_PUBLIC_API_URL
# ARG NEXT_PUBLIC_API_URL
# ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

# Explicitly set ENTRYPOINT to node and CMD to the server script
ENTRYPOINT ["node"]
CMD ["server.js"]
