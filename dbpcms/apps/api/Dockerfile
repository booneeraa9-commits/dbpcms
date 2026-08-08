# ─── Stage 1: Development with hot reload ───
FROM node:20-alpine AS development

WORKDIR /app

# Install OS dependencies
RUN apk add --no-cache openssl

# Copy root manifests (npm workspaces resolves from here)
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all workspace deps
RUN npm install

# Copy source
COPY apps/api ./apps/api
COPY packages ./packages

# Generate Prisma client
RUN cd apps/api && npx prisma generate

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ─── Stage 2: Production build ───
FROM node:20-alpine AS build

WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci

COPY apps/api ./apps/api
COPY packages ./packages

RUN cd apps/api && npx prisma generate
RUN npm run build --workspace=@dbpcms/api

# ─── Stage 3: Production runtime ───
FROM node:20-alpine AS production

WORKDIR /app
RUN apk add --no-cache openssl dumb-init
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages ./packages

WORKDIR /app/apps/api
EXPOSE 4000

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
