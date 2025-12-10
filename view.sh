#!/usr/bin/env bash
set -euo pipefail

# Run the Hugo live preview with drafts and future-dated posts, reloading on changes.
ROOT_DIR="$(cd -- "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Ensure theme submodules are present (no-op if already fetched).
git submodule update --init --recursive

# Allow version switching via HUGO_BIN; default to local 0.145 build (Creative Portfolio).
HUGO_BIN="${HUGO_BIN:-./bin/hugo-145}"
if [ ! -x "$HUGO_BIN" ]; then
  echo "HUGO_BIN not found/executable at '$HUGO_BIN', falling back to system 'hugo'" >&2
  HUGO_BIN="$(command -v hugo)"
fi

"$HUGO_BIN" server -D --buildFuture --disableFastRender --bind 127.0.0.1 --port 1313 "$@"
