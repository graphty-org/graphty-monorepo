/**
 * What the load-time passes turn graphty-element's results into.
 *
 * The ordering, the extremes and the group sizes are the element's arithmetic and are tested
 * there, against its own columns. The fixtures below are LITERAL results -- a ranking, a
 * summary, a graph-level bag -- so what is asserted here is the mapping and the two decisions
 * these passes make of their own: that the degree pass does not paint, and that a modularity
 * that is not a finite number is reported as absent rather than as a fabricated score.
 */

import type { RankingEntry, ResultSummary, RunResult, SummaryGroup } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import type { ElementGraph } from "../elementBridge";
import { readDegreeResults, runCommunityDetection, runDegreePass } from "../runs";

/** What a fixture says one run published. */
interface Published {
    /** The ranking, best first. */
    readonly ranking?: readonly RankingEntry[];
    /** The groups, for a run that partitions. */
    readonly groups?: readonly SummaryGroup[];
    /** How many elements the run measured. Defaults to the ranking or group total. */
    readonly measured?: number;
    /** The graph-level fields, e.g. louvain's modularity. */
    readonly graph?: Readonly<Record<string, unknown>>;
}

/** The graph stub, plus the calls a test wants to see. */
interface Stub {
    /** The graph under test. */
    readonly graph: ElementGraph;
    /** Every algorithm key the caller started, in order. */
    readonly started: string[];
    /** The third argument of every start, so a test can see whether the run was told to paint. */
    readonly startOptions: unknown[];
}

/**
 * Builds the result object a run hands back, from literal fixtures.
 * @param published - what this run should say it published.
 * @returns the result, with only the members these passes read.
 */
function fakeResult(published: Published): RunResult {
    const ranking = published.ranking ?? [];
    const {groups} = published;
    const summary: ResultSummary = {
        count: ranking.length,
        measured: published.measured ?? (groups?.reduce((total, group) => total + group.size, 0) ?? ranking.length),
        min: ranking.length > 0 ? ranking[ranking.length - 1].value : null,
        max: ranking.length > 0 ? ranking[0].value : null,
        median: null,
        mean: null,
        tiedAtMin: 0,
        normalization: "none",
        top: [],
        ...(groups === undefined ? {} : { groups }),
        caveats: {
            exact: true,
            seed: null,
            direction: "as-loaded",
            weight: null,
            precision: "f64",
            method: "exact",
            notes: [],
        },
        durationMs: 0,
    };

    return {
        ranking: () => ranking,
        summary: () => summary,
        graph: published.graph ?? {},
    } as unknown as RunResult;
}

/**
 * A graph whose session holds one finished run per algorithm named.
 * @param finished - what each algorithm's run published.
 * @returns the stub.
 */
function makeStub(finished: Record<string, Published>): Stub {
    const started: string[] = [];
    const startOptions: unknown[] = [];
    const runs = Object.entries(finished).map(([algorithm, published]) => ({
        id: `${algorithm}_1`,
        algorithm,
        status: "succeeded",
        result: fakeResult(published),
    }));

    const session = {
        runs: {
            list: () => runs,
            start: (algorithm: string, _params?: unknown, options?: unknown) => {
                started.push(algorithm);
                startOptions.push(options);

                const existing = runs.find((run) => run.algorithm === algorithm);
                const run = existing ?? { id: `${algorithm}_1`, algorithm, status: "succeeded", result: fakeResult({}) };

                return Object.assign(Promise.resolve(run.result), { id: run.id });
            },
        },
    };

    return { graph: { getSession: () => session } as unknown as ElementGraph, started, startOptions };
}

/**
 * One ranking entry, spelled out.
 * @param id - the node id.
 * @param value - the measured value.
 * @param rank - its position, best first.
 * @returns the entry.
 */
function entry(id: number | string, value: number, rank: number): RankingEntry {
    return { id, value, rank, percentile: 1 };
}

describe("runDegreePass", () => {
    it("runs degree and reads the readings back highest degree first", async () => {
        const stub = makeStub({ degree: { ranking: [entry("b", 9, 1), entry("c", 5, 2), entry("a", 2, 3)] } });

        const results = await runDegreePass(stub.graph);

        expect(stub.started).toEqual(["degree"]);
        expect(results.byDegreeDescending.map((reading) => reading.id)).toEqual(["b", "c", "a"]);
        expect(results.degreesDescending).toEqual([9, 5, 2]);
        expect(results.maxDegree).toBe(9);
    });

    /**
     * The whole reason this pass goes through the session rather than the 1.10 address. A run
     * paints itself on its first completion, and this one is measurement for the label cut and
     * the size ramp; a load that recoloured every node from a background pass would override the
     * element's own hand-tuned defaults.
     */
    it("tells the run not to paint", async () => {
        const stub = makeStub({ degree: { ranking: [entry("a", 1, 1)] } });

        await runDegreePass(stub.graph);

        expect(stub.startOptions).toEqual([{ style: false }]);
    });

    it("prints a numeric node id rather than carrying it as a number", async () => {
        const stub = makeStub({ degree: { ranking: [entry(2, 8, 1), entry(1, 3, 2)] } });

        const results = await runDegreePass(stub.graph);

        expect(results.byDegreeDescending).toEqual([
            { id: "2", degree: 8, degreePct: 1 },
            { id: "1", degree: 3, degreePct: 3 / 8 },
        ]);
    });

    it("draws each degree as a share of the top one, which the element publishes unnormalised", async () => {
        const stub = makeStub({ degree: { ranking: [entry("a", 10, 1), entry("b", 5, 2)] } });

        const results = await runDegreePass(stub.graph);

        expect(results.byDegreeDescending.map((reading) => reading.degreePct)).toEqual([1, 0.5]);
    });
});

describe("readDegreeResults", () => {
    it("reads a pass that already ran without running another one", () => {
        const stub = makeStub({ degree: { ranking: [entry("b", 4, 1), entry("a", 1, 2)] } });

        const again = readDegreeResults(stub.graph);

        expect(stub.started).toEqual([]);
        expect(again.degreesDescending).toEqual([4, 1]);
        expect(again.runId).toBe("degree_1");
    });

    it("returns nothing at all before a pass has run", () => {
        const stub = makeStub({});

        const results = readDegreeResults(stub.graph);

        expect(results.byDegreeDescending).toEqual([]);
        expect(results.maxDegree).toBe(0);
        expect(results.degreesDescending).toEqual([]);
        expect(results.runId).toBeUndefined();
    });
});

describe("runCommunityDetection", () => {
    it("runs louvain and reads the groups back, largest first", async () => {
        const stub = makeStub({
            louvain: {
                groups: [
                    { group: 0, size: 4 },
                    { group: 1, size: 3 },
                    { group: 2, size: 2 },
                    { group: 3, size: 1 },
                ],
                graph: { modularity: 0.4471 },
            },
        });

        const result = await runCommunityDetection(stub.graph);

        expect(stub.started).toEqual(["louvain"]);
        expect(result.groupCount).toBe(4);
        expect(result.largestGroupSize).toBe(4);
        expect(result.nodeCount).toBe(10);
        expect(result.modularity).toBe(0.4471);
        expect(result.groups).toEqual([
            { communityId: 0, size: 4 },
            { communityId: 1, size: 3 },
            { communityId: 2, size: 2 },
            { communityId: 3, size: 1 },
        ]);
    });

    it("orders equal-sized groups by community id, so the encoding is deterministic", async () => {
        const stub = makeStub({
            louvain: {
                groups: [
                    { group: 5, size: 2 },
                    { group: 1, size: 2 },
                    { group: 3, size: 2 },
                ],
                graph: { modularity: 0.2 },
            },
        });

        const result = await runCommunityDetection(stub.graph);

        expect(result.groups.map((group) => group.communityId)).toEqual([1, 3, 5]);
    });

    it("reports no modularity at all when the run published none", async () => {
        const stub = makeStub({ louvain: { groups: [{ group: 0, size: 1 }, { group: 1, size: 1 }] } });

        const result = await runCommunityDetection(stub.graph);

        expect(result.modularity).toBeUndefined();
        expect("modularity" in result).toBe(false);
        expect(result.groupCount).toBe(2);
    });

    it("reports no modularity when the published value is not a finite number", async () => {
        const groups = [{ group: 0, size: 1 }, { group: 1, size: 1 }];
        const nan = makeStub({ louvain: { groups, graph: { modularity: Number.NaN } } });
        const text = makeStub({ louvain: { groups, graph: { modularity: "0.5" } } });

        expect((await runCommunityDetection(nan.graph)).modularity).toBeUndefined();
        expect((await runCommunityDetection(text.graph)).modularity).toBeUndefined();
    });

    it("covers only the elements the run grouped", async () => {
        const stub = makeStub({ louvain: { groups: [{ group: 0, size: 2 }], measured: 2, graph: { modularity: 0.1 } } });

        const result = await runCommunityDetection(stub.graph);

        expect(result.nodeCount).toBe(2);
        expect(result.groups).toEqual([{ communityId: 0, size: 2 }]);
    });

    it("reports an empty result for a graph with no assignments", async () => {
        const stub = makeStub({});

        const result = await runCommunityDetection(stub.graph);

        expect(result).toEqual({
            runId: expect.any(String) as unknown as string,
            groupCount: 0,
            largestGroupSize: 0,
            nodeCount: 0,
            groups: [],
        });
    });
});
