# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY dist ./dist

EXPOSE 9000

CMD ["node", "dist/index.js"]
