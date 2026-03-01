# Build stage for backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend . 
RUN npm run build

# Build stage for frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
RUN npm run build

# Production stage - Backend API
FROM node:20-alpine AS backend-prod
WORKDIR /app
COPY --from=backend-builder /app/backend/dist ./dist
COPY backend/package*.json ./
RUN npm install --production
EXPOSE 3001
CMD ["node", "dist/server.js"]

# Production stage - Frontend
FROM nginx:alpine AS frontend-prod
WORKDIR /app
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
