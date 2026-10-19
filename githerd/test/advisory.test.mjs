import { describe, expect, it } from "vitest";

import { advisoryFailure, jobNames, promotionsDue, readAdvisory, utcDay, warningNow } from "../lib/advisory.mjs";

/** The shape of ci.yml's jobs: ids, display names (one a matrix name), and steps with names. */
const CI = `name: CI
on:
    push:
        branches: [master]
jobs:
    build:
        name: Build
        steps:
            - name: Lint
              run: pnpm lint
            - uses: actions/checkout@v4
              name: Checkout
    test:
        name: Test (\${{ matrix.shard }})
        strategy:
            matrix:
                shard: [a, b]
        steps:
            - name: Types
              run: tsc
    links:
        name: "Links"
        steps:
            - run: ./tools/check-links.sh
    unnamed:
        runs-on: ubuntu-24.04
`;

const entry = (job, step, enforce, issue = 1120) => ({ job, step, added: "2026-10-01", enforce, issue });
const REGISTRY = JSON.stringify({
    required: { build: ["Lint"] },
    advisory: [entry("links", undefined, "2026-10-15"), entry("test", "Types", "2026-10-08")],
});

describe("advisory checks", () => {
    it("names each job's check runs from ci.yml, a matrix name matching every shard", () => {
        const names = jobNames(CI);
        expect(Object.keys(names)).toEqual(["build", "test", "links", "unnamed"]);
        expect(new RegExp(names.test).test("Test (graphty-element-browser-1)")).toBe(true);
        expect(new RegExp(names.test).test("Build")).toBe(false);
        expect(new RegExp(names.links).test("Links")).toBe(true);
        expect(new RegExp(names.unnamed).test("unnamed")).toBe(true);
        // A step's name never renames its job.
        expect(new RegExp(names.build).test("Build")).toBe(true);
    });

    it("lists the entries before their enforce date, and nothing without the file", () => {
        const adv = readAdvisory(REGISTRY, CI);
        expect(adv.entries.map((e) => e.id)).toEqual(["links", "test/Types"]);
        expect(warningNow(adv, "2026-10-07").map((e) => e.id)).toEqual(["links", "test/Types"]);
        // On the enforce date the check is required, as the CI's own `enforce > today` says.
        expect(warningNow(adv, "2026-10-08").map((e) => e.id)).toEqual(["links"]);
        expect(readAdvisory(null, CI).entries).toEqual([]);
        expect(readAdvisory("not json", CI).entries).toEqual([]);
        expect(utcDay(Date.parse("2026-10-07T23:59:59Z"))).toBe("2026-10-07");
    });

    it("asks for a promotion from three days before the enforce date (tools/ci-workflows.test.mjs)", () => {
        const adv = readAdvisory(REGISTRY, CI);
        expect(promotionsDue(adv, "2026-10-04")).toEqual([]);
        expect(promotionsDue(adv, "2026-10-05").map((e) => e.id)).toEqual(["test/Types"]);
        expect(promotionsDue(adv, "2026-10-12").map((e) => e.id)).toEqual(["links", "test/Types"]);
    });

    it("reads a failed job as advisory by its whole-job entry, or when every failed step is one", () => {
        const adv = readAdvisory(REGISTRY, CI);
        const today = "2026-10-05";
        expect(advisoryFailure(adv, today, { job: "Links" })?.map((e) => e.id)).toEqual(["links"]);
        expect(advisoryFailure(adv, today, { job: "Test (a)", steps: ["Types"] })?.map((e) => e.id)).toEqual([
            "test/Types",
        ]);
        // Another step failed too, or the steps are unknown: the failure counts.
        expect(advisoryFailure(adv, today, { job: "Test (a)", steps: ["Types", "Unit"] })).toBeNull();
        expect(advisoryFailure(adv, today, { job: "Test (a)" })).toBeNull();
        expect(advisoryFailure(adv, today, { job: "Build", steps: ["Lint"] })).toBeNull();
        // Past the enforce date it counts as usual.
        expect(advisoryFailure(adv, "2026-10-15", { job: "Links" })).toBeNull();
        expect(advisoryFailure(null, today, { job: "Links" })).toBeNull();
    });
});
