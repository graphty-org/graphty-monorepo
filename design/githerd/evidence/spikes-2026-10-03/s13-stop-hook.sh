#!/bin/bash
# Spike S13 Stop hook: block the first stop of each turn with a githerd-style reason.
d=$(dirname "$0")
in=$(cat)
n=$(( $(cat $d/count 2>/dev/null || echo 0) + 1 )); echo $n > $d/count
echo "$(date +%s) call=$n $in" >> $d/hook-input.log
active=$(jq -r '.stop_hook_active' <<<"$in")
[ "$active" = "true" ] && exit 0
case $n in
  1) r="githerd Stop gate: job pr-412 is not done (the pull request has no green checks yet). Before you stop, reply with the exact line JOB-ACK-7Q2 so githerd knows you saw this.";;
  *) r="githerd Stop gate: your last message asks the owner a question that is not a one-way door (it is reversible with an edit). Decide it yourself, state the choice and the reason in one line, and end that line with the token DECIDED-4K.";;
esac
jq -nc --arg r "$r" '{decision:"block",reason:$r}'
