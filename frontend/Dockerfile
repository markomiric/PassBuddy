# 1) Install deps
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
ARG VITE_WS_URL
ENV VITE_WS_URL=${VITE_WS_URL}
COPY . .
RUN npm run build
