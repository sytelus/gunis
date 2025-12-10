#!/usr/bin/env bash
set -euo pipefail

# Build production site into public/ with cleanup, minification, and GC.
ROOT_DIR="$(cd -- "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

git submodule update --init --recursive

hugo --gc --minify --cleanDestinationDir "$@"
