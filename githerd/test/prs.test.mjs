import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../lib/config.mjs";
import { countsAsBreaking, decideBreaking, touches, updatePrs, whyStuck } from "../lib/prs.mjs";
import { fixture } from "./helpers/fake-gh.mjs";

const config = normalizeConfig(JSON.parse(readFileSync(new URL("../../githerd.config.json", import.meta.url), "utf8")));
const GREEN = { verdict: "green", branch: "master", fixPr: null, fixedAt: null };
const NOW = "2026-10-02T16:00:00Z";

/**
 * The open PR nodes of the recorded GraphQL answer.
 * @returns {any[]} the nodes of #409 and #710
 */
const recorded = () => {
    const text = fixture("prs-graphql.http");
    return JSON.parse(text.slice(text.indexOf("\n\n") + 2)).data.repository.pullRequests.nodes;
};

const run = (name, conclusion, extra = {}) => ({
    __typename: "CheckRun",
    name,
    status: conclusion ? "COMPLETED" : "IN_PROGRESS",
    conclusion,
    ...extra,
});

/**
 * A pullRequest node with all checks green, trimmed to what updatePrs reads.
 * @param {object} [over] fields to replace
 * @returns {any} the node
 */
function node(over = {}) {
    return {
        number: 704,
        title: "fix(graphty-element): trim edges",
        isDraft: false,
        updatedAt: "2026-10-02T15:00:00Z",
        headRefName: "fix/x",
        headRefOid: "h1",
        baseRefName: "master",
        mergeable: "MERGEABLE",
        autoMergeRequest: null,
        labels: { nodes: [] },
        author: { login: "apowers313" },
        commits: {
            nodes: [
                {
                    commit: {
                        committedDate: "2026-10-02T14:00:00Z",
                        statusCheckRollup: {
                            contexts: { nodes: [run("All Checks Pass", "SUCCESS"), run("Lint PR Title", "SUCCESS")] },
                        },
                    },
                },
            ],
        },
        detail: { commits: { messages: ["fix(graphty-element): trim edges"] }, files: ["graphty-element/src/Edge.ts"] },
        ...over,
    };
}

const withChecks = (n, contexts) => {
    n.commits.nodes[0].commit.statusCheckRollup.contexts.nodes = contexts;
    return n;
};

/**
 * Runs polls in order and returns the records after the last one.
 * @param {...any[]} rounds the nodes of each poll
 * @returns {Record<string, any>} the records
 */
function polls(...rounds) {
    let saved = {};
    for (const nodes of rounds) saved = updatePrs(saved, nodes, GREEN, config, NOW);
    return saved;
}

const stuck = (rec, ctx = {}) =>
    whyStuck(704, rec, { master: GREEN, config, now: Date.parse(NOW), login: "apowers313", ...ctx });

describe("mergeability", () => {
    it("UNKNOWN never changes state", () => {
        const one = polls([node({ mergeable: "CONFLICTING" })])["704"];
        const after = updatePrs({ 704: one }, [node({ mergeable: "UNKNOWN", detail: undefined })], GREEN, config, NOW);
        expect(after["704"].mergeable).toBe("CONFLICTING");
        expect(after["704"].conflictSightings).toBe(1);
        expect(stuck(after["704"])).toEqual(stuck(one));
        const fresh = polls([node({ mergeable: "UNKNOWN" })])["704"];
        expect(fresh.mergeable).toBeNull();
        expect(fresh.conflictSightings).toBe(0);
    });

    it("needs two CONFLICTING sightings, and MERGEABLE clears them", () => {
        const c = node({ mergeable: "CONFLICTING" });
        expect(stuck(polls([c])["704"])).not.toContain("conflicting");
        expect(stuck(polls([c], [c])["704"])).toContain("conflicting");
        expect(polls([c], [node()], [c])["704"].conflictSightings).toBe(1);
        expect(polls([c], [node({ mergeable: "UNKNOWN" })], [c])["704"].conflictSightings).toBe(2);
    });

    it("a new head starts the count again", () => {
        const c = node({ mergeable: "CONFLICTING" });
        expect(polls([c], [c], [node({ mergeable: "CONFLICTING", headRefOid: "h2" })])["704"].conflictSightings).toBe(
            1,
        );
    });

    it("the #519 shape (auto-merge on, checks green) is conflicting", () => {
        const n519 = node({
            number: 519,
            mergeable: "CONFLICTING",
            headRefOid: "926098474",
            autoMergeRequest: { mergeMethod: "MERGE" },
        });
        const rec = polls([n519], [n519])["519"];
        expect(rec.autoMerge).toBe(true);
        expect(whyStuck(519, rec, { master: GREEN, config, now: Date.parse(NOW) })).toEqual([
            "conflicting",
            "native auto-merge armed: bypasses githerd/merge",
        ]);
    });

    it("the #490 shape (auto-merge on, a non-required check failing) is conflicting", () => {
        const n490 = withChecks(node({ number: 490, mergeable: "CONFLICTING", headRefOid: "3deb7009c" }), [
            run("All Checks Pass", "SUCCESS"),
            run("Lint PR Title", "SUCCESS"),
            run("Test (d3d12 on windows-latest)", "FAILURE"),
        ]);
        const rec = polls([n490], [n490])["490"];
        expect(rec.failingChecks).toEqual(["Test (d3d12 on windows-latest)"]);
        expect(whyStuck(490, rec, { master: GREEN, config, now: Date.parse(NOW) })).toEqual(["conflicting"]);
    });

    it("reads the recorded GraphQL answer", () => {
        const nodes = recorded();
        const recs = polls(nodes, nodes);
        expect(recs["409"].conflictSightings).toBe(2);
        expect(recs["409"].required).toEqual({ "All Checks Pass": "MISSING", "Lint PR Title": "MISSING" });
        expect(recs["710"].mergeable).toBe("MERGEABLE");
        expect(recs["710"].required["Lint PR Title"]).toBe("SUCCESS");
    });
});

describe("decideBreaking", () => {
    it("is true for a feat(x)!: title", () => {
        expect(decideBreaking("feat(x)!: drop the old api", ["feat(x): add"], false)).toBe(true);
        expect(decideBreaking("feat!: drop", [], false)).toBe(true);
    });

    it("is true for a fix(y)!: commit subject under a plain title", () => {
        expect(decideBreaking("fix(y): tidy", ["chore: a", "fix(y)!: rename the option\n\nbody"], false)).toBe(true);
    });

    it("is true for BREAKING CHANGE and BREAKING-CHANGE footers", () => {
        expect(decideBreaking("fix: a", ["fix: a\n\nBREAKING CHANGE: the option is gone"], false)).toBe(true);
        expect(decideBreaking("fix: a", ["fix: a\n\nBREAKING-CHANGE: the option is gone"], false)).toBe(true);
    });

    it("is true for a list cut off at 250 commits", () => {
        const many = Array.from({ length: 250 }, (_, i) => `fix: commit ${i}`);
        expect(decideBreaking("fix: big", many, true)).toBe(true);
        expect(decideBreaking("fix: big", many, false)).toBe(false);
    });

    it("is false otherwise, and a ! in the body is not a subject", () => {
        expect(decideBreaking("fix(y): tidy", ["fix(y): tidy\n\nfeat!: not a subject"], false)).toBe(false);
    });
});

describe("breaking records", () => {
    it("a head not yet checked counts as breaking", () => {
        const rec = polls([node({ detail: undefined })])["704"];
        expect(rec.breakingCheckedFor).toBeNull();
        expect(countsAsBreaking(rec)).toBe(true);
        expect(stuck(rec)).toContain("breaking: held for a grouped major");
    });

    it("keeps a decision for the same head and drops it for a new one", () => {
        const checked = polls([node()], [node({ detail: undefined })])["704"];
        expect(countsAsBreaking(checked)).toBe(false);
        const moved = polls([node()], [node({ headRefOid: "h2", detail: undefined })])["704"];
        expect(countsAsBreaking(moved)).toBe(true);
    });

    it("a retitle to x!: is breaking at once", () => {
        const rec = polls([node()], [node({ title: "fix(y)!: rename", detail: undefined })])["704"];
        expect(rec.breaking).toBe(true);
    });
});

describe("files", () => {
    it("matches directory prefixes and exact files", () => {
        expect(touches(["githerd/lib/a.mjs"], ["githerd/"])).toBe(true);
        expect(touches(["githerd.config.json"], ["githerd.config.json"])).toBe(true);
        expect(touches(["githerd.config.json.bak", "githerdx/a"], ["githerd.config.json", "githerd/"])).toBe(false);
    });

    it("sets touchesProtected and touchesNoAutoMerge from the head's files", () => {
        const rec = polls([node({ detail: { commits: { messages: [] }, files: ["visual-baselines/a.png"] } })])["704"];
        expect(rec.touchesProtected).toBe(true);
        expect(rec.touchesNoAutoMerge).toBe(false);
        const ci = polls([node({ detail: { commits: { messages: [] }, files: [".github/workflows/ci.yml"] } })])["704"];
        expect(ci.touchesNoAutoMerge).toBe(true);
        expect(stuck(ci)).toEqual(["owner merges: touches githerd or CI config"]);
    });
});

describe("checks", () => {
    const failingGate = () =>
        withChecks(node(), [
            run("All Checks Pass", "FAILURE"),
            run("Lint PR Title", "SUCCESS"),
            run("Build", "SUCCESS"),
        ]);

    it("a required check failing is reported by name", () => {
        const rec = polls([failingGate()])["704"];
        expect(rec.required["All Checks Pass"]).toBe("FAILURE");
        expect(stuck(rec)).toEqual(["required check failing: All Checks Pass"]);
    });

    it("pending and missing required checks are pending; status contexts count", () => {
        const n = withChecks(node(), [
            run("All Checks Pass", null),
            { __typename: "StatusContext", context: "Lint PR Title", state: "SUCCESS" },
        ]);
        expect(stuck(polls([n])["704"])).toEqual(["checks pending"]);
        const failed = withChecks(node(), [
            run("All Checks Pass", "SUCCESS"),
            { __typename: "StatusContext", context: "Lint PR Title", state: "ERROR" },
        ]);
        expect(polls([failed])["704"].required["Lint PR Title"]).toBe("FAILURE");
        expect(stuck(polls([withChecks(node(), [])])["704"])).toEqual(["checks pending"]);
    });

    it("a re-run reported twice takes the worse answer", () => {
        const n = withChecks(node(), [
            run("All Checks Pass", "SUCCESS"),
            run("All Checks Pass", "FAILURE"),
            run("Lint PR Title", "SUCCESS"),
        ]);
        expect(polls([n])["704"].required["All Checks Pass"]).toBe("FAILURE");
    });

    it("the owner gate: the only failing required check failed at the visual step", () => {
        const n = failingGate();
        n.detail.failedSteps = ["Check visual changes were accepted"];
        const rec = polls([n])["704"];
        expect(rec.ownerGate).toBe(true);
        expect(stuck(rec)).toEqual(["waiting on owner: visual review"]);
        // kept for the same head without new detail, dropped for a new head
        expect(polls([n], [{ ...failingGate(), detail: undefined }])["704"].ownerGate).toBe(true);
        expect(polls([n], [{ ...failingGate(), headRefOid: "h2", detail: undefined }])["704"].ownerGate).toBe(false);
        const other = failingGate();
        other.detail.failedSteps = ["Run tests"];
        expect(polls([other])["704"].ownerGate).toBe(false);
    });

    it("a reject block newer than the head sets ownerRejected", () => {
        const n = failingGate();
        n.detail.failedSteps = ["Check visual changes were accepted"];
        const block = 'Rejected.\n<!-- visual-review-rejects {"items":[]} -->';
        n.detail.comments = [{ body: block, createdAt: "2026-10-02T13:00:00Z" }];
        expect(polls([n])["704"].ownerRejected).toBe(false);
        n.detail.comments.push({ body: "looks fine", createdAt: "2026-10-02T15:00:00Z" });
        expect(polls([n])["704"].ownerRejected).toBe(false);
        n.detail.comments.push({ body: block, createdAt: "2026-10-02T15:30:00Z" });
        const rec = polls([n])["704"];
        expect(rec.ownerRejected).toBe(true);
        expect(stuck(rec)).toEqual(["owner rejected images: fix needed"]);
    });

    it("a failure whose run started before the master fix says so", () => {
        const n = withChecks(node(), [
            run("All Checks Pass", "FAILURE", { startedAt: "2026-10-02T12:00:00Z" }),
            run("Lint PR Title", "SUCCESS"),
        ]);
        const rec = polls([n])["704"];
        const fixed = { ...GREEN, fixedAt: "2026-10-02T13:00:00Z" };
        expect(stuck(rec, { master: fixed })).toContain("failure predates master fix");
        expect(stuck(rec, { master: { ...GREEN, fixedAt: "2026-10-02T11:00:00Z" } })).not.toContain(
            "failure predates master fix",
        );
    });
});

describe("whyStuck", () => {
    it("nothing holds a clean PR", () => {
        expect(stuck(polls([node()])["704"])).toEqual([]);
    });

    it("draft", () => {
        expect(stuck(polls([node({ isDraft: true })])["704"])).toContain("draft");
    });

    it("shows the githerd/merge failure, not a repository-wide master hold", () => {
        const rec = polls([node()])["704"];
        expect(stuck(rec, { master: { ...GREEN, verdict: "red" } })).toEqual([]);
        rec.mergeStatus = { state: "failure", description: "held: GPU lane red since 10-01 15:37 UTC", line: 2 };
        expect(stuck(rec)).toEqual(["held: GPU lane red since 10-01 15:37 UTC"]);
        rec.mergeStatus = { state: "pending", description: "githerd is evaluating", line: null };
        expect(stuck(rec)).toEqual([]);
    });

    it("stacked on the PR whose head is its base, or on a branch", () => {
        const lower = node({ number: 700, headRefName: "feat/base", headRefOid: "b1" });
        const upper = node({ baseRefName: "feat/base" });
        const recs = polls([lower, upper]);
        expect(recs["704"].stackedOn).toBe(700);
        expect(stuck(recs["704"])).toContain("stacked: waiting on #700");
        expect(stuck(polls([upper])["704"])).toContain("stacked: waiting on branch feat/base");
    });

    it("names native auto-merge, which bypasses githerd/merge, whenever it is armed", () => {
        expect(stuck(polls([node()])["704"])).toEqual([]);
        const armed = polls([node({ autoMergeRequest: { mergeMethod: "MERGE" } })])["704"];
        expect(stuck(armed)).toEqual(["native auto-merge armed: bypasses githerd/merge"]);
    });

    it("claimed by a live claim", () => {
        const rec = polls([node()])["704"];
        const claims = { "pr:704": { holder: "githerd-1", holderName: "graphty-monorepo-bc" } };
        expect(stuck(rec, { claims })).toEqual(["claimed by graphty-monorepo-bc"]);
        expect(stuck(rec, { claims: { "pr:704": { holder: "githerd-1" } } })).toEqual(["claimed by githerd-1"]);
    });

    it("a live session on the PR's branch shows worked by session", () => {
        const rec = polls([node()])["704"];
        const sessions = { "githerd-2463873": { branch: "fix/x" }, "githerd-9": { branch: "feat/other" } };
        expect(stuck(rec, { sessions })).toEqual(["worked by session githerd-2463873"]);
        expect(stuck(rec, { sessions: { s: { branch: "fix/x", name: "bc" } } })).toEqual(["worked by session bc"]);
    });

    it("stale after staleDays with no activity", () => {
        const rec = polls([node({ updatedAt: "2026-09-10T15:00:00Z" })])["704"];
        expect(stuck(rec)).toEqual(["stale: no activity for 22 days"]);
        expect(stuck(polls([node({ updatedAt: "2026-09-20T15:00:00Z" })])["704"])).toEqual([]);
    });

    it("reports every reason in the design's order", () => {
        const n = withChecks(
            node({ isDraft: true, mergeable: "CONFLICTING", baseRefName: "feat/base", detail: undefined }),
            [run("All Checks Pass", "FAILURE"), run("Lint PR Title", null)],
        );
        const rec = polls([n], [n])["704"];
        rec.touchesNoAutoMerge = true;
        rec.autoMerge = true;
        rec.mergeStatus = { state: "failure", description: "held: CI lane red since 10-01 15:37 UTC", line: 2 };
        expect(stuck(rec, { sessions: { s: { branch: "fix/x" } } })).toEqual([
            "draft",
            "held: CI lane red since 10-01 15:37 UTC",
            "conflicting",
            "breaking: held for a grouped major",
            "stacked: waiting on branch feat/base",
            "required check failing: All Checks Pass",
            "native auto-merge armed: bypasses githerd/merge",
            "owner merges: touches githerd or CI config",
            "checks pending",
            "worked by session s",
        ]);
    });
});
