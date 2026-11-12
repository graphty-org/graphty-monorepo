#!/bin/bash
# Which way of taking the gate's lock leaves it visible in /proc/locks, and does /proc/<pid>/fdinfo
# show it? Form 1: `exec 9>file; flock 9` (the flock process exits once the lock is taken).
# Form 2: `flock file command` (the flock process stays alive as the command's parent).
L=$(cd "$(dirname "$0")" && pwd)/push.lock; : > "$L"; INO=$(stat -c %i "$L")
show() {
  echo "  /proc/locks lines for the file: $(/usr/bin/grep -c ":$INO " /proc/locks)"
  /usr/bin/grep ":$INO " /proc/locks | sed 's/^/    /'
  for p in $(pgrep -f 's24f-'); do
    for fd in /proc/$p/fd/*; do
      [ "$(readlink "$fd")" = "$L" ] || continue
      echo "  pid $p ($(cat /proc/$p/comm)) fd $(basename "$fd") fdinfo: $(/usr/bin/grep '^lock:' /proc/$p/fdinfo/$(basename "$fd") | tr -s ' ' || echo 'no lock line')"
    done
  done
  echo "  processes blocked in flock on the file: $(pgrep -fc "^flock .*push.lock")"
}
echo "== form 1: exec 9>file; flock 9"
bash -c 'exec 9>"$0"; flock 9; exec -a s24f-holder1 sleep 3' "$L" & sleep 0.3
bash -c 'exec -a s24f-waiter1 bash -c "exec 9>\"\$0\"; flock 9; true" "$0"' "$L" & sleep 0.3
show; wait
echo "== form 2: flock file command"
flock "$L" bash -c 'exec -a s24f-holder2 sleep 3' & sleep 0.3
flock "$L" bash -c 'exec -a s24f-waiter2 true' & sleep 0.3
show
FL=$(pgrep -f "^flock .*s24f-holder2"); echo "  SIGKILL the holding flock process $FL only:"; kill -9 $FL; sleep 0.3
echo "  lock now: $(flock -n "$L" true && echo free || echo held, kept by its command)"; show
wait; echo "leftovers: $(pgrep -f 's24f-' || echo none)"
