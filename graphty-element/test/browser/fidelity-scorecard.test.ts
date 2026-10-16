/**
 * The style fidelity scorecard, browser tier: a few small fidelity files mounted in a real
 * `<graphty-element>` with their own styles, what it DREW read off the renderer, scored per
 * property against the scenes the source programs drew, and each score held to its floor in
 * `test/fidelity/drawn-floors.json`. It catches what the Node tier (`test/fidelity/scorecard.test.ts`)
 * cannot see because the right style was asked for: a node drawn under a pixel, a self-loop drawn
 * as nothing, a group box the source program never drew.
 *
 * The set is small on purpose, to stay inside a CI browser shard's budget under SwiftShader; the
 * whole corpus is drawn by `test/fidelity/fidelity.test.ts` by hand. After a fix, record the new
 * floors with
 *
 *     GRAPHTY_FIDELITY_RECORD=1 npx vitest run --project=browser test/browser/fidelity-scorecard.test.ts
 *
 * in graphty-element; an accepted drop goes in the file's `allowedDrops` with its reason.
 */
import { afterAll, afterEach, assert, describe, it } from "vitest";
import { commands } from "vitest/browser";

import { compareSample } from "../../../graph-io/test/fidelity/compare";
import { CORPUS_SAMPLES } from "../../../graph-io/test/fidelity/corpus-samples";
import { SAMPLES } from "../../../graph-io/test/fidelity/samples";
import { PROPERTIES } from "../../../graph-io/test/fidelity/scene";
import { drawnScene, mountSample, nodeKeys, readJson, referenceScenes, unmount } from "../fidelity/mount";

const FLOORS = "test/fidelity/drawn-floors.json";
const RECORD = (import.meta.env.GRAPHTY_FIDELITY_RECORD as string | undefined) === "1";
const EPSILON = 1e-9;

/**
 * The drawn set: small files, most at their stored positions, chosen for what only a drawing shows.
 * - gml-yed-pmodel, graphml-open-archaeo: stored geometry, shapes, borders, groups and bends.
 * - cx-repro-locked-own-size: per-node sizes under Cytoscape's size lock.
 * - gml-repro-groups-no-creator: nested yEd groups drawn as boxes.
 * - cys-import-and-save: 22 self-loops and parallel edges.
 * - xgmml-syn-bypass: expanded Cytoscape groups the source never draws as boxes.
 */
const DRAWN = [
    "gml-yed-pmodel",
    "graphml-open-archaeo",
    "cx-repro-locked-own-size",
    "gml-repro-groups-no-creator",
    "cys-import-and-save",
    "xgmml-syn-bypass",
];

interface Floors {
    about: string;
    floors: Record<string, Record<string, number>>;
    allowedDrops: Record<string, string>;
}

const stored = (await readJson<Floors>(FLOORS)) ?? { about: "", floors: {}, allowedDrops: {} };
const recorded: Floors["floors"] = {};
const all = [...SAMPLES, ...CORPUS_SAMPLES];

afterEach(() => {
    unmount();
});

describe("style fidelity scorecard: what graphty-element draws", () => {
    it.each(DRAWN)("%s", async (id) => {
        const sample = all.find((s) => s.id === id);
        assert.isDefined(sample, `${id} is not a fidelity sample`);
        const { element, sha256, command } = await mountSample(sample);
        const scene = drawnScene(element, sha256, command);
        const result = compareSample(id, await referenceScenes(sample), scene, nodeKeys(element));
        const scores: Record<string, number> = {};
        for (const p of PROPERTIES) {
            const rate = result.properties[p].passRate;
            if (rate !== null) {
                scores[p] = rate;
            }
        }
        recorded[id] = scores;
        if (RECORD) {
            return;
        }

        const floors = stored.floors[id] ?? {};
        const dropped = Object.entries(floors).flatMap(([p, floor]) => {
            const rate = scores[p];
            if ((rate !== undefined && rate >= floor - EPSILON) || `${id}/${p}` in stored.allowedDrops) {
                return [];
            }
            const worst = result.properties[p as keyof typeof result.properties].worst
                .slice(0, 3)
                .map((w) => `${w.id} (reference ${JSON.stringify(w.ref)}, drawn ${JSON.stringify(w.got)})`);
            return [
                `${id} ${p}: ${rate === undefined ? "no longer judged" : rate.toFixed(4)} < floor ${floor.toFixed(4)}; worst: ${worst.join("; ") || "none listed"}`,
            ];
        });
        assert.deepEqual(dropped, [], `${id}: a property fell below its floor in drawn-floors.json`);
        assert.deepEqual(
            Object.keys(scores).filter((p) => !(p in floors)),
            [],
            `${id}: a property is judged that has no floor; record the floors`,
        );
    });

    afterAll(async () => {
        if (RECORD) {
            await commands.writeFile(FLOORS, `${JSON.stringify({ ...stored, floors: recorded }, null, 4)}\n`);
        }
    });
});
