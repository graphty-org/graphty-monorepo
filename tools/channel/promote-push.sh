#!/usr/bin/env bash
# promote.yml: pushes deployed.json and channel.json to a site repository checked out with its deploy key,
# which starts that repository's deploy.yml. Usage: promote-push.sh <site checkout> <dir holding both files>
set -euo pipefail
repo=$1 files=$2
cp "$files/deployed.json" "$files/channel.json" "$repo/"
cd "$repo"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add deployed.json channel.json
git commit -m "deploy $(jq -r .tag deployed.json) ($(jq -r .approver deployed.json))"
git push --no-verify origin HEAD
