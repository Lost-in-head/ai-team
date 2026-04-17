#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# AI Team Framework — Session Save Script
# Manually archives all agent memory files and OWNER_CONTEXT.md
# into memory/archive/ with a timestamp so you can restore them
# later or diff sessions.
#
# Usage:
#   ./scripts/session-save.sh
#   ./scripts/session-save.sh "optional-label"
# ─────────────────────────────────────────────────────────────

set -euo pipefail

AGENTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMORY_DIR="$AGENTS_DIR"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LABEL="${1:-manual}"
ARCHIVE_DIR="$AGENTS_DIR/archive/session_${TIMESTAMP}_${LABEL}"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       AI Team — Session Save         ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Archive destination: $ARCHIVE_DIR"
echo ""

mkdir -p "$ARCHIVE_DIR"

# ─────────────────────────────────────────────
# Save OWNER_CONTEXT.md if it exists
# ─────────────────────────────────────────────
if [ -f "$MEMORY_DIR/OWNER_CONTEXT.md" ]; then
  cp "$MEMORY_DIR/OWNER_CONTEXT.md" "$ARCHIVE_DIR/OWNER_CONTEXT.md"
  echo "  ✓ OWNER_CONTEXT.md"
else
  echo "  — OWNER_CONTEXT.md not found (skipped)"
fi

# ─────────────────────────────────────────────
# Save all agent memory files
# ─────────────────────────────────────────────
AGENTS=(nexus atlas forge ledger oracle engine pulse shield closer lock)
for agent in "${AGENTS[@]}"; do
  MEM_FILE="$MEMORY_DIR/${agent}.memory.md"
  if [ -f "$MEM_FILE" ] && [ -s "$MEM_FILE" ]; then
    cp "$MEM_FILE" "$ARCHIVE_DIR/${agent}.memory.md"
    echo "  ✓ ${agent}.memory.md"
  else
    echo "  — ${agent}.memory.md empty or missing (skipped)"
  fi
done

# ─────────────────────────────────────────────
# Write a session manifest
# ─────────────────────────────────────────────
cat > "$ARCHIVE_DIR/MANIFEST.md" <<EOF
# Session Archive
- **Saved at:** $(date)
- **Label:** $LABEL
- **Archive dir:** $ARCHIVE_DIR
EOF

echo ""
echo "Session saved → archive/session_${TIMESTAMP}_${LABEL}/"
echo ""
echo "To restore:"
echo "  cp $ARCHIVE_DIR/*.memory.md $MEMORY_DIR/"
echo "  cp $ARCHIVE_DIR/OWNER_CONTEXT.md $MEMORY_DIR/"
echo ""
