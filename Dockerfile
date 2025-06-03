
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

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy the rest of the application code
COPY . .

# Debug: List contents of directories to verify structure
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

# Debug: Explicitly check for tsconfig.json and critical files BEFORE the build
RUN echo "DEBUG BUILDER (Before Build - Checkpoint Charlie): Verifying critical file paths and tsconfig" && \
    echo "Listing /app (WORKDIR contents):" && ls -A /app && \
    echo "Checking /app/tsconfig.json:" && (ls -l /app/tsconfig.json || echo "/app/tsconfig.json NOT FOUND") && \
    echo "Contents of /app/tsconfig.json:" && (cat /app/tsconfig.json || echo "Could not cat /app/tsconfig.json") && \
    echo "Checking /app/src/types/task.ts:" && (ls -l /app/src/types/task.ts || echo "/app/src/types/task.ts NOT FOUND") && \
    echo "Checking /app/src/lib/db.ts:" && (ls -l /app/src/lib/db.ts || echo "/app/src/lib/db.ts NOT FOUND") && \
    echo "---"

# Build the Next.js application
RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user and group
RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Copy built assets from the 'builder' stage
# The standalone output already includes node_modules, so no need to copy from 'deps'
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Create /app/data directory and set permissions for SQLite DB
RUN mkdir -p /app/data
RUN chown nextjs:nextjs /app/data

# Debug: List contents of the final /app directory and check server.js
RUN echo "DEBUG RUNNER: Current directory:" && pwd && echo "---"
RUN echo "DEBUG RUNNER: Contents of /app (WORKDIR):" && ls -la /app && echo "---"
RUN echo "DEBUG RUNNER: Specifically checking for server.js in /app:" && (ls -la /app/server.js || echo "/app/server.js NOT FOUND") && echo "---"
RUN echo "DEBUG RUNNER: Permissions of /app/data:" && ls -ld /app/data && echo "---"


# Set the user to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
# For Next.js 13.4+, PORT is automatically set to 3000, no need to set HOSTNAME
# ENV PORT=3000

# Start the Next.js application
# The standalone output produces a server.js file
CMD ["node", "/app/server.js"]
