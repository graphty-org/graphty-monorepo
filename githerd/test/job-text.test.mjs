import { describe, expect, it } from "vitest";

import { newJob } from "../lib/board.mjs";
import { jobText, REVIEW_RUBRIC, RULES } from "../lib/job-text.mjs";
import { TOOLS } from "../lib/mcp.mjs";

const NOW = new Date("2026-10-04T12:00:00Z");

/** One job of every kind, as the queue would hold it. */
const JOBS = {
    "incident-master": {
        kind: "incident",
        target: "ci/build/security-audit",
        reason: "master red since 09:12",
        facts: { scope: "master" },
    },
    "incident-shared": { kind: "incident", target: "ci/test/graphty-element-browser-3", facts: { scope: "shared" } },
    "incident-release": { kind: "incident", target: "release half-state at 1a2b3c4", facts: { scope: "release" } },
    "incident-local": { kind: "incident", target: "gate: knip", facts: { scope: "local" } },
    "incident-verdict": {
        kind: "incident",
        target: "GPU / Test (NVIDIA T4) / Browser smoke on NVIDIA",
        reason: "master failed on no known pattern: is it the code or the environment?",
        facts: {
            scope: "verdict",
            lane: "gpu",
            runId: 37228458287,
            jobId: 111465235370,
            redSha: "7fd13ca".padEnd(40, "0"),
            greenSha: "1a2b3c4".padEnd(40, "0"),
        },
    },
    pr: { kind: "pr", target: "#412", reason: "own failure on the current head" },
    issue: { kind: "issue", target: "#737", reason: "high bug" },
    "issue-verify": {
        kind: "issue",
        target: "#906",
        reason: "referenced by 958d8e9c6 on master",
        facts: { references: ["958d8e9c6", "#550"] },
    },
    triage: { kind: "triage", target: "20 new issues since 2026-10-03" },
    "triage-refresh": {
        kind: "triage",
        target: "2 merges against 2 open issues",
        reason: "refresh pass after merges",
        facts: {
            scope: "refresh",
            batch: [5],
            merged: [
                {
                    number: 760,
                    title: "fix(layout): force step",
                    mergeSha: "a".repeat(40),
                    paths: ["layout/src/force.ts"],
                    truncated: false,
                    mentions: [5],
                },
                {
                    number: 761,
                    title: "feat: big",
                    mergeSha: "b".repeat(40),
                    paths: ["a.ts", "b.ts"],
                    truncated: true,
                    mentions: [],
                },
            ],
            open: [
                { number: 5, title: "force layout drifts" },
                { number: 9, title: "docs typo" },
            ],
        },
    },
    review: { kind: "review", target: "#760 at patch 9f8e7d" },
    title: { kind: "title", target: "#761" },
    major: { kind: "major", target: "graphty-element: #770 #771" },
};

describe("jobText", () => {
    for (const [name, spec] of Object.entries(JOBS)) {
        it(`writes the ${name} text`, async () => {
            await expect(jobText(newJob(spec, NOW))).toMatchFileSnapshot(`job-text/${name}.txt`);
        });
    }

    it("lists earlier attempts and live free-text policies, and starts from the evidence after two failures", async () => {
        const job = newJob(JOBS.issue, NOW);
        job.attempts = [
            {
                session: "a",
                endedAt: "x",
                outcome: "failed",
                findings: "the flake is in the camera tween",
                theory: "timer race",
            },
            { session: "b", endedAt: "y", outcome: "failed", findings: "", theory: null },
            { session: "c", endedAt: null },
        ];
        job.evidenceFirst = true;
        const text = jobText(job, {
            policies: [
                { text: "Do not touch layout/ this week." },
                { text: "an ended policy", endedAt: "z" },
                { switch: "freeze-merges" },
            ],
        });
        await expect(text).toMatchFileSnapshot("job-text/issue-later-attempt.txt");
        expect(text).not.toContain("an ended policy");
        expect(text).not.toContain("3.");
    });

    it("leaves the earlier-attempts and policies sections out of a first attempt", () => {
        const text = jobText(newJob(JOBS.pr, NOW), { policies: [] });
        expect(text).not.toContain("EARLIER ATTEMPTS");
        expect(text).not.toContain("OWNER POLICIES");
    });

    it("refuses a kind or an incident scope it has no text for", () => {
        expect(() => jobText({ kind: "chore", target: "x" })).toThrow("no job text for kind chore");
        expect(() => jobText(newJob({ kind: "incident", target: "k", facts: { scope: "moon" } }, NOW))).toThrow(
            "no done-condition for incident scope moon",
        );
    });

    it("gives the review rubric exactly the verdicts githerd_done accepts", () => {
        const done = TOOLS.find((t) => t.name === "githerd_done");
        const verdicts = JSON.stringify(done).match(/"enum":\["pass",[^\]]*\]/g);
        expect(verdicts).toEqual([`"enum":${JSON.stringify(REVIEW_RUBRIC.map(([v]) => v))}`]);
    });

    it("writes plain ASCII in lines a pane shows whole", () => {
        for (const spec of Object.values(JOBS)) {
            const text = jobText(newJob(spec, NOW), { policies: [{ text: "p" }] });
            expect(text).toMatch(/^[\x20-\x7e\n]*$/);
        }
        expect(RULES.join("")).not.toContain("ACTION NEEDED:");
    });
});
