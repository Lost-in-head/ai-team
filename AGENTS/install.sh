#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# AI Team Framework — Install Script
# Registers the MCP server with Claude Desktop
# Supports: Ubuntu/Debian Linux, macOS
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# AGENTS/ is the flat source directory — all server code and memory live here
AGENTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$AGENTS_DIR/.." && pwd)"
MCP_SERVER_DIR="$AGENTS_DIR"
MEMORY_DIR="$AGENTS_DIR"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║      AI Team Framework Installer     ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Repo:    $REPO_DIR"
echo "Server:  $MCP_SERVER_DIR"
echo "Memory:  $MEMORY_DIR"
echo ""

# ─────────────────────────────────────────────
# 1. Check Node.js
# ─────────────────────────────────────────────
echo "► Checking Node.js..."
if ! command -v node &>/dev/null; then
  echo "✗ Node.js not found. Install Node.js 18+ from https://nodejs.org"
  exit 1
fi
NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "✗ Node.js 18+ required. Current: $(node --version)"
  exit 1
fi
echo "  Node.js $(node --version) ✓"

# ─────────────────────────────────────────────
# 1b. Check python3
# ─────────────────────────────────────────────
echo ""
echo "► Checking python3..."
if ! command -v python3 &>/dev/null; then
  echo "✗ python3 not found. Install Python 3 (used to merge Claude Desktop JSON config)."
  exit 1
fi
echo "  python3 $(python3 --version) ✓"

# ─────────────────────────────────────────────
# 2. Install npm dependencies
# ─────────────────────────────────────────────
echo ""
echo "► Installing MCP server dependencies..."
cd "$MCP_SERVER_DIR"
npm install --silent
echo "  Dependencies installed ✓"

# ─────────────────────────────────────────────
# 3. Set up .env
# ─────────────────────────────────────────────
echo ""
echo "► Setting up .env..."
if [ ! -f "$MCP_SERVER_DIR/.env" ]; then
  cp "$MCP_SERVER_DIR/.env.example" "$MCP_SERVER_DIR/.env"
  echo "  Created .env from template"
  echo ""
  echo "  ⚠  Add your Anthropic API key to: $MCP_SERVER_DIR/.env"
  echo "     ANTHROPIC_API_KEY=sk-ant-..."
else
  echo "  .env already exists ✓"
fi

# ─────────────────────────────────────────────
# 4. Set up OWNER_CONTEXT.md
# ─────────────────────────────────────────────
echo ""
echo "► Checking OWNER_CONTEXT.md..."
if [ ! -f "$MEMORY_DIR/OWNER_CONTEXT.md" ]; then
  cp "$MEMORY_DIR/OWNER_CONTEXT.template.md" "$MEMORY_DIR/OWNER_CONTEXT.md"
  echo "  Created OWNER_CONTEXT.md from template"
  echo ""
  echo "  ⚠  Fill in your context: $MEMORY_DIR/OWNER_CONTEXT.md"
else
  echo "  OWNER_CONTEXT.md already exists ✓"
fi

# ─────────────────────────────────────────────
# 5. Detect Claude Desktop config location
# ─────────────────────────────────────────────
echo ""
echo "► Detecting Claude Desktop config..."

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
else
  echo "  Unknown OS. Manually register the MCP server."
  echo "  See: $REPO_DIR/config/claude-desktop.example.json"
  exit 0
fi

CLAUDE_CONFIG="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
mkdir -p "$CLAUDE_CONFIG_DIR"

# ─────────────────────────────────────────────
# 6. Register MCP server
# ─────────────────────────────────────────────
echo "► Registering MCP server with Claude Desktop..."

NODE_PATH=$(which node)
SERVER_PATH="$MCP_SERVER_DIR/index.js"

# Build the new server entry
NEW_ENTRY=$(cat <<EOF
{
  "command": "$NODE_PATH",
  "args": ["$SERVER_PATH"]
}
EOF
)

if [ ! -f "$CLAUDE_CONFIG" ]; then
  # No config exists — create it fresh
  cat > "$CLAUDE_CONFIG" <<EOF
{
  "mcpServers": {
    "ai-team-core": {
      "command": "$NODE_PATH",
      "args": ["$SERVER_PATH"]
    }
  }
}
EOF
  echo "  Created Claude Desktop config ✓"
else
  # Config exists — check if our server is already registered
  if grep -q "ai-team-core" "$CLAUDE_CONFIG" 2>/dev/null; then
    echo "  ai-team-core already registered ✓"
  else
    # Back up and patch
    cp "$CLAUDE_CONFIG" "$CLAUDE_CONFIG.backup"
    # Use Python to safely merge JSON.
    # Values are passed via environment variables — NOT interpolated into
    # the Python source — to avoid injection via paths containing quotes.
    CLAUDE_CONFIG="$CLAUDE_CONFIG" \
    AI_TEAM_NODE_PATH="$NODE_PATH" \
    AI_TEAM_SERVER_PATH="$SERVER_PATH" \
    python3 - <<'PYEOF'
import json, os, sys

cfg_path        = os.environ['CLAUDE_CONFIG']
ai_node_path    = os.environ['AI_TEAM_NODE_PATH']
ai_server_path  = os.environ['AI_TEAM_SERVER_PATH']

with open(cfg_path) as f:
    config = json.load(f)

if 'mcpServers' not in config:
    config['mcpServers'] = {}

config['mcpServers']['ai-team-core'] = {
    'command': ai_node_path,
    'args': [ai_server_path]
}

with open(cfg_path, 'w') as f:
    json.dump(config, f, indent=2)

print('  Patched existing config ✓')
PYEOF
  fi
fi

# ─────────────────────────────────────────────
# 7. Done
# ─────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════╗"
echo "║           Install Complete ✓         ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "  1. Add your API key:"
echo "     $MCP_SERVER_DIR/.env"
echo ""
echo "  2. Fill in your context:"
echo "     $MEMORY_DIR/OWNER_CONTEXT.md"
echo ""
echo "  3. Restart Claude Desktop"
echo ""
echo "  4. Start a chat with:"
echo "     /nexus  Read memory/OWNER_CONTEXT.md. Give me a status report."
echo ""
