#!/bin/bash
# S21: does CPU time of the session's process tree separate a busy command from a hung one?
. "$(dirname "$0")/lib.sh"; S=$D/s21; cd $S; rm -f samples.log
N=githerd-spike-s21
$T new-session -d -s s21 -x 200 -y 50 -c "$S" "$CLEAN claude --model haiku $ISO --permission-mode default --allowedTools Bash -n $N 'Reply with the single word READY.'"
waitfor $N '"idle"'; P=$(reg $N | jq -r .pid); echo "pid $P"
sample() { for i in $(seq 1 $2); do echo "$1 $(date +%s) $($S/treecpu.sh $P) status=$(reg $N | jq -r .status)" >> samples.log; sleep 10; done; }
sample idle 3
typein s21 'Run exactly this with the Bash tool, in the foreground, with a timeout of 120000 ms: timeout 50 tail -f /dev/null; echo waited . Then reply DONE.'
sleep 8; sample hang 4; waitfor $N '"idle"' 60
typein s21 "Run exactly this with the Bash tool, in the foreground, with a timeout of 120000 ms: timeout 50 sh -c 'while :; do :; done'; echo spun . Then reply DONE."
sleep 8; sample spin 4; waitfor $N '"idle"' 60
quit s21; $T ls 2>&1
awk 'NR>1{printf "%-5s +%ss self+%d ticks desc+%d ticks (desc procs %d) %s\n",$1,$2-pt,$3-ps,$4-pd,$5,$6} {pt=$2;ps=$3;pd=$4}' samples.log
