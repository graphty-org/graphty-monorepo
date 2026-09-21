import { assert, describe, it } from "vitest";

import { clearRegisteredPalettesForTesting, registerPalette } from "../../../src/catalog/paletteRegistry";
import { paletteDescriptor } from "../../../src/catalog/palettes";
import type { Channel, FieldDescriptor, LayerSpec, PaletteDescriptor, Path, RunId, StyleDocument } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import type { RunRef } from "../../../src/session/results/types";
import { prepareBinding, type PreparedBinding } from "../../../src/session/styles/encoding";
import {
    type ChannelExplanation,
    type CompiledLayer,
    createStylesApi,
    type ElementLayerSpec,
    type EncodingRun,
    type EncodingSource,
    type EncodingSpec,
    type ExplainTarget,
    type FieldWords,
    type HighlightSpec,
    type Layer,
    type LayerEdit,
    type LayerPosition,
    type LayerProblem,
    type LayerRepaint,
    type LegendBlock,
    type LegendSwatch,
    type PathDirectory,
    type RepaintContext,
    type RepaintReason,
    type RepaintReport,
    type RepaintRequest,
    type Selector,
    type SessionStylesApi,
    type StyleChange,
    type StyleContribution,
    type StyleExplanation,
    type StylesApi,
    type StylesSources,
    type TemplateOptions,
    type TemplateReport,
    type UnboundLayer,
    type ValidationResult,
} from "../../../src/session/styles/index";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import { createScaleRegistry, type ScaleRegistry } from "../../../src/session/styles/scales";

/** One element's columns, keyed by the path a selector names. */
type Row = Readonly<Record<Path, unknown>>;

/**
 * Three nodes: two a run measured and one it never looked at.
 *
 * The route column carries FALSE for the node the route did not take rather than leaving it out,
 * which is the whole reason a highlight asks about the value instead of its presence.
 */
const NODES: readonly Row[] = [
    { "data.rank": 3, "results.louvain.group": "a", "results.betweenness.value": 0, "results.route.onPath": true },
    { "data.rank": 9, "results.betweenness.value": 8, "results.route.onPath": false },
    {},
];

/** Every path this session can answer. */
const KNOWN: readonly Path[] = [
    "data.rank",
    "results.louvain.group",
    "results.betweenness.value",
    "results.route.onPath",
];

/** What the session can say about one element. */
const ELEMENTS: SelectorSource = {
    nodeValue: (index, path) => NODES[index]?.[path],
    edgeValue: () => undefined,
    nodeIdOf: (index) => `n${String(index)}`,
    edgeIdOf: (index) => `e${String(index)}`,
};

/** Which paths this session answers, and what it would have answered instead. */
const DIRECTORY: PathDirectory = {
    answers: (path) => KNOWN.includes(path),
    candidates: () => KNOWN,
};

/** The element's own layer, which every harness seeds at the bottom. */
const ELEMENT_BASE: ElementLayerSpec = {
    name: "Default",
    source: { by: "element", reason: "default" },
    kind: "base",
    selector: { match: "everything" },
    set: { "node.color": "#333333" },
};

/** One published field, spelled out so a test can say exactly what a run offers. */
function field(name: string, kind: FieldDescriptor["kind"], type: FieldDescriptor["type"], runId: RunId): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type, path: `results.${runId}.${name}` };
}

/** A centrality run: a number per node, which is a thing to encode. */
const BETWEENNESS: EncodingRun = {
    id: "betweenness",
    label: "Betweenness",
    algorithm: "betweenness",
    params: { normalized: true },
    shape: "node-metric",
    fields: [field("value", "node", "number", "betweenness"), field("max", "graph", "number", "betweenness")],
};

/** A route: membership on the nodes AND on the edges, which is a thing to highlight. */
const ROUTE: EncodingRun = {
    id: "route",
    label: "Shortest Path",
    algorithm: "shortest-path",
    params: {},
    shape: "path",
    fields: [
        field("onPath", "node", "boolean", "route"),
        field("order", "node", "integer", "route"),
        field("onPath", "edge", "boolean", "route"),
    ],
};

/** A chosen set of nodes, which is the other thing to highlight. */
const INFLUENCERS: EncodingRun = {
    id: "influencers",
    label: "Influencers",
    algorithm: "dominating-set",
    params: {},
    shape: "node-set",
    fields: [field("in", "node", "boolean", "influencers")],
};

/** Every run these harnesses can look up. */
const RUNS: readonly EncodingRun[] = [BETWEENNESS, ROUTE, INFLUENCERS];

/** Where a run is looked up, which is all the two run-bound verbs need from a session. */
const RUN_SOURCE: EncodingSource = {
    run: (ref: RunRef): EncodingRun | undefined => RUNS.find((entry) => entry.id === ref),
    runIds: (): readonly RunId[] => RUNS.map((entry) => entry.id),
};

/** The scales the prepared bindings below are read through. */
const SCALES: ScaleRegistry = createScaleRegistry();

/** The words the session has for one field, which is what a legend prints. */
function fieldWords(path: Path): FieldWords | undefined {
    return path === "results.betweenness.value"
        ? { plainName: "Betweenness", technicalName: "betweenness" }
        : undefined;
}

/** Everything one node column carries, and how many nodes carry nothing. */
function columnOf(path: Path): { column: unknown[]; unmeasured: number } {
    const column: unknown[] = [];
    let unmeasured = 0;

    for (const row of NODES) {
        const value = row[path];

        if (value === undefined || value === null) {
            unmeasured++;
            continue;
        }

        column.push(value);
    }

    return { column, unmeasured };
}

/**
 * Prepare every binding one layer writes, the way a repaint pass does before it paints.
 *
 * The styles API prepares nothing itself: settling a domain is a walk over a column, and the two
 * verbs that read these -- the legend and the explanation -- are synchronous. This stands in for
 * the pass that would have prepared them.
 * @param layer - The layer, or undefined when it has gone.
 * @returns Its prepared bindings, fixed values first and rules second.
 */
function prepareLayer(layer: Layer | undefined): readonly PreparedBinding[] {
    if (layer === undefined) {
        return [];
    }

    const prepared: PreparedBinding[] = [];

    for (const [name, value] of Object.entries(layer.set ?? {})) {
        prepared.push(prepareBinding({ channel: name as Channel, binding: { value }, scales: SCALES }));
    }

    for (const [name, binding] of Object.entries(layer.encode ?? {})) {
        if (binding === undefined) {
            continue;
        }

        const column = "by" in binding ? columnOf(binding.by) : undefined;

        prepared.push(prepareBinding({ channel: name as Channel, binding, scales: SCALES, ...column }));
    }

    return prepared;
}

/**
 * Prepare one COMPILED layer's bindings, the way the real pass keys them.
 *
 * Keyed by the compiled layer object rather than by an id, because that is the shape the real
 * source has: a layer id is recycled when a layer of the same name is added after one is
 * removed, and an index keyed by id would answer for the layer that has gone. Reading the entry
 * handed in also makes this late rather than captured, so a layer that has just been updated is
 * read through its new binding -- which is what a repaint pass does too.
 * @param entry - The compiled layer the stack holds.
 * @returns The bindings a legend and an explanation read.
 */
function liveEncoding(entry: CompiledLayer): readonly PreparedBinding[] {
    return prepareLayer(entry.layer);
}

/**
 * A layer specification with a name of its own.
 * @param name - What to call it.
 * @param extra - Anything else to say about it.
 * @returns The specification.
 */
function layerSpec(name: string, extra: Partial<LayerSpec> = {}): LayerSpec {
    return {
        name,
        selector: { match: "everything" },
        set: { "node.color": "#ff0000" },
        ...extra,
    };
}

interface Harness {
    /** The stack under test. */
    readonly styles: SessionStylesApi;
    /** Every repaint request, in the order they were made. */
    readonly requests: RepaintRequest[];
    /** Every change announcement. */
    readonly changes: StyleChange[];
    /** Held open, the repaint waits on this until it is released. */
    gate: Promise<void> | null;
    /** Thrown by the repaint when set. */
    failure: Error | null;
}

/**
 * A stack with a repaint that records what it was asked to do.
 * @param extra - Anything to override on the sources.
 * @returns The harness.
 */
function makeStyles(extra: Partial<StylesSources> = {}): Harness {
    const requests: RepaintRequest[] = [];
    const changes: StyleChange[] = [];
    const painted: RepaintReport = { nodes: 3, edges: 0 };
    const harness: Partial<Harness> & { gate: Promise<void> | null; failure: Error | null } = {
        requests,
        changes,
        gate: null,
        failure: null,
    };

    const repaint: LayerRepaint = async (request: RepaintRequest, _context: RepaintContext) => {
        requests.push(request);

        if (harness.gate !== null) {
            await harness.gate;
        }

        if (harness.failure !== null) {
            throw harness.failure;
        }

        return painted;
    };

    const built = harness as Harness & { styles: SessionStylesApi };
    const sources: StylesSources = {
        elements: ELEMENTS,
        base: [ELEMENT_BASE],
        paths: DIRECTORY,
        repaint,
        runs: RUN_SOURCE,
        encoding: liveEncoding,
        nodeIndex: (id) => {
            const at = Number(String(id).slice(1));

            return Number.isInteger(at) && at >= 0 && at < NODES.length ? at : undefined;
        },
        edgeIndex: () => undefined,
        field: (path) => fieldWords(path),
        onChange: (change) => {
            changes.push(change);
        },
        ...extra,
    };

    built.styles = createStylesApi(sources);

    return built;
}

/** The names in the stack, bottom first. */
function namesOf(styles: StylesApi): string[] {
    return styles.list().map((layer) => layer.name);
}

/** The code a rejected run rejected with, or what it did instead. */
async function codeOfRejection(awaitable: PromiseLike<unknown>): Promise<string> {
    try {
        await awaitable;
    } catch (error) {
        if (isGraphtyError(error)) {
            return error.code;
        }

        return error instanceof Error ? error.name : "not-an-error";
    }

    return "resolved";
}

/** The code a synchronous read refused with, or what it did instead. */
function codeOfThrow(read: () => unknown): string {
    try {
        read();
    } catch (error) {
        if (isGraphtyError(error)) {
            return error.code;
        }

        return error instanceof Error ? error.name : "not-an-error";
    }

    return "returned";
}

/** Let every queued microtask and timer callback run, so a pending edit really is pending. */
async function flush(): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
}

/** The codes a verdict reported, in order. */
function codesOf(result: ValidationResult): string[] {
    return result.errors.map((problem) => problem.code);
}

describe("the stack a session holds", () => {
    it("seeds the element's own layers at the bottom and locks them", () => {
        const { styles } = makeStyles();
        const [base] = styles.list();

        assert.deepStrictEqual(namesOf(styles), ["Default"]);
        assert.isTrue(base?.locked);
        assert.deepStrictEqual(base?.source, { by: "element", reason: "default" });
    });

    it("puts a new layer on top, because index 0 is the bottom", async () => {
        const { styles } = makeStyles();

        await styles.add(layerSpec("Mine"));

        assert.deepStrictEqual(namesOf(styles), ["Default", "Mine"]);
    });

    it("hands back the same array until the stack changes", async () => {
        const { styles } = makeStyles();
        const before = styles.list();

        assert.strictEqual(styles.list(), before);

        await styles.add(layerSpec("Mine"));

        assert.notStrictEqual(styles.list(), before);
    });

    it("refuses to be written through the list it hands out", () => {
        const { styles } = makeStyles();

        assert.isFrozen(styles.list());
        assert.isFrozen(styles.list()[0]);
    });
});

describe("addressing a layer by id", () => {
    it("keeps a layer findable by id however much moves around it", async () => {
        const { styles } = makeStyles();
        const first = await styles.add(layerSpec("First"));
        const second = await styles.add(layerSpec("Second"));
        const third = await styles.add(layerSpec("Third"));

        await styles.remove(second.id);
        await styles.move(third.id, first.id);

        assert.deepStrictEqual(namesOf(styles), ["Default", "Third", "First"]);
        assert.strictEqual(styles.get(first.id)?.name, "First");
        assert.strictEqual(styles.get(third.id)?.name, "Third");
        assert.isUndefined(styles.get(second.id));
    });

    it("gives two layers with the same name different ids", async () => {
        const { styles } = makeStyles();
        const first = await styles.add(layerSpec("Highlight"));
        const second = await styles.add(layerSpec("Highlight"));

        assert.notStrictEqual(first.id, second.id);
        assert.strictEqual(styles.get(first.id)?.id, first.id);
    });

    it("keeps a layer's id when it is renamed", async () => {
        const { styles } = makeStyles();
        const added = await styles.add(layerSpec("Before"));
        const renamed = await styles.update(added.id, { name: "After" });

        assert.strictEqual(renamed.id, added.id);
        assert.strictEqual(renamed.name, "After");
    });

    it("rejects a verb that names a layer the stack does not hold", async () => {
        const { styles } = makeStyles();

        assert.strictEqual(await codeOfRejection(styles.remove("nothing_1")), "E_BAD_COMMAND");
        assert.strictEqual(await codeOfRejection(styles.update("nothing_1", { name: "x" })), "E_BAD_COMMAND");
        assert.strictEqual(await codeOfRejection(styles.move("nothing_1", null)), "E_BAD_COMMAND");
    });
});

describe("where a layer goes", () => {
    it("sits above or below the neighbour it names, never at a number", async () => {
        const { styles } = makeStyles();
        const first = await styles.add(layerSpec("First"));
        const above: LayerPosition = { above: first.id };
        const below: LayerPosition = { below: first.id };

        await styles.add(layerSpec("Over"), above);
        await styles.add(layerSpec("Under"), below);

        assert.deepStrictEqual(namesOf(styles), ["Default", "Under", "First", "Over"]);
    });

    it("refuses a position that names both neighbours", async () => {
        const { styles } = makeStyles();
        const first = await styles.add(layerSpec("First"));

        const code = await codeOfRejection(styles.add(layerSpec("Confused"), { above: first.id, below: first.id }));

        assert.strictEqual(code, "E_BAD_COMMAND");
        assert.deepStrictEqual(namesOf(styles), ["Default", "First"]);
    });

    it("moves a layer below the one it names, and to the top for null", async () => {
        const { styles } = makeStyles();
        const a = await styles.add(layerSpec("A"));
        const b = await styles.add(layerSpec("B"));
        await styles.add(layerSpec("C"));

        await styles.move(b.id, a.id);

        assert.deepStrictEqual(namesOf(styles), ["Default", "B", "A", "C"]);

        await styles.move(b.id, null);

        assert.deepStrictEqual(namesOf(styles), ["Default", "A", "C", "B"]);
    });

    it("refuses to move a layer below itself", async () => {
        const { styles } = makeStyles();
        const a = await styles.add(layerSpec("A"));

        assert.strictEqual(await codeOfRejection(styles.move(a.id, a.id)), "E_BAD_COMMAND");
    });
});

describe("the model moves only when the paint has succeeded", () => {
    it("does not show the layer until the run has resolved", async () => {
        const harness = makeStyles();
        let release = (): void => undefined;
        harness.gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        const run = harness.styles.add(layerSpec("Pending"));

        await flush();

        assert.deepStrictEqual(namesOf(harness.styles), ["Default"]);
        assert.strictEqual(harness.requests.length, 1);

        release();
        await run;

        assert.deepStrictEqual(namesOf(harness.styles), ["Default", "Pending"]);
    });

    it("leaves the stack exactly as it was when the repaint fails", async () => {
        const harness = makeStyles();
        harness.failure = new Error("the renderer gave up");

        const code = await codeOfRejection(harness.styles.add(layerSpec("Doomed")));

        assert.strictEqual(code, "E_INTERNAL");
        assert.deepStrictEqual(namesOf(harness.styles), ["Default"]);
    });

    it("leaves the stack exactly as it was when the edit is cancelled mid-paint", async () => {
        const harness = makeStyles();
        let release = (): void => undefined;
        harness.gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        const run = harness.styles.add(layerSpec("Cancelled"));

        await flush();
        run.cancel("a newer edit replaced this one");

        assert.strictEqual(await codeOfRejection(run), "AbortError");

        // The repaint in this harness ignores its signal, exactly as a careless one would. The
        // stack must still be untouched: a cancelled edit that committed anyway is the defect.
        release();
        await flush();

        assert.deepStrictEqual(namesOf(harness.styles), ["Default"]);
    });

    it("refuses a dry run rather than performing half of one", async () => {
        const harness = makeStyles();

        const code = await codeOfRejection(harness.styles.add(layerSpec("Asked"), undefined, { dryRun: true }));

        assert.strictEqual(code, "E_UNSUPPORTED");
        assert.deepStrictEqual(namesOf(harness.styles), ["Default"]);
    });
});

describe("what the repaint is handed", () => {
    it("says what the layer was and what it now is, and where the stack changed", async () => {
        const harness = makeStyles();
        const added = await harness.styles.add(layerSpec("Mine"));
        const addRequest = harness.requests[0];
        const addEdit: LayerEdit | undefined = addRequest?.edits[0];
        const reason: RepaintReason | undefined = addRequest?.reason;

        assert.strictEqual(reason, "add");
        assert.strictEqual(addEdit?.previous, null);
        assert.strictEqual(addEdit?.next?.layer.id, added.id);
        assert.strictEqual(addRequest?.fromIndex, 1);
        assert.deepStrictEqual(
            addRequest?.stack.map((entry: CompiledLayer) => entry.layer.name),
            ["Default", "Mine"],
        );

        await harness.styles.update(added.id, { set: { "node.color": "#00ff00" } });
        const updateEdit = harness.requests[1]?.edits[0];

        assert.strictEqual(updateEdit?.previous?.layer.set?.["node.color"], "#ff0000");
        assert.strictEqual(updateEdit?.next?.layer.set?.["node.color"], "#00ff00");

        await harness.styles.remove(added.id);
        const removeEdit = harness.requests[2]?.edits[0];

        assert.strictEqual(removeEdit?.next, null);
        assert.strictEqual(removeEdit?.previous?.layer.id, added.id);
    });

    it("hands over a compiled predicate rather than a selector to parse", async () => {
        const { styles } = makeStyles();

        await styles.add(layerSpec("Measured", { selector: { match: "has", path: "results.louvain.group" } }));

        const compiled: readonly CompiledLayer[] = styles.compiled();
        const measured = compiled[1];

        assert.strictEqual(measured?.selector.match, "has");
        assert.deepStrictEqual(measured?.selector.paths, ["results.louvain.group"]);
        assert.isTrue(measured?.selector.test?.(0));
        assert.isFalse(measured?.selector.test?.(1));
    });

    it("repaints from the lower of the two positions a move spans", async () => {
        const harness = makeStyles();
        const a = await harness.styles.add(layerSpec("A"));
        await harness.styles.add(layerSpec("B"));
        harness.requests.length = 0;

        await harness.styles.move(a.id, null);

        assert.strictEqual(harness.requests[0]?.fromIndex, 1);
    });

    it("paints nothing, and says so, when no renderer is bound", async () => {
        const changes: StyleChange[] = [];
        const styles = createStylesApi({
            elements: ELEMENTS,
            onChange: (change) => {
                changes.push(change);
            },
        });

        await styles.add(layerSpec("Headless"));

        assert.strictEqual(changes[0]?.painted, null);
        assert.strictEqual(changes[0]?.reason, "add");
        assert.deepStrictEqual(namesOf(styles), ["Headless"]);
    });

    it("reports the paths a new layer reads that nothing answers", async () => {
        const harness = makeStyles();

        await harness.styles.add(layerSpec("Waiting", { selector: { match: "has", path: "results.betweenness.score" } }));

        assert.deepStrictEqual(harness.changes[0]?.unresolvedPaths, ["results.betweenness.score"]);
    });
});

describe("a layer the element owns", () => {
    it("refuses to be removed, changed or moved", async () => {
        const { styles } = makeStyles();
        const [base] = styles.list();
        const id = base?.id ?? "";

        assert.strictEqual(await codeOfRejection(styles.remove(id)), "E_PROTECTED");
        assert.strictEqual(await codeOfRejection(styles.update(id, { name: "Mine now" })), "E_PROTECTED");
        assert.strictEqual(await codeOfRejection(styles.move(id, null)), "E_PROTECTED");
        assert.deepStrictEqual(namesOf(styles), ["Default"]);
    });

    it("cannot be minted through add", async () => {
        const { styles } = makeStyles();

        const code = await codeOfRejection(
            styles.add(layerSpec("Pretender", { source: { by: "element", reason: "selection" } })),
        );

        assert.strictEqual(code, "E_PROTECTED");
        assert.deepStrictEqual(namesOf(styles), ["Default"]);
    });

    it("is never swept, whatever the predicate says", async () => {
        const { styles } = makeStyles();
        await styles.add(layerSpec("Mine"));

        const removed = await styles.removeBySource(() => true);

        assert.strictEqual(removed.length, 1);
        assert.deepStrictEqual(namesOf(styles), ["Default"]);
    });

    it("is told apart by its source rather than by its name", async () => {
        const { styles } = makeStyles();
        await styles.add(layerSpec("Default"));

        const locked = styles.list().filter((layer) => layer.locked);

        assert.strictEqual(locked.length, 1);
        assert.deepStrictEqual(locked[0]?.source, { by: "element", reason: "default" });
    });
});

describe("sweeping layers up by where they came from", () => {
    it("takes away everything one run produced and leaves the rest", async () => {
        const { styles } = makeStyles();
        const runSource: LayerSpec["source"] = {
            by: "run",
            runId: "louvain_1",
            algorithm: "louvain",
            params: {},
        };
        await styles.add(layerSpec("Groups", { source: runSource }));
        await styles.add(layerSpec("Mine"));
        await styles.add(layerSpec("Sizes", { source: runSource }));

        const removed = await styles.removeBySource((source) => source.by === "run" && source.runId === "louvain_1");

        assert.strictEqual(removed.length, 2);
        assert.deepStrictEqual(namesOf(styles), ["Default", "Mine"]);
    });

    it("answers with an empty list when nothing matched, which is not a failure", async () => {
        const { styles } = makeStyles();

        const removed = await styles.removeBySource((source) => source.by === "template");

        assert.deepStrictEqual(removed, []);
        assert.deepStrictEqual(namesOf(styles), ["Default"]);
    });
});

describe("checking a layer before it is committed", () => {
    it("accepts a sound specification and writes nothing", () => {
        const { styles } = makeStyles();
        const result: ValidationResult = styles.validate(layerSpec("Candidate"));

        assert.isTrue(result.ok);
        assert.deepStrictEqual(result.errors, []);
        assert.deepStrictEqual(namesOf(styles), ["Default"]);
    });

    it("reports every problem at once, each with a path into the specification", () => {
        const { styles } = makeStyles();
        const result = styles.validate({
            name: "",
            selector: { match: "everything" },
            set: { "node.colour": "#ff0000", "node.size": -4 } as LayerSpec["set"],
        });

        assert.isFalse(result.ok);
        assert.deepStrictEqual(codesOf(result), ["E_BAD_LAYER", "E_UNKNOWN_CHANNEL", "E_OPTION_RANGE"]);
        assert.deepStrictEqual(
            result.errors.map((problem: LayerProblem) => problem.path),
            ["name", "set.node.colour", "set.node.size"],
        );
    });

    it("points at the character an expression went wrong at", () => {
        const { styles } = makeStyles();
        const selector: Selector = { match: "expression", where: "data.rank >" };
        const result = styles.validate(layerSpec("Broken", { selector }));

        assert.isFalse(result.ok);
        assert.strictEqual(result.errors[0]?.path, "selector");
        assert.isNumber(result.errors[0]?.position);
    });

    it("refuses an empty selector rather than reading it as everything", () => {
        const { styles } = makeStyles();
        const result = styles.validate(layerSpec("Silent", { selector: { match: "has", path: "" } }));

        assert.deepStrictEqual(codesOf(result), ["E_SELECTOR_EMPTY"]);
    });

    it("refuses a layer that writes no channel at all", () => {
        const { styles } = makeStyles();
        const result = styles.validate({ name: "Empty", target: "node", selector: { match: "everything" } });

        assert.deepStrictEqual(codesOf(result), ["E_BAD_LAYER"]);
    });

    it("refuses a channel the layer's target does not paint", () => {
        const { styles } = makeStyles();
        const result = styles.validate({
            name: "Mixed",
            target: "edge",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });

        assert.deepStrictEqual(codesOf(result), ["E_BAD_LAYER"]);
    });

    it("refuses a channel the element draws nothing for, and says what it is", () => {
        const { styles } = makeStyles();
        const result = styles.validate({
            name: "Marker",
            target: "node",
            selector: { match: "everything" },
            set: { "node.marker": "star" } as LayerSpec["set"],
        });

        assert.deepStrictEqual(codesOf(result), ["E_UNSUPPORTED"]);
        assert.include(result.errors[0]?.message ?? "", "node.marker");
    });

    it("refuses a scale nothing is registered under, and lists the ones that are", () => {
        const { styles } = makeStyles();
        const result = styles.validate({
            name: "Ramped",
            selector: { match: "has", path: "data.rank" },
            encode: { "node.color": { by: "data.rank", scale: "cubic" } },
        });

        assert.deepStrictEqual(codesOf(result), ["E_UNKNOWN_SCALE"]);
        assert.include(result.errors[0]?.candidates ?? [], "linear");
    });

    it("refuses a run-bound encoding on a layer that paints everything", () => {
        const { styles } = makeStyles();
        const result = styles.validate({
            name: "Unscoped",
            selector: { match: "everything" },
            encode: { "node.color": { by: "results.louvain.group", scale: "ordinal" } },
        });

        assert.deepStrictEqual(codesOf(result), ["E_UNSCOPED_RUN_ENCODING"]);
    });

    it("refuses a channel written twice, once as a literal and once as an encoding", () => {
        const { styles } = makeStyles();
        const result = styles.validate({
            name: "Twice",
            selector: { match: "has", path: "data.rank" },
            set: { "node.color": "#ff0000" },
            encode: { "node.color": { by: "data.rank" } },
        });

        assert.deepStrictEqual(codesOf(result), ["E_BAD_LAYER"]);
    });

    it("reports a path nothing answers without calling it an error", () => {
        const { styles } = makeStyles();
        const result = styles.validate(layerSpec("Early", { selector: { match: "has", path: "results.pagerank.score" } }));

        assert.isTrue(result.ok);
        assert.deepStrictEqual(result.unresolvedPaths, ["results.pagerank.score"]);
    });

    it("reports no unresolved path when the session cannot say", () => {
        const styles = createStylesApi({ elements: ELEMENTS });
        const result = styles.validate(layerSpec("Early", { selector: { match: "has", path: "results.pagerank.score" } }));

        assert.isTrue(result.ok);
        assert.deepStrictEqual(result.unresolvedPaths, []);
    });
});

describe("refusals, and where they arrive", () => {
    it("never throws out of a write verb, so a click handler cannot be broken by one", async () => {
        const { styles } = makeStyles();
        let run: PromiseLike<Layer> | null = null;

        assert.doesNotThrow(() => {
            run = styles.add({ name: "", selector: { match: "everything" } });
        });

        assert.strictEqual(await codeOfRejection(run ?? Promise.resolve()), "E_BAD_LAYER");
    });

    it("carries every problem on the refusal, not only the first", async () => {
        const { styles } = makeStyles();

        try {
            await styles.add({ name: "", selector: { match: "everything" } });
            assert.fail("the run should have rejected");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            assert.isArray(isGraphtyError(error) ? error.details.errors : null);
        }
    });

    it("refuses an update that would leave a layer add would have refused", async () => {
        const { styles } = makeStyles();
        const added = await styles.add(layerSpec("Sound"));

        const code = await codeOfRejection(styles.update(added.id, { set: undefined }));

        assert.strictEqual(code, "E_BAD_LAYER");
        assert.strictEqual(styles.get(added.id)?.set?.["node.color"], "#ff0000");
    });
});

describe("the consumer's own bag", () => {
    it("hands back the very object it was given", async () => {
        const { styles } = makeStyles();
        const bag = { row: "expanded", pinned: [1, 2, 3] };

        const added = await styles.add(layerSpec("Carrier", { userData: bag }));

        assert.strictEqual(added.userData, bag);
        assert.strictEqual(styles.get(added.id)?.userData, bag);
    });

    it("survives an update that does not mention it, and is replaced by one that does", async () => {
        const { styles } = makeStyles();
        const bag = { row: "expanded" };
        const added = await styles.add(layerSpec("Carrier", { userData: bag }));

        const renamed = await styles.update(added.id, { name: "Still carrying" });

        assert.strictEqual(renamed.userData, bag);

        const replaced = await styles.update(added.id, { userData: { row: "collapsed" } });

        assert.deepStrictEqual(replaced.userData, { row: "collapsed" });
    });
});

describe("encode(), the one path an analysis layer takes", () => {
    it("writes the path, the selector, the kind and the source, so a caller cannot get them wrong", async () => {
        const { styles } = makeStyles();
        const spec: EncodingSpec = { run: "betweenness", channel: "node.color" };

        const layer = await styles.encode(spec);

        assert.strictEqual(layer.kind, "encoding");
        assert.strictEqual(layer.target, "node");
        assert.deepStrictEqual(layer.selector, { match: "has", path: "results.betweenness.value" });
        assert.deepStrictEqual(layer.source, {
            by: "run",
            runId: "betweenness",
            algorithm: "betweenness",
            params: { normalized: true },
        });
    });

    it("replaces the layer already painting that channel from that run, keeping its id and its place", async () => {
        const { styles } = makeStyles();
        const first = await styles.encode({ run: "betweenness", channel: "node.color", name: "By betweenness" });
        await styles.add(layerSpec("Mine"));

        const second = await styles.encode({
            run: "betweenness",
            channel: "node.color",
            palette: "inferno",
            name: "By betweenness",
        });

        const rebound = styles.get(first.id)?.encode?.["node.color"];

        assert.strictEqual(second.id, first.id);
        assert.deepStrictEqual(namesOf(styles), ["Default", "By betweenness", "Mine"]);
        assert.strictEqual(rebound !== undefined && "by" in rebound ? rebound.palette : null, "inferno");
    });

    it("refuses a palette nothing registered, at the call rather than at the repaint", async () => {
        // The palette used to be written onto the layer unchecked, so a misspelling became a
        // layer that painted nothing one frame later, with the failure arriving somewhere a
        // settings form is not listening.
        const { styles } = makeStyles();

        const code = await codeOfRejection(
            styles.encode({ run: "betweenness", channel: "node.color", palette: "no-such-palette" }),
        );

        assert.strictEqual(code, "E_UNKNOWN_PALETTE");
        assert.deepStrictEqual(namesOf(styles), ["Default"], "and nothing was added");
    });

    it("takes over the layer the element derived, and the layer stops being the element's", async () => {
        const derived: ElementLayerSpec = {
            name: "Betweenness",
            source: { by: "element", reason: "default" },
            kind: "encoding",
            selector: { match: "has", path: "results.betweenness.value" },
            encode: { "node.color": { by: "results.betweenness.value", palette: "viridis" } },
        };
        const { styles } = makeStyles({ base: [ELEMENT_BASE, derived] });
        const before = styles.list()[1];

        const taken = await styles.encode({ run: "betweenness", channel: "node.color", name: "Betweenness" });

        assert.strictEqual(taken.id, before?.id);
        assert.strictEqual(styles.list().length, 2);
        assert.isFalse(taken.locked);
    });

    it("leaves a layer somebody wrote by hand alone, and stacks above it", async () => {
        const { styles } = makeStyles();
        await styles.add(
            layerSpec("Mine", {
                selector: { match: "has", path: "results.betweenness.value" },
                set: undefined,
                encode: { "node.color": { by: "results.betweenness.value", palette: "viridis" } },
            }),
        );

        const added = await styles.encode({ run: "betweenness", channel: "node.color", name: "Derived" });

        assert.deepStrictEqual(namesOf(styles), ["Default", "Mine", "Derived"]);
        assert.strictEqual(styles.list()[2]?.id, added.id);
    });

    it("paints another channel of the same run as a layer of its own", async () => {
        const { styles } = makeStyles();

        await styles.encode({ run: "betweenness", channel: "node.color", name: "Colour" });
        await styles.encode({ run: "betweenness", channel: "node.size", name: "Size" });

        assert.deepStrictEqual(namesOf(styles), ["Default", "Colour", "Size"]);
    });

    it("says which runs there are when it does not hold the one it was given", async () => {
        const { styles } = makeStyles();

        assert.strictEqual(
            await codeOfRejection(styles.encode({ run: "pagerank", channel: "node.color" })),
            "E_UNKNOWN_RUN",
        );
    });

    it("refuses in a session that cannot look a run up at all", async () => {
        const styles = createStylesApi({ elements: ELEMENTS });

        assert.strictEqual(
            await codeOfRejection(styles.encode({ run: "betweenness", channel: "node.color" })),
            "E_UNSUPPORTED",
        );
    });
});

describe("highlight(), which is exclusive", () => {
    it("paints both halves of a route, because one layer never paints both", async () => {
        const { styles } = makeStyles();

        const layers = await styles.highlight({ run: "route" });

        assert.deepStrictEqual(
            layers.map((layer) => layer.target),
            ["node", "edge"],
        );
        assert.deepStrictEqual(
            layers.map((layer) => layer.kind),
            ["highlight", "highlight"],
        );
    });

    it("asks what the membership column SAYS, so the elements the run did not choose are left alone", async () => {
        const { styles } = makeStyles();

        const [nodes] = await styles.highlight({ run: "route" });

        assert.deepStrictEqual(nodes?.selector, {
            match: "expression",
            where: "results.route.onPath == `true`",
        });
    });

    it("matches the node the route took and not the node it passed by", async () => {
        const { styles } = makeStyles();

        const [nodes] = await styles.highlight({ run: "route" });
        const compiled = styles.compiled().find((entry) => entry.layer.id === nodes?.id);

        assert.isTrue(compiled?.selector.test?.(0));
        assert.isFalse(compiled?.selector.test?.(1));
    });

    it("paints the element's own highlight colour when the caller names none", async () => {
        const { styles } = makeStyles();
        const [highlighted] = paletteDescriptor("blue-highlight")?.colors ?? [];

        const [nodes] = await styles.highlight({ run: "influencers" });

        assert.strictEqual(nodes?.set?.["node.color"], highlighted);
    });

    it("paints only the half the caller's style names a channel for", async () => {
        const { styles } = makeStyles();
        const spec: HighlightSpec = { run: "route", set: { "edge.color": "#ff0000" } };

        const layers = await styles.highlight(spec);

        assert.deepStrictEqual(
            layers.map((layer) => layer.target),
            ["edge"],
        );
        assert.strictEqual(layers[0]?.set?.["edge.color"], "#ff0000");
    });

    it("replaces the highlight that was there, and leaves every other layer alone", async () => {
        const { styles } = makeStyles();
        await styles.add(layerSpec("Mine"));
        const route = await styles.highlight({ run: "route" });

        const chosen = await styles.highlight({ run: "influencers" });

        assert.deepStrictEqual(namesOf(styles), ["Default", "Mine", "Influencers"]);
        assert.isUndefined(styles.get(route[0]?.id ?? ""));
        assert.strictEqual(styles.get(chosen[0]?.id ?? "")?.kind, "highlight");
    });

    it("refuses a run that measured every element, and names the verb that paints one", async () => {
        const { styles } = makeStyles();

        assert.strictEqual(await codeOfRejection(styles.highlight({ run: "betweenness" })), "E_BAD_COMMAND");
    });

    it("refuses a field the run does not publish", async () => {
        const { styles } = makeStyles();

        assert.strictEqual(
            await codeOfRejection(styles.highlight({ run: "route", field: "onRoute" })),
            "E_UNKNOWN_ATTRIBUTE",
        );
    });

    it("refuses a style that names no channel for the half the run chose", async () => {
        const { styles } = makeStyles();

        assert.strictEqual(
            await codeOfRejection(styles.highlight({ run: "influencers", set: { "edge.color": "#ff0000" } })),
            "E_BAD_COMMAND",
        );
    });
});

describe("the legend, and why one element looks the way it does", () => {
    it("derives a block per encoded channel, in the words the session has for the field", async () => {
        const { styles } = makeStyles();
        await styles.encode({ run: "betweenness", channel: "node.color", name: "By betweenness" });

        const blocks: readonly LegendBlock[] = styles.legend();
        const [block] = blocks;
        const swatches: readonly LegendSwatch[] = block?.swatches ?? [];

        assert.strictEqual(blocks.length, 1);
        assert.strictEqual(block?.channel, "node.color");
        assert.strictEqual(block?.runId, "betweenness");
        assert.strictEqual(block?.field?.plainName, "Betweenness");
        assert.strictEqual(block?.field?.path, "results.betweenness.value");
        assert.isAbove(swatches.length, 0);
        assert.isTrue(swatches.every((swatch) => typeof swatch.color === "string"));
    });

    it("has nothing to say in a session with nothing prepared to paint from", async () => {
        const styles = createStylesApi({ elements: ELEMENTS, runs: RUN_SOURCE });
        await styles.encode({ run: "betweenness", channel: "node.color" });

        assert.deepStrictEqual(styles.legend(), []);
    });

    it("names the layer that won a channel and refuses to call a rule editable", async () => {
        const { styles } = makeStyles();
        const layer = await styles.encode({ run: "betweenness", channel: "node.color", name: "By betweenness" });

        const why: StyleExplanation = styles.explain({ node: "n1" });
        const colour: ChannelExplanation | undefined = why.channels.find((entry) => entry.channel === "node.color");

        assert.strictEqual(colour?.layerId, layer.id);
        assert.strictEqual(colour?.mode, "encoded");
        assert.isFalse(colour?.editable);
        assert.isString(colour?.reason);
    });

    it("lists the layers that contributed, bottom first", async () => {
        const { styles } = makeStyles();
        await styles.encode({ run: "betweenness", channel: "node.color", name: "By betweenness" });

        const { contributions } = styles.explain({ node: "n1" });

        assert.deepStrictEqual(
            contributions.map((entry: StyleContribution) => entry.name),
            ["Default", "By betweenness"],
        );
        assert.deepStrictEqual(contributions[1]?.properties, ["node.color"]);
    });

    it("refuses an element this session does not hold", () => {
        const { styles } = makeStyles();

        assert.strictEqual(codeOfThrow(() => styles.explain({ node: "n99" })), "E_BAD_COMMAND");
    });
});

describe("resolveToStatic, which makes a rule editable by ending it", () => {
    it("writes the value the rule produced for that element, and drops the rule", async () => {
        const { styles } = makeStyles();
        const layer = await styles.encode({ run: "betweenness", channel: "node.color", name: "By betweenness" });
        const at: ExplainTarget = { node: "n1" };

        const fixed = await styles.resolveToStatic(layer.id, "node.color", at);

        assert.strictEqual(fixed.id, layer.id);
        assert.isString(fixed.set?.["node.color"]);
        assert.isUndefined(fixed.encode);
        assert.isTrue(styles.explain({ node: "n1" }).channels.find((entry) => entry.channel === "node.color")?.editable);
    });

    it("takes a value out of the picture when the caller names no element", async () => {
        const { styles } = makeStyles();
        const layer = await styles.encode({ run: "betweenness", channel: "node.size", name: "By betweenness" });

        const fixed = await styles.resolveToStatic(layer.id, "node.size");

        assert.isNumber(fixed.set?.["node.size"]);
    });

    it("refuses a channel the layer does not work out from the data", async () => {
        const { styles } = makeStyles();
        const added = await styles.add(layerSpec("Mine"));

        assert.strictEqual(await codeOfRejection(styles.resolveToStatic(added.id, "node.color")), "E_BAD_COMMAND");
    });

    it("refuses a layer the element owns", async () => {
        const { styles } = makeStyles();
        const base = styles.list()[0];

        assert.strictEqual(
            await codeOfRejection(styles.resolveToStatic(base?.id ?? "", "node.color")),
            "E_PROTECTED",
        );
    });
});

/** A document with one layer this session can answer and one it cannot. */
/**
 * A palette no build of the element ships, so a document naming it is meaningful only on a page
 * that registered it -- which is the whole question the two tests below ask.
 */
const DOCUMENT_PALETTE: PaletteDescriptor = {
    id: "house-style",
    plainName: "House Style",
    kind: "categorical",
    colors: ["#112233", "#445566"],
    capacity: 2,
    colorblindSafe: [],
};

const DOCUMENT: StyleDocument = {
    version: 1,
    layers: [
        { name: "Ranked", selector: { match: "has", path: "data.rank" }, set: { "node.size": 2 } },
        {
            name: "Waiting",
            selector: { match: "has", path: "results.pagerank.score" },
            set: { "node.color": "#00ff00" },
        },
    ],
};

describe("a style document, out and back in", () => {
    it("carries the layers somebody chose, and not the element's own", async () => {
        const { styles } = makeStyles();
        await styles.add(layerSpec("Mine"));

        const document = styles.toDocument();

        assert.strictEqual(document.version, 1);
        assert.deepStrictEqual(
            document.layers.map((layer) => layer.name),
            ["Mine"],
        );
    });

    it("round-trips into another stack", async () => {
        const source = makeStyles().styles;
        await source.add(layerSpec("Mine", { selector: { match: "has", path: "data.rank" } }));
        const { styles } = makeStyles();

        const report = await styles.applyTemplate(source.toDocument());

        assert.deepStrictEqual(namesOf(styles), ["Default", "Mine"]);
        assert.strictEqual(report.applied.length, 1);
        assert.deepStrictEqual(report.unbound, []);
    });

    it("applies what binds, disables what does not, and reports both with what it needs", async () => {
        const { styles } = makeStyles();
        const options: TemplateOptions = { templateId: "publication" };

        const report: TemplateReport = await styles.applyTemplate(DOCUMENT, options);
        const { applied, unbound } = report;
        const waiting = styles.get(unbound[0]?.layerId ?? "");

        assert.deepStrictEqual(namesOf(styles), ["Default", "Ranked", "Waiting"]);
        assert.strictEqual(applied.length, 1);
        assert.deepStrictEqual(
            unbound.map((entry: UnboundLayer) => entry.needs),
            [["results.pagerank.score"]],
        );
        assert.include(unbound[0]?.reason ?? "", "results.pagerank.score");
        assert.isFalse(waiting?.enabled);
        assert.isTrue(styles.get(applied[0] ?? "")?.enabled);
    });

    it("files a layer that named no source under the template it arrived in", async () => {
        const { styles } = makeStyles();

        const report = await styles.applyTemplate(DOCUMENT, { templateId: "publication" });
        const applied = styles.get(report.applied[0] ?? "");

        assert.deepStrictEqual(applied?.source, { by: "template", templateId: "publication" });

        const swept = await styles.removeBySource((source) => source.by === "template");

        assert.strictEqual(swept.length, 2);
    });

    it("leaves the stack exactly as it was when one layer is malformed", async () => {
        const { styles } = makeStyles();

        const code = await codeOfRejection(
            styles.applyTemplate({
                version: 1,
                layers: [{ name: "Fine", selector: { match: "everything" }, set: { "node.color": "#ffffff" } }, { name: "", selector: { match: "everything" } }],
            }),
        );

        assert.strictEqual(code, "E_BAD_LAYER");
        assert.deepStrictEqual(namesOf(styles), ["Default"]);
    });

    it("refuses a document claiming to carry the element's own layers", async () => {
        const { styles } = makeStyles();

        const code = await codeOfRejection(
            styles.applyTemplate({
                version: 1,
                layers: [
                    {
                        name: "Pretender",
                        source: { by: "element", reason: "default" },
                        selector: { match: "everything" },
                        set: { "node.color": "#ffffff" },
                    },
                ],
            }),
        );

        assert.strictEqual(code, "E_PROTECTED");
    });

    it("refuses a palette it does not have, rather than painting colours nobody chose", async () => {
        const { styles } = makeStyles();

        const code = await codeOfRejection(
            styles.applyTemplate({
                version: 1,
                layers: [...DOCUMENT.layers],
                palettes: [
                    {
                        id: "house-style",
                        plainName: "House Style",
                        kind: "categorical",
                        colors: ["#112233"],
                        capacity: 1,
                        colorblindSafe: [],
                    },
                ],
            }),
        );

        assert.strictEqual(code, "E_UNKNOWN_PALETTE");
        assert.deepStrictEqual(namesOf(styles), ["Default"]);
    });

    it("applies a document that carries a palette this page has registered", async () => {
        // The other half of the same rule. A document may describe the palettes its layers name,
        // and one already registered here is not a reason to refuse the whole document. The
        // refusal above and this acceptance are the same check reading the same registry.
        registerPalette(DOCUMENT_PALETTE);

        try {
            const { styles } = makeStyles();

            await styles.applyTemplate({
                version: 1,
                layers: [...DOCUMENT.layers],
                palettes: [DOCUMENT_PALETTE],
            });

            assert.deepStrictEqual(namesOf(styles), ["Default", "Ranked", "Waiting"]);
        } finally {
            // The registry is global and there is no unregister, so a test that registers
            // something owes the next one the registry it found.
            clearRegisteredPalettesForTesting();
        }
    });

    it("writes the palettes its layers name that the element does not ship, so a saved look is self-describing", async () => {
        registerPalette(DOCUMENT_PALETTE);

        try {
            const { styles } = makeStyles();

            await styles.add({
                name: "By rank",
                target: "node",
                selector: { match: "has", path: "data.rank" },
                encode: { "node.color": { by: "data.rank", palette: DOCUMENT_PALETTE.id } },
            });
            await styles.add({
                name: "By rank again",
                target: "node",
                selector: { match: "has", path: "data.rank" },
                encode: { "node.color": { by: "data.rank", palette: "viridis" } },
            });

            const document = styles.toDocument();

            assert.deepStrictEqual(
                document.palettes,
                [DOCUMENT_PALETTE],
                "the registered palette travels with the document; the element's own does not, " +
                    "because viridis means the same thing on every page",
            );
        } finally {
            clearRegisteredPalettesForTesting();
        }
    });

    it("refuses a version it does not read", async () => {
        const { styles } = makeStyles();
        const fromDisk = JSON.parse('{"version":2,"layers":[]}') as StyleDocument;

        assert.strictEqual(await codeOfRejection(styles.applyTemplate(fromDisk)), "E_BAD_COMMAND");
    });

    it("leaves the stack as it was when the paint fails", async () => {
        const harness = makeStyles();
        harness.failure = new Error("the renderer gave up");

        await codeOfRejection(harness.styles.applyTemplate(DOCUMENT));

        assert.deepStrictEqual(namesOf(harness.styles), ["Default"]);
    });
});
