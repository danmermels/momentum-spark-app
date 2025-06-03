
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package.json and lock file
# For npm:
COPY package.json package-lock.json* ./
# For pnpm:
# COPY package.json pnpm-lock.yaml* ./
# For yarn:
# COPY package.json yarn.lock* ./

# Install dependencies based on the lock file found
# This order handles most common cases. If multiple lock files exist, adjust as needed.
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else echo "Warning: No lock file found. Installing from package.json." && npm install; \
    fi

# Stage 2: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy node_modules and package files from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
# If you have a package-lock.json, copy it too (optional if already handled by npm ci in deps)
# COPY --from=deps /app/package-lock.json ./package-lock.json

# Copy the rest of your application source code
# Ensure .dockerignore is properly set up to exclude node_modules, .next, etc. from being copied here.
COPY . .

# Add debugging ls commands
RUN echo "DEBUG BUILDER: Current directory:" && pwd && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app (root of WORKDIR):" && ls -A /app && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src:" && (ls -A /app/src || echo "Directory /app/src not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/app:" && (ls -A /app/src/app || echo "Directory /app/src/app not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/components:" && (ls -A /app/src/components || echo "Directory /app/src/components not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/components/ui:" && (ls -A /app/src/components/ui || echo "Directory /app/src/components/ui not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/hooks:" && (ls -A /app/src/hooks || echo "Directory /app/src/hooks not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/lib:" && (ls -A /app/src/lib || echo "Directory /app/src/lib not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/types:" && (ls -A /app/src/types || echo "Directory /app/src/types not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/ai:" && (ls -A /app/src/ai || echo "Directory /app/src/ai not found or empty") && echo "---"
RUN echo "DEBUG BUILDER: Contents of /app/src/ai/flows:" && (ls -A /app/src/ai/flows || echo "Directory /app/src/ai/flows not found or empty") && echo "---"


# Set NEXT_TELEMETRY_DISABLED to 1 to disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build the Next.js application
RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
# Set NEXT_TELEMETRY_DISABLED to 1 to disable telemetry during runtime
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone Next.js output
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./

# Copy public assets
COPY --from=builder /app/public ./public

# Copy static assets (needed for output: 'standalone')
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing

USER nextjs

# Debugging ls commands in runner stage
RUN echo "DEBUG RUNNER: Current directory:" && pwd && echo "---"
RUN echo "DEBUG RUNNER: Contents of /app (WORKDIR):" && ls -la /app && echo "---"
RUN echo "DEBUG RUNNER: Specifically checking for server.js in /app:" && ls -la /app/server.js && echo "---"


EXPOSE 3000

ENV PORT 3000

# Correct command to run the standalone server
CMD ["node", "/app/server.js"]
