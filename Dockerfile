# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else echo "Warning: No lock file found. Installing from package.json." && npm install; \
  fi

# Stage 2: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency-related files and install
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
# COPY --from=deps /app/package-lock.json ./package-lock.json # Only if it exists

# Copy the rest of the application source code
COPY . .

# Debugging: List contents of various directories
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

# Debugging: Verify critical file paths just before build - ADDING A UNIQUE MARKER
RUN echo "DEBUG BUILDER (Before Build - Checkpoint Alpha): Verifying critical file paths" && \
    echo "Checking /app/src/types/task.ts:" && \
    (ls -l /app/src/types/task.ts || echo "/app/src/types/task.ts NOT FOUND") && \
    echo "Checking /app/src/lib/db.ts:" && \
    (ls -l /app/src/lib/db.ts || echo "/app/src/lib/db.ts NOT FOUND") && \
    echo "---"

# Build the Next.js application
RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
# ENV NEXT_TELEMETRY_DISABLED 1 # Uncomment this to disable telemetry

RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone Next.js output
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
# Copy the public folder
COPY --from=builder /app/public ./public
# Copy the static assets from .next/static (needed for optimized images, fonts, etc.)
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Debugging: List contents of the final /app directory in runner
RUN echo "DEBUG RUNNER: Current directory:" && pwd && echo "---"
RUN echo "DEBUG RUNNER: Contents of /app (WORKDIR):" && ls -la /app && echo "---"
RUN echo "DEBUG RUNNER: Specifically checking for server.js in /app:" && ls -la /app/server.js && echo "---"
RUN echo "DEBUG RUNNER: Creating /app/data directory" && mkdir -p /app/data && echo "---"
RUN echo "DEBUG RUNNER: Setting ownership of /app/data to nextjs user" && chown nextjs:nextjs /app/data && echo "---"
RUN echo "DEBUG RUNNER: Permissions of /app/data:" && ls -ld /app/data && echo "---"


USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "/app/server.js"]
