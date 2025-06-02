# Dockerfile

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
# If you use yarn.lock or pnpm-lock.yaml, adjust the line above and the command below
RUN npm ci

# Stage 2: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules

# Copy necessary source files and configuration for the build
COPY package.json .
COPY next.config.ts .
COPY tsconfig.json .
COPY public ./public
COPY src ./src
# If you have other root-level config files needed for build (e.g., postcss.config.js, tailwind.config.ts), copy them too.
# COPY tailwind.config.ts . 
# COPY components.json . # components.json might be needed if `next build` processes it

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Copy essential build artifacts from the 'builder' stage
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

# CMD ["node", "server.js"] # This is for standalone output with a custom server.
# For default Next.js standalone output, the entrypoint is often managed by the output itself.
# The server.js is part of the .next/standalone output.
CMD ["node", "server.js"]
