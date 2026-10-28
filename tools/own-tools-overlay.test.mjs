#!/usr/bin/env node
// One rule for every workflow job that checks out another commit than the workflow's own (a full run's candidate, a
// held head, a version commit, a bisect point, an older commit's site): before it runs anything from tools/ or a
// local action (.github/actions/), it overlays the workflow's own copies -- its step "Use the workflow's own tools
// and actions", git archive "$GITHUB_SHA" -- so a commit that predates a fix never runs the unfixed tool. The jobs
// that must run the checked-out commit's own tools/ are listed below with the reason.
// Run: node tools/own-tools-overlay.test.mjs (WORKFLOWS=<dir> checks another tree's workflows)
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const STEP = "Use the workflow's own tools and actions";

/** Jobs that overlay only .github/actions/: the checked-out commit's tools/ are what the job checks or bisects. */
export const OWN_TOOLS = {
    "ci.yml/lint": "lints the commit's own tools/ with its own eslint rules (tools/eslint-rules)",
    "ci.yml/checks": "runs the commit's tool tests and checks against its own workflows and packages",
    "ci.yml/docs": "builds the commit's docs with its own copy-docs-content.js and sanitize-api-docs.js",
    "base-check.yml/check": "the base's own tests are what is checked; master's tools run from $RUNNER_TEMP/trusted",
    "pr-integrity.yml/integrity":
        "a pull request is checked by its own head's pr-integrity.mjs, which takes master's trusted code itself",
    "bisect.yml/point":
        "the point's run-tests.sh and ci-test-matrix.mjs are what is bisected; bisect-ci.mjs runs from the workflow's copy",
};

/** Jobs left out entirely, each with the reason. */
export const EXEMPT = {
    "ci.yml/visual":
        "owner-guarded (CLAUDE.md: agents never edit the visual job); it runs no tools/ and only master-safe local actions",
};

// a checkout of the workflow's own commit, or of master's tip (the same tools or newer), needs no overlay
const OWN_REF = /^(\$\{\{ ?github\.sha ?\}\}|master|refs\/heads\/master)$/;

/**
 * The problems in one workflow.
 * @param file the workflow's file name
 * @param text its YAML
 * @returns one line per problem
 */
export function problems(file, text) {
    const out = [];
    for (const [id, job] of Object.entries(parse(text)?.jobs ?? {})) {
        const key = `${file}/${id}`;
        if (EXEMPT[key]) continue;
        const steps = job.steps ?? [];
        const co = steps.findIndex(
            (s) =>
                String(s.uses ?? "").startsWith("actions/checkout@") &&
                s.with?.ref &&
                !s.with?.path &&
                !OWN_REF.test(String(s.with.ref).trim()),
        );
        if (co < 0) continue;
        let overlay = null;
        for (const s of steps.slice(co + 1)) {
            if (s.name === STEP) {
                overlay = String(s.env?.OVERLAY ?? "").split(/\s+/);
                continue;
            }
            const action = String(s.uses ?? "").startsWith("./.github/actions/");
            const tools = /(^|[^\w.-])tools\//m.test(String(s.run ?? ""));
            if (action && !overlay?.includes(".github/actions"))
                out.push(`${key}: "${s.uses}" runs before the workflow's .github/actions/ are overlaid`);
            if (tools && !OWN_TOOLS[key] && !overlay?.includes("tools"))
                out.push(
                    `${key}: step "${s.name ?? s.run.split("\n")[0]}" runs tools/ before the workflow's are overlaid`,
                );
            if (action || tools) break; // the first use decides
        }
    }
    return out;
}

const dir = process.env.WORKFLOWS ?? fileURLToPath(new URL("../.github/workflows/", import.meta.url));
const all = () =>
    readdirSync(dir)
        .filter((f) => f.endsWith(".yml"))
        .flatMap((f) => problems(f, readFileSync(join(dir, f), "utf8")));

describe("jobs on another commit run the workflow's own tools and actions", () => {
    it("overlays them before their first use, in every workflow", () => {
        assert.deepEqual(all(), []);
    });

    it("finds a job that runs a candidate's tools/ without the overlay", () => {
        const yml = (steps) => `jobs:\n  j:\n    steps:\n${steps}`;
        const checkout = "      - uses: actions/checkout@v7\n        with: { ref: '${{ inputs.ref }}' }\n";
        assert.equal(problems("x.yml", yml(`${checkout}      - run: node tools/full-run.mjs pick\n`)).length, 1);
        assert.equal(problems("x.yml", yml(`${checkout}      - uses: ./.github/actions/timings\n`)).length, 1);
        const overlay = `      - name: ${STEP}\n        env: { OVERLAY: tools .github/actions }\n        run: true\n`;
        assert.deepEqual(
            problems("x.yml", yml(`${checkout}${overlay}      - run: node tools/full-run.mjs pick\n`)),
            [],
        );
        const own = "      - uses: actions/checkout@v7\n        with: { ref: master }\n";
        assert.deepEqual(problems("x.yml", yml(`${own}      - run: node tools/full-run.mjs pick\n`)), []);
    });

    it("names a reason for every job it lets run the commit's own tools/", () => {
        for (const [k, why] of Object.entries({ ...OWN_TOOLS, ...EXEMPT })) assert.ok(why.length > 20, k);
    });
});
