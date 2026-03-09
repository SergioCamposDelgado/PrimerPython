# Etapa 1: Construcción
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Servidor de Producción
FROM nginx:alpine
# Copiamos los archivos estáticos generados por Vite a Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Copiamos una config básica de Nginx (opcional, para manejar rutas de React)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]