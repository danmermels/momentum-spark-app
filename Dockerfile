
# Dockerfile

# -------- Base Stage --------
# Use Node.js 20 Alpine as the base image for a smaller footprint
FROM node:20-alpine AS base
WORKDIR /app
# Create a non-root user and group for security best practices
# Using fixed GID/UID can help with managing permissions if mounting volumes
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# -------- Dependencies Stage --------
# This stage is dedicated to installing dependencies.
# It leverages Docker's layer caching: if package.json/lockfiles haven't changed,
# this layer can be reused, speeding up subsequent builds.
FROM base AS deps
WORKDIR /app
# Copy only package files to leverage Docker cache
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
# Install dependencies based on the lock file present
# corepack enable is needed for pnpm if not globally enabled in the base image
RUN \
  if [ -f package-lock.json ]; then echo "Found package-lock.json, running npm ci" && npm ci; \
  elif [ -f pnpm-lock.yaml ]; then echo "Found pnpm-lock.yaml, running pnpm i" && corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then echo "Found yarn.lock, running yarn install" && yarn install --frozen-lockfile; \
  else echo "No lockfile found. Please commit a lockfile." && exit 1; \
  fi

# -------- Builder Stage --------
# This stage builds the Next.js application.
FROM base AS builder
WORKDIR /app
# Copy dependencies from 'deps' stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/package.json ./package.json
# Copy the rest of the application source code
# Using .dockerignore to exclude unnecessary files
COPY . .

# Build the Next.js application
# The build process will generate the .next directory with build artifacts,
# including the standalone server if output: 'standalone' is set in next.config.js
RUN npm run build

# -------- Runner Stage --------
# This is the final stage that will run the application.
# It starts from the clean 'base' image to keep it small.
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
# Set the Gemini API Key as an environment variable from a build argument
# The build argument (GEMINI_API_KEY_ARG) must be passed during the 'docker build' command
ARG GEMINI_API_KEY_ARG
ENV GEMINI_API_KEY=$GEMINI_API_KEY_ARG
# Explicitly set NEXT_DIST_DIR, though standalone server.js usually figures this out.
# This tells Next.js where the .next build output directory is relative to server.js.
ENV NEXT_DIST_DIR=.next

# Create and set permissions for the /app/data directory for SQLite database
# This ensures the 'nextjs' user can write to this directory.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
# Some hosting platforms (like Vercel) might use /data, this is for broader compatibility
RUN mkdir -p /data && chown nextjs:nodejs /data

# Copy necessary files from the builder stage for the standalone output:
# 1. The standalone server and its dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 2. The static assets (CSS, JS chunks, images) that server.js needs to serve
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 3. The public directory contents
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Diagnostic step: List the contents of /app to verify file structure
RUN echo "DEBUG RUNNER: Recursive listing of /app (CacheBuster-Structure-MU)" && ls -AlR /app

# Ensure all files within /app are owned by the 'nextjs' user.
# This is a good practice, especially after multiple COPY operations.
RUN chown -R nextjs:nodejs /app

# Switch to the non-root user 'nextjs' for running the application
USER nextjs

# Expose port 8080 (Next.js will listen on this port due to PORT env var below)
# This informs Docker that the container listens on port 8080 at runtime.
ENV PORT=8080
EXPOSE 8080

# Correct command to run the Next.js standalone server.
# 'server.js' is the entry point for the standalone output.
# Adding --trace-warnings for more detailed Node.js startup/runtime feedback.
CMD ["node", "--trace-warnings", "server.js"]
