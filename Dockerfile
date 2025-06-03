
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
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY . .

# Debug: Show contents of key directories after COPY . .
RUN echo "DEBUG BUILDER (Post-Copy): Current directory:" && pwd && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app (root of WORKDIR):" && ls -A /app && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src:" && (ls -A /app/src || echo "Directory /app/src not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/app:" && (ls -A /app/src/app || echo "Directory /app/src/app not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/app/api:" && (ls -A /app/src/app/api || echo "Directory /app/src/app/api not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/app/api/tasks:" && (ls -A /app/src/app/api/tasks || echo "Directory /app/src/app/api/tasks not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/components:" && (ls -A /app/src/components || echo "Directory /app/src/components not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/components/ui:" && (ls -A /app/src/components/ui || echo "Directory /app/src/components/ui not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/hooks:" && (ls -A /app/src/hooks || echo "Directory /app/src/hooks not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/lib (CacheBuster-LIB-EPSILON):" && (ls -Al /app/src/lib || echo "Directory /app/src/lib not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/types (CacheBuster-TYPES-EPSILON):" && (ls -Al /app/src/types || echo "Directory /app/src/types not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/ai:" && (ls -A /app/src/ai || echo "Directory /app/src/ai not found or empty") && echo "---"
RUN echo "DEBUG BUILDER (Post-Copy): Contents of /app/src/ai/flows:" && (ls -A /app/src/ai/flows || echo "Directory /app/src/ai/flows not found or empty") && echo "---"

# RIGOROUS FILE CHECK (Checkpoint Delta) - This will fail the build if files are not found at expected paths/casing
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

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Create the /app/data directory and set permissions for the database
RUN mkdir -p /app/data && \
    chown nextjs:nextjs /app/data && \
    echo "DEBUG RUNNER: Permissions of /app/data:" && ls -ld /app/data && echo "---"

USER nextjs

COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Copy the data directory from the builder if it exists (it won't unless pre-populated, but good practice)
# This is more relevant if you had a seed DB in your source that was copied to builder
# For a runtime-created DB, the mkdir -p /app/data above in this stage is key.
# COPY --from=builder --chown=nextjs:nextjs /app/data ./data

EXPOSE 3000
ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

# Legacy ENV format for Firebase App Hosting buildpack compatibility
# TODO: Update to new format if buildpack supports it
ENV ASPNETCORE_URLS=http://+:8080
ENV鋰電池 PORT=8080
