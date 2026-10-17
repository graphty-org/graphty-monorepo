#!/bin/bash
# S12: a generated --settings file merged with the owner's user settings (user settings loaded).
# Runs under env -i so the owner's hooks cannot page. Arg: test | control (control has no --settings).
. "$(dirname "$0")/lib.sh"; S=$D/s12; cd $S; V=$1; rm -rf $V; mkdir -p $V/visual-baselines; cd $V
jq -n --arg srv $D/../spikes/mcp/block-server.mjs --arg log $S/$V/mcp.log '{mcpServers:{githerd:{command:"node",args:[$srv],env:{LOG:$log}}}}' > mcp.json
cat > settings.json <<'J'
{
  "permissions": {
    "allow": ["mcp__githerd__*", "Bash(gh pr create:*)", "Bash(gh pr edit:*)"],
    "deny": ["AskUserQuestion", "Workflow", "Edit(visual-baselines/**)", "Bash(touch denied-by-settings*)"]
  },
  "enabledPlugins": {"ponytail@ponytail": false},
  "promptSuggestionEnabled": false
}
J
extra=""; [ $V = test ] && extra="--settings $S/$V/settings.json"
N=githerd-spike-s12-$V
$T new-session -d -s $V -x 200 -y 50 -c "$S/$V" "$CLEAN claude --model haiku --strict-mcp-config --mcp-config $S/$V/mcp.json --permission-mode default $extra -n $N 'Reply with the single word READY.'"
waitfor $N '"idle"' 60
step() { # name prompt
  typein $V "$2"; sleep 4
  for i in $(seq 1 60); do r=$(reg $N); grep -q '"status":"idle"\|"status":"waiting"' <<<"$r" && break; sleep 1; done
  sleep 1; cap $V $1.txt 14 > /dev/null; echo "== $1: $(reg $N | jq -c '{status,waitingFor}')"; grep -v '^\s*$' $1.txt | grep -v "^$(printf '\xe2\x94')" | tail -8
  if grep -q '"status":"waiting"' <<<"$(reg $N)"; then $T send-keys -t $V Escape; sleep 3; waitfor $N '"idle"' 30; echo "   (prompt dismissed with Escape)"; fi
}
step 1-mcp 'Call the githerd MCP tool block with seconds 1, then reply with what it returned.'
step 2-ghpr 'Run with the Bash tool: gh pr create --help | head -3 . Then reply DONE.'
step 3-deny-bash 'Run with the Bash tool: touch denied-by-settings.txt . Report exactly what happened.'
step 4-deny-edit 'Use the Write tool to create the file visual-baselines/probe.txt containing hi. Report exactly what happened.'
step 5-tools 'Answer from your tool list only, no tool calls: is a tool named AskUserQuestion available to you (yes/no)? Is a tool named Workflow available (yes/no)?'
step 6-ask 'Use the AskUserQuestion tool to ask me whether I prefer tea or coffee. If you cannot, say why.'
SID=$(reg $N | jq -r .sessionId); quit $V
f=$(ls ~/.claude/projects/*/$SID.jsonl | head -1); echo "transcript $f"
echo "ponytail mentions in transcript: $(grep -c -i ponytail $f)"; echo "PONYTAIL MODE mentions: $(grep -c 'PONYTAIL MODE' $f)"
ls visual-baselines/ denied-by-settings.txt 2>&1; echo "mcp log:"; cat mcp.log 2>/dev/null
