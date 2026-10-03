#!/usr/bin/env bash
# Runs the test suite against each Cytoscape version named on the command line, e.g. the oldest and newest the
# peer range admits: `scripts/test-cytoscape-versions.sh 3.31.0 3` (a bare "3" is the newest 3.x on npm). Each
# version is installed into a temporary directory and handed to vitest as CYTOSCAPE_DIR, which the runtime tests
# and the consumer type check both follow. Needs a built package (dist/), like the suite itself.
set -euo pipefail
cd "$(dirname "$0")/.."
for version in "$@"; do
    dir="$(mktemp -d)"
    trap 'rm -rf "$dir"' EXIT
    npm install --prefix "$dir" --no-save --no-package-lock --no-audit --no-fund --ignore-scripts "cytoscape@$version" >/dev/null
    cy="$dir/node_modules/cytoscape"
    echo "=== cytoscape $(node -p "require('$cy/package.json').version") (asked for $version)"
    CYTOSCAPE_DIR="$cy" npx vitest run
    rm -rf "$dir"
    trap - EXIT
done
