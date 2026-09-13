import { describe, expect, it } from "vitest";

import {
    isAboveLargeGraphThreshold,
    LABEL_COUNT_MAX,
    LABEL_COUNT_MIN,
    labelCountFor,
    labelDegreeThreshold,
    LARGE_GRAPH_NODE_THRESHOLD,
    loadDefaults,
    PERFORMANCE_LABEL_COUNT,
    UNENCODED_NODE_COLOR,
} from "../loadDefaults";

describe("loadDefaults constants", () => {
    it("declares the threshold spec 7.2 and 7.3 both branch on", () => {
        expect(LARGE_GRAPH_NODE_THRESHOLD).toBe(100000);
    });

    it("declares the label clamp spec 7.2 names", () => {
        expect(LABEL_COUNT_MIN).toBe(5);
        expect(LABEL_COUNT_MAX).toBe(50);
        expect(PERFORMANCE_LABEL_COUNT).toBe(20);
    });

    /* The colour an unencoded node actually carries, which is the ELEMENT's own default
       (graphty-element/src/config/NodeStyle.ts:90) rather than a colour the shell paints.
       The shell stopped painting one on 2026-09-13; the constant survives only so the
       legend's Other swatch can match what a reader sees. */
    it("declares the colour an unencoded node actually carries", () => {
        expect(UNENCODED_NODE_COLOR).toBe("#6366F1");
    });
});

describe("isAboveLargeGraphThreshold", () => {
    it("is false at the threshold itself", () => {
        expect(isAboveLargeGraphThreshold(LARGE_GRAPH_NODE_THRESHOLD)).toBe(false);
    });

    it("is false one node below the threshold", () => {
        expect(isAboveLargeGraphThreshold(LARGE_GRAPH_NODE_THRESHOLD - 1)).toBe(false);
    });

    it("is true one node above the threshold", () => {
        expect(isAboveLargeGraphThreshold(LARGE_GRAPH_NODE_THRESHOLD + 1)).toBe(true);
    });

    it("is false on an empty graph", () => {
        expect(isAboveLargeGraphThreshold(0)).toBe(false);
    });
});

describe("labelCountFor", () => {
    it("floors at 5 on the cat fixture, whose sqrt rounds to 4", () => {
        expect(labelCountFor(20)).toBe(5);
    });

    it("floors at 5 on a graph smaller than the floor implies", () => {
        expect(labelCountFor(10)).toBe(5);
    });

    it("takes the rounded square root between the floor and the ceiling", () => {
        expect(labelCountFor(100)).toBe(10);
    });

    it("rounds rather than truncates", () => {
        // sqrt(110) is 10.488, which rounds to 10; sqrt(132) is 11.489, which rounds to 11.
        expect(labelCountFor(110)).toBe(10);
        expect(labelCountFor(132)).toBe(11);
    });

    it("caps at 50 below the threshold", () => {
        expect(labelCountFor(4000)).toBe(50);
    });

    it("still caps at 50 immediately below the threshold", () => {
        expect(labelCountFor(LARGE_GRAPH_NODE_THRESHOLD)).toBe(LABEL_COUNT_MAX);
    });

    it("drops to the Performance budget above the threshold", () => {
        expect(labelCountFor(200000)).toBe(20);
        expect(labelCountFor(LARGE_GRAPH_NODE_THRESHOLD + 1)).toBe(PERFORMANCE_LABEL_COUNT);
    });

    it("floors at 5 on an empty graph rather than returning 0", () => {
        expect(labelCountFor(0)).toBe(LABEL_COUNT_MIN);
    });
});

describe("labelDegreeThreshold", () => {
    it("cuts at the labelCount-th degree", () => {
        expect(labelDegreeThreshold([4, 4, 4, 3, 3, 2], 5)).toBe(3);
    });

    it("returns undefined when there is nothing to label", () => {
        expect(labelDegreeThreshold([], 5)).toBeUndefined();
    });

    it("cuts at the last degree when the budget exceeds the graph", () => {
        expect(labelDegreeThreshold([9, 5, 1], 50)).toBe(1);
    });

    it("keeps ties, so the cut degree may cover more nodes than the budget", () => {
        // Three labels asked for, cut degree 4, and five nodes share it: the selector
        // matches six nodes, not three. The tie is kept rather than two of the fours
        // being dropped for sharing a degree with a four that was kept.
        const degrees = [7, 4, 4, 4, 4, 4, 1];
        const cut = labelDegreeThreshold(degrees, 3);

        expect(cut).toBe(4);
        expect(degrees.filter((degree) => degree >= (cut ?? 0))).toHaveLength(6);
    });

    it("returns undefined for a budget of zero or less", () => {
        expect(labelDegreeThreshold([4, 3], 0)).toBeUndefined();
        expect(labelDegreeThreshold([4, 3], -1)).toBeUndefined();
    });
});

describe("loadDefaults below the threshold", () => {
    const defaults = loadDefaults({ nodeCount: 20 });

    it("does not take the Performance branch", () => {
        expect(defaults.aboveThreshold).toBe(false);
    });

    it("picks ngraph with no config", () => {
        expect(defaults.layout).toEqual({ type: "ngraph", config: {} });
    });

    it("labels the clamped top-N", () => {
        expect(defaults.labelCount).toBe(labelCountFor(20));
    });

    /* Node colour and size are NOT decided here any more. 7.2 asks for a neutral colour
       and size by degree, and both were reverted on 2026-09-13: the element's own default
       layer carries hand-tuned node and edge values, and these overrode them from the
       first frame -- the size curve worst of all, landing every node on the cat fixture
       between 3.12x and 4.00x the base. See the note on the apply block in AppShell. */
    it("decides no node colour and no node size", () => {
        expect("neutralColor" in defaults).toBe(false);
        expect("sizeByDegree" in defaults).toBe(false);
    });

    it("ignores complete positions below the threshold", () => {
        expect(loadDefaults({ nodeCount: 20, hasPositionsForEveryNode: true }).layout).toEqual({
            type: "ngraph",
            config: {},
        });
    });
});

describe("loadDefaults above the threshold", () => {
    const nodeCount = LARGE_GRAPH_NODE_THRESHOLD + 1;

    it("takes the Performance branch", () => {
        expect(loadDefaults({ nodeCount }).aboveThreshold).toBe(true);
    });

    it("falls back to Random with a fixed seed, the spec's own named fallback", () => {
        expect(loadDefaults({ nodeCount }).layout).toEqual({ type: "random", config: { seed: 1 } });
    });

    it("falls back to Random when positions are declared incomplete", () => {
        expect(loadDefaults({ nodeCount, hasPositionsForEveryNode: false }).layout).toEqual({
            type: "random",
            config: { seed: 1 },
        });
    });

    it("picks Fixed when the file carried a position for every node", () => {
        expect(loadDefaults({ nodeCount, hasPositionsForEveryNode: true }).layout).toEqual({
            type: "fixed",
            config: {},
        });
    });

    it("caps labels at 20", () => {
        const defaults = loadDefaults({ nodeCount });

        expect(defaults.labelCount).toBe(PERFORMANCE_LABEL_COUNT);
    });

    it("never picks a grid layout, which is not registered", () => {
        expect(loadDefaults({ nodeCount }).layout.type).not.toBe("grid");
        expect(loadDefaults({ nodeCount, hasPositionsForEveryNode: true }).layout.type).not.toBe("grid");
    });
});
