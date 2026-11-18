#!/usr/bin/env bash
# Makes the Python graph-io's schema validation runs with (graph-io/test/conformance/schemas.ts): a venv
# at <dir> holding graph-io/test/conformance/tools/requirements.txt, and prints its interpreter's path.
# CI's graph-io shard and tools/run-tests.sh both call it, so they validate with the same packages.
#
#   GRAPH_IO_SCHEMA_PYTHON="$(tools/schema-python.sh <dir>)"
#
# A venv that already holds the pinned packages is reused without touching the network.
set -euo pipefail
[ $# -eq 1 ] || { echo "usage: tools/schema-python.sh <dir>" >&2; exit 2; }
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
req="$root/graph-io/test/conformance/tools/requirements.txt"
dir="$1"
if ! cmp -s "$req" "$dir/requirements.txt" 2>/dev/null; then
    python3 -m venv "$dir" >&2
    "$dir/bin/python" -m pip install --quiet --disable-pip-version-check -r "$req" >&2
    cp "$req" "$dir/requirements.txt"
fi
echo "$dir/bin/python"
