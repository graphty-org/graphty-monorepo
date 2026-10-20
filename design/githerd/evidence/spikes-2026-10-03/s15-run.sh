#!/bin/bash
# S15: StopFailure reasons, against a fake API, with a private config dir (the owner's state is untouched).
. "$(dirname "$0")/lib.sh"; S=$D/s15; cd $S; rm -f hooks.log; PORT=$1; shift
$D/mksettings.sh $S StopFailure Stop
for mode in "$@"; do
  C=$S/config-$mode; rm -rf $C; mkdir -p $C
  jq -n --arg cwd "$S" '{hasCompletedOnboarding:true, theme:"dark", projects: {($cwd): {hasTrustDialogAccepted:true}}}' > $C/.claude.json
  N=githerd-spike-s15-$mode
  $T new-session -d -s $mode -x 200 -y 50 -c "$S" "env -i HOME=$HOME PATH=$PATH TERM=xterm-256color LANG=C.UTF-8 CLAUDE_CONFIG_DIR=$C ANTHROPIC_BASE_URL=http://127.0.0.1:$PORT/$mode ANTHROPIC_AUTH_TOKEN=fake-token CLAUDE_CODE_MAX_RETRIES=0 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 claude --model claude-opus-5-5 --strict-mcp-config --setting-sources project,local --settings $S/settings.json -n $N 'Reply OK.'"
done
sleep 40
for mode in "$@"; do cap $mode cap-$mode.txt 10; $T send-keys -t $mode C-c; sleep 0.5; $T send-keys -t $mode C-c; done
sleep 3; $T kill-server 2>/dev/null; $T ls 2>&1
echo "== hook events"; cut -d' ' -f2- hooks.log | jq -rc '[.hook_event_name, .error // "", .error_details // "" , (.last_assistant_message // "")[0:100]] | @tsv'
echo "== keys"; cut -d' ' -f2- hooks.log | jq -c 'keys' | sort -u
echo "== requests by mode"; jq -r '[.mode,.path]|@tsv' requests.log | sort | uniq -c
