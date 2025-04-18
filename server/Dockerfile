# 1) Install production deps
FROM node:18-alpine AS deps
WORKDIR /app
# copy only package manifests for caching
COPY package.json package-lock.json ./
RUN npm ci --only=production

# 2) Final image
FROM node:18-alpine AS runtime
WORKDIR /app

# create non‑root user (node image already has one)
USER node

# copy in deps and app code
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

ENV NODE_ENV=production
EXPOSE 3030

# run your websocket server entrypoint
CMD ["node", "index.js"]
