#!/bin/bash
# Print "<self_ticks> <descendant_ticks> <descendant_count>" for a pid: utime+stime (+cutime+cstime
# for descendants' reaped children) from /proc/<pid>/stat.
root=$1; desc() { for c in $(cat /proc/$1/task/*/children 2>/dev/null); do echo $c; desc $c; done; }
t() { awk '{print $14+$15+$16+$17}' /proc/$1/stat 2>/dev/null || echo 0; }
self=$(awk '{print $14+$15}' /proc/$root/stat); sum=0; n=0
for p in $(desc $root); do sum=$((sum + $(t $p))); n=$((n+1)); done
echo "$self $sum $n"
