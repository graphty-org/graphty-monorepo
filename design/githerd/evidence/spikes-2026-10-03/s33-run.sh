#!/bin/bash
# S33: can a PreToolUse hook on Agent count running subagents and refuse a third?
. "$(dirname "$0")/lib.sh"; S=$D/s33; cd $S; rm -f hooks.log decisions.log running
N=githerd-spike-s33
$T new-session -d -s s33 -x 200 -y 50 -c "$S" "$CLEAN claude --model haiku $ISO --permission-mode default --settings $S/settings.json -n $N 'In ONE message, launch three general-purpose subagents in parallel with the Agent tool (do not run them in the background). Subagent 1 replies ALPHA, subagent 2 replies BRAVO, subagent 3 replies CHARLIE; none of them uses any tool. Then report which of the three you got answers from and quote any error you received.'"
sleep 10; waitfor $N '"idle"' 150; sleep 2; cap s33 1-result.txt 30
typein s33 'Now launch three more general-purpose subagents the same way, but with run_in_background set to true, each replying DELTA, ECHO and FOXTROT respectively. Report what happened at launch.'
sleep 10; waitfor $N '"idle"' 150; sleep 15; cap s33 2-bg.txt 30
quit s33; $T ls 2>&1
echo "== decisions"; cat decisions.log
echo "== events"; cut -d' ' -f2- hooks.log | jq -rc '[.hook_event_name, .tool_name // .agent_type // "", .tool_use_id // .agent_id // "", (.tool_input|tostring)[0:120]] | @tsv'
