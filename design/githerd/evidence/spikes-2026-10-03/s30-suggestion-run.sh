#!/bin/bash
# Prompt suggestions: does ghost text appear in the idle prompt box, how does it look with -e, and
# does promptSuggestionEnabled:false in --settings stop it?
. "$(dirname "$0")/lib.sh"; S=$D/sugg; cd $S; rm -f *.txt *.ansi
echo '{"promptSuggestionEnabled": false}' > off.json; echo '{}' > on.json
PR=$(printf '\xe2\x9d\xaf')  # the prompt character
for v in on off; do
  $T new-session -d -s $v -x 200 -y 50 -c "$S" "$CLEAN claude --model haiku $ISO --permission-mode default --allowedTools Bash --settings $S/$v.json -n githerd-spike-sugg-$v 'List the files in this directory with the Bash tool and offer two possible next steps.'"
done
for v in on off; do waitfor githerd-spike-sugg-$v '"status":"idle"' 90; done
for k in 1 2 3; do
  sleep 12
  for v in on off; do
    $T capture-pane -p -t $v > $v-$k.txt; $T capture-pane -e -p -t $v > $v-$k.ansi
    echo "$v turn$k box: [$(grep "^$PR" $v-$k.txt | tail -1)]  ansi: $(grep -a "$PR" $v-$k.ansi | tail -1 | cat -v | cut -c1-160)"
    [ $k -lt 3 ] && typein $v 'Do the first of those next steps.'
  done
  for v in on off; do sleep 3; waitfor githerd-spike-sugg-$v '"status":"idle"' 90; done
done
for v in on off; do quit $v; done; $T ls 2>&1
