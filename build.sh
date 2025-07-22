npm run clean
npm run build

docker-compose down rag-app

docker-compose build --no-cache rag-app
docker-compose up -d rag-app

# docker-compose down chromadb
# docker-compose build chromadb
# docker-compose up

# docker-compose build --no-cache openwebui