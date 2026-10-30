#!/usr/bin/env bash
# The pipeline health dashboard's dead-man switch from outside AWS (design/ci/health-dashboard.md section 13).
# A paused AWS project or the graphty-health Budget's deny-all stops the collector, its Pushover alerts and the SNS
# alarm email together, so release.yml runs this on every attempt: when the dashboard's API does not answer, or its
# views are over 30 minutes old, it pushes one Pushover page. It never fails. Only the first attempt of a scheduled
# run (mode full) on master pages -- not the same slot's hand-off run on channel/full-run -- so a long outage pages at
# most four times a day, and only loudly (priority 1) between 9:00 and 21:00 Pacific; at night it pages at priority
# 0, which the owner's quiet hours hold.
# Usage: tools/health-dead-man.sh [status URL]   (PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY from the environment;
# RELEASE_MODE, SCHEDULED, GITHUB_REF and GITHUB_RUN_ATTEMPT from release.yml)
set -uo pipefail

api=${1:-https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com/v1/status}
# Retried, so one cold start or one 5xx from API Gateway does not page.
generated=$(curl -fsS --max-time 20 --retry 3 --retry-all-errors --retry-delay 10 "$api" 2>/dev/null | jq -r '.generated // empty' 2>/dev/null || true)
if [ -n "$generated" ]; then
    min=$((($(date +%s) - $(date -d "$generated" +%s)) / 60))
    if [ "$min" -le 30 ]; then
        echo "health dashboard updated ${min} min ago"
        exit 0
    fi
    ago="${min} min"
    [ "$min" -ge 60 ] && ago="$((min / 60)) h $((min % 60)) min"
    what="The pipeline health dashboard last updated ${ago} ago"
    cause="Likely causes: the collector crashed (CloudWatch emails its alarm), AWS paused the project (spend limit), or the graphty-health Budget locked it at \$10."
else
    what="The pipeline health dashboard's API does not answer"
    cause="Usual cause: AWS paused the project (spend limit) or the graphty-health Budget locked it at \$10."
fi
echo "::warning::${what}"
if [ "${GITHUB_RUN_ATTEMPT:-1}" != 1 ] || [ "${RELEASE_MODE:-full}" != full ] || [ "${SCHEDULED:-false}" != true ] ||
    [ "${GITHUB_REF:-}" != refs/heads/master ]; then
    echo "only the first attempt of a scheduled run on master pages the owner"
    exit 0
fi
hour=$(TZ=America/Los_Angeles date +%-H)
priority=0
[ "$hour" -ge 9 ] && [ "$hour" -lt 21 ] && priority=1
if [ -z "${PUSHOVER_APP_TOKEN:-}" ] || [ -z "${PUSHOVER_USER_KEY:-}" ]; then
    echo "::warning::no Pushover keys: the owner was not paged"
    exit 0
fi
curl -fsS --max-time 20 https://api.pushover.net/1/messages.json \
    --form-string "token=${PUSHOVER_APP_TOKEN}" \
    --form-string "user=${PUSHOVER_USER_KEY}" \
    --form-string "priority=${priority}" \
    --form-string "title=Health dashboard down: nothing is being watched" \
    --form-string "message=${what}, so none of its alerts can reach you. ${cause} Check AWS Settings > Billing (https://settings.aws.com/), then ask a Claude session to look." \
    --form-string "url=https://health.graphty.app" >/dev/null ||
    echo "::warning::the Pushover page failed"
exit 0
