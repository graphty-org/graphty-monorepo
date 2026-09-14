import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    DEFAULT_LABEL_SETTINGS,
    isAboveLargeGraphThreshold,
    LABEL_COUNT_MAX,
    LABEL_COUNT_MIN,
    LABEL_OVERSHOOT_FACTOR,
    LABEL_SETTINGS_STORAGE_KEY,
    labelCountFor,
    labelCutExplanation,
    labelCutFor,
    labelDegreeThreshold,
    LARGE_GRAPH_NODE_THRESHOLD,
    loadDefaults,
    PERFORMANCE_LABEL_COUNT,
    type PersistedLabelSettings,
    readPersistedLabelSettings,
    resolveLabelSettings,
    UNENCODED_NODE_COLOR,
    writePersistedLabelSettings,
} from "../loadDefaults";

/* Every board in this file that does not name its own settings reads the store, so the
   store is emptied before each of them: a value one board wrote must not decide what the
   next one gets. */
beforeEach(() => {
    window.localStorage.removeItem(LABEL_SETTINGS_STORAGE_KEY);
});

/** Labels on, budget decided from the graph's size. @returns the default record. */
function labelsOn(): PersistedLabelSettings {
    return { topDegreeLabelsOn: true, labelCount: null };
}

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
    it("cuts at the labelCount-th degree when the budget lands on a change of degree", () => {
        expect(labelDegreeThreshold([4, 4, 4, 3, 3, 2], 5)).toBe(3);
    });

    it("returns undefined when there is nothing to label", () => {
        expect(labelDegreeThreshold([], 5)).toBeUndefined();
    });

    it("cuts at the last degree when the budget exceeds the graph", () => {
        expect(labelDegreeThreshold([9, 5, 1], 50)).toBe(1);
    });

    it("cuts at the only degree of a single-node graph", () => {
        expect(labelDegreeThreshold([4], 5)).toBe(4);
    });

    /* The 2026-09-13 change, and the reason for it: the layer is now a RULE, so the cut is
       all it has. Keeping a tie group that straddles the budget used to label 15 of the cat
       fixture's 20 nodes against a budget of 5. */
    it("drops a tie group whole rather than overshooting the budget", () => {
        const degrees = [7, 4, 4, 4, 4, 4, 1];
        const cut = labelDegreeThreshold(degrees, 3);

        expect(cut).toBe(7);
        expect(degrees.filter((degree) => degree >= (cut ?? 0))).toHaveLength(1);
    });

    it("never covers more nodes than the budget, on the cat fixture's own distribution", () => {
        // 3 nodes of degree 4, 12 of degree 3, 5 of degree 2, and 7.2's budget of 5.
        const degrees = [4, 4, 4, ...Array.from({ length: 12 }, () => 3), ...Array.from({ length: 5 }, () => 2)];
        const cut = labelDegreeThreshold(degrees, 5);

        expect(cut).toBe(4);
        expect(degrees.filter((degree) => degree >= (cut ?? 0))).toHaveLength(3);
    });

    it("returns undefined when the highest tie group is the whole graph", () => {
        // A regular graph: a cut every node meets distinguishes none of them, so nothing is
        // labelled rather than every node being labelled. A tie group that is merely LARGER
        // than the budget is drawn -- see the boundary boards below.
        expect(labelDegreeThreshold([3, 3, 3, 3], 2)).toBeUndefined();
    });

    it("returns undefined for a budget of zero or less, which is how the setting turns labels off", () => {
        expect(labelDegreeThreshold([4, 3], 0)).toBeUndefined();
        expect(labelDegreeThreshold([4, 3], -1)).toBeUndefined();
    });
});

describe("labelCutFor, on the distributions the shipped samples actually have", () => {
    /* The College football sample's own degree histogram, counted off
       graphty/public/samples/football.gml: 12 nodes of degree 12, 66 of 11, 28 of 10, 5 of
       9, 3 of 8 and one of 7. It is here as a literal rather than parsed from the file
       because these boards are arithmetic over a distribution, and a parser would make the
       failure of a load a failure of this file.
       @returns the sample's 115 degrees, highest first. */
    function collegeFootballDegrees(): readonly number[] {
        return [
            ...Array.from({ length: 12 }, () => 12),
            ...Array.from({ length: 66 }, () => 11),
            ...Array.from({ length: 28 }, () => 10),
            ...Array.from({ length: 5 }, () => 9),
            ...Array.from({ length: 3 }, () => 8),
            7,
        ];
    }

    /* The cat fixture's: 3 nodes of degree 4, 12 of degree 3, 5 of degree 2.
       @returns the fixture's 20 degrees, highest first. */
    function catFixtureDegrees(): readonly number[] {
        return [4, 4, 4, ...Array.from({ length: 12 }, () => 3), ...Array.from({ length: 5 }, () => 2)];
    }

    /**
     * How many nodes a cut covers, which is the number every board here is really about.
     * @param degrees - the graph's degrees.
     * @param cut - the cut, or undefined when there is none.
     * @returns how many nodes the rule `degree >= cut` would label.
     */
    function labelled(degrees: readonly number[], cut: number | undefined): number {
        return cut === undefined ? 0 : degrees.filter((degree) => degree >= cut).length;
    }

    it("counts the football sample's own degrees correctly, so the boards below mean something", () => {
        expect(collegeFootballDegrees()).toHaveLength(115);
        expect(labelCountFor(115, labelsOn())).toBe(11);
    });

    /* THE DEFECT. The walk-up of 2026-09-13 took the cut all the way to nothing here -- the
       top 12 degrees are all 12, so every candidate cut inside the budget of 11 sat inside
       that tie group -- and the sample got no label layer at all while the Settings switch
       still read ON. Spec 7.2 asks for labels on the top clamp(round(sqrt(n)), 5, 50) nodes
       and names no exemption for graphs whose degrees are similar. */
    it("labels a NEAR-REGULAR graph: College football gets its 12 top-degree nodes", () => {
        const degrees = collegeFootballDegrees();
        const outcome = labelCutFor(degrees, labelCountFor(115, labelsOn()));

        expect(outcome.kind).toBe("tie-overshoot");
        expect(labelDegreeThreshold(degrees, 11)).toBe(12);
        expect(labelled(degrees, labelDegreeThreshold(degrees, 11))).toBe(12);
    });

    it("overshoots the football budget by ONE node, not by the 66 the next degree carries", () => {
        const degrees = collegeFootballDegrees();

        // Cutting at degree 11 instead would label 78 of the 115 nodes: the overshoot is
        // bounded by the tie group at the TOP, never by the next one down.
        expect(labelled(degrees, labelDegreeThreshold(degrees, 11))).toBe(12);
        expect(labelled(degrees, 11)).toBe(78);
    });

    /* The cat fixture must not regress: a cut DOES fit its budget of 5 (three nodes of
       degree 4), so the overshoot branch is never reached and the answer is the one the
       2026-09-13 change established. */
    it("still spends the cat fixture's budget inside it: degree 4, three labels", () => {
        const degrees = catFixtureDegrees();
        const outcome = labelCutFor(degrees, labelCountFor(20, labelsOn()));

        expect(labelCountFor(20, labelsOn())).toBe(5);
        expect(outcome).toEqual({ kind: "within-budget", degreeThreshold: 4, labelledCount: 3, budget: 5 });
        expect(labelled(degrees, labelDegreeThreshold(degrees, 5))).toBe(3);
    });

    it("never labels the cat fixture's 15 nodes of degree 3 or more", () => {
        const degrees = catFixtureDegrees();

        expect(labelled(degrees, labelDegreeThreshold(degrees, 5))).toBeLessThanOrEqual(5);
        expect(labelled(degrees, 3)).toBe(15);
    });
});

describe("labelCutFor, at the boundary between a tie worth drawing and one that is not", () => {
    /**
     * A graph whose top tie group is `tied` nodes, with five plainly smaller nodes under it.
     * @param tied - how many nodes share the highest degree.
     * @returns the degrees, highest first.
     */
    function topTieOf(tied: number): readonly number[] {
        return [...Array.from({ length: tied }, () => 6), ...Array.from({ length: 5 }, () => 1)];
    }

    it("allows a top tie group of exactly LABEL_OVERSHOOT_FACTOR times the budget", () => {
        const degrees = topTieOf(10);

        expect(LABEL_OVERSHOOT_FACTOR).toBe(2);
        expect(labelCutFor(degrees, 5)).toEqual({
            kind: "tie-overshoot",
            degreeThreshold: 6,
            labelledCount: 10,
            budget: 5,
        });
    });

    it("refuses one node past it, which is where a tie stops being a reading", () => {
        const outcome = labelCutFor(topTieOf(11), 5);

        expect(outcome.kind).toBe("too-regular");
        expect(labelDegreeThreshold(topTieOf(11), 5)).toBeUndefined();
    });

    it("refuses a tie group that is the WHOLE graph even when it is inside the allowance", () => {
        // A regular graph: a cut every node meets distinguishes none of them, which is the
        // one thing the budget exists to prevent. Four nodes against a budget of two is
        // inside the allowance and still refused.
        expect(labelCutFor([3, 3, 3, 3], 2).kind).toBe("too-regular");
        expect(labelDegreeThreshold([3, 3, 3, 3], 2)).toBeUndefined();
    });

    it("reports labels-off and an empty graph as themselves, not as a refusal to label", () => {
        expect(labelCutFor([4, 3], 0)).toEqual({ kind: "labels-off" });
        expect(labelCutFor([], 5)).toEqual({ kind: "empty-graph" });
    });
});

describe("labelCutExplanation", () => {
    it("says nothing when labels were drawn, however the cut was reached", () => {
        expect(labelCutExplanation(labelCutFor([4, 4, 4, 3, 3, 2], 5))).toBeUndefined();
        expect(labelCutExplanation(labelCutFor([6, 6, 6, 6, 1], 2))).toBeUndefined();
    });

    it("says nothing when the switch is off or nothing is loaded, which explain themselves", () => {
        expect(labelCutExplanation(labelCutFor([4, 3], 0))).toBeUndefined();
        expect(labelCutExplanation(labelCutFor([], 5))).toBeUndefined();
    });

    /* THE OTHER HALF OF THE DEFECT: a switch that reads ON over a canvas with no labels has
       to say why somewhere. This module owns no pixels, so what it owns is the sentence. */
    it("explains a refusal in numbers a reader can check against their own graph", () => {
        const sentence = labelCutExplanation(labelCutFor([...Array.from({ length: 11 }, () => 6), 1, 1], 5));

        expect(sentence).toContain("Labels are on");
        expect(sentence).toContain("11 of 13 nodes");
        expect(sentence).toContain("highest degree (6)");
    });

    it("names a budget that really would draw labels, rather than a hopeful one", () => {
        const degrees = [...Array.from({ length: 11 }, () => 6), 1, 1];
        const sentence = labelCutExplanation(labelCutFor(degrees, 5)) ?? "";

        expect(sentence).toContain("Set the label budget in Settings > Performance to 6 or more");
        expect(labelDegreeThreshold(degrees, 6)).toBe(6);
    });

    it("promises no budget at all when no reachable budget could cover the tie", () => {
        // 200 nodes tied at the top: the largest budget Settings will accept is
        // LABEL_COUNT_MAX, and twice that is still under 200.
        const degrees = [...Array.from({ length: 200 }, () => 9), ...Array.from({ length: 300 }, () => 1)];
        const sentence = labelCutExplanation(labelCutFor(degrees, LABEL_COUNT_MAX)) ?? "";

        expect(sentence).toContain("No label budget can cover a tie that large");
        expect(sentence).not.toContain("Set the label budget");
        expect(labelDegreeThreshold(degrees, LABEL_COUNT_MAX)).toBeUndefined();
    });

    it("is plain ASCII, because it is read aloud by a screen reader and copied into issues", () => {
        const sentence = labelCutExplanation(labelCutFor([3, 3, 3, 3], 2)) ?? "";

        expect(sentence).not.toBe("");
        expect(/^[\x20-\x7E]+$/.test(sentence)).toBe(true);
    });
});

describe("the label settings record", () => {
    it("defaults to labels on with an automatic budget", () => {
        expect(DEFAULT_LABEL_SETTINGS).toEqual({ topDegreeLabelsOn: true, labelCount: null });
    });

    it("remembers nothing when nothing was stored", () => {
        expect(readPersistedLabelSettings()).toEqual({});
    });

    it("reads back what was written", () => {
        writePersistedLabelSettings({ topDegreeLabelsOn: false, labelCount: 12 });

        expect(readPersistedLabelSettings()).toEqual({ topDegreeLabelsOn: false, labelCount: 12 });
    });

    it("keeps a versioned key, so a shape change is a missing key rather than a corrupt read", () => {
        expect(LABEL_SETTINGS_STORAGE_KEY).toBe("graphty.shell.labels.v1");
    });

    it("survives an empty value", () => {
        window.localStorage.setItem(LABEL_SETTINGS_STORAGE_KEY, "");

        expect(readPersistedLabelSettings()).toEqual({});
    });

    it("survives malformed JSON", () => {
        window.localStorage.setItem(LABEL_SETTINGS_STORAGE_KEY, "{not json");

        expect(readPersistedLabelSettings()).toEqual({});
    });

    it("refuses an array and a scalar", () => {
        window.localStorage.setItem(LABEL_SETTINGS_STORAGE_KEY, "[true]");
        expect(readPersistedLabelSettings()).toEqual({});

        window.localStorage.setItem(LABEL_SETTINGS_STORAGE_KEY, "42");
        expect(readPersistedLabelSettings()).toEqual({});
    });

    it("validates each field on its own, so one bad field costs only that field", () => {
        window.localStorage.setItem(
            LABEL_SETTINGS_STORAGE_KEY,
            JSON.stringify({ topDegreeLabelsOn: false, labelCount: "lots" }),
        );

        expect(readPersistedLabelSettings()).toEqual({ topDegreeLabelsOn: false });
    });

    it("refuses a budget below one, which would be the switch's job", () => {
        window.localStorage.setItem(
            LABEL_SETTINGS_STORAGE_KEY,
            JSON.stringify({ topDegreeLabelsOn: true, labelCount: 0 }),
        );

        expect(readPersistedLabelSettings()).toEqual({ topDegreeLabelsOn: true });
    });

    it("keeps an explicit null budget, which means follow the graph's size", () => {
        window.localStorage.setItem(LABEL_SETTINGS_STORAGE_KEY, JSON.stringify({ labelCount: null }));

        expect(readPersistedLabelSettings()).toEqual({ labelCount: null });
    });

    it("survives a store that throws on read", () => {
        vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
            throw new Error("private mode");
        });

        expect(readPersistedLabelSettings()).toEqual({});

        vi.restoreAllMocks();
    });

    it("survives a store that throws on write", () => {
        vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
            throw new Error("quota");
        });

        expect(() => {
            writePersistedLabelSettings(DEFAULT_LABEL_SETTINGS);
        }).not.toThrow();

        vi.restoreAllMocks();
    });

    it("fills the gaps in a partial record with the defaults", () => {
        expect(resolveLabelSettings({ topDegreeLabelsOn: false })).toEqual({
            topDegreeLabelsOn: false,
            labelCount: null,
        });
        expect(resolveLabelSettings({})).toEqual(DEFAULT_LABEL_SETTINGS);
    });
});

describe("labelCountFor, with the reader's settings", () => {
    it("is the automatic budget when the reader has chosen nothing", () => {
        expect(labelCountFor(20, labelsOn())).toBe(labelCountFor(20));
    });

    it("is zero when the switch is off, which is what stops the layer being added", () => {
        expect(labelCountFor(20, { topDegreeLabelsOn: false, labelCount: null })).toBe(0);
        expect(labelCountFor(20, { topDegreeLabelsOn: false, labelCount: 12 })).toBe(0);
    });

    it("takes the reader's own budget over the automatic one", () => {
        expect(labelCountFor(20, { topDegreeLabelsOn: true, labelCount: 3 })).toBe(3);
        expect(labelCountFor(4000, { topDegreeLabelsOn: true, labelCount: 8 })).toBe(8);
    });

    it("holds the reader's budget to the 50 ceiling below the threshold", () => {
        expect(labelCountFor(4000, { topDegreeLabelsOn: true, labelCount: 400 })).toBe(LABEL_COUNT_MAX);
    });

    it("holds the reader's budget to the Performance ceiling above the threshold", () => {
        expect(
            labelCountFor(LARGE_GRAPH_NODE_THRESHOLD + 1, { topDegreeLabelsOn: true, labelCount: 50 }),
        ).toBe(PERFORMANCE_LABEL_COUNT);
    });

    it("rounds a fractional budget rather than passing it on", () => {
        expect(labelCountFor(20, { topDegreeLabelsOn: true, labelCount: 6.4 })).toBe(6);
    });
});

describe("loadDefaults below the threshold", () => {
    /* Built inside each board rather than once at module scope: `loadDefaults` reads the
       reader's settings when the caller names none, and a record written by another board
       must not be able to decide this one. */
    const belowThreshold = (): ReturnType<typeof loadDefaults> => loadDefaults({ nodeCount: 20, labels: labelsOn() });

    it("does not take the Performance branch", () => {
        expect(belowThreshold().aboveThreshold).toBe(false);
    });

    it("picks ngraph with no config", () => {
        expect(belowThreshold().layout).toEqual({ type: "ngraph", config: {} });
    });

    it("labels the clamped top-N", () => {
        expect(belowThreshold().labelCount).toBe(labelCountFor(20));
    });

    /* Node colour and size are NOT decided here any more. 7.2 asks for a neutral colour
       and size by degree, and both were reverted on 2026-09-13: the element's own default
       layer carries hand-tuned node and edge values, and these overrode them from the
       first frame -- the size curve worst of all, landing every node on the cat fixture
       between 3.12x and 4.00x the base. See the note on the apply block in AppShell. */
    it("decides no node colour and no node size", () => {
        expect("neutralColor" in belowThreshold()).toBe(false);
        expect("sizeByDegree" in belowThreshold()).toBe(false);
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
        expect(loadDefaults({ nodeCount, labels: labelsOn() }).labelCount).toBe(PERFORMANCE_LABEL_COUNT);
    });

    it("never picks a grid layout, which is not registered", () => {
        expect(loadDefaults({ nodeCount }).layout.type).not.toBe("grid");
        expect(loadDefaults({ nodeCount, hasPositionsForEveryNode: true }).layout.type).not.toBe("grid");
    });
});

describe("loadDefaults and the reader's Performance settings", () => {
    /* The one seam the setting travels through. AppShell asks `loadDefaults` for the
       budget, asks `labelDegreeThreshold` for a cut at that budget, and adds the label
       layer only when it gets one -- so a budget of zero is the whole of "labels off",
       and there is no second branch that could draw labels the reader switched off. */
    it("takes the reader's stored settings when the caller names none", () => {
        writePersistedLabelSettings({ topDegreeLabelsOn: false, labelCount: null });

        expect(loadDefaults({ nodeCount: 20 }).labelCount).toBe(0);
    });

    it("gives a budget of zero no cut, so no layer is added", () => {
        writePersistedLabelSettings({ topDegreeLabelsOn: false, labelCount: null });

        const defaults = loadDefaults({ nodeCount: 20 });

        expect(labelDegreeThreshold([4, 4, 4, 3, 3], defaults.labelCount)).toBeUndefined();
    });

    it("takes the reader's stored budget", () => {
        writePersistedLabelSettings({ topDegreeLabelsOn: true, labelCount: 2 });

        expect(loadDefaults({ nodeCount: 20 }).labelCount).toBe(2);
    });

    it("labels as usual once the reader switches it back on", () => {
        writePersistedLabelSettings({ topDegreeLabelsOn: true, labelCount: null });

        expect(loadDefaults({ nodeCount: 20 }).labelCount).toBe(labelCountFor(20));
    });

    it("labels as usual when nothing has ever been stored", () => {
        expect(loadDefaults({ nodeCount: 20 }).labelCount).toBe(labelCountFor(20));
    });

    it("prefers the settings the caller names over the stored ones", () => {
        writePersistedLabelSettings({ topDegreeLabelsOn: false, labelCount: null });

        expect(loadDefaults({ nodeCount: 20, labels: labelsOn() }).labelCount).toBe(labelCountFor(20));
    });

    it("still decides the layout when labels are off", () => {
        writePersistedLabelSettings({ topDegreeLabelsOn: false, labelCount: null });

        expect(loadDefaults({ nodeCount: 20 }).layout).toEqual({ type: "ngraph", config: {} });
    });

    it("survives an unreadable store by labelling as usual", () => {
        vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
            throw new Error("private mode");
        });

        expect(loadDefaults({ nodeCount: 20 }).labelCount).toBe(labelCountFor(20));

        vi.restoreAllMocks();
    });
});
