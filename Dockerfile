
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Stage 2: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app

# Set environment variables for the build
ENV NODE_ENV=production

# Copy dependency artifacts and source code
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY . .

# Debug: List contents of directories after COPY to verify
RUN echo "DEBUG BUILDER: Current directory:" && pwd && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app (root of WORKDIR):" && ls -A /app && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src (CacheBuster-SRC-OMEGA):" && (ls -Al /app/src || echo "Directory /app/src not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/app (CacheBuster-APP-OMEGA):" && (ls -Al /app/src/app || echo "Directory /app/src/app not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/app/api (CacheBuster-API-OMEGA):" && (ls -Al /app/src/app/api || echo "Directory /app/src/app/api not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/app/api/tasks (CacheBuster-APITASKS-OMEGA):" && (ls -Al /app/src/app/api/tasks || echo "Directory /app/src/app/api/tasks not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/components (CacheBuster-COMPONENTS-OMEGA):" && (ls -Al /app/src/components || echo "Directory /app/src/components not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/components/ui (CacheBuster-UI-OMEGA):" && (ls -Al /app/src/components/ui || echo "Directory /app/src/components/ui not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/hooks (CacheBuster-HOOKS-OMEGA):" && (ls -Al /app/src/hooks || echo "Directory /app/src/hooks not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/lib (CacheBuster-LIB-OMEGA):" && (ls -Al /app/src/lib || echo "Directory /app/src/lib not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/types (CacheBuster-TYPES-OMEGA):" && (ls -Al /app/src/types || echo "Directory /app/src/types not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/ai (CacheBuster-AI-OMEGA):" && (ls -Al /app/src/ai || echo "Directory /app/src/ai not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/ai/flows (CacheBuster-AIFLOWS-OMEGA):" && (ls -Al /app/src/ai/flows || echo "Directory /app/src/ai/flows not found or empty") && echo "---"

# RIGOROUS FILE CHECK (Checkpoint Delta) - This will fail the build if files are not found
RUN echo "DEBUG BUILDER (Before Build - Checkpoint Delta): Verifying critical file paths and tsconfig" && \
    echo "Listing /app (WORKDIR contents):" && ls -A /app && \
    echo "Checking /app/tsconfig.json..." && \
    [ -f /app/tsconfig.json ] || (echo "CRITICAL ERROR: /app/tsconfig.json NOT FOUND!" && exit 1) && \
    echo "/app/tsconfig.json FOUND. Contents:" && cat /app/tsconfig.json && \
    echo "Checking /app/src/types/task.ts..." && \
    [ -f /app/src/types/task.ts ] || (echo "CRITICAL ERROR: /app/src/types/task.ts NOT FOUND!" && exit 1) && \
    ls -l /app/src/types/task.ts && \
    echo "Checking /app/src/lib/db.ts..." && \
    [ -f /app/src/lib/db.ts ] || (echo "CRITICAL ERROR: /app/src/lib/db.ts NOT FOUND!" && exit 1) && \
    ls -l /app/src/lib/db.ts && \
    echo "--- All critical files verified by Checkpoint Delta ---"

# Build the Next.js application
RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# PORT will be set by the `docker run -p` mapping, but Next.js standalone defaults to 3000 if PORT env is not set.
# We set it to 8080 here to be explicit, matching the EXPOSE and typical -p mapping.
ENV PORT=8080

# Create a non-root user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone server, static assets, and public files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create and set permissions for the data directory for SQLite
# This directory will be /app/data inside the container
RUN mkdir -p /app/data
# Note: chown will be done *after* all files are in place and *before* USER nextjs

# Debug: List all files in /app recursively to see structure and permissions before chown
RUN echo "DEBUG RUNNER: Recursive listing of /app before USER change and chown" && ls -AlR /app && echo "---"

# Ensure the nextjs user owns all application files and the data directory
RUN chown -R nextjs:nodejs /app
RUN chown -R nextjs:nodejs /app/data # Explicitly ensure data dir ownership

# Switch to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 8080

# Correct command to run the Next.js standalone server, with trace warnings
CMD ["node", "--trace-warnings", "server.js"]
