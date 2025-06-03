# ==== Stage 1: Base ====
# Use official Node.js Alpine image as a base
FROM node:20-alpine AS base
LABEL maintainer="daniel@danielgronau.com"

# Set working directory
WORKDIR /app

# Create a non-root user and group for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ==== Stage 2: Dependencies ====
# Install dependencies, separate from the build stage for caching
FROM base AS deps
WORKDIR /app

# Copy package.json and lock files
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install dependencies based on the lock file found
# This prioritizes package-lock.json (npm), then pnpm-lock.yaml (pnpm), then yarn.lock (yarn)
RUN \
  if [ -f package-lock.json ]; then \
    echo "Found package-lock.json, running npm ci" && \
    npm ci; \
  elif [ -f pnpm-lock.yaml ]; then \
    echo "Found pnpm-lock.yaml, running pnpm i --frozen-lockfile" && \
    npm install -g pnpm && \
    pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then \
    echo "Found yarn.lock, running yarn install --frozen-lockfile" && \
    npm install -g yarn && \
    yarn install --frozen-lockfile; \
  else \
    echo "No lockfile found. Please ensure one of (package-lock.json, pnpm-lock.yaml, yarn.lock) is present." && \
    exit 1; \
  fi

# ==== Stage 3: Builder ====
# Build the Next.js application
FROM base AS builder
WORKDIR /app

# Copy dependencies from 'deps' stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/package.json ./package.json

# Copy the rest of the application code
# Ensure .dockerignore is properly set up to exclude unnecessary files
COPY . .

# Set environment variables for the build stage
# Ensure these are appropriate for your build process, e.g., if you have specific build-time secrets or configs
# ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED 1

# Build the Next.js application
# Ensure the build script is correctly defined in package.json
RUN npm run build

# ==== Stage 4: Runner ====
# Create the final, minimal image for running the application
FROM base AS runner
WORKDIR /app

# Set environment variables for the runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Pass the API key as a build argument and set it as an environment variable
ARG GEMINI_API_KEY_ARG
ENV GEMINI_API_KEY=$GEMINI_API_KEY_ARG

# Create a non-root user for running the app
# This user was created in the 'base' stage
USER nextjs

# Create and set permissions for the /app/data directory for SQLite
# This needs to be done as root before switching to nextjs user if nextjs needs to write here
# However, server.js will run as nextjs, so /app/data needs to be writable by nextjs
# The getDB function attempts to create /app/data if it doesn't exist.
# Ensure the parent directory /app is writable by nextjs initially or create /app/data as root and chown it.
# We'll create it as root and chown it here.
USER root
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
# Also for the /data directory if it's different and used by SQLite
RUN mkdir -p /data && chown nextjs:nodejs /data
USER nextjs

# Copy the standalone Next.js server output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets and public directory
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public


# For debugging: List the contents of /app to verify structure
USER root
RUN echo "DEBUG RUNNER: Recursive listing of /app (CacheBuster-Structure-MU)" && ls -AlR /app
# Ensure all files in /app are owned by the nextjs user for good measure
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose the port the app runs on
EXPOSE 8080

# Correct command to run the Next.js standalone server
CMD ["node", "--trace-warnings", "server.js"]

