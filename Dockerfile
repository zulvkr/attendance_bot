
# Install pnpm globally
FROM node:18-alpine AS pnpm-base
RUN npm install -g pnpm

# Install dependencies only (cache node_modules)
FROM pnpm-base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build the app
FROM pnpm-base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# Final runtime image
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN mkdir -p /app/data
VOLUME ["/app/data"]
CMD ["node", "dist/main.js"]
