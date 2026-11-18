#!/usr/bin/env node
// The green graphty-agent pull requests pipeline-round arms itself (its step 7 and step 8, "Unarmed agent pull
// requests"): open, not a draft, CLEAN, checks SUCCESS, auto-merge off, never turned off by anyone but graphty-agent
// (pr-open.sh turns it off on each re-run), no breaking commit, and no file holding an approval the owner keeps.
// Ordered critical, then high, then the rest, by the priority labels of the issues each one closes, oldest first.
//
//   node tools/armable-prs.mjs [--json]
//
// 2026-11-18: green guarded-path fixes for critical issues (#8471 for #8457) sat unarmed for days while the rule to
// arm them was prose only.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const AGENT = "graphty-agent";
// Approvals the owner keeps for himself: an agent never arms a pull request that writes one (pipeline-round step 7).
const OWNER_FILES =
    /^(visual-review\/passkeys\.json|release-approvals\.json|tools\/test-quarantine\.json|visual-review-approvals\/|visual-baselines\/)/;
const BREAKING = /^[a-z]+(\([^)]*\))?!:|^BREAKING[ -]CHANGE:/m;
const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

const QUERY = `query($after: String) {
  repository(owner: "graphty-org", name: "graphty-monorepo") {
    pullRequests(states: OPEN, first: 20, after: $after, orderBy: { field: CREATED_AT, direction: ASC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number createdAt isDraft mergeStateStatus
        author { __typename login }
        autoMergeRequest { enabledAt }
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
        history: commits(last: 30) { nodes { commit { message } } }
        timelineItems(itemTypes: [AUTO_MERGE_DISABLED_EVENT], last: 20) {
          nodes { ... on AutoMergeDisabledEvent { actor { login } } }
        }
        closingIssuesReferences(first: 10) { nodes { number labels(first: 20) { nodes { name } } } }
        files(first: 100) { nodes { path } }
      }
    }
  }
}`;

const priority = (pr) => {
    const names = new Set(pr.closingIssuesReferences.nodes.flatMap((i) => i.labels.nodes.map((l) => l.name)));
    const found = Object.keys(RANK).find((p) => names.has(`priority:${p}`));
    return found ?? "none";
};

// An open graphty-agent pull request, not a draft, auto-merge off, CLEAN with checks SUCCESS.
const green = (pr) =>
    pr.author?.login === AGENT &&
    pr.author.__typename === "User" &&
    !pr.isDraft &&
    !pr.autoMergeRequest &&
    pr.mergeStateStatus === "CLEAN" &&
    pr.commits.nodes[0]?.commit.statusCheckRollup?.state === "SUCCESS";

// Why only the owner may arm it, or null.
const holdFor = (pr) => {
    const offBy = pr.timelineItems.nodes.find((e) => e.actor?.login !== AGENT);
    if (offBy) return `auto-merge turned off by ${offBy.actor?.login ?? "a deleted account"}`;
    const owned = pr.files.nodes.find((f) => OWNER_FILES.test(f.path));
    if (owned) return `writes ${owned.path}`;
    return pr.history.nodes.some((c) => BREAKING.test(c.commit.message)) ? "breaking commit" : null;
};

/**
 * Sorts open pull requests into the ones to arm and the green ones only the owner may arm.
 * @param prs GraphQL PullRequest nodes from QUERY
 * @returns `{ armable: [{ number, priority }], owner: [{ number, priority, why }] }`
 */
export function armable(prs) {
    const out = { armable: [], owner: [] };
    for (const pr of prs.filter((x) => green(x))) {
        const why = holdFor(pr);
        const entry = { number: pr.number, priority: priority(pr), at: pr.createdAt };
        if (why) out.owner.push({ ...entry, why });
        else out.armable.push(entry);
    }
    const order = (a, b) => (RANK[a.priority] ?? 4) - (RANK[b.priority] ?? 4) || a.at.localeCompare(b.at);
    for (const list of Object.values(out)) {
        list.sort(order);
        for (const x of list) delete x.at;
    }
    return out;
}

/**
 * The printed lines.
 * @param r from armable()
 * @returns lines
 */
export function lines(r) {
    const fmt = (list) =>
        list.map((x) => (x.why ? `#${x.number} ${x.priority} (${x.why})` : `#${x.number} ${x.priority}`));
    return [
        `armable: ${fmt(r.armable).join(", ") || "none"} -- arm the first with gh pr merge <n> --auto --merge`,
        ...(r.owner.length ? [`green, held for the owner: ${fmt(r.owner).join(", ")}`] : []),
    ];
}

function fetchAll() {
    const all = [];
    let after;
    do {
        const args = ["api", "graphql", "-f", `query=${QUERY}`];
        if (after) args.push("-f", `after=${after}`);
        const out = execFileSync("gh", args, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "inherit"],
            maxBuffer: 1 << 26,
        });
        const page = JSON.parse(out).data.repository.pullRequests;
        all.push(...page.nodes);
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined;
    } while (after);
    return all;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const r = armable(fetchAll());
    console.log(process.argv.includes("--json") ? JSON.stringify(r, null, 2) : lines(r).join("\n"));
}
