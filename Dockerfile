# Dockerfile

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package.json and lock file
# Prefer package-lock.json if it exists, otherwise yarn.lock or pnpm-lock.yaml
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install dependencies based on the lock file found
# This order handles most common cases. If multiple lock files exist, adjust as needed.
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else echo "Warning: No lock file found. Installing from package.json." && npm install; \
    fi

# Stage 2: Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy necessary files from 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
# Ensure the specific lock file used in 'deps' is copied
# Adjust if you use a different package manager or lock file name
COPY --from=deps /app/package-lock.json ./package-lock.json

# Copy the rest of the application code from the build context
COPY . .

# Debug: Verify file structure before build
RUN echo "DEBUG: Current directory:" && pwd && echo "---"
RUN echo "DEBUG: Contents of /app (root of WORKDIR):" && ls -A /app && echo "---"
RUN echo "DEBUG: Contents of /app/src:" && ls -A /app/src && echo "---"
RUN echo "DEBUG: Contents of /app/src/app:" && ls -A /app/src/app && echo "---"
RUN echo "DEBUG: Contents of /app/src/components:" && ls -A /app/src/components && echo "---"
RUN echo "DEBUG: Contents of /app/src/components/ui:" && ls -A /app/src/components/ui && echo "---"
RUN echo "DEBUG: Contents of /app/src/hooks:" && (ls -A /app/src/hooks || echo "Directory /app/src/hooks not found or empty") && echo "---"
RUN echo "DEBUG: Contents of /app/src/lib:" && (ls -A /app/src/lib || echo "Directory /app/src/lib not found or empty") && echo "---"
RUN echo "DEBUG: Contents of /app/src/types:" && (ls -A /app/src/types || echo "Directory /app/src/types not found or empty") && echo "---"
# Crucial lines for the current error:
RUN echo "DEBUG: Contents of /app/src/ai:" && (ls -A /app/src/ai || echo "Directory /app/src/ai not found or empty") && echo "---"
RUN echo "DEBUG: Contents of /app/src/ai/flows:" && (ls -A /app/src/ai/flows || echo "Directory /app/src/ai/flows not found or empty") && echo "---"

# Build the Next.js application
RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1 # Uncomment to disable telemetry

RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

ENTRYPOINT ["node"]
CMD ["server.js"]
