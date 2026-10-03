#!/bin/bash
# Set up: PR A (a -> master), PR B stacked on A (b -> a), PR D (d -> master), PR C stacked on D (c -> d).
# Then move master forward so A is behind.
set -e
cd "$(dirname "$0")/scratch"
R=apowers313/githerd-spike-2026-10-03
mk() { git switch -q -c "$1" "$2"; echo "$1" > "$1.txt"; git add "$1.txt"; git commit -q -m "chore: $1"; git push -q -u origin "$1"; }
mk a master; mk b a; mk d master; mk c d
git switch -q master
gh pr create -R $R -B master -H a -t "A" -b "spike A" 
gh pr create -R $R -B a -H b -t "B stacked on A" -b "spike B"
gh pr create -R $R -B master -H d -t "D" -b "spike D"
gh pr create -R $R -B d -H c -t "C stacked on D" -b "spike C"
echo m1 > m1.txt; git add m1.txt; git commit -q -m "chore: move master"; git push -q origin master
git rev-parse master a b c d
