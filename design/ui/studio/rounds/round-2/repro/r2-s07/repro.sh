#!/usr/bin/env bash
# Keyboard-only repro of round 2 session r2-s07 (Morgan, screen-reader mode): when the Export
# dialog opens, does focus move into it, and can Tab reach its controls?
# Writes PNGs and run.log into ./run/ beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
echo "== open Les Miserables (5 Tabs, Enter); focus lands on the drawing"
st --key Tab --key Tab --key Tab --key Tab --key Tab --key Enter --wait 3000
echo "== A: Shift+Tab back to Main menu (10), Enter, Up to Export from Help"
for i in $(seq 10); do st --key Shift+Tab; done
st --key Enter
st --key End --key ArrowUp --key ArrowUp --key ArrowUp --key ArrowUp
echo "== A: Enter on Export: is the dialog open (PNG), and where is focus?"
st --key Enter
echo "== A: Tab x4 -- do we reach the dialog's controls?"
for i in 1 2 3 4; do st --key Tab; done
echo "== B: Escape (does the dialog close?), then Control+e"
st --key Escape
st --key Control+e
echo "== B: Tab x4 after Control+e"
for i in 1 2 3 4; do st --key Tab; done
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
