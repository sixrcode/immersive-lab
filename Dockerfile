# 1. Base Image
FROM node:20-slim AS base

# 2. Set up pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# 3. Copy all source code
COPY . .

# 4. Install dependencies
# Install root dependencies (for Next.js app and workspace)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# AI Microservice is deployed as a Firebase Function, so its dependencies are handled during function deployment.
# We still need its code for any shared types or utilities if imported by other services,
# but no direct dependency installation here for runtime.

# Install dependencies for collaboration-service
# It has its own package-lock.json, so we run npm install there.
RUN cd collaboration-service && npm install --production

# Install dependencies for portfolio-microservice
RUN --mount=type=cache,id=pnpm-portfolio,target=/pnpm/store pnpm --filter portfolio-microservice install --prod --frozen-lockfile

# 5. Build necessary applications
# Build Next.js application
RUN pnpm build

# Build collaboration-service (TypeScript)
RUN cd collaboration-service && npm run build

# 6. Configure PM2 to start all services
# First, install pm2 globally within the container
RUN npm install pm2 -g

# Copy the pm2 ecosystem file
COPY ecosystem.config.js .

# 7. Expose ports (Next.js, Collaboration, Portfolio)
EXPOSE 3000 3001 3003

# Start services using pm2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
