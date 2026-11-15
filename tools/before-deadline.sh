#!/usr/bin/env bash
# Runs a command and kills it at DEADLINE (epoch seconds), failing the step instead. For an advisory job
# (continue-on-error): a job that reaches its own timeout-minutes is cancelled, and a cancelled job makes the whole
# run conclude cancelled, which continue-on-error does not absorb (issue #7986). A failed step it does absorb.
#
#   DEADLINE=<epoch seconds> tools/before-deadline.sh <command> [args...]
#
# Exits 1 when the deadline has already passed, 124 when the command ran out of time, else the command's status.
set -uo pipefail

left=$((DEADLINE - $(date +%s)))
if ((left <= 0)); then
    echo "::error::the job's time budget was spent before this step started: $*"
    exit 1
fi
timeout --kill-after=30 "$left" "$@"
status=$?
((status == 124 || status == 137)) && echo "::error::the job's time budget ran out ($left s) during: $*"
exit "$status"
