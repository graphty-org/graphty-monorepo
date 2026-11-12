# Shared helpers for the group B spikes. Source from a spike script.
D=/home/apowers/Projects/graphty-monorepo/.worktrees/githerd/tmp/githerd/spikes-b
T="tmux -L githerd-spike-b"
OPUS=claude-opus-5-5
CLEAN="env -i HOME=$HOME PATH=$PATH TERM=xterm-256color LANG=C.UTF-8"
ISO="--setting-sources project,local --strict-mcp-config"
reg() { f=$(grep -l "\"name\":\"$1\"" ~/.claude/sessions/*.json 2>/dev/null | head -1); [ -n "$f" ] && jq -c '{pid,sessionId,status,waitingFor}' "$f" || echo none; }
cap() { $T capture-pane -p -t "$1" > "$2"; echo "--- $2"; grep -v '^\s*$' "$2" | tail -${3:-14}; }
waitfor() { for i in $(seq 1 ${3:-90}); do sleep 1; reg "$1" | grep -q "$2" && return 0; done; echo "TIMEOUT waiting for $2 on $1"; }
typein() { $T send-keys -t "$1" -l "$2"; sleep 0.5; $T send-keys -t "$1" Enter; }
quit() { typein "$1" '/exit'; sleep 4; }
