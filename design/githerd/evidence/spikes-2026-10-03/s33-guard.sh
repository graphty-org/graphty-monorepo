#!/bin/bash
# S33 guard: PreToolUse on Agent refuses a third concurrent subagent; SubagentStop frees a slot.
d=$(dirname "$0"); in=$(cat); ev=$(jq -r .hook_event_name <<<"$in")
echo "$(date +%s.%N | cut -c1-14) $in" >> $d/hooks.log
exec 9>$d/lock; flock 9
n=$(cat $d/running 2>/dev/null || echo 0)
case $ev in
  PreToolUse)
    if [ "$n" -ge 2 ]; then
      echo "$(date +%s) refuse n=$n" >> $d/decisions.log
      jq -nc '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"githerd: at most 2 subagents may run at once for a worker; 2 are running. Wait for one to finish, or do this part yourself."}}'
      exit 0
    fi
    echo $((n+1)) > $d/running; echo "$(date +%s) allow n=$((n+1))" >> $d/decisions.log ;;
  SubagentStop) echo $((n>0 ? n-1 : 0)) > $d/running; echo "$(date +%s) stop n=$((n>0 ? n-1 : 0))" >> $d/decisions.log ;;
esac
exit 0
