#!/bin/bash
# Does an authenticated 304 count against the core budget? Three conditional GETs in a row.
U=/repos/graphty-org/graphty-monorepo
E=$(gh api -i $U | tr -d '\r' | grep -i '^etag' | sed 's/^[Ee]tag: //')
for i in 1 2 3; do gh api -i -H "If-None-Match: $E" $U 2>&1 | tr -d '\r' | grep -i '^HTTP\|^x-ratelimit-used' | tr '\n' ' '; echo; done
