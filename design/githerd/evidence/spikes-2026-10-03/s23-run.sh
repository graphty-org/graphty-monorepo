#!/bin/bash
# S23: Nx 22.7 shares the MAIN checkout's .nx/cache with every git worktree on its own
# (nx/dist/src/utils/cache-directory.js, sharedCacheDirectory). This run leaves NX_CACHE_DIRECTORY
# unset. Both worktrees get the same never-built edit (an exported constant appended to graph-format/src/constants.ts,
# a production input of every build below), so every hash is new to the cache.
# Phase 1: A and B build at the same time (both cold). Phase 2: dist removed, each builds again.
unset -f grep 2>/dev/null
D=$(cd "$(dirname "$0")" && pwd)
A=/home/apowers/Projects/graphty-monorepo/.worktrees/githerd-spike-c23a
B=/home/apowers/Projects/graphty-monorepo/.worktrees/githerd-spike-c23b
P="graph-format,graph-io,graph-samples,algorithms,layout"
OUT="graph-format/dist graph-io/dist graph-samples/dist algorithms/dist layout/dist"
MARK="s23 probe $(date +%s%N)"
build() { (cd "$1" && NX_DAEMON=false NX_NO_CLOUD=true NX_TUI=false \
  pnpm exec nx run-many -t build -p "$P" --outputStyle=static >"$2" 2>&1); echo $?; }
summary() { /usr/bin/grep -E "^> nx run|Successfully ran|Nx read the output|Failed|rror" "$1" | sed 's/^/    /'; }
sums() { (cd "$1" && find $OUT -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -c1-16; find $OUT -type f | wc -l); }
for w in "$A" "$B"; do (cd "$w" && printf "export const S23_PROBE = \"%s\";\n" "$MARK" >> graph-format/src/constants.ts && rm -rf $OUT); done
echo "== phase 1: A and B at the same time, both cold"
t=$(date +%s)
build "$A" "$D/q1-A.log" > "$D/q1-A.rc" & build "$B" "$D/q1-B.log" > "$D/q1-B.rc" & wait
echo "A rc=$(cat "$D/q1-A.rc") B rc=$(cat "$D/q1-B.rc") together $(( $(date +%s)-t ))s"
echo "  A:"; summary "$D/q1-A.log"; echo "  B:"; summary "$D/q1-B.log"
echo "  outputs (digest, files): A $(sums "$A" | tr '\n' ' ') B $(sums "$B" | tr '\n' ' ')"
echo "== phase 2: dist removed in both, each builds again"
for w in "$A" "$B"; do (cd "$w" && rm -rf $OUT); done
for w in A B; do eval W=\$$w; t=$(date +%s); rc=$(build "$W" "$D/q2-$w.log"); echo "$w: rc=$rc $(( $(date +%s)-t ))s"; summary "$D/q2-$w.log"; done
echo "  outputs (digest, files): A $(sums "$A" | tr '\n' ' ') B $(sums "$B" | tr '\n' ' ')"
for w in "$A" "$B"; do (cd "$w" && sed -i "/^export const S23_PROBE = /d" graph-format/src/constants.ts && echo "edit removed: $(git status --short | wc -l) changed files"); done
