#!/bin/bash
# S24: a gate that takes flock on a lock file. Are waiters visible in /proc/locks, and is the lock
# released when the holder is SIGKILLed? Also: what happens when a step the holder started (which
# inherits the lock's descriptor, as every step of a gate script does) outlives the holder.
# Every sleep is bounded and every wait has a timeout; leftovers are listed at the end.
unset -f grep 2>/dev/null  # the calling shell may export a grep wrapper that skips /proc files
D=$(cd "$(dirname "$0")" && pwd)
L="$D/push.lock"; : > "$L"
INO=$(stat -c %i "$L"); echo "lock file inode $INO"
locks() { /usr/bin/grep ":$INO " /proc/locks | sed 's/^/  /'; }
waiters() { /usr/bin/grep ":$INO " /proc/locks | /usr/bin/grep -c -- '->'; }
free() { flock -n "$L" true && echo free || echo held; }
# gate NAME STEP: takes the lock like a script would, then runs STEP as a child process.
gate() { bash -c 'exec 9>"$0"; flock 9; echo "  $1 got the lock"; eval "$2"; echo "  $1 finished"' "$L" "$1" "$2" & }

echo "== case 1: one holder, two waiters; SIGKILL the holder's bash only, then its step"
gate A 'exec -a s24-stepA sleep 60 & wait'; A=$!; sleep 0.3
gate B 'true'; B=$!; gate C 'true'; C=$!; sleep 0.3
echo "/proc/locks (the '->' lines are waiters):"; locks
echo "waiters counted from /proc/locks: $(waiters)"
STEP=$(pgrep -f '^s24-stepA'); echo "holder bash $A, its step $STEP"
kill -9 $A; sleep 0.3
echo "after SIGKILL of the holder bash only: lock $(free); the step still has fd 9 -> $(readlink /proc/$STEP/fd/9)"
locks
kill -9 $STEP; sleep 0.3
timeout 5 tail --pid=$B -f /dev/null; timeout 5 tail --pid=$C -f /dev/null
echo "after the step is killed too: lock $(free)"

echo "== case 2: SIGKILL of the holder's whole process group"
setsid -w bash -c 'exec 9>"$0"; flock 9; echo "  A2 got the lock"; exec -a s24-stepA2 sleep 60 & wait' "$L" & sleep 0.3
PG=$(ps -o pgid= $(pgrep -f '^s24-stepA2') | tr -d ' ')
gate B2 'true'; B2=$!; sleep 0.3; echo "holder pgid $PG, waiters: $(waiters)"; locks
echo "case 2 runs the holder in its own session (setsid -w), as a supervisor would start a gate"
kill -9 -- -$PG; timeout 5 tail --pid=$B2 -f /dev/null
echo "after kill -9 -$PG: lock $(free)"

echo "== case 3: holder exits normally, but a step left a detached child (like a daemon)"
bash -c 'exec 9>"$0"; flock 9; node -e "require(\"child_process\").spawn(\"bash\",[\"-c\",\"exec -a s24-daemon sleep 60\"],{detached:true,stdio:\"ignore\"}).unref()"; echo "  holder exits normally"' "$L"
sleep 0.3; DET=$(pgrep -f '^s24-daemon'); echo "detached child $DET, fd 9 -> $(readlink /proc/$DET/fd/9)"
echo "lock after the holder exited: $(free)"; locks
kill -9 $DET; sleep 0.3; echo "after killing the detached child: lock $(free)"

echo "== case 4: same, but the gate runs its steps with fd 9 closed (9>&-)"
bash -c 'exec 9>"$0"; flock 9; node -e "require(\"child_process\").spawn(\"bash\",[\"-c\",\"exec -a s24-daemon sleep 60\"],{detached:true,stdio:\"ignore\"}).unref()" 9>&-; echo "  holder exits normally"' "$L"
sleep 0.3; DET=$(pgrep -f '^s24-daemon'); echo "detached child $DET, fd 9 -> $(readlink /proc/$DET/fd/9 || echo none)"
echo "lock after the holder exited: $(free)"
kill -9 $DET 2>/dev/null
sleep 0.3; echo "leftovers: $(pgrep -f '^s24-' || echo none)"
