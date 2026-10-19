// Refuses a push to a branch whose pull request sits in Mergify's merge queue.
//
// Mergify labels a queued pull request "queued". A push to it dequeues it and throws away the batch
// run it was part of -- and a "merge master" push is never needed there, because the queue tests the
// pull request on top of master itself. Run by tools/prepush.sh before the gate:
//
//   node tools/queued-push-guard.mjs <branch>
//
// No pull request, no gh, or no network: the push goes ahead. ALLOW_PUSH_WHILE_QUEUED=1 lets a
// deliberate push through (the rest of the gate still runs).
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const QUEUED_LABEL = "queued";

/**
 * Why this push must be refused, or null to let it through.
 * @param pr the branch's pull request
 * @param env the environment
 * @returns the refusal message
 */
function refusal(pr, env) {
    if (!pr || pr.state !== "OPEN") return null;
    if (!pr.labels.some((l) => l.name === QUEUED_LABEL)) return null;
    if (env.ALLOW_PUSH_WHILE_QUEUED === "1") return null;
    return [
        `Pull request #${pr.number} is in the Mergify merge queue (label "${QUEUED_LABEL}").`,
        "A push dequeues it and discards the batch run it is part of. Merging master in is never",
        "needed while queued: the queue already tests the pull request on top of master.",
        'If the change is really needed, dequeue it first (comment "@mergifyio dequeue") or wait',
        "for the merge. To push anyway: ALLOW_PUSH_WHILE_QUEUED=1 git push ...",
    ].join("\n");
}

/**
 * The open pull request of a branch, from gh; null when there is none or gh cannot answer.
 * @param branch the branch name
 * @param gh the gh executable
 * @returns the pull request, or null
 */
function findPr(branch, gh = "gh") {
    try {
        const out = execFileSync(gh, ["pr", "view", branch, "--json", "number,labels,state"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 15_000,
        });
        return JSON.parse(out);
    } catch {
        return null;
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const branch = process.argv[2];
    const message = branch ? refusal(findPr(branch, process.env.GH ?? "gh"), process.env) : null;
    if (message) {
        console.error(message);
        process.exit(1);
    }
}
