
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package.json and lock file
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install dependencies based on the lock file present
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else echo "Warning: No lock file found. Installing from package.json." && npm install; \
  fi

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy installed dependencies and package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy the rest of the application code
COPY . .

# DEBUG: Verify directory structure and file presence
RUN echo "DEBUG BUILDER: Current directory:" && pwd && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app (root of WORKDIR):" && ls -A /app && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src:" && (ls -A /app/src || echo "Directory /app/src not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/app:" && (ls -A /app/src/app || echo "Directory /app/src/app not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/app/api:" && (ls -A /app/src/app/api || echo "Directory /app/src/app/api not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/app/api/tasks:" && (ls -A /app/src/app/api/tasks || echo "Directory /app/src/app/api/tasks not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/components:" && (ls -A /app/src/components || echo "Directory /app/src/components not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/components/ui:" && (ls -A /app/src/components/ui || echo "Directory /app/src/components/ui not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/hooks:" && (ls -A /app/src/hooks || echo "Directory /app/src/hooks not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/lib:" && (ls -A /app/src/lib || echo "Directory /app/src/lib not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/types:" && (ls -A /app/src/types || echo "Directory /app/src/types not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/ai:" && (ls -A /app/src/ai || echo "Directory /app/src/ai not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/ai/flows:" && (ls -A /app/src/ai/flows || echo "Directory /app/src/ai/flows not found or empty") && echo "---"

# RIGOROUS FILE CHECK (NEW - Checkpoint Delta) - This will fail the build if files are not found
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
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Create the /app/data directory and set ownership
RUN mkdir -p /app/data
RUN chown nextjs:nextjs /app/data
RUN echo "DEBUG RUNNER: Permissions of /app/data:" && ls -ld /app/data && echo "---"

# Copy standalone output
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./

# Copy public assets
COPY --from=builder /app/public ./public

# Copy static assets
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs

# DEBUG commands for runner stage
RUN echo "DEBUG RUNNER: Current directory:" && pwd && echo "---"
RUN echo "DEBUG RUNNER: Contents of /app (WORKDIR):" && ls -la /app && echo "---"
RUN echo "DEBUG RUNNER: Specifically checking for server.js in /app:" && (ls -la /app/server.js || echo "/app/server.js NOT FOUND") && echo "---"

EXPOSE 3000
ENV PORT 3000

# CMD ["node", "server.js"]
CMD ["node", "/app/server.js"]
