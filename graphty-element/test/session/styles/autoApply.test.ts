import { assert, describe, it } from "vitest";

import type { FieldDescriptor, LayerId, LayerSource, Path, ResultShape, RunId } from "../../../src/catalog/types";
import { createGraphSession, dispatcherOf } from "../../../src/session/GraphSession";
import type { RunRef } from "../../../src/session/results/types";
import type { RunStatus } from "../../../src/session/runs";
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
    type StyleSuggestion,
} from "../../../src/session/styles/index";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import type { ElementSession, GraphSession, StyleProblem } from "../../../src/session/types";
import { fixtureSession } from "../history/fixture-session";
import { stubResult } from "../runs/harness";

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
const EDGE_BETWEENNESS = runOf("edgebetweenness", "edge-metric", [field("value", "edge", "number", "edgebetweenness")]);

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
// A stack the policy reads, and what it decides
// ---------------------------------------------------------------------------------------------

interface Recorder {
    /** The policy under test. */
    readonly policy: AutoApplyPolicy;
    /** Every refusal it reported. */
    readonly problems: { runId: RunId; error: unknown }[];
    /** What the stack holds, which a test sets before it finishes a run. */
    layers: Layer[];
}

/**
 * A policy over a stack a test fills in.
 * @param bind - Whether this session has a stack at all.
 * @returns The recorder.
 */
function record(bind = true): Recorder {
    const harness: Recorder = { problems: [], layers: [], policy: {} as AutoApplyPolicy };
    const styles: AutoApplyStyles = { list: () => harness.layers };
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

/** The encodings among some suggestions. */
function encodings(suggestions: readonly StyleSuggestion[]): EncodingSpec[] {
    return suggestions.flatMap((suggestion) => (suggestion.as === "highlight" ? [] : [suggestion.spec]));
}

/** The highlights among some suggestions. */
function highlights(suggestions: readonly StyleSuggestion[]): HighlightSpec[] {
    return suggestions.flatMap((suggestion) => (suggestion.as === "highlight" ? [suggestion.spec] : []));
}

/** The run ids some suggestions encode, in order. */
function encodedRuns(suggestions: readonly StyleSuggestion[]): string[] {
    // The policy names a run by its bare id, which is what makes a suggestion serialisable and
    // what a saved layer would carry. Anything else here is the policy having changed its mind.
    return encodings(suggestions).map((spec) => (typeof spec.run === "string" ? spec.run : "not an id"));
}

// ---------------------------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------------------------

describe("when a finished run paints", () => {
    it("paints on a first completion, and says the run has had its moment", () => {
        const harness = record();

        const decision = harness.policy.completed(BETWEENNESS, false);

        assert.deepStrictEqual(encodedRuns(decision.paint), ["betweenness"]);
        assert.deepStrictEqual(encodings(decision.paint)[0].channel, "node.color");
        assert.isTrue(decision.painted);
    });

    it("never paints a run whose entry says it already painted", () => {
        // A re-run keeps its id, so it keeps the layers already bound to it. Painting again would
        // stack a second copy of the same picture on the first.
        const harness = record();

        const decision = harness.policy.completed(BETWEENNESS, true);

        assert.lengthOf(decision.paint, 0);
        assert.isTrue(decision.painted);
    });

    it("paints again once the run has been taken out of the session", () => {
        // Removing or undoing a run takes its entry, and with it the record that it painted.
        const harness = record();

        const first = harness.policy.completed(BETWEENNESS, false);
        const again = harness.policy.completed(BETWEENNESS, false);

        assert.deepStrictEqual(
            [...encodedRuns(first.paint), ...encodedRuns(again.paint)],
            ["betweenness", "betweenness"],
        );
    });

    it("paints nothing for a run that failed or was cancelled", () => {
        const harness = record();

        for (const status of ["failed", "canceled", "running", "queued"] as RunStatus[]) {
            const decision = harness.policy.completed(
                runOf(`r${status}`, "node-metric", BETWEENNESS.fields, { status }),
                false,
            );

            assert.lengthOf(decision.paint, 0, status);
            assert.isFalse(decision.painted, status);
        }
    });

    it("paints nothing when the caller asked for the numbers without the picture", () => {
        const harness = record();

        const decision = harness.policy.completed(
            runOf("quiet", "node-metric", BETWEENNESS.fields, { style: false }),
            false,
        );

        assert.lengthOf(decision.paint, 0);
    });

    it("paints nothing for a result that is read rather than painted", () => {
        const harness = record();

        assert.lengthOf(harness.policy.completed(DIAMETER, false).paint, 0);
    });

    it("highlights a run that chose a subset rather than measuring everything", () => {
        const harness = record();

        const { paint } = harness.policy.completed(ROUTE, false);

        assert.lengthOf(encodings(paint), 0);
        assert.deepStrictEqual(highlights(paint), [{ run: "route", field: "onPath" }]);
    });

    it("reports a refusal rather than losing it", () => {
        const harness = record();

        harness.policy.refused("betweenness", new Error("the stack said no"));

        assert.lengthOf(harness.problems, 1);
        assert.strictEqual(harness.problems[0].runId, "betweenness");
    });

    it("paints nothing, and throws nothing, in a session with no style stack", () => {
        const harness = record(false);

        assert.lengthOf(harness.policy.completed(BETWEENNESS, false).paint, 0);
    });
});

describe("when somebody has already said what that channel looks like", () => {
    it("leaves an authored layer alone rather than painting over it", () => {
        const harness = record();
        harness.layers = [layerOf("mine", { by: "user" })];

        assert.lengthOf(harness.policy.completed(BETWEENNESS, false).paint, 0);
    });

    it("counts a template's layer and a plugin's layer as authored too", () => {
        for (const source of [
            { by: "template", templateId: "t" },
            { by: "plugin", name: "p" },
        ] as LayerSource[]) {
            const harness = record();
            harness.layers = [layerOf("theirs", source)];

            assert.lengthOf(harness.policy.completed(BETWEENNESS, false).paint, 0, source.by);
        }
    });

    it("paints under an authored layer that drives another channel", () => {
        const harness = record();
        harness.layers = [layerOf("sizes", { by: "user" }, { set: { "node.size": 4 } })];

        assert.lengthOf(harness.policy.completed(BETWEENNESS, false).paint, 1);
    });

    it("paints under a disabled authored layer, which drives nothing", () => {
        const harness = record();
        harness.layers = [layerOf("off", { by: "user" }, { enabled: false })];

        assert.lengthOf(harness.policy.completed(BETWEENNESS, false).paint, 1);
    });

    it("is not suppressed by the element's own base layer", () => {
        // The base layer paints a colour on every node. Counting it would suppress every
        // suggestion there will ever be, which is the same as having no policy at all.
        const harness = record();
        harness.layers = [layerOf("base", { by: "element", reason: "default" }, { kind: "base" })];

        assert.lengthOf(harness.policy.completed(BETWEENNESS, false).paint, 1);
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

        assert.lengthOf(harness.policy.completed(BETWEENNESS, false).paint, 1);
    });

    it("still paints when the authored layer names only some elements", () => {
        // A reader who coloured one node by hand decided about that node, not about the graph:
        // the run still paints, and is placed beneath the override so the node stays as chosen.
        const harness = record();
        harness.layers = [layerOf("one node", { by: "user" }, { selector: { match: "ids", nodes: ["n0"] } })];

        assert.lengthOf(harness.policy.completed(BETWEENNESS, false).paint, 1);
        assert.lengthOf(highlights(harness.policy.completed(INFLUENCERS, false).paint), 1);
    });

    it("suppresses a highlight when an authored layer drives a colour it would paint", () => {
        const harness = record();
        harness.layers = [layerOf("mine", { by: "user" })];

        assert.lengthOf(highlights(harness.policy.completed(INFLUENCERS, false).paint), 0);
    });
});

describe("when a sweep finishes", () => {
    it("paints once rather than once per member", () => {
        // Four node metrics all want the node colour. Painting each would leave three layers
        // invisible under the fourth, and four blocks in a legend describing one picture.
        const harness = record();
        const hold = harness.policy.hold();

        const during = [DEGREE, BETWEENNESS, PAGERANK].flatMap(
            (run) => harness.policy.completed(run, false, hold).paint,
        );
        assert.lengthOf(during, 0, "nothing paints while the sweep is running");

        assert.deepStrictEqual(encodedRuns(hold.release()), ["pagerank"]);
    });

    it("keeps the member that would have ended up on top", () => {
        const harness = record();
        const hold = harness.policy.hold();

        harness.policy.completed(PAGERANK, false, hold);
        harness.policy.completed(DEGREE, false, hold);

        assert.deepStrictEqual(encodedRuns(hold.release()), ["degree"]);
    });

    it("keeps one member per channel, so a node metric and an edge metric both paint", () => {
        const harness = record();
        const hold = harness.policy.hold();

        harness.policy.completed(DEGREE, false, hold);
        harness.policy.completed(EDGE_BETWEENNESS, false, hold);

        assert.deepStrictEqual(encodedRuns(hold.release()), ["degree", "edgebetweenness"]);
    });

    it("keeps one highlight however many members chose a subset", () => {
        const harness = record();
        const hold = harness.policy.hold();

        harness.policy.completed(ROUTE, false, hold);
        harness.policy.completed(INFLUENCERS, false, hold);
        const held = highlights(hold.release());

        assert.lengthOf(held, 1);
        assert.strictEqual(held[0].run, "influencers");
    });

    it("holds only the batch's own members: a run finishing beside the batch paints at once", () => {
        const harness = record();
        const hold = harness.policy.hold();

        assert.lengthOf(harness.policy.completed(DEGREE, false).paint, 1);
        assert.lengthOf(hold.release(), 0);
    });

    it("hands back nothing on a second release", () => {
        const harness = record();
        const hold = harness.policy.hold();
        harness.policy.completed(DEGREE, false, hold);

        assert.lengthOf(hold.release(), 1);
        assert.lengthOf(hold.release(), 0);
    });

    it("still counts a member that was suppressed as having had its moment", () => {
        const harness = record();
        harness.layers = [layerOf("mine", { by: "user" })];

        const decision = harness.policy.completed(DEGREE, false);

        assert.lengthOf(decision.paint, 0);
        assert.isTrue(decision.painted, "the moment passed, so a later completion paints nothing");
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
 * The real stack, with what the policy decides applied to it as the verbs a consumer calls would
 * apply it: a session plans the same commands into the run's own step.
 * @returns The stack, and a function finishing a run over it.
 */
function realStack(): { styles: SessionStylesApi; finish: (run: AutoApplyRun) => Promise<void> } {
    const styles = createStylesApi({ elements: ELEMENTS, base: [ELEMENT_BASE], runs: RUN_SOURCE });
    const policy = createAutoApplyPolicy({ styles: () => styles });
    const finish = async (run: AutoApplyRun): Promise<void> => {
        for (const suggestion of policy.completed(run, false).paint) {
            await (suggestion.as === "highlight" ? styles.highlight(suggestion.spec) : styles.encode(suggestion.spec));
        }
    };

    return { styles, finish };
}

describe("what the policy leaves in a real stack", () => {
    it("adds one layer, scoped to the elements the run measured", async () => {
        const { styles, finish } = realStack();

        await finish(BETWEENNESS);

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
        const { styles, finish } = realStack();

        await finish(BETWEENNESS);

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
        const { styles, finish } = realStack();

        await finish(BETWEENNESS);
        await finish(DEGREE);

        const layers = styles.list();

        assert.lengthOf(layers, 3);
        assert.deepStrictEqual(layers[2].selector, { match: "has", path: "results.degree.value" });
    });

    it("paints a route as one exclusive highlight over both halves it runs through", async () => {
        const { styles, finish } = realStack();

        await finish(ROUTE);

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
        const { styles, finish } = realStack();

        await finish(ROUTE);
        await finish(INFLUENCERS);

        const highlights = styles.list().filter((layer) => layer.kind === "highlight");

        assert.lengthOf(highlights, 1);
        assert.strictEqual(highlights[0].target, "node");
        assert.deepStrictEqual(highlights[0].selector, {
            match: "expression",
            where: "results.influencers.in == `true`",
        });
    });

    it("leaves the element's own layers where they are", async () => {
        const { styles, finish } = realStack();

        await finish(BETWEENNESS);
        await finish(ROUTE);

        const [bottom] = styles.list();

        assert.strictEqual(bottom.name, "Default");
        assert.strictEqual(bottom.locked, true);
    });
});

// ---------------------------------------------------------------------------------------------
// What a session's runs paint, and when
// ---------------------------------------------------------------------------------------------

/**
 * The layers bound to one run, in a session.
 * @param session - The session.
 * @param runId - The run.
 * @returns Its layers, bottom first.
 */
function layersOf(session: GraphSession, runId: RunId): Layer[] {
    return session.styles.list().filter((each) => each.source.by === "run" && each.source.runId === runId);
}

/**
 * The channels a session's run layers encode, in stack order.
 * @param session - The session.
 * @returns The channels.
 */
function encodedChannels(session: GraphSession): string[] {
    return session.styles
        .list()
        .filter((each) => each.source.by === "run")
        .flatMap((each) => Object.keys(each.encode ?? {}));
}

describe("the size layer in a real stack", () => {
    it("is added beside the colour layer and removed with the run's other layers", async () => {
        const { styles, finish } = realStack();

        await finish({ ...BETWEENNESS, style: { size: true } });

        const size = styles.list().find((layer) => layer.encode?.["node.size"] !== undefined);

        assert.isDefined(size);
        assert.deepStrictEqual(size?.selector, { match: "has", path: "results.betweenness.value" });

        await styles.removeBySource((source) => source.by === "run" && source.runId === "betweenness");

        assert.lengthOf(styles.list(), 1, "only the element's base layer is left");
    });
});

describe("what a session's runs paint", () => {
    it("paints a run that finished, in the step that records it", async () => {
        const session = await fixtureSession();

        const run = session.runs.start("degree", {}, { as: "deg" });
        await run;

        assert.lengthOf(layersOf(session, "deg"), 1);
        assert.lengthOf(session.history.steps, 1, "the run and its layer are one step");
        session.dispose();
    });

    it("paints a sweep once rather than once per member", async () => {
        // Three members, one picture. The batch holds the policy for its whole life, so the two
        // layers that would have been painted over are never added at all.
        const session = await fixtureSession();

        await session.runs.batch([{ algorithm: "degree" }, { algorithm: "betweenness" }, { algorithm: "pagerank" }]);

        assert.deepStrictEqual(encodedChannels(session), ["node.color"]);
        assert.strictEqual(session.runs.list().length, 3, "every member still ran and kept its result");
        assert.lengthOf(session.history.steps, 1, "the batch and its layer are one step");
        session.dispose();
    });

    it("paints beneath a user layer that colours one node, so the override still wins there", async () => {
        const session = await fixtureSession();
        const mine = await session.styles.add({
            name: "n1 in red",
            selector: { match: "ids", nodes: ["n1"] },
            set: { "node.color": "#ff0000" },
        });

        await session.runs.start("degree", {}, { as: "deg" });

        const ids = session.styles.list().map((each) => each.id);
        const [derived] = layersOf(session, "deg");
        assert.isDefined(derived, "the run painted the nodes it measured");
        assert.isBelow(ids.indexOf(derived.id), ids.indexOf(mine.id), "the hand-coloured node keeps its colour");

        await session.runs.batch([{ algorithm: "degree", as: "deg2" }]);

        const after = session.styles.list().map((each) => each.id);
        const [batched] = layersOf(session, "deg2");
        assert.isDefined(batched, "a sweep paints too");
        assert.isBelow(after.indexOf(batched.id), after.indexOf(mine.id));
        assert.isAbove(after.indexOf(batched.id), after.indexOf(derived.id), "later runs still stack above earlier");
        session.dispose();
    });

    it("paints nothing for a run started with the picture turned off", async () => {
        const session = await fixtureSession();

        await session.runs.start("degree", {}, { style: false });

        assert.deepStrictEqual(encodedChannels(session), []);
        session.dispose();
    });

    it("paints a node size as well when the run was started with style: { size }", async () => {
        const session = await fixtureSession();

        await session.runs.start("degree", {}, { style: { size: [2, 6] } });

        assert.deepStrictEqual(encodedChannels(session), ["node.color", "node.size"]);
        const size = session.styles.list().find((each) => each.encode?.["node.size"] !== undefined);
        assert.deepStrictEqual((size?.encode?.["node.size"] as { range?: unknown } | undefined)?.range, [2, 6]);
        session.dispose();
    });

    it("carries the style object through a batch member", async () => {
        const session = await fixtureSession();

        await session.runs.batch([{ algorithm: "degree", style: { size: true } }]);

        assert.include(encodedChannels(session), "node.size");
        session.dispose();
    });

    it("paints again after the run was removed and started afresh", async () => {
        const session = await fixtureSession();

        const first = session.runs.start("degree", {}, { as: "deg" });
        await first;
        session.runs.remove(first.id);
        assert.lengthOf(layersOf(session, "deg"), 0, "the layer went with the run");
        await session.runs.start("degree", {}, { as: "deg" });

        assert.lengthOf(layersOf(session, "deg"), 1);
        session.dispose();
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
    it("has painted the run's layers once the stack has settled", async () => {
        const session = createGraphSession({
            runs: { execute: (context) => Promise.resolve({ result: stubResult(context.runId) }) },
        });

        const before = session.styles.list().length;
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        await session.styles.settled();

        assert.isAbove(session.styles.list().length, before, "the run's layer is in the stack");
        assert.isFalse((session as ElementSession).paint.painting(), "and no pass is still on its way");
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
    it("reaches a listener rather than being swallowed, and the run is still recorded", async () => {
        const session = await fixtureSession();
        const dispatcher = dispatcherOf(session as ElementSession);
        const stack = dispatcher.services.styles;
        assert.isDefined(stack);
        // The stack refuses every encoding: the element plans the run's suggestion into the step
        // that records the run, which nobody asked for layer by layer, so the refusal has to
        // arrive somewhere other than a call site.
        dispatcher.services.styles = {
            execute: (command, draft) => {
                if (command.op === "style.encode") {
                    throw new Error("the stack said no");
                }

                return stack.execute(command, draft);
            },
        };
        const problems: StyleProblem[] = [];
        const stop = session.on("style:problem", (problem) => {
            problems.push(problem);
        });

        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        stop();

        assert.lengthOf(problems, 1, "the element tried to paint, was refused, and said so");
        assert.strictEqual(problems[0].runId, "degree");
        assert.strictEqual(problems[0].error.source, "style");
        assert.strictEqual(run.status, "succeeded");
        assert.lengthOf(session.history.steps, 1, "the run is recorded without the refused layer");
        session.dispose();
    });
});
