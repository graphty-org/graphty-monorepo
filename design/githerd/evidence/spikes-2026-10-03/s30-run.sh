#!/bin/bash
# S30: capture the plan-approval dialog and the MCP needs-authentication state in a pane.
. "$(dirname "$0")/lib.sh"; S=$D/s30; cd $S; rm -f *.txt *.ansi; PORT=$1
jq -n --arg u "http://127.0.0.1:$PORT/mcp" '{mcpServers:{"spike-auth":{type:"http",url:$u}}}' > mcp.json
N=githerd-spike-s30
$T new-session -d -s s30 -x 200 -y 50 -c "$S" "$CLEAN claude --model haiku $ISO --mcp-config $S/mcp.json --permission-mode plan -n $N 'Plan how to create a file hello.txt containing the word hi. Keep the plan to two lines, then present it for my approval.'"
sleep 6; cap s30 0-startup.txt 12
for i in $(seq 1 90); do sleep 1; r=$(reg $N); grep -q '"status":"waiting"' <<<"$r" && break; done
echo "registry: $(reg $N)"; sleep 1; cap s30 1-plan-approval.txt 30; $T capture-pane -e -p -t s30 > 1-plan-approval.ansi
$T send-keys -t s30 Escape; sleep 3; cap s30 2-after-escape.txt 8
typein s30 '/mcp'; sleep 3; cap s30 3-mcp-list.txt 20; $T send-keys -t s30 Escape; sleep 1
quit s30; $T ls 2>&1; echo "== auth server saw"; cat auth-requests.log
