#!/usr/bin/env bash
# The pipeline health dashboard's dead-man switch from outside AWS (design/ci/health-dashboard.md section 13).
# A paused AWS project or the graphty-health Budget's deny-all stops the collector, its Pushover alerts and the SNS
# alarm email together, so release.yml runs this on every attempt: when the dashboard's API does not answer, or its
# views are over 30 minutes old, it pushes one priority-1 Pushover page. It never fails.
# Usage: tools/health-dead-man.sh [status URL]   (PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY from the environment)
set -uo pipefail

api=${1:-https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com/v1/status}
generated=$(curl -fsS --max-time 20 "$api" 2>/dev/null | jq -r '.generated // empty' 2>/dev/null || true)
if [ -n "$generated" ]; then
    min=$((($(date +%s) - $(date -d "$generated" +%s)) / 60))
    if [ "$min" -le 30 ]; then
        echo "health dashboard updated ${min} min ago"
        exit 0
    fi
    ago="${min} min"
    [ "$min" -ge 60 ] && ago="$((min / 60)) h $((min % 60)) min"
    what="The pipeline health dashboard last updated ${ago} ago"
else
    what="The pipeline health dashboard's API does not answer"
fi
echo "::warning::${what}"
if [ -z "${PUSHOVER_APP_TOKEN:-}" ] || [ -z "${PUSHOVER_USER_KEY:-}" ]; then
    echo "::warning::no Pushover keys: the owner was not paged"
    exit 0
fi
curl -fsS --max-time 20 https://api.pushover.net/1/messages.json \
    --form-string "token=${PUSHOVER_APP_TOKEN}" \
    --form-string "user=${PUSHOVER_USER_KEY}" \
    --form-string "priority=1" \
    --form-string "title=Health dashboard down: nothing is being watched" \
    --form-string "message=${what}, so none of its alerts can reach you. Usual cause: AWS paused the project (spend limit) or the graphty-health Budget locked it at \$10. Check AWS Settings > Billing (https://settings.aws.com/), then ask a Claude session to look." \
    --form-string "url=https://health.graphty.app" >/dev/null ||
    echo "::warning::the Pushover page failed"
exit 0
