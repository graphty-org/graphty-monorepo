#!/usr/bin/env bash
# Runs Cytoscape desktop 3.10.5 with CyREST on <rest port>, on its own Xvfb display and with its own
# home directory, so it never shares state with another Cytoscape on the machine. Start it under
# servherd (TOOLS.md, "The oracles"):
#
#   references/run-cytoscape.sh <rest port> [display number, default 88]
#
# Tools come from $STYLE_FIDELITY_TOOLS (default <main checkout>/tmp/style-fidelity/tools):
# cytoscape/cytoscape-unix-3.10.5/, jre17/jdk-17*/ and xvfb-debs/ (an Xvfb unpacked from its Debian
# packages, Xvfb-patched); $XVFB names another Xvfb. Cytoscape's home is $CYTOSCAPE_HOME (default
# <main checkout>/tmp/style-fidelity/cytoscape-home).
set -euo pipefail
PORT=${1:?usage: run-cytoscape.sh <rest port> [display]}
D=${2:-88}
here=$(cd "$(dirname "$0")" && pwd)
main=$(dirname "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)")
T=${STYLE_FIDELITY_TOOLS:-$main/tmp/style-fidelity/tools}
X=$T/xvfb-debs
XVFB=${XVFB:-$X/Xvfb-patched}
if [[ "$XVFB" == "$X/Xvfb-patched" ]]; then
    (cd "$X" && LD_LIBRARY_PATH=$X/root/usr/lib/x86_64-linux-gnu exec ./Xvfb-patched ":$D" -screen 0 1600x1200x24 -nolisten tcp >/dev/null 2>&1) &
else
    "$XVFB" ":$D" -screen 0 1600x1200x24 -nolisten tcp >/dev/null 2>&1 &
fi
XPID=$!
trap 'kill $XPID 2>/dev/null' EXIT
until [[ -e /tmp/.X11-unix/X$D ]]; do
    kill -0 "$XPID" 2>/dev/null || { echo "run-cytoscape.sh: Xvfb :$D exited" >&2; exit 1; }
    sleep 0.2
done
HOME=${CYTOSCAPE_HOME:-$main/tmp/style-fidelity/cytoscape-home}
mkdir -p "$HOME"
JAVA_HOME=$(echo "$T"/jre17/jdk-17*)
export DISPLAY=:$D HOME JAVA_HOME CHECK_ROOT_INSTANCE_RUNNING=false PATH=$JAVA_HOME/bin:$PATH
"$T/cytoscape/cytoscape-unix-3.10.5/cytoscape.sh" -R "$PORT"
