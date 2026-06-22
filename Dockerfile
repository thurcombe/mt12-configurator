# Build stage
FROM node:22-alpine AS builder
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
RUN npm run build

# Serve stage
FROM nginx:alpine AS runner
RUN apk upgrade --no-cache && apk del curl freetype && nginx -t -q
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
