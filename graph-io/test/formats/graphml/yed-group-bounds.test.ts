/**
 * yEd keeps an open group's box round its members: it draws the group at the members' box grown by the group's
 * insets and, on top, by its top label's height, whatever box the file stores. The expected boxes are the ones yEd
 * 3.25 draws in the oracle drawings of the same files (graph-io/test/fidelity/oracles/).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { extractPositions } from "../../../src/positions/index.js";
import { createRegistry } from "../../../src/registry.js";
import { resolveStyles } from "../../../src/styles/internal.js";

const registry = createRegistry();
const SPECIMENS = resolve(import.meta.dirname, "../../fidelity/specimens");

/**
 * Each named node's drawn box: its center from the file's positions (y down) and its width and height from its styles.
 * @param format - the format
 * @param file - the specimen, under the specimens folder
 * @param ids - the nodes
 * @returns left, top, width and height of each
 */
async function drawnBoxes(format: "graphml" | "gml", file: string, ids: readonly (string | number)[]) {
    const result = await registry.importGraph(readFileSync(resolve(SPECIMENS, file)), { format, styles: {} });
    const { snapshot, report, styles } = result;
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    const coords = extractPositions(registry.importer(format), snapshot, report)?.coords ?? new Float64Array();
    const width = resolveStyles(styles, "node", "width", snapshot);
    const height = resolveStyles(styles, "node", "height", snapshot);
    return ids.map((id) => {
        const i = snapshot.ids.indexOf(id);
        const [w, h] = [Number(width[i]), Number(height[i])];
        return [coords[3 * i] - w / 2, -coords[3 * i + 1] - h / 2, w, h].map((v) => Math.round(v * 100) / 100);
    });
}

describe("yEd open groups", () => {
    it("draws a GraphML group round its members, its insets and its labels, nested groups first", async () => {
        const boxes = await drawnBoxes("graphml", "yed-graphml/specimen-groups.graphml", [
            "group-open",
            "group-closed",
            "group-label-bottom",
            "group-insets-30",
            "group-nested",
        ]);
        // yed-graphml-specimen-groups.svg: <rect x="123" y="95.8594" width="114" height="69.6406"/>; a closed group
        // keeps its stored box; the label at the bottom grows it down (<rect x="683" y="316.5" width="114"
        // height="69.6406"/>); <rect x="948" y="285.8594" width="144" height="99.6406"/>; the outer nested group
        // round the inner one's own box, <rect x="108" y="475.2188" width="144" height="115.2812"/>
        expect(boxes).toEqual([
            [123, 95.86, 114, 69.64],
            [420, 103.5, 80, 50],
            [683, 316.5, 114, 69.64],
            [948, 285.86, 144, 99.64],
            [108, 475.22, 144, 115.28],
        ]);
    });

    it("draws a GML group round its members, nested groups first, and keeps an empty one's box", async () => {
        const boxes = await drawnBoxes("gml", "gml/specimen-groups.gml", [4, 8, 10]);
        // gml-specimen-groups.svg: <rect x="104" y="178.3594" width="96" height="63.6406"/>, the empty group at its
        // stored 328,166 96 x 80, the nested one at <rect x="576" y="158.7188" width="79.2" height="103.2812"/>
        expect(boxes).toEqual([
            [104, 178.36, 96, 63.64],
            [328, 166, 96, 80],
            [576, 158.72, 79.2, 103.28],
        ]);
    });
});
