#!/usr/bin/env bash
# Manual smoke test of real judgment runs (plan task 2.8): dry-run, the real repository, real
# claude, $3 total. See smoke-runs.mjs for the four runs and what each must show.
#
# After the runs it checks that nothing is left: no process whose command line or environment
# names the smoke state directory (claude, the run's MCP launcher, a hook), and no servherd entry
# whose cwd is under it or under a githerd worktree.
#
# Usage: githerd/scripts/smoke-runs.sh [work dir]   (default: <repo>/tmp/githerd/smoke-runs)
# Environment: SERVHERD (the servherd command, default: the config's servherdCommand).
set -euo pipefail

PKG=$(cd "$(dirname "$0")/.." && pwd)
ROOT=$(git -C "$PKG" rev-parse --show-toplevel)
WORK=${1:-$ROOT/tmp/githerd/smoke-runs}
mkdir -p "$WORK"
WORK=$(cd "$WORK" && pwd)

status=0
node "$PKG/scripts/smoke-runs.mjs" "$WORK" || status=$?

left=0
for _ in $(seq 50); do
    pids=""
    for p in $(grep -lsF "$WORK/state" /proc/[0-9]*/cmdline /proc/[0-9]*/environ 2>/dev/null |
        sed -E 's#/proc/([0-9]+)/.*#\1#' | sort -u); do
        # The grep that searched names the directory in its own command line.
        cmd=$(tr '\0' ' ' 2>/dev/null <"/proc/$p/cmdline") || continue
        case "$cmd" in grep\ *) continue ;; esac
        [ "$p" = "$$" ] || pids="$pids $p"
    done
    [ -z "$pids" ] && break
    sleep 0.2
done
if [ -n "$pids" ]; then
    echo "left running:" >&2
    for p in $pids; do tr '\0' ' ' <"/proc/$p/cmdline" >&2 2>/dev/null; echo >&2; done
    left=1
fi

if [ -n "${SERVHERD:-}" ]; then
    read -r -a SH <<<"$SERVHERD"
else
    mapfile -t SH < <(node -e 'for (const w of JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).servherdCommand) console.log(w)' "$ROOT/githerd.config.json")
fi
servers=$(cd "$ROOT" && "${SH[@]}" --json list)
if SERVERS=$servers node -e '
const data = JSON.parse(process.env.SERVERS);
const list = (data.data?.servers ?? data.servers ?? []).map((s) => s.server ?? s);
const bad = list.filter((s) => s.cwd && (s.cwd.startsWith(process.argv[1]) || s.cwd.startsWith(process.argv[2])));
for (const s of bad) console.error(`servherd leftover: ${s.name} in ${s.cwd}`);
process.exit(bad.length ? 1 : 0);
' "$WORK/state" "$ROOT/.worktrees/githerd-"; then :; else left=1; fi

[ "$left" -eq 0 ] && echo "smoke-runs: nothing left running"
[ "$status" -eq 0 ] && [ "$left" -eq 0 ] && echo "smoke-runs: ok"
exit $((status | left))
