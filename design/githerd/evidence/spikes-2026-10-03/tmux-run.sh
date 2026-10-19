#!/bin/bash
# Spike: an interactive claude in a detached tmux session, driven and read from outside.
cd "$(dirname "$0")"; rm -f perm-probe.txt
T="tmux -L githerd-spike"; S=w1; N=githerd-spike-tmux
reg() { f=$(grep -l "\"name\":\"$N\"" ~/.claude/sessions/*.json 2>/dev/null | head -1); [ -n "$f" ] && jq -c '{pid,status,waitingFor}' "$f" || echo none; }
cap() { $T capture-pane -p -t $S > "$1"; echo "--- $1 (registry $(reg))"; grep -v '^\s*$' "$1" | tail -${2:-12}; }
waitfor() { for i in $(seq 1 60); do sleep 1; reg | grep -q "$1" && return 0; done; echo "TIMEOUT waiting for $1"; }
$T new-session -d -s $S -x 200 -y 50 -c "$PWD" "claude --model haiku --setting-sources project,local --strict-mcp-config --permission-mode default -n $N 'Run the bash command: date +%s > perm-probe.txt'"
waitfor '"waiting"'; cap 1-permission.txt 14
$T send-keys -t $S 1; waitfor '"idle"'; sleep 1; cap 2-idle.txt 8; ls perm-probe.txt
$T send-keys -t $S -l 'partial owner text'; sleep 1; cap 3-half-typed.txt 6
$T send-keys -t $S C-u; sleep 1; cap 4-after-ctrl-u.txt 6
$T send-keys -t $S -l 'githerd: reply with exactly the word DOORBELL-OK'; sleep 1; cap 5-doorbell-typed.txt 6
$T send-keys -t $S Enter; sleep 1; reg; waitfor '"idle"'; sleep 1; cap 6-after-doorbell.txt 8
pid=$(reg | jq -r .pid)
$T send-keys -t $S -l '/exit'; $T send-keys -t $S Enter; sleep 4
echo "pid $pid alive: $(kill -0 $pid 2>/dev/null && echo yes || echo no); registry file: $(ls ~/.claude/sessions/$pid.json 2>/dev/null || echo gone)"; $T ls 2>&1
