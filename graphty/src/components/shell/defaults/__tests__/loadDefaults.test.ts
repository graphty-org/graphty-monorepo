import { DEFAULT_LIMITS, recommendLayout } from "@graphty/graphty-element/session";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_GRAPH_STATISTICS } from "../../analysis/graphShape";
import {
    DEFAULT_LABEL_SETTINGS,
    isAboveLargeGraphThreshold,
    LABEL_COUNT_MAX,
    LABEL_COUNT_MIN,
    LABEL_SETTINGS_STORAGE_KEY,
    labelCountFor,
    loadDefaults,
    PERFORMANCE_LABEL_COUNT,
    type PersistedLabelSettings,
    readPersistedLabelSettings,
    resolveLabelSettings,
    writePersistedLabelSettings,
} from "../loadDefaults";

/**
 * The large-graph threshold every branch below reads. It is graphty-element's own shipped
 * default, not a number this suite states: the shell declared one of its own until this pass,
 * ten times the element's, and a literal here would be the same defect wearing a test.
 */
const LARGE_GRAPH_NODE_THRESHOLD = DEFAULT_LIMITS.largeGraphThreshold;

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
    /* The shell declares no threshold of its own any more. This board exists to catch its
       return: a number written down here would be free to disagree with the element's, which
       is exactly how the shell came to branch at 100,000 nodes while the element drew less
       detail from 10,000. */
    it("branches on graphty-element's own large-graph threshold and declares none of its own", () => {
        expect(isAboveLargeGraphThreshold(DEFAULT_LIMITS.largeGraphThreshold)).toBe(false);
        expect(isAboveLargeGraphThreshold(DEFAULT_LIMITS.largeGraphThreshold + 1)).toBe(true);
    });

    it("declares the label clamp spec 7.2 names", () => {
        expect(LABEL_COUNT_MIN).toBe(5);
        expect(LABEL_COUNT_MAX).toBe(50);
        expect(PERFORMANCE_LABEL_COUNT).toBe(20);
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
});

describe("loadDefaults above the threshold", () => {
    const nodeCount = LARGE_GRAPH_NODE_THRESHOLD + 1;

    it("takes the Performance branch", () => {
        expect(loadDefaults({ nodeCount }).aboveThreshold).toBe(true);
    });

    it("caps labels at 20", () => {
        expect(loadDefaults({ nodeCount, labels: labelsOn() }).labelCount).toBe(PERFORMANCE_LABEL_COUNT);
    });
});

/*
 * The arrangement is graphty-element's decision now, so these boards stand where the shell's
 * own layout table used to be tested and pin the same three cases through the call AppShell
 * makes -- `recommendLayout(statistics, { placedNodes })`, whose `layout.engine` is what the
 * shell hands to `setLayout`.
 *
 * They are here rather than deleted because the shell RELIES on these answers: a small graph
 * gets a force layout, a large one is scattered instead of holding the frame, a fully placed
 * one keeps the coordinates the data arrived with, and no arrangement the element cannot serve
 * is ever named. That last one is what the shell's own table got wrong for a long time, naming
 * "grid" for an engine that was never registered.
 */
describe("the arrangement a load applies, which graphty-element decides", () => {
    /** @param over - the counts and the placed nodes this board means. @returns the engine the shell would set. */
    function engineFor(over: { nodeCount: number; edgeCount: number; placedNodes?: number }): string | undefined {
        const statistics = { ...EMPTY_GRAPH_STATISTICS, nodeCount: over.nodeCount, edgeCount: over.edgeCount };

        return recommendLayout(statistics, { placedNodes: over.placedNodes ?? 0 })?.layout.engine;
    }

    it("spreads a small connected graph out with the force engine", () => {
        expect(engineFor({ nodeCount: 20, edgeCount: 29 })).toBe("ngraph");
    });

    it("scatters a graph above the large-graph threshold rather than settling a simulation", () => {
        expect(engineFor({ nodeCount: LARGE_GRAPH_NODE_THRESHOLD + 1, edgeCount: 400000 })).toBe("random");
    });

    it("keeps the coordinates the data arrived with when every node carries one", () => {
        expect(engineFor({ nodeCount: 20, edgeCount: 29, placedNodes: 20 })).toBe("fixed");
    });

    it("does not keep positions when only some nodes carry one", () => {
        expect(engineFor({ nodeCount: 20, edgeCount: 29, placedNodes: 19 })).not.toBe("fixed");
    });

    it("rings an edgeless graph, where a force layout has no pull to work with", () => {
        expect(engineFor({ nodeCount: 20, edgeCount: 0 })).toBe("circular");
    });

    it("never names the grid engine, which is not registered", () => {
        expect(engineFor({ nodeCount: 20, edgeCount: 29 })).not.toBe("grid");
        expect(engineFor({ nodeCount: LARGE_GRAPH_NODE_THRESHOLD + 1, edgeCount: 400000 })).not.toBe("grid");
        expect(engineFor({ nodeCount: 20, edgeCount: 29, placedNodes: 20 })).not.toBe("grid");
    });
});

describe("loadDefaults and the reader's Performance settings", () => {
    /* The one seam the setting travels through. AppShell asks `loadDefaults` for the
       budget and adds the label layer only when the budget is above zero -- so a budget of
       zero is the whole of "labels off", and there is no second branch that could draw
       labels the reader switched off. */
    it("takes the reader's stored settings when the caller names none", () => {
        writePersistedLabelSettings({ topDegreeLabelsOn: false, labelCount: null });

        expect(loadDefaults({ nodeCount: 20 }).labelCount).toBe(0);
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

    it("still reports the Performance branch when labels are off", () => {
        writePersistedLabelSettings({ topDegreeLabelsOn: false, labelCount: null });

        expect(loadDefaults({ nodeCount: 20 }).aboveThreshold).toBe(false);
        expect(loadDefaults({ nodeCount: LARGE_GRAPH_NODE_THRESHOLD + 1 }).aboveThreshold).toBe(true);
    });

    it("survives an unreadable store by labelling as usual", () => {
        vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
            throw new Error("private mode");
        });

        expect(loadDefaults({ nodeCount: 20 }).labelCount).toBe(labelCountFor(20));

        vi.restoreAllMocks();
    });
});
