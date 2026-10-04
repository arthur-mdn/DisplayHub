FROM node:20 as build
WORKDIR /app

ARG VITE_SCHEME
ARG VITE_CLIENT_URL
ARG VITE_SERVER_URL
ARG VITE_ADMIN_URL
ARG VITE_COOKIE_DOMAIN

ENV VITE_SCHEME=$VITE_SCHEME \
    VITE_CLIENT_URL=$VITE_CLIENT_URL \
    VITE_SERVER_URL=$VITE_SERVER_URL \
    VITE_ADMIN_URL=$VITE_ADMIN_URL \
    VITE_COOKIE_DOMAIN=$VITE_COOKIE_DOMAIN

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d
CMD ["nginx", "-g", "daemon off;"]
