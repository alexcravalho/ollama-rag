DATA_DIR="$(pwd)/chroma"
DETACH=false
RESET=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    -r|--reset)
      RESET=true
      ;;
    -d|--detach)
      DETACH=true
      ;;
  esac
done

# Stop and remove any existing container
if docker ps -a -q -f name=chromadb > /dev/null; then
  echo "🛑 Stopping and removing existing ChromaDB container..."
  docker stop chromadb >/dev/null 2>&1
  docker rm chromadb >/dev/null 2>&1
fi

# Reset data if requested
if [ "$RESET" = true ]; then
  echo "🧹 Resetting ChromaDB data..."
  rm -rf "$DATA_DIR"
fi

# Ensure data directory exists
mkdir -p "$DATA_DIR"

# Decide mode
if [ "$DETACH" = true ]; then
  echo "🚀 Starting ChromaDB in detached mode..."
  docker run -d \
    --name chromadb \
    -p 8000:8000 \
    -v "$DATA_DIR:/data" \
    ghcr.io/chroma-core/chroma:latest
else
  echo "🚀 Running ChromaDB in foreground (logs will be shown)..."
  docker run --rm -it \
    --name chromadb \
    -p 8000:8000 \
    -v "$DATA_DIR:/data" \
    ghcr.io/chroma-core/chroma:latest
fi
