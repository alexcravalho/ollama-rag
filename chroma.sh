DATA_DIR="$(pwd)/chroma"

# Stop and remove container if it exists
if docker ps -a -q -f name=chromadb > /dev/null; then
  echo "Stopping and removing existing ChromaDB container..."
  docker stop chromadb >/dev/null 2>&1
  docker rm chromadb >/dev/null 2>&1
fi

# Optional reset
if [ "$1" == "--reset" ]; then
  echo "Deleting Chroma Local Persistant Storage Dir"
  rm -rf "$DATA_DIR"
fi

# Recreate data directory
mkdir -p "$DATA_DIR"

# Start new container
echo "Starting ChromaDB container..."
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v "$DATA_DIR:/chroma/chroma" \
  ghcr.io/chroma-core/chroma:latest