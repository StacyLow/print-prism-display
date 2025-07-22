
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm install
RUN npm run dev

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install serve globally and curl for health checks
RUN apk add --no-cache curl
RUN npm install -g serve

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
