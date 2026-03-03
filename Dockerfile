# syntax=docker/dockerfile:1.7

# Build stage for backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund
COPY backend . 
RUN npm run build

# Production-only dependencies for backend runtime image
FROM backend-builder AS backend-prod-deps
WORKDIR /app/backend
RUN npm prune --omit=dev

# Build stage for frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund
COPY frontend .
RUN npm run build

# Production stage - Backend API
FROM node:20-alpine AS backend-prod
WORKDIR /app
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/seed.ts ./seed.ts
COPY --from=backend-prod-deps /app/backend/node_modules ./node_modules
COPY backend/package*.json ./
EXPOSE 3001
CMD ["node", "dist/server.js"]

# Production stage - Frontend
FROM nginx:alpine AS frontend-prod
WORKDIR /app
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
