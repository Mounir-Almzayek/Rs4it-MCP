#!/bin/bash

# Wrapper script for running MCP plugins via npx on Linux/Mac
# This ensures proper stdio connection and helps avoid "Connection closed" errors

set -e

# Get the first argument (the package name/version)
PACKAGE="$1"
shift

# Ensure Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed" >&2
    exit 1
fi

# Get npm's bin directory to ensure npx is found
NPM_BIN=$(npm bin -g 2>/dev/null || echo "/usr/local/bin")

# Try to run npx with proper environment
export NODE_OPTIONS="--max-old-space-size=4096"

# Method 1: Use node + npm (most reliable on Linux)
if command -v npm &> /dev/null; then
    exec npx -y "$PACKAGE" "$@"
else
    # Fallback: try to find npx manually
    if [ -f "$NPM_BIN/npx" ]; then
        exec "$NPM_BIN/npx" -y "$PACKAGE" "$@"
    else
        echo "Error: npx or npm not found" >&2
        exit 1
    fi
fi
