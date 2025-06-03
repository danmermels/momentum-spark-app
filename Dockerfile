
# Stage 1: Base image with Node.js and basic setup
FROM node:20-alpine AS base
WORKDIR /app
# Create a non-root user and group
# Using 'nextjs' as the user/group name consistently.
RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Stage 2: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Stage 3: Builder stage - build the Next.js application
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy the rest of the application code
COPY . .

# --- Start of extensive diagnostic ls commands (CacheBuster-*-OMEGA) ---
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
# --- End of extensive diagnostic ls commands ---

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
# Ensure NODE_ENV is production for the build step as well
ENV NODE_ENV=production
RUN npm run build


# Stage 4: Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# PORT will be picked up by server.js from this environment variable.
# The EXPOSE instruction below doesn't set it, just documents it.
ENV PORT=8080

# Create and set permissions for the data directory, needed for SQLite by db.ts for non-Vercel production
# This needs to be done as root before switching to the nextjs user.
RUN mkdir -p /app/data && chown nextjs:nextjs /app/data
# If your db.ts also tries to write to /data (as seen in some iterations), ensure it's also prepared.
RUN mkdir -p /data && chown nextjs:nextjs /data

# Copy the standalone output
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
# Copy the static assets to the location expected by the standalone server
# The server.js in ./ (from standalone) will look for .next/static relative to itself.
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
# Copy the public folder
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

USER nextjs

# Informs Docker that the container listens on port 8080
EXPOSE 8080 

# Correct command to run the Next.js standalone server
CMD ["node", "server.js"]
