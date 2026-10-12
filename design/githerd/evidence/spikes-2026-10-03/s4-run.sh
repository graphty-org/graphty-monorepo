#!/bin/bash
# S4: unauthenticated (per-IP, 60/hour) bucket drained, then a conditional GET.
U=https://api.github.com/repos/graphty-org/graphty-monorepo
h() { curl -s -D - -o /dev/null "$@" | grep -i '^HTTP\|^x-ratelimit-remaining\|^etag' | tr -d '\r' | tr '\n' ' '; echo; }
echo "first:"; R=$(curl -s -D - -o /dev/null $U | tr -d '\r'); echo "$R" | grep -i '^HTTP\|^x-ratelimit-remaining\|^etag'
E=$(echo "$R" | grep -i '^etag' | sed 's/^[Ee]tag: //')
echo "conditional with budget left:"; h -H "If-None-Match: $E" $U
n=0
while :; do rem=$(curl -s -D - -o /dev/null https://api.github.com/repos/graphty-org/graphty-monorepo/commits?per_page=1 | tr -d '\r' | grep -i '^x-ratelimit-remaining' | awk '{print $2}'); n=$((n+1)); [ "$rem" = "0" ] && break; [ $n -gt 70 ] && break; done
echo "drained after $n calls"
echo "conditional at zero:"; h -H "If-None-Match: $E" $U
echo "unconditional at zero:"; h $U
