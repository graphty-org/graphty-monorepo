#!/bin/bash
# More read-only checks for the final githerd design.
M=/home/apowers/Projects/graphty-monorepo
echo "== visual-review reject block"; git -C $M show origin/master:visual-review/README.md | grep -n -i "reject" | head -12
echo "== pr-title triggers"; git -C $M show origin/master:.github/workflows/pr-title.yml | sed -n '1,15p' | grep -n -A4 "^on"
echo "== gpu.yml triggers"; git -C $M show origin/master:.github/workflows/gpu.yml | grep -n -A12 "^on:" | head -16
echo "== gpu runs-on"; git -C $M show origin/master:.github/workflows/gpu.yml | grep -n "runs-on" | head
echo "== bench-compare step"; git -C $M show origin/master:.github/workflows/gpu.yml | grep -n "bench-compare\|bench-groups" | head
echo "== hosts paths"; git -C $M show origin/master:.github/workflows/hosts.yml | grep -n -A8 "^on:" | head -12
echo "== ci artifact retention"; git -C $M show origin/master:.github/workflows/ci.yml | grep -n "retention-days" | sort -u -k2 | head -3
echo "== ignoreGhsas"; git -C $M show origin/master:package.json | grep -n -A4 -i "ignoreGhsas\|auditConfig" | head
echo "== workflows"; git -C $M ls-tree --name-only origin/master .github/workflows/
echo "== tmux version"; tmux -V
echo "== claude version"; claude --version 2>/dev/null
echo "== nproc"; nproc
