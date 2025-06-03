# Dockerfile

# ---- Base Stage ----
FROM node:20-alpine AS base
WORKDIR /app
# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ---- Dependencies Stage ----
FROM base AS deps
WORKDIR /app

# Copy package.json and lock files
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install dependencies based on the lock file found
# This stage is for installing dependencies only and can be cached effectively
RUN \
  if [ -f package-lock.json ]; then \
    echo "Found package-lock.json, running npm ci" && \
    npm ci; \
  elif [ -f pnpm-lock.yaml ]; then \
    echo "Found pnpm-lock.yaml, running pnpm i"; \
    # Ensure pnpm is available if you use it, e.g., by installing it globally in 'base' or here
    # npm install -g pnpm && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then \
    echo "Found yarn.lock, running yarn install" && \
    yarn install --frozen-lockfile; \
  else \
    echo "No lockfile found, running npm install (less ideal for reproducibility)"; \
    npm install; \
  fi

# ---- Builder Stage ----
FROM base AS builder
WORKDIR /app

# Copy dependencies from the 'deps' stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/package.json ./package.json

# Copy the rest of the application source code
# Ensure .dockerignore is properly configured to exclude unnecessary files
COPY . .

# Set build-time arguments
ARG NEXT_PUBLIC_GTAG_ID_ARG
ENV NEXT_PUBLIC_GTAG_ID=$NEXT_PUBLIC_GTAG_ID_ARG

# Build the Next.js application
# Ensure the 'build' script is correctly defined in package.json
# The nextjs user should own the files it's building if possible,
# but build often requires root for certain operations or writes to system dirs.
# If build can run as non-root, switch USER nextjs before this.
# For now, assume build needs broader permissions or runs as root by default.
RUN npm run build

# ---- Runner Stage ----
FROM base AS runner
WORKDIR /app

# Set environment to production for the running application
ENV NODE_ENV=production

# Build-time argument for the API key
ARG GEMINI_API_KEY_ARG
# Set the environment variable for the application from the build-time argument
ENV GEMINI_API_KEY=$GEMINI_API_KEY_ARG
# ENV NEXT_DIST_DIR=/app/.next # Removed for this attempt

# Create and set permissions for the /app/data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
# Also ensure /data exists if it's used by SQLite directly (as seen in some DB init logs)
# This might be redundant if db is always in /app/data, but harmless.
RUN mkdir -p /data && chown nextjs:nodejs /data


# Copy only necessary artifacts from the builder stage for standalone output
# This includes the server.js, .next/server, and minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy the .next/static directory for serving client-side assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the public directory
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Debug: List the contents of /app to verify structure
# This is a cache-busting echo to ensure ls runs on changes
RUN echo "DEBUG RUNNER: Recursive listing of /app (CacheBuster-Structure-MU)" && ls -AlR /app

# Ensure the nextjs user owns all application files in the final image.
# This is crucial if any files were created/copied as root.
RUN chown -R nextjs:nodejs /app

# Switch to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 8080 # Informs Docker that the container listens on port 8080

# Correct command to run the Next.js standalone server via npm start
# This relies on the package.json in the standalone output having a "start": "node server.js" script.
CMD ["npm", "start"]
