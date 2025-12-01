#!/bin/bash

# =============================================================================
# restart-with-updates.sh
# Script to pull latest changes, install dependencies, and restart all services
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# PID files location
PID_DIR="$SCRIPT_DIR/.pids"
mkdir -p "$PID_DIR"

# =============================================================================
# Stop all services
# =============================================================================
stop_services() {
    log_info "Stopping all services..."

    # Stop MCP Server Backend
    if [ -f "$PID_DIR/mcp-server-backend.pid" ]; then
        PID=$(cat "$PID_DIR/mcp-server-backend.pid")
        if kill -0 "$PID" 2>/dev/null; then
            log_info "Stopping MCP Server Backend (PID: $PID)..."
            kill "$PID" 2>/dev/null || true
            sleep 2
            kill -9 "$PID" 2>/dev/null || true
        fi
        rm -f "$PID_DIR/mcp-server-backend.pid"
    fi

    # Stop MCP Server Frontend
    if [ -f "$PID_DIR/mcp-server-frontend.pid" ]; then
        PID=$(cat "$PID_DIR/mcp-server-frontend.pid")
        if kill -0 "$PID" 2>/dev/null; then
            log_info "Stopping MCP Server Frontend (PID: $PID)..."
            kill "$PID" 2>/dev/null || true
            sleep 2
            kill -9 "$PID" 2>/dev/null || true
        fi
        rm -f "$PID_DIR/mcp-server-frontend.pid"
    fi

    # Stop Truck Loading Backend
    if [ -f "$PID_DIR/truck-loading-backend.pid" ]; then
        PID=$(cat "$PID_DIR/truck-loading-backend.pid")
        if kill -0 "$PID" 2>/dev/null; then
            log_info "Stopping Truck Loading Backend (PID: $PID)..."
            kill "$PID" 2>/dev/null || true
            sleep 2
            kill -9 "$PID" 2>/dev/null || true
        fi
        rm -f "$PID_DIR/truck-loading-backend.pid"
    fi

    # Stop Truck Loading Frontend
    if [ -f "$PID_DIR/truck-loading-frontend.pid" ]; then
        PID=$(cat "$PID_DIR/truck-loading-frontend.pid")
        if kill -0 "$PID" 2>/dev/null; then
            log_info "Stopping Truck Loading Frontend (PID: $PID)..."
            kill "$PID" 2>/dev/null || true
            sleep 2
            kill -9 "$PID" 2>/dev/null || true
        fi
        rm -f "$PID_DIR/truck-loading-frontend.pid"
    fi

    # Also kill any orphaned processes
    pkill -f "uvicorn.*mcp-server" 2>/dev/null || true
    pkill -f "uvicorn.*truck-loading" 2>/dev/null || true
    pkill -f "vite.*mcp-server" 2>/dev/null || true
    pkill -f "vite.*truck-loading" 2>/dev/null || true

    log_info "All services stopped."
}

# =============================================================================
# Pull latest changes from GitHub
# =============================================================================
pull_updates() {
    log_info "Pulling latest changes from GitHub..."
    git fetch origin
    git reset --hard origin/main
    log_info "Updated to latest version."
}

# =============================================================================
# Install dependencies
# =============================================================================
install_dependencies() {
    log_info "Installing dependencies..."

    # Check for Python/pip
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 is not installed. Please install Python 3.11+"
        exit 1
    fi

    # Check for Node.js/npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install Node.js 18+"
        exit 1
    fi

    # MCP Server Backend
    log_info "Installing MCP Server backend dependencies..."
    cd "$SCRIPT_DIR/mcp-server/backend"
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -q -r requirements.txt
    deactivate

    # MCP Server Frontend
    log_info "Installing MCP Server frontend dependencies..."
    cd "$SCRIPT_DIR/mcp-server/frontend"
    npm install --silent

    # Truck Loading Backend
    log_info "Installing Truck Loading backend dependencies..."
    cd "$SCRIPT_DIR/truck-loading/backend"
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -q -r requirements.txt
    deactivate

    # Truck Loading Frontend
    log_info "Installing Truck Loading frontend dependencies..."
    cd "$SCRIPT_DIR/truck-loading/frontend"
    npm install --silent

    cd "$SCRIPT_DIR"
    log_info "All dependencies installed."
}

# =============================================================================
# Start all services
# =============================================================================
start_services() {
    log_info "Starting all services..."

    # Create data directory
    mkdir -p "$SCRIPT_DIR/data"

    # Create log directory
    LOG_DIR="$SCRIPT_DIR/logs"
    mkdir -p "$LOG_DIR"

    # MCP Server Backend (port 8800)
    log_info "Starting MCP Server Backend on port 8800..."
    cd "$SCRIPT_DIR/mcp-server/backend"
    source venv/bin/activate

    # Load .env if exists
    if [ -f "$SCRIPT_DIR/mcp-server/.env" ]; then
        export $(grep -v '^#' "$SCRIPT_DIR/mcp-server/.env" | xargs)
    fi

    export DATABASE_URL="sqlite:///$SCRIPT_DIR/data/mcp_generator.db"
    nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8800 > "$LOG_DIR/mcp-server-backend.log" 2>&1 &
    echo $! > "$PID_DIR/mcp-server-backend.pid"
    deactivate

    # MCP Server Frontend (port 5174)
    log_info "Starting MCP Server Frontend on port 5174..."
    cd "$SCRIPT_DIR/mcp-server/frontend"
    nohup npm run dev -- --host --port 5174 > "$LOG_DIR/mcp-server-frontend.log" 2>&1 &
    echo $! > "$PID_DIR/mcp-server-frontend.pid"

    # Truck Loading Backend (port 8000)
    log_info "Starting Truck Loading Backend on port 8000..."
    cd "$SCRIPT_DIR/truck-loading/backend"
    source venv/bin/activate
    export DATABASE_URL="sqlite:///$SCRIPT_DIR/data/lng_loading.db"
    nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/truck-loading-backend.log" 2>&1 &
    echo $! > "$PID_DIR/truck-loading-backend.pid"
    deactivate

    # Truck Loading Frontend (port 5173)
    log_info "Starting Truck Loading Frontend on port 5173..."
    cd "$SCRIPT_DIR/truck-loading/frontend"
    nohup npm run dev -- --host --port 5173 > "$LOG_DIR/truck-loading-frontend.log" 2>&1 &
    echo $! > "$PID_DIR/truck-loading-frontend.pid"

    cd "$SCRIPT_DIR"

    # Wait a moment for services to start
    sleep 3

    log_info "All services started!"
    echo ""
    echo "=========================================="
    echo "Services running:"
    echo "=========================================="
    echo "MCP Server Frontend:      http://localhost:5174"
    echo "MCP Server Backend:       http://localhost:8800"
    echo "Truck Loading Frontend:   http://localhost:5173"
    echo "Truck Loading Backend:    http://localhost:8000"
    echo ""
    echo "Logs: $LOG_DIR/"
    echo "=========================================="
}

# =============================================================================
# Show status
# =============================================================================
show_status() {
    echo ""
    echo "Service Status:"
    echo "---------------"

    for service in mcp-server-backend mcp-server-frontend truck-loading-backend truck-loading-frontend; do
        if [ -f "$PID_DIR/$service.pid" ]; then
            PID=$(cat "$PID_DIR/$service.pid")
            if kill -0 "$PID" 2>/dev/null; then
                echo -e "$service: ${GREEN}Running${NC} (PID: $PID)"
            else
                echo -e "$service: ${RED}Stopped${NC} (stale PID file)"
            fi
        else
            echo -e "$service: ${YELLOW}Not started${NC}"
        fi
    done
    echo ""
}

# =============================================================================
# Main
# =============================================================================
case "${1:-}" in
    stop)
        stop_services
        ;;
    start)
        start_services
        ;;
    status)
        show_status
        ;;
    logs)
        SERVICE="${2:-all}"
        LOG_DIR="$SCRIPT_DIR/logs"
        if [ "$SERVICE" = "all" ]; then
            tail -f "$LOG_DIR"/*.log
        else
            tail -f "$LOG_DIR/$SERVICE.log"
        fi
        ;;
    *)
        # Default: full update cycle
        stop_services
        pull_updates
        install_dependencies
        start_services
        ;;
esac
