/**
 * scripts/bench-groups.js: the GPU lane's paired benchmark runs only the groups a pull request can move. These tests
 * hold the selection to its fail-safe rule on the real source tree, so a refactor that hides a file from the import
 * scan fails here instead of silently skipping a benchmark.
 */
import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
    AFFECTS_EVERY_GROUP,
    declaredGroups,
    groupFileSets,
    kernelModules,
    PAIRED_PASSES,
    PAIRED_TIMEOUT_CAP,
    pairedTimeoutMinutes,
    PASS_SECONDS,
    selectGroups,
    srcFiles,
} from "../scripts/bench-groups.js";

const sets = groupFileSets();
const ALL = [...sets.keys()];
const changed = (...files: string[]): string[] => files.map((f) => `webgpu-graph-algorithms/${f}`);

describe("bench-groups", () => {
    it("reads every group benchmarks/run.ts declares", () => {
        expect(ALL).toEqual(declaredGroups().map((g) => g.name));
        expect(ALL).toContain("pagerank");
        expect(ALL).toContain("layout-exact");
    });

    it("gives every group a non-empty file set", () => {
        for (const [group, files] of sets) {
            expect(files.size, group).toBeGreaterThan(0);
        }
    });

    it("places every file under src/ in a group's set or in the affects-every-group list", () => {
        const placed = new Set([...sets.values()].flatMap((s) => [...s]));
        const unplaced = srcFiles().filter((f) => !placed.has(f) && !AFFECTS_EVERY_GROUP.includes(f));
        expect(unplaced, "reach these from a benchmark or list them in AFFECTS_EVERY_GROUP").toEqual([]);
    });

    it("lists only files that exist", () => {
        const files = new Set(srcFiles());
        expect(AFFECTS_EVERY_GROUP.filter((f) => !files.has(f))).toEqual([]);
    });

    it("maps every WGSL module to a kernel id of the registry", () => {
        const mapped = new Set(
            [...kernelModules().values()].flat().map((f) => f.replace(/\\/g, "/").split("/src/")[1]),
        );
        const modules = readdirSync(new URL("../src/wgsl", import.meta.url)).map((f) => `wgsl/${f}`);
        expect(modules.filter((m) => !mapped.has(m))).toEqual([]);
    });

    it("selects every group that imports a shared primitive", () => {
        const importers = ALL.filter((g) => sets.get(g)?.has("src/primitives/radix-sort.ts"));
        expect(importers.length).toBeGreaterThan(1);
        expect(selectGroups(changed("src/primitives/radix-sort.ts"), sets).groups).toEqual(importers);
    });

    it("selects only the group of one algorithm's own file and its kernel", () => {
        expect(selectGroups(changed("src/algorithms/pagerank.ts"), sets).groups).toEqual(["pagerank"]);
        expect(selectGroups(changed("src/algorithms/components.ts"), sets).groups).not.toContain("pagerank");
        expect(selectGroups(changed("src/wgsl/apsp-fw.wgsl.ts"), sets).groups).toEqual(["apsp"]);
    });

    it("selects every group for an unplaceable file or a listed one", () => {
        expect(selectGroups(changed("src/algorithms/not-yet-written.ts"), sets).groups).toEqual(ALL);
        expect(selectGroups(changed("src/device/acquire.ts"), sets).groups).toEqual(ALL);
    });

    it("selects nothing for a change outside src/", () => {
        expect(
            selectGroups(["webgpu-graph-algorithms/README.md", "graphty-element/src/Graph.ts"], sets).groups,
        ).toEqual([]);
        expect(selectGroups(changed("benchmarks/harness.ts"), sets).groups).toEqual([]);
    });

    describe("the paired step's timeout", () => {
        it("has a measured pass time for exactly the declared groups", () => {
            expect(Object.keys(PASS_SECONDS).sort()).toEqual([...ALL].sort());
        });

        it("fits one full paired run, unpadded, under the cap given for every group", () => {
            const full = Object.values(PASS_SECONDS).reduce((a, b) => a + b, 0);
            // 8 x 528 s = 70.4 minutes, plus the base build's measured minute
            expect(Math.ceil((PAIRED_PASSES * full) / 60) + 1).toBeLessThanOrEqual(PAIRED_TIMEOUT_CAP);
            expect(pairedTimeoutMinutes(["all"])).toBe(PAIRED_TIMEOUT_CAP);
        });

        it("scales with the selected groups' pass time, between 10 minutes and the cap", () => {
            expect(pairedTimeoutMinutes(["mst"])).toBe(10);
            // 8 x 188 s x 1.5 = 37.6 -> 38, + 2 for the base build
            expect(pairedTimeoutMinutes(["betweenness"])).toBe(40);
            // the three slowest: 364 s a pass, 48.5 minutes for 8 even unpadded, which a flat 40 could not hold
            expect(pairedTimeoutMinutes(["attraction-scale", "betweenness", "label-propagation"])).toBe(
                PAIRED_TIMEOUT_CAP,
            );
        });

        it("gives PR #1189's 13-group selection the cap, not 40 (run 37451823822 timed out after 5 of 8 passes)", () => {
            expect(pairedTimeoutMinutes(ALL.filter((g) => g !== "upload"))).toBe(PAIRED_TIMEOUT_CAP);
        });

        it("assumes an untimed group is the slowest", () => {
            expect(pairedTimeoutMinutes(["not-yet-timed"])).toBe(pairedTimeoutMinutes(["betweenness"]));
        });
    });
});
