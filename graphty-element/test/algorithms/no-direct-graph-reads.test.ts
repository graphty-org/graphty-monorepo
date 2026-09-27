/**
 * @file A static guard: no file under `src/algorithms/` reads the graph around the input accessor
 * (design/sets/sets-design.md section 10.1). A direct `getDataManager()` or `getSnapshot()` call
 * reads the whole graph, whatever the run's scope, so a new one is refused unless it is listed
 * here with a reason.
 *
 * It is a secondary guard. Which algorithms compute over their scope is decided by each class's
 * `scopeInput` declaration at run time, and proved behaviourally, not by which file reads what.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { assert, describe, it } from "vitest";

const ROOT = join(__dirname, "../../src/algorithms");
const DIRECT_READ = /getDataManager\(\)|getSnapshot\(\)/;

/** Files that may read the graph directly for good, and why. */
const PERMANENT: Readonly<Record<string, string>> = {
    "Algorithm.ts": "a seam: it hands the data manager to the input accessor",
    "utils/snapshotGraph.ts": "a seam: it builds the object graph from the accessor's input and reads the store's undirected cache",
    "results/labels.ts": "reads node labels for a summary, not topology",
};

/**
 * Files still to move onto the input accessor. The list only shrinks: each entry must still read
 * the graph directly, so a migrated file is removed from it in the commit that migrates it.
 */
const TO_MIGRATE: readonly string[] = [
    "BellmanFordAlgorithm.ts",
    "BFSAlgorithm.ts",
    "BipartiteMatchingAlgorithm.ts",
    "DFSAlgorithm.ts",
    "DijkstraAlgorithm.ts",
    "EigenvectorCentralityAlgorithm.ts",
    "FloydWarshallAlgorithm.ts",
    "GirvanNewmanAlgorithm.ts",
    "KruskalAlgorithm.ts",
    "LabelPropagationAlgorithm.ts",
    "LeidenAlgorithm.ts",
    "LinkPredictionAlgorithm.ts",
    "LouvainAlgorithm.ts",
    "MaxFlowAlgorithm.ts",
    "MinCutAlgorithm.ts",
    "PrimAlgorithm.ts",
    "StronglyConnectedComponentsAlgorithm.ts",
    "utils/communityUtils.ts",
    "utils/graphUtils.ts",
];

/**
 * Every TypeScript file under a directory, relative to the algorithms root.
 * @param directory - The directory.
 * @returns The paths.
 */
function sources(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            return sources(path);
        }

        return entry.name.endsWith(".ts") ? [relative(ROOT, path)] : [];
    });
}

/** The files that read the graph directly today, outside the input accessor's own directory. */
const reading = sources(ROOT)
    .filter((path) => !path.startsWith("input/"))
    .filter((path) => DIRECT_READ.test(readFileSync(join(ROOT, path), "utf8")))
    .sort();

describe("no algorithm reads the graph around the input accessor", () => {
    it("no file outside the allowlist calls getDataManager() or getSnapshot()", () => {
        const allowed = new Set([...Object.keys(PERMANENT), ...TO_MIGRATE]);

        assert.deepStrictEqual(
            reading.filter((path) => !allowed.has(path)),
            [],
            "read the graph through Algorithm.input, or list the file with a reason",
        );
    });

    it("every file still to migrate still reads directly, so the list only shrinks", () => {
        assert.deepStrictEqual(
            TO_MIGRATE.filter((path) => !reading.includes(path)),
            [],
            "a migrated file comes off the list in the commit that migrates it",
        );
    });
});
