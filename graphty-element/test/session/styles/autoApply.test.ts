import { assert, describe, it } from "vitest";

import type { FieldDescriptor, LayerId, LayerSource, Path, ResultShape, RunId } from "../../../src/catalog/types";
import { createGraphSession } from "../../../src/session/GraphSession";
import type { RunRef } from "../../../src/session/results/types";
import { createRunsApi, type RunStatus } from "../../../src/session/runs";
import {
    type AutoApplyPolicy,
    type AutoApplyRun,
    type AutoApplySources,
    type AutoApplyStyles,
    createAutoApplyPolicy,
    createStylesApi,
    type ElementLayerSpec,
    type EncodingRun,
    type EncodingSource,
    type EncodingSpec,
    type HighlightSpec,
    type Layer,
    type SessionStylesApi,
} from "../../../src/session/styles/index";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import type { StyleProblem } from "../../../src/session/types";
import { CAVEATS, descriptor, ENGINE, FakeGraph, FakeQueue, spyExecutor, stubResult } from "../runs/harness";

// ---------------------------------------------------------------------------------------------
// The runs these tests finish
// ---------------------------------------------------------------------------------------------

/** One published field, spelled out so a test can say exactly what a run offers. */
function field(
    name: string,
    kind: FieldDescriptor["kind"],
    type: FieldDescriptor["type"],
    runId: RunId,
): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type, path: `results.${runId}.${name}` };
}

/** A run that has finished and is ready to be told about. */
function runOf(
    id: RunId,
    shape: ResultShape,
    fields: readonly FieldDescriptor[],
    extra: Partial<AutoApplyRun> = {},
): AutoApplyRun {
    return {
        id,
        label: `The ${id} run`,
        algorithm: id,
        params: {},
        shape,
        fields,
        status: "succeeded",
        style: true,
        ...extra,
    };
}

/** A node measurement, which asks for a colour over the nodes it measured. */
const BETWEENNESS = runOf("betweenness", "node-metric", [field("value", "node", "number", "betweenness")]);

/** A second node measurement, which asks for the same channel. */
const DEGREE = runOf("degree", "node-metric", [field("value", "node", "number", "degree")]);

/** A third, so a sweep has something to coalesce. */
const PAGERANK = runOf("pagerank", "node-metric", [field("value", "node", "number", "pagerank")]);

/** An edge measurement, which asks for the other half and therefore clashes with none of them. */
const EDGE_BETWEENNESS = runOf("edgebetweenness", "edge-metric", [
    field("value", "edge", "number", "edgebetweenness"),
]);

/** A route, which is a highlight rather than an encoding. */
const ROUTE = runOf("route", "path", [
    field("onPath", "node", "boolean", "route"),
    field("onPath", "edge", "boolean", "route"),
]);

/** A chosen set of nodes, which is the other kind of highlight. */
const INFLUENCERS = runOf("influencers", "node-set", [field("in", "node", "boolean", "influencers")]);

/** A bare fact, which has nothing per element and therefore suggests nothing. */
const DIAMETER = runOf("diameter", "fact", [field("count", "graph", "integer", "diameter")]);

// ---------------------------------------------------------------------------------------------
// A stack that records what it was asked to paint
// ---------------------------------------------------------------------------------------------

interface Recorder {
    /** The policy under test. */
    readonly policy: AutoApplyPolicy;
    /** Every encoding it applied, in order. */
    readonly encoded: EncodingSpec[];
    /** Every highlight it applied, in order. */
    readonly highlighted: HighlightSpec[];
    /** Every refusal it reported. */
    readonly problems: { runId: RunId; error: unknown }[];
    /** What the stack holds, which a test sets before it finishes a run. */
    layers: Layer[];
    /** Thrown by the next edit when set, so a refusal has somewhere to arrive from. */
    failure: Error | null;
}

/**
 * A policy over a stack that records rather than paints.
 * @param bind - Whether this session has a stack at all.
 * @returns The recorder.
 */
function record(bind = true): Recorder {
    const harness: Recorder = {
        encoded: [],
        highlighted: [],
        problems: [],
        layers: [],
        failure: null,
        policy: {} as AutoApplyPolicy,
    };
    const refuse = (): PromiseLike<unknown> =>
        harness.failure === null ? Promise.resolve(undefined) : Promise.reject(harness.failure);
    const styles: AutoApplyStyles = {
        list: () => harness.layers,
        encode: (spec: EncodingSpec) => {
            harness.encoded.push(spec);

            return refuse();
        },
        highlight: (spec: HighlightSpec) => {
            harness.highlighted.push(spec);

            return refuse();
        },
    };

    const sources: AutoApplySources = {
        styles: () => (bind ? styles : undefined),
        onProblem: (runId, error) => {
            harness.problems.push({ runId, error });
        },
    };

    return Object.assign(harness, { policy: createAutoApplyPolicy(sources) });
}

/** A layer as a stack would hold one, for the suppression rule to read. */
function layerOf(id: LayerId, source: LayerSource, extra: Partial<Layer> = {}): Layer {
    return {
        id,
        name: id,
        kind: "custom",
        source,
        locked: source.by === "element",
        enabled: true,
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#ff0000" },
        ...extra,
    };
}

/** The run ids a recorder was asked to encode, in order. */
function encodedRuns(harness: Recorder): string[] {
    // The policy names a run by its bare id, which is what makes a suggestion serialisable and
    // what a saved layer would carry. Anything else here is the policy having changed its mind.
    return harness.encoded.map((spec) => (typeof spec.run === "string" ? spec.run : "not an id"));
}

// ---------------------------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------------------------

describe("when a finished run paints", () => {
    it("paints on a first completion", () => {
        const harness = record();

        harness.policy.completed(BETWEENNESS);

        assert.deepStrictEqual(encodedRuns(harness), ["betweenness"]);
        assert.deepStrictEqual(harness.encoded[0].channel, "node.color");
    });

    it("never paints the same run twice", () => {
        // A re-run keeps its id, so it keeps the layers already bound to it. Painting again would
        // stack a second copy of the same picture on the first.
        const harness = record();

        harness.policy.completed(BETWEENNESS);
        harness.policy.completed(BETWEENNESS);
        harness.policy.completed(BETWEENNESS);

        assert.lengthOf(harness.encoded, 1);
    });

    it("paints again once the run has been taken out of the session", () => {
        const harness = record();

        harness.policy.completed(BETWEENNESS);
        harness.policy.forget(BETWEENNESS.id);
        harness.policy.completed(BETWEENNESS);

        assert.deepStrictEqual(encodedRuns(harness), ["betweenness", "betweenness"]);
    });

    it("paints nothing for a run that failed or was cancelled", () => {
        const harness = record();

        for (const status of ["failed", "canceled", "running", "queued"] as RunStatus[]) {
            harness.policy.completed(runOf(`r${status}`, "node-metric", BETWEENNESS.fields, { status }));
        }

        assert.lengthOf(harness.encoded, 0);
    });

    it("paints nothing when the caller asked for the numbers without the picture", () => {
        const harness = record();

        harness.policy.completed(runOf("quiet", "node-metric", BETWEENNESS.fields, { style: false }));

        assert.lengthOf(harness.encoded, 0);
    });

    it("paints nothing for a result that is read rather than painted", () => {
        const harness = record();

        harness.policy.completed(DIAMETER);

        assert.lengthOf(harness.encoded, 0);
        assert.lengthOf(harness.highlighted, 0);
    });

    it("highlights a run that chose a subset rather than measuring everything", () => {
        const harness = record();

        harness.policy.completed(ROUTE);

        assert.lengthOf(harness.encoded, 0);
        assert.deepStrictEqual(harness.highlighted, [{ run: "route", field: "onPath" }]);
    });

    it("reports a refusal rather than losing it", () => {
        const harness = record();
        harness.failure = new Error("the stack said no");

        harness.policy.completed(BETWEENNESS);

        return Promise.resolve().then(() => {
            assert.lengthOf(harness.problems, 1);
            assert.strictEqual(harness.problems[0].runId, "betweenness");
        });
    });

    it("paints nothing, and throws nothing, in a session with no style stack", () => {
        const harness = record(false);

        harness.policy.completed(BETWEENNESS);

        assert.lengthOf(harness.encoded, 0);
    });
});

describe("when somebody has already said what that channel looks like", () => {
    it("leaves an authored layer alone rather than painting over it", () => {
        const harness = record();
        harness.layers = [layerOf("mine", { by: "user" })];

        harness.policy.completed(BETWEENNESS);

        assert.lengthOf(harness.encoded, 0);
    });

    it("counts a template's layer and a plugin's layer as authored too", () => {
        for (const source of [{ by: "template", templateId: "t" }, { by: "plugin", name: "p" }] as LayerSource[]) {
            const harness = record();
            harness.layers = [layerOf("theirs", source)];

            harness.policy.completed(BETWEENNESS);

            assert.lengthOf(harness.encoded, 0, source.by);
        }
    });

    it("paints under an authored layer that drives another channel", () => {
        const harness = record();
        harness.layers = [layerOf("sizes", { by: "user" }, { set: { "node.size": 4 } })];

        harness.policy.completed(BETWEENNESS);

        assert.lengthOf(harness.encoded, 1);
    });

    it("paints under a disabled authored layer, which drives nothing", () => {
        const harness = record();
        harness.layers = [layerOf("off", { by: "user" }, { enabled: false })];

        harness.policy.completed(BETWEENNESS);

        assert.lengthOf(harness.encoded, 1);
    });

    it("is not suppressed by the element's own base layer", () => {
        // The base layer paints a colour on every node. Counting it would suppress every
        // suggestion there will ever be, which is the same as having no policy at all.
        const harness = record();
        harness.layers = [layerOf("base", { by: "element", reason: "default" }, { kind: "base" })];

        harness.policy.completed(BETWEENNESS);

        assert.lengthOf(harness.encoded, 1);
    });

    it("is not suppressed by the layer an earlier run derived", () => {
        const harness = record();
        harness.layers = [
            layerOf(
                "earlier",
                { by: "run", runId: "degree", algorithm: "degree", params: {} },
                { kind: "encoding", set: undefined, encode: { "node.color": { by: "results.degree.value" } } },
            ),
        ];

        harness.policy.completed(BETWEENNESS);

        assert.lengthOf(harness.encoded, 1);
    });

    it("suppresses a highlight when an authored layer drives a colour it would paint", () => {
        const harness = record();
        harness.layers = [layerOf("mine", { by: "user" })];

        harness.policy.completed(INFLUENCERS);

        assert.lengthOf(harness.highlighted, 0);
    });
});

describe("when a sweep finishes", () => {
    it("paints once rather than once per member", () => {
        // Four node metrics all want the node colour. Painting each would leave three layers
        // invisible under the fourth, and four blocks in a legend describing one picture.
        const harness = record();

        harness.policy.hold();
        harness.policy.completed(DEGREE);
        harness.policy.completed(BETWEENNESS);
        harness.policy.completed(PAGERANK);
        assert.lengthOf(harness.encoded, 0, "nothing paints while the sweep is running");
        harness.policy.release();

        assert.deepStrictEqual(encodedRuns(harness), ["pagerank"]);
    });

    it("keeps the member that would have ended up on top", () => {
        const harness = record();

        harness.policy.hold();
        harness.policy.completed(PAGERANK);
        harness.policy.completed(DEGREE);
        harness.policy.release();

        assert.deepStrictEqual(encodedRuns(harness), ["degree"]);
    });

    it("keeps one member per channel, so a node metric and an edge metric both paint", () => {
        const harness = record();

        harness.policy.hold();
        harness.policy.completed(DEGREE);
        harness.policy.completed(EDGE_BETWEENNESS);
        harness.policy.release();

        assert.deepStrictEqual(encodedRuns(harness), ["degree", "edgebetweenness"]);
    });

    it("keeps one highlight however many members chose a subset", () => {
        const harness = record();

        harness.policy.hold();
        harness.policy.completed(ROUTE);
        harness.policy.completed(INFLUENCERS);
        harness.policy.release();

        assert.lengthOf(harness.highlighted, 1);
        assert.strictEqual(harness.highlighted[0].run, "influencers");
    });

    it("waits for the outermost hold before it paints", () => {
        const harness = record();

        harness.policy.hold();
        harness.policy.hold();
        harness.policy.completed(DEGREE);
        harness.policy.release();
        assert.lengthOf(harness.encoded, 0);
        harness.policy.release();

        assert.lengthOf(harness.encoded, 1);
    });

    it("ignores a release nothing held", () => {
        const harness = record();

        harness.policy.release();
        harness.policy.completed(DEGREE);

        assert.lengthOf(harness.encoded, 1);
    });

    it("still counts a member that was suppressed as having had its moment", () => {
        const harness = record();
        harness.layers = [layerOf("mine", { by: "user" })];

        harness.policy.completed(DEGREE);
        harness.layers = [];
        harness.policy.completed(DEGREE);

        assert.lengthOf(harness.encoded, 0);
    });
});

// ---------------------------------------------------------------------------------------------
// The same policy over the real stack
// ---------------------------------------------------------------------------------------------

/** Three nodes: two the runs measured, and one they never looked at. */
const NODES: readonly Readonly<Record<Path, unknown>>[] = [
    { "results.betweenness.value": 0, "results.degree.value": 2, "results.route.onPath": true },
    { "results.betweenness.value": 8, "results.degree.value": 5, "results.route.onPath": false },
    {},
];

/** What the session can say about one element. */
const ELEMENTS: SelectorSource = {
    nodeValue: (index, path) => NODES[index]?.[path],
    edgeValue: () => undefined,
    nodeIdOf: (index) => `n${String(index)}`,
    edgeIdOf: (index) => `e${String(index)}`,
};

/** The element's own layer, which paints every node and must suppress nothing. */
const ELEMENT_BASE: ElementLayerSpec = {
    name: "Default",
    source: { by: "element", reason: "default" },
    kind: "base",
    selector: { match: "everything" },
    set: { "node.color": "#333333" },
};

/** Every run the real stack can look one up by. */
const KNOWN_RUNS: readonly EncodingRun[] = [BETWEENNESS, DEGREE, ROUTE, INFLUENCERS];

/** Where the real stack looks a run up. */
const RUN_SOURCE: EncodingSource = {
    run: (ref: RunRef): EncodingRun | undefined => KNOWN_RUNS.find((entry) => entry.id === ref),
    runIds: (): readonly RunId[] => KNOWN_RUNS.map((entry) => entry.id),
};

/**
 * The real stack, with the policy painting into it.
 * @returns The stack and the policy over it.
 */
function realStack(): { styles: SessionStylesApi; policy: AutoApplyPolicy } {
    const styles = createStylesApi({ elements: ELEMENTS, base: [ELEMENT_BASE], runs: RUN_SOURCE });
    const policy = createAutoApplyPolicy({ styles: () => styles });

    return { styles, policy };
}

/**
 * Let the queued style edits run.
 *
 * A style edit is a run and takes its turn, so a policy that fires and forgets has not finished
 * when it returns. Nothing about the policy is awaitable on purpose: a click handler must not
 * have to wait for a picture in order to have started the work.
 * @param rounds - How many turns of the timer queue to let pass.
 */
async function settle(rounds = 4): Promise<void> {
    for (let round = 0; round < rounds; round++) {
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
    }
}

describe("what the policy leaves in a real stack", () => {
    it("adds one layer, scoped to the elements the run measured", async () => {
        const { styles, policy } = realStack();

        policy.completed(BETWEENNESS);
        await settle();

        const layers = styles.list();

        assert.lengthOf(layers, 2, "the element's base layer, and the derived one above it");
        assert.deepStrictEqual(layers[1].selector, { match: "has", path: "results.betweenness.value" });
        assert.strictEqual(layers[1].kind, "encoding");
        assert.deepStrictEqual(layers[1].source, {
            by: "run",
            runId: "betweenness",
            algorithm: "betweenness",
            params: {},
        });
    });

    it("hands the layer over to an explicit encode of the same run and channel", async () => {
        // The case the suppression rule cannot catch: the `encode()` call comes AFTER the run
        // completed, so auto-apply has already fired. Without the takeover a quickstart that runs
        // an algorithm and then colours by it leaves two layers and two legend blocks on one
        // channel, one of them invisible under the other.
        const { styles, policy } = realStack();

        policy.completed(BETWEENNESS);
        await settle();

        const derived = styles.list()[1];

        await styles.encode({ run: "betweenness", channel: "node.color", palette: "inferno" });

        const layers = styles.list();

        assert.lengthOf(layers, 2, "the same two layers");
        assert.strictEqual(layers[1].id, derived.id, "the same layer, in the same place");
        assert.deepStrictEqual(layers[1].encode?.["node.color"], {
            by: "results.betweenness.value",
            scale: "linear",
            palette: "inferno",
        });
    });

    it("leaves a second run's picture above the first rather than replacing it", async () => {
        const { styles, policy } = realStack();

        policy.completed(BETWEENNESS);
        await settle();
        policy.completed(DEGREE);
        await settle();

        const layers = styles.list();

        assert.lengthOf(layers, 3);
        assert.deepStrictEqual(layers[2].selector, { match: "has", path: "results.degree.value" });
    });

    it("paints a route as one exclusive highlight over both halves it runs through", async () => {
        const { styles, policy } = realStack();

        policy.completed(ROUTE);
        await settle();

        const highlights = styles.list().filter((layer) => layer.kind === "highlight");

        assert.lengthOf(highlights, 2, "one layer per half: a layer never paints both");
        assert.deepStrictEqual(
            highlights.map((layer) => layer.target),
            ["node", "edge"],
        );
        // The membership column carries FALSE for the elements the run looked at and did not
        // choose, so a presence test would paint the whole neighbourhood in the route's colour.
        assert.deepStrictEqual(highlights[0].selector, {
            match: "expression",
            where: "results.route.onPath == `true`",
        });
    });

    it("replaces a highlight when a second run chooses a different subset", async () => {
        const { styles, policy } = realStack();

        policy.completed(ROUTE);
        await settle();
        policy.completed(INFLUENCERS);
        await settle();

        const highlights = styles.list().filter((layer) => layer.kind === "highlight");

        assert.lengthOf(highlights, 1);
        assert.strictEqual(highlights[0].target, "node");
        assert.deepStrictEqual(highlights[0].selector, {
            match: "expression",
            where: "results.influencers.in == `true`",
        });
    });

    it("leaves the element's own layers where they are", async () => {
        const { styles, policy } = realStack();

        policy.completed(BETWEENNESS);
        policy.completed(ROUTE);
        await settle();

        const [bottom] = styles.list();

        assert.strictEqual(bottom.name, "Default");
        assert.strictEqual(bottom.locked, true);
    });
});

// ---------------------------------------------------------------------------------------------
// What the runs API fires, and when
// ---------------------------------------------------------------------------------------------

/**
 * A runs API that finishes at once, with a recorder standing in for the style stack.
 * @param harness - The recorder whose policy the runs API fires.
 * @returns The runs API.
 */
function runsOver(harness: Recorder): ReturnType<typeof createRunsApi> {
    const metrics = ["degree", "betweenness", "pagerank"].map((key) => descriptor({ key }));

    return createRunsApi({
        queue: new FakeQueue(),
        catalog: { algorithms: () => metrics },
        resolveScope: new FakeGraph(4).resolve,
        execute: spyExecutor().execute,
        engine: ENGINE,
        defaultCaveats: CAVEATS,
        styling: harness.policy,
    });
}

describe("what a session's runs fire", () => {
    it("paints a run that finished", async () => {
        const harness = record();
        const runs = runsOver(harness);

        const run = runs.start("degree");
        await run;

        assert.deepStrictEqual(encodedRuns(harness), [run.id]);
    });

    it("paints a sweep once rather than once per member", async () => {
        // Four members, one picture. The batch holds the policy for its whole life, so the three
        // layers that would have been painted over are never added at all.
        const harness = record();
        const runs = runsOver(harness);

        await runs.batch([{ algorithm: "degree" }, { algorithm: "betweenness" }, { algorithm: "pagerank" }]);

        assert.lengthOf(harness.encoded, 1);
        assert.strictEqual(runs.list().length, 3, "every member still ran and kept its result");
    });

    it("paints nothing for a run started with the picture turned off", async () => {
        const harness = record();
        const runs = runsOver(harness);

        await runs.start("degree", {}, { style: false });

        assert.lengthOf(harness.encoded, 0);
    });

    it("paints again after the run was removed and started afresh", async () => {
        const harness = record();
        const runs = runsOver(harness);

        const first = runs.start("degree");
        await first;
        runs.remove(first.id);
        await runs.start("degree");

        assert.lengthOf(harness.encoded, 2);
    });
});

/**
 * WHERE A REFUSAL GOES WHEN NOBODY IS AWAITING IT.
 *
 * The tests above drive the policy directly, so they can see a refusal because the harness hands
 * one back. A real session is the case that matters and the case that was broken: the element
 * paints a run's suggestion on the run's own completion, without anybody awaiting the edit,
 * because a consumer must not have to await the picture in order to have started the work. That
 * leaves a refusal with no call site to arrive at. The session declared a channel for it and
 * passed no handler, so it was swallowed -- and a graph kept the picture it already had while the
 * element believed it had painted a new one, which is the silent failure the whole style system
 * exists to replace.
 */
/**
 * WHEN THE PICTURE HAS CAUGHT UP WITH THE NUMBERS.
 *
 * `await runs.start(...)` hands back the result, and the suggested encoding is still on its way:
 * the element deliberately does not make a caller await the paint in order to have started the
 * work. So a consumer reading the stack in that same turn sees the picture as it stood a moment
 * earlier and can reasonably conclude the element painted nothing. Counting turns to work that
 * out is coordination code, which is exactly what a consumer should never have to write against
 * this element -- so the element answers it.
 */
describe("when the element has finished painting a run", () => {
    it("has not painted yet when the run resolves, and has once the stack has settled", async () => {
        const session = createGraphSession({
            runs: { execute: (context) => Promise.resolve({ result: stubResult(context.runId) }) },
        });

        const before = session.styles.list().length;
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;

        assert.strictEqual(session.styles.list().length, before, "the numbers arrive before the picture");

        await session.styles.settled();

        assert.isAbove(session.styles.list().length, before, "and the picture has landed by now");
        session.dispose();
    });

    it("resolves at once on a session with nothing in flight", async () => {
        const session = createGraphSession();

        await session.styles.settled();

        assert.isNotEmpty(session.styles.list(), "the element's own layers are there from the start");
        session.dispose();
    });
});

describe("a refusal in a real session", () => {
    it("reaches a listener rather than being swallowed", async () => {
        const session = createGraphSession({
            runs: { execute: (context) => Promise.resolve({ result: stubResult(context.runId) }) },
        });
        const problems: StyleProblem[] = [];
        const stop = session.on("style:problem", (problem) => {
            problems.push(problem);
        });

        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;

        /* Removed while its own picture is still on the way. The element starts that edit
           fire-and-forget on the run's completion, and the edit resolves the run when the queue
           reaches it -- so a reader who deletes a result the moment it lands is racing the
           element's own paint, and the paint loses. That is not a contrived failure: it is the
           ordinary consequence of not making a consumer await the picture. */
        session.runs.remove(run.id);
        await settle();
        stop();

        assert.lengthOf(problems, 1, "the element tried to paint, was refused, and said so");
        assert.strictEqual(problems[0].runId, "degree");
        assert.strictEqual(problems[0].error.source, "style");
        session.dispose();
    });
});
