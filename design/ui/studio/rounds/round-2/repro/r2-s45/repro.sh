#!/usr/bin/env bash
# Repro of round 2 session r2-s45 in screen-reader mode, keys only: open the truncated
# club-members.graphml with Ctrl+O and listen to what is announced; Tab to the toast's close
# button (12 Tabs, as in the session) and read its name; press it and see where focus lands. Writes PNGs and run.log.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
S="$here/run"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
node "$T" --start "$S" empty --sr
echo "== A: Ctrl+O and the truncated file"
st --key Control+o                                   # 02
st --upload club-members.graphml                     # 03 announcements, focus
echo "== B: Tab from the page body through the page, as Morgan did (12 Tabs)"
for i in $(seq 1 12); do st --key Tab; done          # 04-15; the 12th is the toast close
echo "== C: press it"
st --key Enter                                       # 16 focus after closing
node "$T" --end "$S"
} 2>&1 | tee "$here/run.log"
