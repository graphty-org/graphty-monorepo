#!/usr/bin/env bash
# Manual smoke test of the launcher against the real servherd (design section 16): five launchers
# start at once in a scratch repository and must all be served by one daemon.
#
# It works in a temporary repository with a bare origin holding this package, under the servherd
# name githerd-smoke, with a gh that is always offline (nothing reaches GitHub) and no notify
# command; its state is ~/.githerd/githerd-smoke-repo. At the end it removes its servherd entry and
# that directory, and checks that no process it started is left. It needs a servherd release that
# has --autorestart.
#
# Usage: githerd/scripts/smoke-launcher.sh
# Environment: SERVHERD (the servherd command, default "npx -y servherd@^1.2.0").
set -euo pipefail

PKG=$(cd "$(dirname "$0")/.." && pwd)
SERVHERD=${SERVHERD:-npx -y servherd@^1.2.0}
NAME=githerd-smoke
WORK=$(mktemp -d)
REPO=$WORK/githerd-smoke-repo
STATE=$HOME/.githerd/githerd-smoke-repo
read -r -a SH <<<"$SERVHERD"

cleanup() {
    (cd "$REPO" 2>/dev/null && "${SH[@]}" remove --force "$NAME" >/dev/null 2>&1) || true
    rm -rf "$WORK" "$STATE"
}
trap cleanup EXIT

# A git that ignores the owner's global config (signing, hooks).
printf '' >"$WORK/gitconfig"
export GIT_CONFIG_GLOBAL=$WORK/gitconfig GIT_CONFIG_NOSYSTEM=1

mkdir -p "$WORK/bin" "$REPO/githerd"
printf '#!/bin/sh\necho "smoke gh: offline" >&2\nexit 1\n' >"$WORK/bin/gh"
chmod +x "$WORK/bin/gh"
export PATH=$WORK/bin:$PATH

cp -r "$PKG/bin" "$PKG/lib" "$PKG/package.json" "$REPO/githerd/"
# The config is committed: the daemon reads the default branch's, never GITHERD_CONFIG.
servherd_json=$(printf '%s\n' "${SH[@]}" | node -e 'console.log(JSON.stringify(require("fs").readFileSync(0, "utf8").trim().split("\n")))')
cat >"$REPO/githerd.config.json" <<EOF
{
  "repo": "smoke/smoke",
  "lanes": { "ci": { "workflow": "ci.yml", "gating": "required" } },
  "servherdCommand": $servherd_json,
  "notify": { "command": null }
}
EOF
git -C "$REPO" init -q -b master
git -C "$REPO" -c user.name=smoke -c user.email=smoke@example.com add -A
git -C "$REPO" -c user.name=smoke -c user.email=smoke@example.com commit -q -m smoke
git init -q --bare "$WORK/origin.git"
git -C "$REPO" remote add origin "$WORK/origin.git"
git -C "$REPO" push -q origin master
git -C "$REPO" remote set-head origin master
export GITHERD_NAME=$NAME

call='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"githerd_status"}}'
for i in 1 2 3 4 5; do
    (cd "$REPO" && printf '%s\n' "$call" | node "$PKG/bin/githerd-mcp.mjs" >"$WORK/out.$i" 2>"$WORK/err.$i") &
done
wait

failed=0
for i in 1 2 3 4 5; do
    if ! grep -q '"result"' "$WORK/out.$i" || grep -q '"isError":true' "$WORK/out.$i"; then
        echo "launcher $i got no status:" >&2
        cat "$WORK/out.$i" "$WORK/err.$i" >&2
        failed=1
    fi
done

# Every daemon process runs the archived copy through the state directory's current link.
mapfile -t pids < <(pgrep -f "$STATE/current/bin/githerd-daemon.mjs" || true)
echo "daemon pids: ${pids[*]:-none}"
port=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).port)' "$STATE/daemon.json")
curl -s "http://127.0.0.1:$port/health"
echo
[ "${#pids[@]}" -eq 1 ] || failed=1

# servherd started the pm2 process with autorestart on.
autorestart=$(SERVHERD_JSON=$servherd_json node --input-type=module -e "
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pm2Command } from '$PKG/lib/launcher.mjs';
const [cmd, ...args] = pm2Command(JSON.parse(process.env.SERVHERD_JSON), process.env);
const env = { ...process.env, PM2_HOME: process.env.PM2_HOME || join(homedir(), '.servherd', 'pm2') };
const list = JSON.parse(execFileSync(cmd, [...args, 'jlist'], { env, encoding: 'utf8' }));
console.log(list.find((p) => p.name === 'servherd-$NAME')?.pm2_env.autorestart);
")
echo "pm2 autorestart: $autorestart"
[ "$autorestart" = true ] || failed=1

# A SIGKILLed daemon comes back: pm2 restarts it with a new pid.
if [ "${#pids[@]}" -eq 1 ]; then
    kill -9 "${pids[0]}"
    back=
    for _ in $(seq 100); do
        sleep 0.1
        now=$(pgrep -f "$STATE/current/bin/githerd-daemon.mjs" || true)
        if [ -n "$now" ] && [ "$now" != "${pids[0]}" ]; then
            back=$now
            break
        fi
    done
    echo "after SIGKILL of ${pids[0]}: ${back:-not back}"
    [ -n "$back" ] || failed=1
fi

(cd "$REPO" && "${SH[@]}" remove --force "$NAME" >/dev/null)
for _ in $(seq 50); do
    pgrep -f "$STATE/current/bin" >/dev/null || break
    sleep 0.1
done
if pgrep -f "$STATE/current/bin" >/dev/null; then
    echo "a daemon process is left after servherd remove" >&2
    failed=1
fi
if (cd "$REPO" && "${SH[@]}" --json list) | grep -q "\"$NAME\""; then
    echo "servherd still lists $NAME" >&2
    failed=1
fi
[ "$failed" -eq 0 ] && echo "smoke-launcher: ok, one daemon, nothing left"
exit "$failed"
