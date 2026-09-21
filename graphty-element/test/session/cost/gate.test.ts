import { assert, describe, it } from "vitest";

import { algorithmByKey, BUILT_IN_ALGORITHMS } from "../../../src/catalog/algorithms";
import type { AlgorithmDescriptor } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import {
    type CostGateDecision,
    type CostInput,
    DEFAULT_EXACT_COMPUTATION_CAP_SECONDS,
    estimateCost,
    gateRun,
    MAX_COLUMN_LENGTH,
    resultBytes,
} from "../../../src/session/cost";
import type { GraphStatistics } from "../../../src/session/types";

/** A graph of a stated size, in one connected piece unless a test says otherwise. */
function statistics(over: Partial<GraphStatistics> = {}): GraphStatistics {
    const nodeCount = over.nodeCount ?? 1000;

    return {
        nodeCount,
        edgeCount: 4000,
        density: 0.004,
        directedness: "directed",
        weighted: false,
        selfLoopCount: 0,
        repeatedEdgeCount: 0,
        degreeRange: [0, 40],
        components: {
            count: 1,
            sizes: [nodeCount],
            largestSize: nodeCount,
            isolatedCount: 0,
            truncatedSizes: false,
            componentOf: () => 0,
        },
        ...over,
    };
}

/** A descriptor with one node field and a linear cost, unless a test says otherwise. */
function descriptor(over: Partial<AlgorithmDescriptor> = {}): AlgorithmDescriptor {
    return {
        key: "acme:test",
        plainName: "Test",
        technicalName: "test",
        description: "A descriptor written for a test.",
        category: "structure",
        shape: "node-metric",
        fields: [
            {
                name: "value",
                plainName: "Value",
                technicalName: "value",
                kind: "node",
                type: "number",
                path: "results.$.value",
            },
        ],
        options: [],
        costClass: "instant",
        complexity: "O(n + m)",
        ...over,
    };
}

/** The error behind a refusal, asserted to be one. */
function refusal(decision: CostGateDecision): { code: string; details: Readonly<Record<string, unknown>>; message: string } {
    assert.equal(decision.kind, "refused");
    assert.isTrue(decision.kind === "refused" && isGraphtyError(decision.error));
    if (decision.kind !== "refused") {
        throw new Error("unreachable");
    }

    return { code: decision.error.code, details: decision.error.details, message: decision.error.message };
}

/** A graph big enough that an n * m sweep over it is hours. */
const BIG: Partial<GraphStatistics> = { nodeCount: 70000, edgeCount: 350000 };

describe("gateRun: at or below the cap", () => {
    it("runs exactly", () => {
        const decision = gateRun({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
        });

        assert.equal(decision.kind, "exact");
        assert.isTrue(decision.kind === "exact" && decision.estimate.available);
    });

    it("runs exactly right up to the cap, and refuses just past it", () => {
        const input: CostInput = {
            algorithm: "acme:test",
            descriptor: descriptor({ cost: () => 10 }),
            statistics: statistics(),
        };

        assert.equal(gateRun(input, { limits: { exactComputationCap: 10, memoryBudgetBytes: 1e9 } }).kind, "exact");
        assert.equal(gateRun(input, { limits: { exactComputationCap: 9.9, memoryBudgetBytes: 1e9 } }).kind, "refused");
    });
});

describe("gateRun: above the cap with an approximate method", () => {
    const approximable = descriptor({
        costClass: "heavy",
        complexity: "O(n * m)",
        approximable: { method: "brandes-sampled", plainName: "Sampled bridges", defaultSample: 200, seeded: true },
    });

    it("switches to it rather than refusing, and records what it did", () => {
        const decision = gateRun({ algorithm: "acme:test", descriptor: approximable, statistics: statistics(BIG) });

        assert.equal(decision.kind, "approximate");
        if (decision.kind !== "approximate") {
            return;
        }

        assert.equal(decision.method, "brandes-sampled");
        assert.equal(decision.sampleSize, 200);
        assert.isTrue(decision.seeded);
        assert.isBelow(decision.estimate.seconds, decision.exactEstimate.seconds);
        assert.isTrue(
            decision.notes.some((note) => note.includes("Sampled rather than exact")),
            "the caveats have to say the number is a sample, not merely be a sample",
        );
        assert.isTrue(decision.notes.some((note) => note.includes("past the")));
    });

    it("says so when the sampled run is itself still past the cap", () => {
        const decision = gateRun(
            { algorithm: "acme:test", descriptor: approximable, statistics: statistics(BIG) },
            { sample: 2000 },
        );

        assert.equal(decision.kind, "approximate");
        assert.isTrue(
            decision.kind === "approximate" && decision.notes.some((note) => note.includes("still past the cap")),
        );
    });

    it("honours an explicitly asked-for sample even when the exact run would have fitted", () => {
        const decision = gateRun(
            { algorithm: "acme:test", descriptor: approximable, statistics: statistics() },
            { sample: 50 },
        );

        assert.equal(decision.kind, "approximate");
        assert.isTrue(decision.kind === "approximate" && decision.sampleSize === 50);
    });

    it("reads a sample named on the work as readily as one named on the decision", () => {
        const decision = gateRun({
            algorithm: "acme:test",
            descriptor: approximable,
            statistics: statistics(),
            sample: 50,
        });

        assert.equal(decision.kind, "approximate");
        assert.isTrue(decision.kind === "approximate" && decision.sampleSize === 50);
    });

    it("refuses instead when the caller demanded exactness", () => {
        const decision = gateRun(
            { algorithm: "acme:test", descriptor: approximable, statistics: statistics(BIG) },
            { exact: true },
        );

        const { code, details } = refusal(decision);
        assert.equal(code, "E_CAP_EXCEEDED");
        assert.isTrue(details.exactRequested);
        assert.isTrue(details.approximable);
    });

    it("refuses a call that asks for both exactness and a sample", () => {
        const decision = gateRun(
            { algorithm: "acme:test", descriptor: approximable, statistics: statistics(BIG) },
            { exact: true, sample: 100 },
        );

        const { code, details } = refusal(decision);
        assert.equal(code, "E_BAD_COMMAND");
        assert.deepEqual(details.fields, ["exact", "sample"]);
    });
});

describe("gateRun: above the cap with no approximate method", () => {
    it("fails with a code a consumer switches on, not a string it has to invent", () => {
        const decision = gateRun({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics(BIG),
        });

        const { code, details } = refusal(decision);
        assert.equal(code, "E_CAP_EXCEEDED");
        assert.equal(details.capSeconds, DEFAULT_EXACT_COMPUTATION_CAP_SECONDS);
        assert.isAbove(details.estimateSeconds as number, DEFAULT_EXACT_COMPUTATION_CAP_SECONDS);
        assert.equal(details.confidence, "modelled");
        assert.isString(details.basis);
        assert.deepEqual(details.graph, { nodes: 70000, edges: 350000 });
        assert.isFalse(details.approximable);
    });

    it("carries how big the graph is and how big it could be", () => {
        const decision = gateRun({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics(BIG),
        });

        const { details } = refusal(decision);
        const fits = details.fitsUpTo as { nodes: number; edges: number } | undefined;
        assert.isDefined(fits, "'too expensive' has to arrive with a size that is not");
        assert.isAbove(fits?.nodes ?? 0, 0);
        assert.isBelow(fits?.nodes ?? 0, 70000);

        const atThatSize = estimateCost({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics(BIG),
            scope: { nodes: fits?.nodes ?? 0, edges: fits?.edges ?? 0, exact: false },
        });
        assert.isAtMost(atThatSize.seconds, DEFAULT_EXACT_COMPUTATION_CAP_SECONDS);
    });

    it("names the largest connected piece when that scope would fit", () => {
        const decision = gateRun({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics({
                ...BIG,
                components: {
                    count: 2,
                    sizes: [3000, 67000],
                    largestSize: 3000,
                    isolatedCount: 0,
                    truncatedSizes: false,
                    componentOf: () => 0,
                },
            }),
        });

        const { details } = refusal(decision);
        const scopes = details.scopes as readonly { scope: unknown; seconds: number; exact: boolean }[];
        assert.lengthOf(scopes, 1);
        assert.equal(scopes[0].scope, "largest-component");
        assert.isAtMost(scopes[0].seconds, DEFAULT_EXACT_COMPUTATION_CAP_SECONDS);
        assert.isFalse(scopes[0].exact, "the edge count of a component is scaled, and must not read as counted");
    });

    it("offers no scope when the graph is one piece, because there is no smaller one to name", () => {
        const decision = gateRun({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics(BIG),
        });

        assert.lengthOf(refusal(decision).details.scopes as readonly unknown[], 0);
    });
});

describe("gateRun: the structural cases, which are not the cap", () => {
    it("reports a graph past the column ceiling as E_TOO_LARGE", () => {
        const decision = gateRun({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics({ nodeCount: MAX_COLUMN_LENGTH + 1000, edgeCount: 10 }),
        });

        const { code, details, message } = refusal(decision);
        assert.equal(code, "E_TOO_LARGE");
        assert.equal(details.limit, MAX_COLUMN_LENGTH);
        assert.include(message, "No scope or sample changes that.");
    });

    it("reports a result larger than the memory budget as E_OUT_OF_MEMORY", () => {
        const decision = gateRun(
            { algorithm: "degree", descriptor: algorithmByKey("degree"), statistics: statistics() },
            { limits: { exactComputationCap: 30, memoryBudgetBytes: 1000 } },
        );

        const { code, details } = refusal(decision);
        assert.equal(code, "E_OUT_OF_MEMORY");
        assert.equal(details.budget, 1000);
        assert.isAbove(details.bytes as number, 1000);
    });

    it("charges the fields the descriptor declares, not a table kept beside it", () => {
        const degree = algorithmByKey("degree");
        assert.isDefined(degree);
        if (degree === undefined) {
            return;
        }

        const nodeFields = degree.fields.filter((declared) => declared.kind === "node").length;
        const edgeFields = degree.fields.filter((declared) => declared.kind === "edge").length;
        const bytes = resultBytes(degree, 1000, 4000);

        assert.isAtLeast(bytes, (nodeFields * 1000 + edgeFields * 4000) * 8);
        assert.isBelow(bytes, (nodeFields * 1000 + edgeFields * 4000) * 8 + degree.fields.length * 2048);
    });

    it("reports an algorithm nothing registers as E_UNKNOWN_ALGORITHM", () => {
        const decision = gateRun({ algorithm: "acme:nope", statistics: statistics() });

        assert.equal(refusal(decision).code, "E_UNKNOWN_ALGORITHM");
    });

    it("reports a requirement this graph does not meet as E_UNSUPPORTED", () => {
        const decision = gateRun({
            algorithm: "kruskal",
            descriptor: algorithmByKey("kruskal"),
            statistics: statistics({ directedness: "directed" }),
        });

        const { code, details } = refusal(decision);
        assert.equal(code, "E_UNSUPPORTED");
        assert.include(String(details.reason), "undirected");
    });

    it("reports a missing accelerator as E_NO_ACCELERATOR", () => {
        const decision = gateRun({
            algorithm: "acme:test",
            descriptor: descriptor({ requires: { accelerator: true } }),
            statistics: statistics(),
        });

        assert.equal(refusal(decision).code, "E_NO_ACCELERATOR");
    });
});

describe("gateRun: the policy holds for every algorithm the element ships", () => {
    it("never lets an expensive exact run through in silence", () => {
        for (const built of BUILT_IN_ALGORITHMS) {
            const input: CostInput = {
                algorithm: built.key,
                descriptor: built,
                statistics: statistics({ ...BIG, directedness: "undirected", weighted: true }),
            };
            const decision = gateRun(input);
            const estimate = estimateCost(input);

            if (!estimate.available) {
                assert.equal(decision.kind, "refused", `${built.key} is unavailable and must be refused`);
                continue;
            }

            if (estimate.seconds <= DEFAULT_EXACT_COMPUTATION_CAP_SECONDS) {
                assert.equal(decision.kind, "exact", `${built.key} fits the cap and must run exactly`);
                continue;
            }

            assert.notEqual(decision.kind, "exact", `${built.key} is past the cap and must not run exactly`);
            if (decision.kind === "refused") {
                assert.equal(decision.error.code, "E_CAP_EXCEEDED", `${built.key} must refuse with the cap code`);
            }
        }
    });

    it("returns its refusals instead of throwing them, so a button can be drawn from one", () => {
        assert.doesNotThrow(() => {
            gateRun({ algorithm: "acme:nope", statistics: statistics({ nodeCount: Number.NaN }) });
        });
    });
});
