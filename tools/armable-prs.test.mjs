import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { armable, lines } from "./armable-prs.mjs";

const pr = (number, extra = {}) => ({
    number,
    createdAt: `2026-11-${String(10 + number).padStart(2, "0")}T00:00:00Z`,
    isDraft: false,
    mergeStateStatus: "CLEAN",
    author: { __typename: "User", login: "graphty-agent" },
    autoMergeRequest: null,
    commits: { nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }] },
    history: { nodes: [{ commit: { message: "fix(tools): x" } }] },
    timelineItems: { nodes: [] },
    closingIssuesReferences: { nodes: [{ number: 100 + number, labels: { nodes: [{ name: "priority:low" }] } }] },
    files: { nodes: [{ path: "tools/issue-groups.mjs" }] },
    ...extra,
});
const prio = (p) => ({
    closingIssuesReferences: { nodes: [{ number: 1, labels: { nodes: [{ name: `priority:${p}` }] } }] },
});

describe("armable", () => {
    it("offers green, clean, unarmed agent pull requests, critical first, then oldest", () => {
        const r = armable([
            pr(1),
            pr(2, prio("high")),
            pr(3, prio("critical")),
            pr(4, prio("high")),
            pr(5, { autoMergeRequest: { enabledAt: "x" } }),
            pr(6, { mergeStateStatus: "BLOCKED" }),
            pr(7, { commits: { nodes: [{ commit: { statusCheckRollup: { state: "FAILURE" } } }] } }),
            pr(8, { author: { __typename: "User", login: "apowers313" } }),
            pr(9, { isDraft: true }),
            pr(10, { timelineItems: { nodes: [{ actor: { login: "graphty-agent" } }] } }),
        ]);
        assert.deepEqual(
            r.armable.map((x) => [x.number, x.priority]),
            [
                [3, "critical"],
                [2, "high"],
                [4, "high"],
                [1, "low"],
            ],
            "any disable is a hold, graphty-agent's too (a send-back for changes)",
        );
        assert.match(lines(r)[0], /^armable: #3 critical, #2 high/);
    });

    it("leaves for the owner one turned off, one writing his approvals, one guarding him and one breaking", () => {
        const r = armable([
            pr(1, { timelineItems: { nodes: [{ actor: { login: "apowers313" } }] } }),
            pr(2, { files: { nodes: [{ path: "visual-review/passkeys.json" }] } }),
            pr(3, { history: { nodes: [{ commit: { message: "feat(x)!: y" } }] } }),
            pr(4, { files: { nodes: [{ path: "tools/pr-integrity.mjs" }] } }),
            pr(5, { changedFiles: 101 }),
        ]);
        assert.deepEqual(r.armable, []);
        assert.deepEqual(
            r.owner.map((x) => x.why),
            [
                "auto-merge turned off by apowers313",
                "writes visual-review/passkeys.json",
                "breaking commit",
                "guards the owner: tools/pr-integrity.mjs",
                "too large to check here",
            ],
        );
        assert.equal(lines(r)[0], "armable: none -- arm the first with gh pr merge <n> --auto --merge");
    });
});
