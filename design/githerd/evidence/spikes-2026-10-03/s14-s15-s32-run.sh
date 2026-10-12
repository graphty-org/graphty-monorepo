#!/bin/bash
# S14 resume, S15 UserPromptSubmit for tmux-typed text, S32 background_tasks in the Stop input.
. "$(dirname "$0")/lib.sh"; S=$D/s14; rm -rf $S; mkdir -p $S; cd $S
$D/mksettings.sh $S SessionStart UserPromptSubmit Stop
N=githerd-spike-s14
$T new-session -d -s s14 -x 200 -y 50 -c "$S" "$CLEAN claude --model haiku $ISO --permission-mode default --allowedTools Bash --settings $S/settings.json -n $N 'Remember the codeword BLUE-HERON-41. Reply with the single word OK.'"
waitfor $N '"idle"'; sleep 2; cap s14 1-start.txt 6
typein s14 '[githerd n0nce-77] reply with the single word PONG'
sleep 2; waitfor $N '"idle"'; sleep 1; cap s14 2-typed.txt 6
typein s14 'Use the Bash tool with run_in_background set to true to run: sleep 40 ; then end your turn at once, replying with the single word STARTED.'
sleep 3; waitfor $N '"idle"'; sleep 2; cap s14 3-bg.txt 10
R=$(reg $N); echo "registry before exit: $R"; SID=$(jq -r .sessionId <<<"$R")
quit s14; echo "after /exit: $(reg $N); tmux: $($T ls 2>&1)"
echo "== resume $SID in a new tmux window"
$T new-session -d -s s14r -x 200 -y 50 -c "$S" "$CLEAN claude --model haiku $ISO --permission-mode default --settings $S/settings.json --resume $SID"
sleep 8; cap s14r 4-resumed.txt 12
typein s14r 'What was the codeword I asked you to remember? Reply with it only.'
sleep 3; for i in $(seq 1 40); do sleep 1; $T capture-pane -p -t s14r | grep -q 'BLUE-HERON-41' && break; done; sleep 2; cap s14r 5-codeword.txt 8
ls ~/.claude/sessions/*.json | xargs grep -l "$SID" 2>/dev/null | xargs -r jq -c '{pid,sessionId,name,status}'
quit s14r; $T ls 2>&1
echo "== hook events"; jq -rc '[.hook_event_name, .source // "", .prompt // "", (.background_tasks|tostring), .session_id[0:8], (.last_assistant_message // "")[0:40]] | @tsv' <(cut -d' ' -f2- hooks.log)
