#!/bin/bash
# S28: can a process started like a githerd worker (env -i) make a signed commit object without
# any prompt? Runs git commit-tree -S in a scratch repository, with and without the owner's
# Claude-settings git variables (GIT_CONFIG_COUNT/KEY/VALUE, which select SSH signing).
D=$(cd "$(dirname "$0")" && pwd)
R="$D/repo"; rm -rf "$R"; git init -q "$R"
BASE=(HOME="$HOME" USER="$USER" LANG="${LANG:-C.UTF-8}" TERM=xterm-256color PATH="$PATH")
SSHVARS=(GIT_CONFIG_COUNT=2 GIT_CONFIG_KEY_0=gpg.format GIT_CONFIG_VALUE_0=ssh
         GIT_CONFIG_KEY_1=user.signingkey GIT_CONFIG_VALUE_1="$HOME/.ssh/git_signing_claude.pub")
probe() { # $1 label, rest: extra env
  local label=$1; shift
  local t0=$(date +%s%N)
  local out
  out=$(cd "$R" && setsid env -i "${BASE[@]}" "$@" timeout 20 bash -c \
    'tree=$(git hash-object -t tree /dev/null); git commit-tree -S -m githerd-signing-probe "$tree"' \
    </dev/null 2>&1); local rc=$?
  local ms=$(( ($(date +%s%N) - t0) / 1000000 ))
  echo "[$label] exit=$rc ms=$ms"
  echo "$out" | sed 's/^/  | /' | head -8
  if [ $rc -eq 0 ]; then
    local sha=$(echo "$out" | tail -1)
    (cd "$R" && git cat-file -p "$sha" | grep -c 'BEGIN SSH SIGNATURE\|BEGIN PGP SIGNATURE' | sed 's/^/  signature blocks: /')
    (cd "$R" && git cat-file -p "$sha" | grep -m1 'BEGIN .* SIGNATURE' | sed 's/^/  /')
  fi
}
probe "worker env, owner's Claude git variables" "${SSHVARS[@]}"
probe "worker env, owner's Claude git variables (second run)" "${SSHVARS[@]}"
probe "plain env -i, no Claude git variables (global gpg key)"
echo "gpg-agent after: $(pgrep -a gpg-agent || echo none)"
