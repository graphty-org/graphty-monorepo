#!/usr/bin/env bash
# Repro of round 3 session r3-s52 (T5, club-members.graphml refused, screen-reader mode).
# Checks, on two runs of the same keyboard path:
#  1. The refusal is announced twice, word for word (two "live: alert (assertive)" lines after the upload).
#  2. After the file chooser closes, focus falls to the page body ("focus: nothing (the page itself)"),
#     not back to "Open project or file..." and not to the message.
#  3. Shift+Tab from there lands nowhere and Tab restarts at "Main menu", far from the message's
#     "Dismiss" button.
# Writes PNGs and run.log into ./run1 and ./run2 beside this script.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
T="$here/../../../../tool/real.mjs"
for n in 1 2; do
S="$here/run$n"
rm -rf "$S"
st() { node "$T" --step "$S" "$@"; }
{
echo "=== run $n"
node "$T" --start "$S" empty --sr
st --key Tab --key Tab --key Tab          # 02 focus on "Open project or file..."
st --key Enter                            # 03 file chooser
st --upload club-members.graphml          # 04 refusal: how many announcements, where is focus?
st --key Shift+Tab                        # 05 lands where?
st --key Tab                              # 06 lands where?
node "$T" --end "$S"
} 2>&1
done > "$here/run.log"
echo "exit $?"
