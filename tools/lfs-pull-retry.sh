#!/usr/bin/env bash
# `git lfs pull "$@"`, tried up to three times. git-lfs treats a 5xx from GitHub's LFS batch endpoint as fatal and
# never retries it, so one bad minute on GitHub's side fails the whole CI job (issue #10145). Each failure is
# printed; after the third the script exits with git's status, so a failure is never hidden. Objects already
# fetched stay in .git/lfs/objects, so a retry fetches only what is still missing.
# LFS_PULL_RETRY_DELAYS: the seconds to wait before the second and third tries (default "20 60").
# Usage: tools/lfs-pull-retry.sh --include "<patterns>"
set -uo pipefail

read -r -a delays <<<"${LFS_PULL_RETRY_DELAYS:-20 60}"
tries=$((${#delays[@]} + 1))
for ((try = 1; ; try++)); do
    git lfs pull "$@" && exit 0
    rc=$?
    echo "lfs-pull-retry: git lfs pull failed (exit $rc), try $try of $tries" >&2
    if ((try >= tries)); then
        echo "::error::git lfs pull failed $tries times; giving up"
        exit "$rc"
    fi
    sleep "${delays[try - 1]}"
done
