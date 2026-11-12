#!/bin/bash
# S16: SessionStart source compact re-injects a record after /compact. S17: PostToolUse additionalContext.
. "$(dirname "$0")/lib.sh"
S=$D/s16; rm -rf $S; mkdir -p $S; cd $S
$D/mksettings.sh $S SessionStart PreCompact PostCompact
echo 'githerd job record (re-injected after compaction): job pr-7, branch fix/pr-7, done when PR #7 is green. Record token RECORD-5TZ.' > reply-SessionStart-compact
N=githerd-spike-s16
$T new-session -d -s s16 -x 200 -y 50 -c "$S" "$CLEAN claude --model $OPUS $ISO --permission-mode default --settings $S/settings.json -n $N 'Remember the codeword AMBER-FOX-9. Reply with the single word OK.'"
waitfor $N '"idle"'; sleep 2; cap s16 1-start.txt 4
typein s16 '/compact'
sleep 5; waitfor $N '"idle"' 180; sleep 3; cap s16 2-compacted.txt 12
typein s16 'Is there any githerd job record in your context? If so, quote its record token exactly; if not, say NONE. Also say the codeword if you know it.'
sleep 3; waitfor $N '"idle"'; sleep 2; cap s16 3-quote.txt 10
quit s16
echo "== S16 hook events"; cut -d' ' -f2- hooks.log | jq -rc '[.hook_event_name, .source // .trigger // "", (.compact_summary // "")[0:80]] | @tsv'

S=$D/s17; rm -rf $S; mkdir -p $S; cd $S
$D/mksettings.sh $S PostToolUse
jq -nc '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:"githerd news for job pr-7: the owner edited issue #12 after this job started (new acceptance line: keep the old flag). Acknowledge this news in your reply with the token NEWS-ACK-3M."}}' > reply-PostToolUse
N=githerd-spike-s17
$T new-session -d -s s17 -x 200 -y 50 -c "$S" "$CLEAN claude --model $OPUS $ISO --permission-mode default --allowedTools Bash --settings $S/settings.json -n $N 'Run echo hi with the Bash tool, then tell me what it printed.'"
sleep 5; waitfor $N '"idle"'; sleep 2; cap s17 1-reply.txt 16
quit s17; $T ls 2>&1
echo "== S17 hook events"; cut -d' ' -f2- hooks.log | jq -rc '[.hook_event_name, .tool_name, (.tool_response|tostring)[0:80]] | @tsv'
