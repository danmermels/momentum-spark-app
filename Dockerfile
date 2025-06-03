
# Stage 0: Base image with Node.js and common dependencies
FROM node:20-alpine AS base
WORKDIR /app

# Create a non-root user and group first
# These should be available in subsequent stages that derive FROM base
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lock; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy the rest of the application code
COPY . .

# --- Start of Debugging LS Commands ---
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
# --- End of Debugging LS Commands ---

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
FROM base AS runner
WORKDIR /app

# We need to ensure the `data` directory for SQLite is writable by the `nextjs` user
# This should ideally be volume-mounted in production for persistence.
# For Vercel-like deployments, /tmp is often the only writable path.
# The db.ts logic attempts to place the DB in /data for Docker, /tmp for Vercel, or project root for local.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
RUN mkdir -p /data && chown nextjs:nodejs /data


COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

ENV NODE_ENV production
ENV PORT 8080 # Corrected ENV instruction

EXPOSE 8080

CMD ["node", "server.js"]
