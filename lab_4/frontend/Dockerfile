# budowa
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install react-router-dom react-scripts
COPY . .
RUN npx react-scripts build

# nginx
FROM nginx:alpine
RUN mkdir -p /tmp/nginx_cache && chown -R nginx:nginx /tmp/nginx_cache
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]