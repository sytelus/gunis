#!/usr/bin/env bash
set -euo pipefail

# Run the Hugo live preview with drafts and future-dated posts, reloading on changes.
ROOT_DIR="$(cd -- "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Ensure theme submodules are present (no-op if already fetched).
git submodule update --init --recursive

hugo server -D --buildFuture --disableFastRender --bind 127.0.0.1 --port 1313 "$@"
