#!/bin/bash
# S20: does the registry show a permission prompt raised inside a subagent? Plus Notification hook input.
. "$(dirname "$0")/lib.sh"; S=$D/s20; rm -rf $S; mkdir -p $S; cd $S
$D/mksettings.sh $S Notification PermissionRequest
N=githerd-spike-s20
$T new-session -d -s s20 -x 200 -y 50 -c "$S" "$CLEAN claude --model haiku $ISO --permission-mode default --settings $S/settings.json -n $N 'Use the Agent tool to launch one general-purpose subagent whose only job is to run this Bash command: date +%s > sub-perm.txt . Do not run it yourself.'"
for i in $(seq 1 60); do sleep 1; r=$(reg $N); echo "$i $r" >> registry.log; grep -q "\"status\":\"waiting\"" <<<"$r" && break; done
sleep 2; echo "registry: $(reg $N)"; cap s20 1-subagent-prompt.txt 24
$T capture-pane -e -p -t s20 > 1-subagent-prompt.ansi
$T send-keys -t s20 Escape; sleep 3; waitfor $N '"idle"' 60; cap s20 2-after-no.txt 10; ls sub-perm.txt 2>&1
quit s20; $T ls 2>&1
echo "== events"; cut -d' ' -f2- hooks.log | jq -rc '[.hook_event_name, .notification_type // .tool_name // "", .message // "", (.tool_input|tostring)[0:80], .agent_id // ""] | @tsv'
echo "== registry samples"; cut -d' ' -f2- registry.log | uniq -c
