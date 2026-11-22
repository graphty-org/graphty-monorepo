/**
 * vis-network's file samples carry vis-network's own account of where it drew each node (`drawn` in the oracle,
 * written by oracles/tools/web/web-oracle.mjs). Without it the comparator names nodes by their shapes alone, and
 * where vis-network draws nodes over each other (json-vis-nodelegend's legend) it reads the wrong shape as a node.
 * json-vis-synth is not listed yet: drawn again today, its SVG gains vis-network's drop shadows and kept blanks, so
 * it waits until that new drawing is accepted on its own.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const oracles = join(dirname(fileURLToPath(import.meta.url)), "oracles");

describe("vis-network's file oracles", () => {
    it("record where vis-network drew every node", () => {
        const ids = [
            "json-vis-lesmiserables",
            "json-vis-nodelegend",
            "json-vis-siblings",
            "json-vis-transparency",
            "json-vis-unix",
            "json-vis-world",
        ];
        for (const id of ids) {
            const meta = JSON.parse(readFileSync(join(oracles, `${id}.oracle.json`), "utf8")) as {
                observed: { nodes: number };
                drawn?: { nodes: { box?: unknown }[] };
            };
            assert.strictEqual(meta.drawn?.nodes.length, meta.observed.nodes, `${id}: drawn nodes`);
            // the box's corners, not only its size: a label drawn below the shape puts it off the center (#7402)
            assert.isTrue(
                meta.drawn?.nodes.every((n) => n.box !== undefined),
                `${id}: drawn boxes`,
            );
        }
    });
});
