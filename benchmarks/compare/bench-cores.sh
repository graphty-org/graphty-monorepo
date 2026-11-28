#!/usr/bin/env bash
# Gives a timed benchmark run its own CPU cores for exactly as long as the run lasts.
#
#   bench-cores.sh run <command...>   reserve, run the command on the reserved cores, release
#   bench-cores.sh release            give every core back now (safe to run any time)
#   bench-cores.sh status             show the reservation
#   bench-cores.sh watchdog           loop: release whenever no live run holds the reservation
#
# How: two CPU groups (cgroup v2 cpusets) under /sys/fs/cgroup. "shared" holds every other process on the
# machine; "bench" holds the timed run. While a run holds the reservation, shared may use every core except
# BENCH_CPUS and bench may use only BENCH_CPUS. Releasing is one write: shared gets every core again. Processes
# stay in the shared group afterwards, which costs nothing.
#
# Freed by three independent things: the run's own exit trap; the watchdog (a separate long-lived process,
# started through servherd) that releases as soon as the holder process is gone, however it died; and the
# release command, which anyone can run by hand.
#
# BENCH_CPUS defaults to 8-15: four performance cores (both threads of each), including the two 6 GHz cores.
# Runs take turns on their own lock (reserve.lock), so only one run holds the reservation at a time; take the
# GPU bench lock outside this command as before.
set -u
CG=/sys/fs/cgroup
ALL=$(cat "$CG/cpuset.cpus.effective")
BENCH_CPUS=${BENCH_CPUS:-8-15}
# The main checkout's tmp/bench-cores, whichever worktree this copy runs from, so every copy shares one reservation.
MAIN=$(dirname "$(git -C "$(dirname "$0")" rev-parse --path-format=absolute --git-common-dir)")
mkdir -p "$MAIN/tmp/bench-cores"
LOCK=$MAIN/tmp/bench-cores/reserve.lock
STATE=$MAIN/tmp/bench-cores/holder

shared_cpus() {
    # Every core of ALL except BENCH_CPUS, as a cpuset list.
    python3 -I - "$ALL" "$BENCH_CPUS" <<'EOF'
import sys
def parse(s):
    out = set()
    for part in s.split(','):
        if '-' in part: a, b = part.split('-'); out |= set(range(int(a), int(b) + 1))
        elif part: out.add(int(part))
    return out
print(','.join(str(c) for c in sorted(parse(sys.argv[1]) - parse(sys.argv[2]))))
EOF
}

setup() {
    grep -qw cpuset "$CG/cgroup.subtree_control" || echo +cpuset > "$CG/cgroup.subtree_control"
    mkdir -p "$CG/shared" "$CG/bench"
    # The container's top group is a threaded domain, so its children must be threaded groups.
    [ "$(cat "$CG/shared/cgroup.type")" = threaded ] || echo threaded > "$CG/shared/cgroup.type"
    [ "$(cat "$CG/bench/cgroup.type")" = threaded ] || echo threaded > "$CG/bench/cgroup.type"
    cat "$CG/cpuset.mems.effective" > "$CG/shared/cpuset.mems"
    cat "$CG/cpuset.mems.effective" > "$CG/bench/cpuset.mems"
    [ -s "$CG/shared/cpuset.cpus" ] || echo "$ALL" > "$CG/shared/cpuset.cpus"
}

sweep() {
    # Move every process still in the top group (new shells from outside, anything not yet moved) into shared.
    # The top group's cgroup.procs lists every process below it too, so move only those still at the top.
    local p
    while read -r p; do
        [ "$(cat "/proc/$p/cgroup" 2>/dev/null)" = "0::/" ] && echo "$p" > "$CG/shared/cgroup.procs" 2>/dev/null
    done < "$CG/cgroup.procs"
}

release() {
    [ -d "$CG/shared" ] && echo "$ALL" > "$CG/shared/cpuset.cpus"
    rm -f "$STATE"
}

holder_alive() {
    [ -f "$STATE" ] || return 1
    local pid start
    read -r pid start < "$STATE"
    [ -r "/proc/$pid/stat" ] || return 1
    [ "$(awk '{print $22}' "/proc/$pid/stat")" = "$start" ]
}

case "${1:-}" in
run)
    shift
    [ $# -gt 0 ] || { echo "usage: bench-cores.sh run <command...>" >&2; exit 2; }
    exec 9>"$LOCK"
    flock 9
    setup
    sweep
    echo "$$ $(awk '{print $22}' /proc/$$/stat)" > "$STATE"
    trap 'release' EXIT
    trap 'exit 143' INT TERM HUP
    echo "$BENCH_CPUS" > "$CG/bench/cpuset.cpus"
    echo "$(shared_cpus)" > "$CG/shared/cpuset.cpus"
    # Keep sweeping newcomers off the reserved cores while the command runs.
    ( while kill -0 $$ 2>/dev/null; do sweep; sleep 2; done ) &
    sweeper=$!
    ( echo "$BASHPID" > "$CG/bench/cgroup.procs"; exec "$@" )
    rc=$?
    kill "$sweeper" 2>/dev/null
    exit $rc
    ;;
release)
    release
    echo "released: every process may use $ALL"
    ;;
status)
    echo "shared: $(cat "$CG/shared/cpuset.cpus" 2>/dev/null || echo none)  bench: $(cat "$CG/bench/cpuset.cpus" 2>/dev/null || echo none)"
    if holder_alive; then echo "held by pid $(cut -d' ' -f1 "$STATE")"; else echo "not held"; fi
    ;;
watchdog)
    while :; do
        if [ -d "$CG/shared" ] && [ "$(cat "$CG/shared/cpuset.cpus")" != "$ALL" ] && ! holder_alive; then
            release
            echo "$(date '+%F %T') released a reservation whose holder was gone"
        fi
        sleep 5
    done
    ;;
*)
    sed -n '2,8p' "$0"; exit 2 ;;
esac
