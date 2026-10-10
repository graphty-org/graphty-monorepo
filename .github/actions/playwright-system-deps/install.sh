#!/usr/bin/env bash
# Installs the system packages Chromium needs for action.yml. HIT is the cache step's cache-hit.
# PLAYWRIGHT_DEBS (the cached .deb files) and APT_ARCHIVES (apt's download directory) are overridable
# so tools/ci-workflows.test.mjs can run this against a fake apt.
set -euo pipefail
shopt -s nullglob
dir=${PLAYWRIGHT_DEBS:-$HOME/.cache/playwright-debs}
archives=${APT_ARCHIVES:-/var/cache/apt/archives}

if [ "${HIT:-}" = "true" ]; then
    debs=("$dir"/*.deb)
    echo "Installing ${#debs[@]} cached packages"
    if [ ${#debs[@]} -gt 0 ]; then sudo dpkg -i "${debs[@]}"; fi
else
    # apt-get keeps what it downloads by default; this says so in case the image's config does not.
    echo 'APT::Keep-Downloaded-Packages "true";' | sudo tee /etc/apt/apt.conf.d/99keep-downloaded-packages
    sudo rm -f "$archives"/*.deb
    log=$(mktemp)
    pnpm exec playwright install-deps chromium | tee "$log"
    mkdir -p "$dir"
    debs=("$archives"/*.deb)
    # An empty cache is right only when apt installed nothing; otherwise apt deleted its downloads and
    # every hit would install too little.
    if [ ${#debs[@]} -eq 0 ] && ! grep -q '^0 upgraded, 0 newly installed' "$log"; then
        echo "::error::apt installed packages but kept no .deb files in $archives"
        exit 1
    fi
    if [ ${#debs[@]} -gt 0 ]; then cp "${debs[@]}" "$dir"/; fi
fi

# Every package Playwright asks for must now be installed, so a cache that holds too little fails here
# and not later as a missing shared library when Chromium starts. Since Playwright 1.63 the dry run
# simulates the install (`apt-get install -s`) and names only the packages still missing.
set +e
check=$(pnpm exec playwright install-deps --dry-run chromium 2>&1)
status=$?
set -e
if [ $status -eq 0 ] && grep -qx 'All system dependencies are installed.' <<<"$check"; then
    echo "All the system packages Chromium needs are installed"
elif grep -q '^Missing system dependencies' <<<"$check"; then
    echo "::error::Chromium's system packages are not all installed:"
    echo "$check"
    exit 1
else
    echo "::error::unrecognized output (exit $status) from playwright install-deps --dry-run:"
    echo "$check"
    exit 1
fi
