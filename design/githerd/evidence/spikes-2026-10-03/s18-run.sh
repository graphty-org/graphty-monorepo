#!/bin/bash
# Spike S18 runner: one session with the inherited environment, one under env -i.
cd "$(dirname "$0")"; rm -f hook-env.log
T="tmux -L githerd-spike"
common="--model haiku --setting-sources project,local --strict-mcp-config --allowedTools Bash --settings $PWD/settings.json"
$T new-session -d -s inherit -x 200 -y 50 -c "$PWD" "S18_LABEL=inherit claude $common -n githerd-spike-s18a \"\$(cat prompt.txt)\""
$T new-session -d -s clean -x 200 -y 50 -c "$PWD" "env -i HOME=$HOME PATH=$PATH TERM=xterm-256color LANG=C.UTF-8 S18_LABEL=clean claude $common -n githerd-spike-s18b \"\$(cat prompt.txt)\""
for i in $(seq 1 45); do sleep 2; [ "$(grep -c Stop hook-env.log 2>/dev/null)" -ge 2 ] && break; done
sleep 2
for s in inherit clean; do echo "== $s"; $T capture-pane -p -t $s | grep -E 'bash pushover|trust|Error|error' | head -5; done
echo "== hooks"; cat hook-env.log
for s in inherit clean; do $T send-keys -t $s -l '/exit'; $T send-keys -t $s Enter; done
sleep 4; $T ls 2>&1
