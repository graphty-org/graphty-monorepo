#!/bin/bash
# S5: GET /advisories conditional request, and the braces advisory's times.
Q='/advisories?ecosystem=npm&sort=updated&direction=desc&per_page=100'
E=$(gh api -i "$Q" 2>/dev/null | tr -d '\r' | grep -i '^etag' | sed 's/^[Ee]tag: //')
echo "etag: $E"
echo "second, If-None-Match:"; gh api -i -H "If-None-Match: $E" "$Q" 2>&1 | tr -d '\r' | grep -i '^HTTP\|^x-ratelimit-remaining\|^etag'
echo "braces advisory:"; jq -r '.[]|select(.ghsa_id=="GHSA-vfj7-8cjw-p6xm")|"\(.ghsa_id) published=\(.published_at) updated=\(.updated_at) withdrawn=\(.withdrawn_at)"' adv1.json
echo "index in page 1: $(jq '[.[].ghsa_id]|index("GHSA-vfj7-8cjw-p6xm")' adv1.json) of $(jq length adv1.json)"
echo "S11 header in any response:"; gh api -i /repos/graphty-org/graphty-monorepo 2>/dev/null | tr -d '\r' | grep -i 'token-expiration\|^x-oauth-scopes' ; echo "(no expiration line above means absent)"
