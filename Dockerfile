
# === Builder Stage ===
# Creates the build artifacts, including the .next/standalone directory
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then echo "Found package-lock.json, running npm ci" && npm ci; \
  elif [ -f pnpm-lock.yaml ]; then echo "Found pnpm-lock.yaml, running pnpm i --frozen-lockfile" && corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then echo "Found yarn.lock, running yarn install --frozen-lockfile" && yarn install --frozen-lockfile; \
  else echo "No lockfile found, running npm install" && npm install; \
  fi

# Copy the rest of the application code
COPY . .

# Build the Next.js application
# The `npm run build` command should generate the .next/standalone directory
RUN npm run build


# === Runner Stage ===
# Sets up the minimal environment to run the standalone Next.js server
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Create a non-root user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Argument for the API key, will be passed during `docker build`
ARG GEMINI_API_KEY_ARG
# Set the environment variable for the application from the build argument
ENV GEMINI_API_KEY=$GEMINI_API_KEY_ARG

# Create and set permissions for the data directory if your app needs to write to it
# This is where the SQLite DB will live.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
# An alternative or additional persistent data directory if needed outside /app for clarity
RUN mkdir -p /data && chown nextjs:nodejs /data


# Copy the standalone output from the builder stage
# This includes server.js, .next/server, and potentially minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy the static assets from the builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the public directory from the builder stage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# For debugging: List the contents of the /app directory in the runner stage
RUN echo "DEBUG RUNNER: Recursive listing of /app (CacheBuster-Structure-MU)" && ls -AlR /app

# Ensure all files in /app are owned by the nextjs user
# This is important for permissions when running as a non-root user.
RUN chown -R nextjs:nodejs /app

# Switch to the non-root user
USER nextjs

# Expose the port the app runs on (set by ENV PORT or default 3000)
EXPOSE 8080

# Correct command to run the Next.js standalone server
# server.js is designed to be run directly with node.
# Add --trace-warnings for more detailed startup/runtime warnings
CMD ["node", "server.js", "--trace-warnings"]
