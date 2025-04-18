# PassBuddy

WebSocket relay server with React front-end for streaming GPT responses.

## Prerequisites
- Docker & Docker Compose
- `.env` file (copy from `.env.example`)

## Setup
1. Copy environment file:
   ```bash
   cp .env.example .env
   # Edit values as needed
   ```

2. Build images:
   ```bash
   docker-compose build --build-arg VITE_WS_URL=${VITE_WS_URL}
   ```

3. Start services:
   ```bash
   docker-compose up -d
   ```

4. Access front-end at http://localhost and ensure WebSocket is connected.

## Production Deployment

1. Configure DNS and SSL for your domain (e.g., `example.com`).
2. Populate `.env` with:
   ```ini
   PORT=3030
   ALLOWED_ORIGINS=https://example.com
   VITE_WS_URL=wss://example.com/ws
   ```
3. Rebuild and push images to your container registry:
   ```bash
   docker-compose build --build-arg VITE_WS_URL=https://example.com/ws
   docker tag passbuddy_server your-registry/passbuddy_server:latest
   docker tag passbuddy_frontend your-registry/passbuddy_frontend:latest
   docker push your-registry/passbuddy_server:latest
   docker push your-registry/passbuddy_frontend:latest
   ```
4. Deploy on your hosting provider (e.g., AWS ECS, DigitalOcean App Platform, or Azure App Service) using your registry images.
5. Set up a managed NGINX or load balancer to:
   - Serve `passbuddy_frontend` static files
   - Proxy `/ws` to `passbuddy_server:3030`
   - Terminate SSL
6. Monitor health via built-in Docker healthchecks and set up alerts/logging as needed.

---

For detailed customization or CI/CD integration, refer to your hosting provider docs.