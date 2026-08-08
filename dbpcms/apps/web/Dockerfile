FROM node:20-alpine AS development

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm install

COPY apps/web ./apps/web
COPY packages ./packages

WORKDIR /app/apps/web
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci
COPY apps/web ./apps/web
COPY packages ./packages

RUN npm run build --workspace=@dbpcms/web

FROM nginx:alpine AS production
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
