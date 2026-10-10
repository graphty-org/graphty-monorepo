#!/bin/bash
# Read-only checks of repository and machine facts the final githerd design cites.
R=graphty-org/graphty-monorepo
M=/home/apowers/Projects/graphty-monorepo
echo "== repo settings"; gh api repos/$R --jq '{delete_branch_on_merge,allow_auto_merge,allow_update_branch,private}'
echo "== master rules"; gh api repos/$R/rules/branches/master --jq '.[] | {type, p: .parameters}' 2>&1 | head -40
echo "== servherd autorestart"; grep -n "autorestart" /home/apowers/Projects/servherd/src/services/process.service.ts | head
echo "== servherd identity"; grep -n "cwd" /home/apowers/Projects/servherd/src/services/registry.service.ts | sed -n 1,12p
echo "== master .claude"; git -C $M ls-tree --name-only origin/master .claude/ 2>&1
echo "== prepush lock"; git -C $M show origin/master:tools/prepush.sh | grep -n -i "flock\|lock" ; git -C $M show origin/master:.husky/pre-push
ls -la /tmp/graphty-push.lock 2>&1
echo "== visual-review update"; git -C $M show origin/master:visual-review/trusted/cli.mjs 2>/dev/null | grep -n "update" | head
echo "== mergify"; gh pr view 777 -R $R --json state,title --jq '.state+" "+.title'
echo "== release gate artifact notice"; git -C $M show origin/master:.github/workflows/release.yml | grep -n -i "artifact\|notice\|almost never" | head -20
echo "== ci audit step"; git -C $M show origin/master:.github/workflows/ci.yml | grep -n -i -A3 "audit" | head -20
echo "== bench-groups"; git -C $M show origin/master:webgpu-graph-algorithms/scripts/bench-groups.js 2>/dev/null | head -5
echo "== supervisord"; ls /usr/local/etc/supervisord.conf 2>&1; grep -n "autorestart" /usr/local/etc/supervisord.conf 2>&1 | head -3
echo "== boot id / pid1"; cat /proc/sys/kernel/random/boot_id; awk '{print $22}' /proc/1/stat
echo "== pm2 env"; P=$(pgrep -f "PM2 v" | head -1); echo pid=$P; tr '\0' '\n' < /proc/$P/environ 2>/dev/null | grep -o '^\(CLAUDECODE\|CLAUDE_CODE_CHILD_SESSION\|CLAUDE_PID\|PUSHOVER_[A-Z_]*\)=' 
echo "== automode env"; grep -n -A3 '"autoMode"' ~/.claude/settings.json | head -8
echo "== defaultMode"; grep -n 'defaultMode' ~/.claude/settings.json
echo "== nx cache"; git -C $M show origin/master:nx.json | grep -n -i "cacheDirectory"
