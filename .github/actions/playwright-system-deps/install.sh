#!/usr/bin/env bash
# Installs the system packages Chromium needs for action.yml, or those of the browsers BROWSERS names
# (space separated; chromium by default). HIT is the cache step's cache-hit.
# PLAYWRIGHT_DEBS (the cached .deb files) and APT_ARCHIVES (apt's download directory) are overridable
# so tools/ci-workflows.test.mjs can run this against a fake apt.
set -euo pipefail
shopt -s nullglob
dir=${PLAYWRIGHT_DEBS:-$HOME/.cache/playwright-debs}
archives=${APT_ARCHIVES:-/var/cache/apt/archives}
browsers=${BROWSERS:-chromium}
name="Chromium"
[ "$browsers" = chromium ] || name="Playwright's browsers ($browsers)"

if [ "${HIT:-}" = "true" ]; then
    debs=("$dir"/*.deb)
    echo "Installing ${#debs[@]} cached packages"
    if [ ${#debs[@]} -gt 0 ]; then sudo dpkg -i "${debs[@]}"; fi
else
    # apt-get keeps what it downloads by default; this says so in case the image's config does not.
    echo 'APT::Keep-Downloaded-Packages "true";' | sudo tee /etc/apt/apt.conf.d/99keep-downloaded-packages
    sudo rm -f "$archives"/*.deb
    log=$(mktemp)
    # shellcheck disable=SC2086 # the list is space-separated browser names
    pnpm exec playwright install-deps $browsers | tee "$log"
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
# and not later as a missing shared library when Chromium starts. Since Playwright 1.65 the dry run
# simulates the install with `apt-get install -s`, lists what is missing and exits non-zero if anything is.
# shellcheck disable=SC2086 # the list is space-separated browser names
if ! report=$(pnpm exec playwright install-deps --dry-run $browsers 2>&1); then
    echo "::error::$name's system packages are not all installed:"
    echo "$report"
    exit 1
fi
echo "All system packages $name needs are installed"
