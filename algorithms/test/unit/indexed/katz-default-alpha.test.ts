import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { lesMiserables } from "@graphty/graph-samples/datasets/les-miserables";
import { describe, expect, it } from "vitest";

import { ConvergenceError } from "../../../src/errors.js";
import { katzAlpha, katzCentrality } from "../../../src/indexed/katz.js";
import { Graph } from "../../helpers/legacy-graph.js";
import { checksummedSnapshot } from "../../helpers/snapshot-differential.js";

// graph-samples' build output, the files graphty.app publishes, so the test downloads nothing.
const local = resolve(__dirname, "../../../../graph-samples/dist/data/v1");
const localFetch: typeof fetch = async (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    return new Response(await readFile(join(local, url.split("/").pop() ?? "")));
};

describe("katzCentrality's derived alpha", () => {
    it("converges on Les Miserables, where an alpha of 0.1 diverges", async () => {
        const s = await lesMiserables({ fetch: localFetch });
        expect(() => katzCentrality(s, { alpha: 0.1 })).toThrow(ConvergenceError);
        const r = katzCentrality(s);
        expect(r.converged).toBe(true);
        // Valjean co-appears with the most characters, so he has the top score
        expect(r.scores[s.ids.indexOf("Valjean")]).toBe(1);
    });

    it("keeps 0.1 where 0.1 is certain to converge, and an explicit alpha as given", () => {
        const g = new Graph({ directed: false });
        g.addEdge("a", "b");
        g.addEdge("b", "c");
        g.addEdge("c", "d");
        g.addEdge("d", "a");
        const s = checksummedSnapshot(g);
        expect(katzAlpha(s, {})).toBe(0.1);
        expect(katzAlpha(s, { alpha: 0.3 })).toBe(0.3);
        expect(katzCentrality(s, { normalized: false }).scores).toEqual(
            katzCentrality(s, { alpha: 0.1, normalized: false }).scores,
        );
    });
});
