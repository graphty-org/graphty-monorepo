/**
 * Every public reader of a graph session, and what it reads with `workingGraph: "visible"`
 * (design/working-graph/design.md section 10).
 *
 * The readers are not listed by hand: `sessionMembers()` walks the session's public API from
 * `GraphSession` through every namespace property (`session.data`, `session.selection`, ...) in the
 * api-extractor reports (`api/*.api.md`), and collects each namespace's methods and its plain
 * properties (`selection.nodes`, `time.current`). `working-graph-readers.test.ts` fails on a member
 * that is in none of these lists:
 *
 * - `PROBES`: a reader whose answer the test checks. A `working` reader, or a `writer` over a set
 *   (a write fed a selector or a target set), answers with a filter hiding one node exactly as it
 *   answers on the same graph without that node; when it takes a scope, `scope: "graph"` brings the
 *   node back. A `whole` reader reads the whole graph by name: its answer is the same in both modes
 *   and still holds the hidden node. `whole` probes are the rows of the `wholeGraph` list in
 *   `graphty-element/working-graph-baseline.json`, each with its reason; `tools/check-working-graph.mjs`
 *   keeps that list from growing without review. A reader still to be fixed is a row of that file's
 *   `notYetWorking` list, and its probe must still fail.
 * - `BY_ID`: a lookup or a write by id, which reads or touches exactly the ids it is given.
 * - `NOT_A_READER`: it reads no nodes or edges: the camera, settings, history, loading, registries,
 *   the schema of the columns, style rules (a rule paints by its selector, and a hidden node draws
 *   nothing).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { GraphSession } from "../../src/session";
import { API_DIR } from "../cost-coverage/api-methods";

/** A class or interface the report declares; `Node_2` is api-extractor's rename of `Node`. */
const OWNER = /^(?:export )?(?:declare )?(?:abstract )?(?:class|interface) (\w+?)(?:_\d+)?\b/;
const METHOD = /^ {4}(?:readonly )?([A-Za-z_$][\w$]*)\??(?:<.*?>)?\(/;
const PROPERTY = /^ {4}(?:readonly )?([A-Za-z_$][\w$]*)\??: (\w+)?/;

/**
 * Each declared owner's member lines, across every report.
 * @returns owner name -> its lines
 */
function declarations(): Map<string, string[]> {
    const blocks = new Map<string, string[]>();
    let lines: string[] | undefined;
    for (const file of readdirSync(API_DIR).filter((name) => name.endsWith(".api.md"))) {
        for (const line of readFileSync(path.join(API_DIR, file), "utf8").split("\n")) {
            const opened = OWNER.exec(line);
            if (opened) {
                const owner = opened[1] ?? "";
                lines = blocks.get(owner) ?? [];
                blocks.set(owner, lines);
            } else if (line === "}") {
                lines = undefined;
            } else {
                lines?.push(line);
            }
        }
    }

    return blocks;
}

/**
 * Every public method and plain property reachable from `GraphSession` through its namespaces.
 * A namespace is a property whose type is a declared interface; it is walked, not listed. Plain
 * properties are listed only on owners that have methods (a namespace, not a data shape).
 * @returns `Owner.member` names, sorted
 */
export function sessionMembers(): string[] {
    const blocks = declarations();
    const walked = new Set<string>();
    const found = new Set<string>();
    const walk = (owner: string): void => {
        const lines = blocks.get(owner);
        if (lines === undefined || walked.has(owner)) {
            return;
        }

        walked.add(owner);
        const methods: string[] = [];
        const plain: string[] = [];
        let internal = false;
        for (const line of lines) {
            if (/^ {4}\/\/ @internal/.test(line)) {
                internal = true;
                continue;
            }

            if (!/^ {4}\S/.test(line) || line.startsWith("    //")) {
                continue;
            }

            const method = METHOD.exec(line);
            const property = method ? null : PROPERTY.exec(line);
            if (!internal && method?.[1] !== undefined && method[1] !== "constructor") {
                methods.push(method[1]);
            } else if (!internal && property?.[1] !== undefined) {
                const type = property[2];
                if (type !== undefined && blocks.has(type) && /;$/.test(line) && line.endsWith(`: ${type};`)) {
                    walk(type);
                } else {
                    plain.push(property[1]);
                }
            }

            internal = false;
        }

        for (const name of methods.length > 0 ? [...methods, ...plain] : []) {
            found.add(`${owner}.${name}`);
        }
    };
    walk("GraphSession");
    return [...found].sort();
}

/** Who answers a probe: the session under test, and the scope it names, if any. */
export type ProbeCall = (session: GraphSession, scope?: "graph") => unknown;

/** How a reader's answer is checked; see the file comment. */
export interface Probe {
    readonly kind: "working" | "writer" | "whole";
    /** Calls the reader and returns the part of its answer the check compares. */
    readonly call: ProbeCall;
    /** It takes a scope: `scope: "graph"` must answer differently, with the hidden node. */
    readonly scoped?: boolean;
}

/** The hidden node, of kind "b"; every other node is of kind "a". */
export const HIDDEN = "h";

/** The filter that hides `HIDDEN`. */
export const KIND_A = { kind: "categories", attribute: "data.kind", values: ["a"] } as const;

const scopeOf = (scope?: "graph"): { scope: "graph" } | undefined => (scope ? { scope } : undefined);
const snapshotIds = (snapshot: {
    readonly nodeCount: number;
    readonly ids: { idOf(row: number): unknown };
}): string[] => Array.from({ length: snapshot.nodeCount }, (_, row) => String(snapshot.ids.idOf(row))).sort();
/** The size an estimate priced, `n=5 m=4`, from its basis. */
const sizeOf = (basis: string): string => /n=\d+ m=\d+/.exec(basis)?.[0] ?? basis;
const idsOf = (rows: readonly { readonly id: unknown }[]): string[] => rows.map((row) => String(row.id)).sort();
const sorted = (ids: Iterable<unknown>): string[] => [...ids].map(String).sort();

/**
 * A layer over every node, colored by kind.
 * @param session - The session.
 * @returns Its id.
 */
async function byKind(session: GraphSession): Promise<string> {
    const layer = await session.styles.add({
        name: "Kinds",
        target: "node",
        selector: { match: "has", path: "data.kind" },
        encode: { "node.color": { by: "data.kind", scale: "ordinal" } },
    });
    await session.styles.settled();
    return layer.id;
}

/**
 * Selects every node and edge of the whole graph by id; ids the graph does not hold are ignored.
 * @param session - The session.
 * @param ids - Every node id of the fixture, hidden or not.
 */
async function selectAll(session: GraphSession, ids: readonly string[]): Promise<void> {
    const edges = session.data.edges({ scope: "graph" }).map((each) => each.id);
    await session.selection.apply({ nodes: ids, edges });
}

/** Every node id of the fixture. */
export const ALL_IDS = ["a0", "a1", "a2", "a3", "a4", HIDDEN] as const;

const run = async (session: GraphSession, scope?: "graph"): Promise<unknown> => {
    const result = await session.run({ op: "algo.run", algorithm: "degree", ...scopeOf(scope) });
    return { measured: result.measured, values: ALL_IDS.map((id) => result.node(id) ?? null) };
};

export const PROBES: Readonly<Record<string, Probe>> = {
    // What a session answers about its graph.
    "GraphSession.find": {
        kind: "working",
        scoped: true,
        call: (s, scope) => {
            const found = s.find(HIDDEN, scopeOf(scope));
            return { total: found.total, records: found.records.length };
        },
    },
    "GraphSession.run": { kind: "working", scoped: true, call: run },
    "GraphSession.estimate": {
        kind: "working",
        scoped: true,
        call: (s, scope) => sizeOf(s.estimate({ op: "algo.run", algorithm: "degree", ...scopeOf(scope) }).basis),
    },
    "GraphSession.plan": {
        kind: "working",
        scoped: true,
        call: async (s, scope) =>
            sizeOf((await s.plan({ op: "algo.run", algorithm: "degree", ...scopeOf(scope) })).cost.basis),
    },
    "GraphSession.recommendLayout": { kind: "working", call: (s) => s.recommendLayout() },
    "RunsApi.start": {
        kind: "working",
        call: async (s) => {
            const result = await s.runs.start("degree", undefined, { style: false });
            return { measured: result.measured, values: ALL_IDS.map((id) => result.node(id) ?? null) };
        },
    },
    "RunsApi.batch": {
        kind: "working",
        call: async (s) => {
            await s.runs.batch([{ algorithm: "degree" }]);
            return s.runs.list().map((each) => each.result?.measured ?? null);
        },
    },
    "SessionDataApi.working": { kind: "working", call: (s) => sorted(s.data.working().nodeIds()) },
    "SessionDataApi.attributes": {
        kind: "working",
        scoped: true,
        call: (s, scope) => s.data.attributes(scopeOf(scope)),
    },
    "SessionDataApi.nodes": { kind: "working", scoped: true, call: (s, scope) => idsOf(s.data.nodes(scopeOf(scope))) },
    "SessionDataApi.edges": { kind: "working", scoped: true, call: (s, scope) => idsOf(s.data.edges(scopeOf(scope))) },
    "SessionDataApi.nodePage": {
        kind: "working",
        scoped: true,
        call: (s, scope) => {
            const page = s.data.nodePage(scopeOf(scope));
            return { total: page.total, ids: idsOf(page.records) };
        },
    },
    "SessionDataApi.edgePage": {
        kind: "working",
        scoped: true,
        call: (s, scope) => {
            const page = s.data.edgePage(scopeOf(scope));
            return { total: page.total, ids: idsOf(page.records) };
        },
    },
    "SessionDataApi.neighbors": {
        kind: "working",
        scoped: true,
        call: (s, scope) => {
            const page = s.data.neighbors("a4", scopeOf(scope));
            return { total: page.total, ids: sorted(page.records.map((each) => each.node.id)) };
        },
    },
    "SessionDataApi.statistics": {
        kind: "working",
        scoped: true,
        call: (s, scope) => s.data.statistics(scopeOf(scope)),
    },
    "SessionDataApi.valueCounts": {
        kind: "working",
        scoped: true,
        call: (s, scope) => s.data.valueCounts("data.kind", scopeOf(scope)),
    },
    "SessionDataApi.histogram": {
        kind: "working",
        scoped: true,
        call: (s, scope) => s.data.histogram({ kind: "node", name: "size" }, scopeOf(scope)),
    },
    "SessionDataApi.issues": {
        kind: "working",
        scoped: true,
        call: (s, scope) => s.data.issues(scopeOf(scope)).map((issue) => [issue.code, issue.count]),
    },

    // The selection: its readers read the members the filter shows; its writes over a target
    // set reach only what is shown unless they name the whole graph.
    "SelectionApi.nodes": {
        kind: "working",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            return sorted(s.selection.nodes);
        },
    },
    "SelectionApi.size": {
        kind: "working",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            return s.selection.size;
        },
    },
    "SelectionApi.edges": {
        kind: "working",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            return sorted(s.selection.edges);
        },
    },
    "SelectionApi.has": {
        kind: "working",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            return ALL_IDS.map((id) => s.selection.has(id));
        },
    },
    "SelectionApi.nodeMask": {
        kind: "working",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            const mask = s.selection.nodeMask();
            const snapshot = s.data.snapshot();
            return sorted(ALL_IDS.filter((id) => mask[snapshot.ids.indexOf(id)] === 1));
        },
    },
    "SelectionApi.edgeMask": {
        kind: "working",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            const mask = s.selection.edgeMask();
            return [...mask].filter((bit) => bit === 1).length;
        },
    },
    "SelectionApi.count": {
        kind: "working",
        call: (s) => s.selection.count({ where: "data.kind == 'b'" }),
    },
    "SelectionApi.statistics": {
        kind: "working",
        scoped: true,
        call: async (s, scope) => {
            await s.selection.apply({ nodes: ["a4"] });
            const statistics = await s.selection.statistics(scopeOf(scope));
            return { nodes: statistics.nodes, cut: statistics.cutEdges, degree: statistics.degree };
        },
    },
    "SelectionApi.apply": {
        kind: "writer",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            return sorted(s.selection.nodes);
        },
    },
    "SelectionApi.promote": {
        kind: "writer",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            const id = s.selection.promote("Everything selected");
            return sorted((await s.scope.resolve({ set: id })).nodes);
        },
    },
    "SetsApi.combine": {
        kind: "writer",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            const id = await s.sets.combine("union", ["selection", "selection"]);
            return sorted((await s.scope.resolve({ set: id })).nodes);
        },
    },
    "SetsApi.createPath": {
        kind: "writer",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            const id = await s.sets.createPath("selection");
            return sorted((await s.scope.resolve({ set: id })).nodes);
        },
    },
    "SetsApi.createFrom": {
        kind: "writer",
        call: async (s) => {
            await selectAll(s, ALL_IDS);
            const id = await s.sets.createFrom("selection");
            return sorted((await s.scope.resolve({ set: id })).nodes);
        },
    },

    // Styling counts.
    "StylesApi.categories": {
        kind: "working",
        call: async (s) =>
            s.styles
                .categories(await byKind(s), "node.color")
                .filter((each) => each.count > 0)
                .map((each) => [each.value, each.count]),
    },
    "StylesApi.groups": {
        kind: "working",
        call: async (s) =>
            s.styles
                .groups(await byKind(s), "data.kind")
                .filter((each) => each.count > 0)
                .map((each) => [each.value, each.count]),
    },
    "StylesApi.counts": { kind: "working", call: async (s) => s.styles.counts(await byKind(s)).visible },
    "StylesApi.agreement": {
        kind: "working",
        call: async (s) => {
            await byKind(s);
            await selectAll(s, ALL_IDS);
            return s.styles.agreement("selection", "node.color");
        },
    },
    "TimeApi.bins": {
        kind: "working",
        scoped: true,
        call: (s, scope) => s.time.bins({ from: 0, to: 6, count: 6, ...scopeOf(scope) }),
    },
    "TimeApi.changes": {
        kind: "working",
        call: async (s) => {
            await s.time.window({ from: 0, to: 2 });
            await s.time.window({ from: 0, to: 9 });
            return s.time.changes();
        },
    },
    "TimeApi.series": { kind: "working", call: async (s) => await s.time.series({ from: 0, to: 6 }) },
    "StylesApi.legend": {
        kind: "working",
        call: async (s) => {
            const id = await byKind(s);
            return (s.styles.legend().find((block) => block.layerId === id)?.swatches ?? []).map((row) => [
                row.value,
                row.count,
            ]);
        },
    },
    "StylesApi.legendOf": {
        kind: "working",
        call: async (s) => s.styles.legendOf(await byKind(s)).map((block) => block.swatches.map((row) => row.value)),
    },

    // The visibility filter's own shown sets.
    "VisibilityApi.nodes": { kind: "working", call: (s) => sorted(s.visibility.nodes) },
    "VisibilityApi.edges": { kind: "working", call: (s) => s.visibility.edges.size },

    // The whole graph by name: the rows of `wholeGraph` in working-graph-baseline.json.
    "GraphSession.snapshot": { kind: "whole", call: (s) => snapshotIds(s.snapshot()) },
    "SessionDataApi.snapshot": { kind: "whole", call: (s) => snapshotIds(s.data.snapshot()) },
    "SessionGraphStore.getSnapshot": { kind: "whole", call: (s) => snapshotIds(s.data.store.getSnapshot()) },
    "VisibilityApi.nodeMask": { kind: "whole", call: (s) => s.visibility.nodeMask().length },
    "VisibilityApi.edgeMask": { kind: "whole", call: (s) => s.visibility.edgeMask().length },
    "ScopeApi.histogram": { kind: "whole", call: (s) => s.scope.histogram("data.kind") },
    "ScopeApi.count": { kind: "whole", call: (s) => s.scope.count({ where: "data.kind == 'b'" }) },
    "ScopeApi.resolve": {
        kind: "whole",
        call: async (s) => sorted((await s.scope.resolve({ where: "data.kind == 'b'" })).nodes),
    },
    "VisibilityApi.conditionCounts": {
        kind: "whole",
        call: async (s) => {
            await s.visibility.addCondition({
                effect: "exclude",
                rule: { kind: "categories", attribute: "data.kind", values: ["z"] },
            });
            return s.visibility.conditionCounts().map((each) => each.nodes);
        },
    },
    "VisibilityApi.set": {
        kind: "whole",
        call: async (s) =>
            (await s.visibility.set({ kind: "categories", attribute: "data.kind", values: ["a"] })).total,
    },
    "ProjectApi.save": {
        kind: "whole",
        call: async (s) => {
            const saved = await s.project.save();
            return saved.text.includes(`"${HIDDEN}"`);
        },
    },
    "GraphSession.recipe": { kind: "whole", call: (s) => s.recipe() },
    "TimeApi.extent": { kind: "whole", call: (s) => s.time.extent() },
};

/** A lookup or a write by id: it reads or touches exactly the ids it is given. */
export const BY_ID: readonly string[] = [
    "ReadonlyElementPositions.isPinned",
    "ReadonlyElementPositions.isPlaced",
    "ReadonlyElementPositions.read",
    "ResultsApi.get",
    "RunsApi.answered",
    "TimeApi.spanOf",
    "ResultsApi.has",
    "ResultsApi.path",
    "ResultsApi.term",
    "RunsApi.bindings",
    "RunsApi.get",
    "RunsApi.layers",
    "RunsApi.move",
    "RunsApi.paint",
    "RunsApi.painting",
    "RunsApi.readers",
    "RunsApi.remove",
    "SelectionApi.hover",
    "SessionDataApi.addEdges",
    "SessionDataApi.addNodes",
    "SessionDataApi.collapse",
    "SessionDataApi.edge",
    "SessionDataApi.expand",
    "SessionDataApi.ignoreIssue",
    "SessionDataApi.ignoreIssues",
    "SessionDataApi.name",
    "SessionDataApi.node",
    "SessionDataApi.nodeSource",
    "SessionDataApi.removeEdges",
    "SessionDataApi.removeNodes",
    "SessionDataApi.sourcesOf",
    "SessionDataApi.structureValue",
    "SessionDataApi.updateEdges",
    "SessionDataApi.updateNodes",
    "SessionPositions.pin",
    "SessionPositions.set",
    "SessionPositions.unpin",
    "SetsApi.addMembers",
    "SetsApi.containing",
    "SetsApi.get",
    "SetsApi.offers",
    "SetsApi.pathKind",
    "SetsApi.removeMembers",
    "SetsApi.status",
    "SetsApi.usedBy",
    "StylesApi.explain",
    "StylesApi.valueAt",
    "VisibilityApi.isVisible",
    "NotesApi.add",
    "NotesApi.get",
    "NotesApi.remove",
    "NotesApi.status",
    "NotesApi.update",
];

/** It reads no nodes or edges. */
export const NOT_A_READER: readonly string[] = [
    // The session's lifecycle, commands, history and subscriptions. `execute` and `transaction`
    // dispatch commands whose readers are the methods each command names.
    "GraphSession.acceleration",
    "GraphSession.canRedo",
    "GraphSession.canUndo",
    "GraphSession.catalog",
    "GraphSession.capabilities",
    "GraphSession.dispose",
    "GraphSession.execute",
    "GraphSession.fingerprint",
    "GraphSession.on",
    "GraphSession.redo",
    "GraphSession.seededNodeCount",
    "GraphSession.setAccelerator",
    "GraphSession.transaction",
    "GraphSession.undo",
    "SessionHistory.bytes",
    "SessionHistory.cancel",
    "SessionHistory.clear",
    "SessionHistory.limitBytes",
    "SessionHistory.limitSteps",
    "SessionHistory.nextUndo",
    "SessionHistory.pending",
    "SessionHistory.position",
    "SessionHistory.restoreTo",
    "SessionHistory.steps",
    "SessionHistory.version",
    "JournalApi.cap",
    "JournalApi.clear",
    "JournalApi.entries",
    "JournalApi.get",
    "JournalApi.subscribe",
    // Settings, the network, assets, shaders, saved views and the project's identity.
    "SessionConfig.acceleration",
    "SessionConfig.backgroundColor",
    "SessionConfig.inEffect",
    "SessionConfig.set",
    "SessionConfig.setWorkingGraph",
    "SessionConfig.workingGraph",
    "NetworkApi.allow",
    "NetworkApi.deny",
    "NetworkApi.pending",
    "NetworkApi.policy",
    "NetworkApi.setPolicy",
    "NetworkApi.setProjectHosts",
    "AssetsApi.add",
    "AssetsApi.allowHosts",
    "AssetsApi.files",
    "AssetsApi.find",
    "AssetsApi.get",
    "AssetsApi.inspect",
    "AssetsApi.list",
    "AssetsApi.offer",
    "AssetsApi.ready",
    "AssetsApi.remove",
    "AssetsApi.setLimits",
    "AssetsApi.states",
    "AssetsApi.supply",
    "AssetsApi.waiting",
    "SessionShaders.add",
    "SessionShaders.approve",
    "SessionShaders.availability",
    "SessionShaders.check",
    "SessionShaders.list",
    "SessionShaders.remove",
    "SessionShaders.replace",
    "SessionShaders.source",
    "SessionShaders.status",
    "SessionShaders.thumbnail",
    "SessionViews.remove",
    "SessionViews.save",
    "ProjectApi.dirty",
    "ProjectApi.id",
    "ProjectApi.markSaved",
    "ProjectApi.name",
    "ProjectApi.open",
    "ProjectApi.rename",
    "NotesApi.authors",
    "NotesApi.counts",
    "NotesApi.list",
    "NotesApi.mergeDocument",
    "NotesApi.toDocument",
    // Loading, sources and the schema of the columns: they act on the source rows, not on what
    // a filter shows of them.
    "SessionDataApi.checkSource",
    "SessionDataApi.clear",
    "SessionDataApi.declare",
    "SessionDataApi.editJoin",
    "SessionDataApi.editJoinReport",
    "SessionDataApi.fingerprint",
    "SessionDataApi.fix",
    "SessionDataApi.generate",
    "SessionDataApi.hiddenColumns",
    "SessionDataApi.import",
    "SessionDataApi.joins",
    "SessionDataApi.lastImport",
    "SessionDataApi.listSource",
    "SessionDataApi.loadDataset",
    "SessionDataApi.loadSample",
    "SessionDataApi.loadedWeight",
    "SessionDataApi.loads",
    "SessionDataApi.matchesSource",
    "SessionDataApi.more",
    "SessionDataApi.pendingSourceLoads",
    "SessionDataApi.prepare",
    "SessionDataApi.previewSource",
    "SessionDataApi.previewType",
    "SessionDataApi.readableValues",
    "SessionDataApi.refresh",
    "SessionDataApi.reloadSource",
    "SessionDataApi.removeSource",
    "SessionDataApi.renameColumn",
    "SessionDataApi.renameSource",
    "SessionDataApi.replaceSource",
    "SessionDataApi.resultColumns",
    "SessionDataApi.runPendingSourceLoad",
    "SessionDataApi.setHidden",
    "SessionDataApi.setRole",
    "SessionDataApi.setType",
    "SessionDataApi.setValueLabel",
    "SessionDataApi.source",
    "SessionDataApi.sources",
    "SessionDataApi.structureValues",
    "SessionDataApi.testSource",
    "SessionDataApi.valueLabels",
    "SessionGraphStore.directionSettledBy",
    "SessionGraphStore.lastImport",
    "SessionGraphStore.seededNodeCount",
    "SessionGraphStore.undirected",
    "ReadonlyElementPositions.capacity",
    "ReadonlyElementPositions.count",
    "ReadonlyElementPositions.generation",
    "ReadonlyElementPositions.pinnedCount",
    "ReadonlyElementPositions.placedCount",
    "SessionPositions.pinned",
    // The layout's settings. A layout run reads the working graph; the browser tests in
    // test/browser/working-graph-layout.test.ts check it, since a session in Node lays out nothing.
    "SessionLayout.arrangedDimension",
    "SessionLayout.dimension",
    "SessionLayout.engine",
    "SessionLayout.id",
    "SessionLayout.locationColumns",
    "SessionLayout.optionInEffect",
    "SessionLayout.options",
    "SessionLayout.set",
    "SessionLayout.setDimension",
    // Runs' bookkeeping and results' registry.
    "RunsApi.list",
    "RunsApi.queue",
    "ResultsApi.roots",
    // Saved scopes and the filter's step editor.
    "ScopeApi.allowRun",
    "ScopeApi.asUnion",
    "ScopeApi.cancelRun",
    "ScopeApi.edit",
    "ScopeApi.list",
    "ScopeApi.remove",
    "ScopeApi.save",
    "ScopeApi.setOptions",
    "SetsApi.create",
    "SetsApi.list",
    "SetsApi.redefine",
    "SetsApi.remove",
    "SetsApi.rename",
    "SetsApi.restore",
    // The selection's state that is not its members.
    "SelectionApi.cap",
    // Clear empties the whole stored selection, shown or hidden; the test checks it with a hidden
    // member selected.
    "SelectionApi.clear",
    "SelectionApi.checkRule",
    "SelectionApi.hoverPreview",
    "SelectionApi.hovered",
    "SelectionApi.layerSelector",
    "SelectionApi.origin",
    "SelectionApi.originPaths",
    "SelectionApi.previewHover",
    "SelectionApi.truncated",
    // Style rules and their tree: a rule paints by its selector, and a hidden node draws nothing.
    "StylesApi.add",
    "StylesApi.addFolder",
    "StylesApi.addRow",
    "StylesApi.applyTemplate",
    "StylesApi.colors",
    "StylesApi.defaultValue",
    "StylesApi.deleteRow",
    "StylesApi.get",
    "StylesApi.hideRow",
    "StylesApi.highlight",
    "StylesApi.highlightStyle",
    "StylesApi.layersUnder",
    "StylesApi.list",
    "StylesApi.lockRow",
    "StylesApi.mark",
    "StylesApi.move",
    "StylesApi.moveRow",
    "StylesApi.parts",
    "StylesApi.pinRow",
    "StylesApi.remove",
    "StylesApi.removeBySource",
    "StylesApi.renameRow",
    "StylesApi.replaceColor",
    "StylesApi.resolveToStatic",
    "StylesApi.restoreStartingRows",
    "StylesApi.setDefaultPalettes",
    "StylesApi.setFoldBelow",
    "StylesApi.setHighlightColor",
    "StylesApi.setValueEntries",
    "StylesApi.setValueEntry",
    "StylesApi.setValueHidden",
    "StylesApi.settled",
    "StylesApi.showBranches",
    "StylesApi.showingBranches",
    "StylesApi.shownBranches",
    "StylesApi.toDocument",
    "StylesApi.toFile",
    "StylesApi.tree",
    "StylesApi.update",
    "StylesApi.updateMany",
    "StylesApi.validate",
    "StylesApi.writeRow",
    // The timeline's controls and settings.
    "TimeApi.atEnd",
    "TimeApi.atStart",
    "TimeApi.candidates",
    "TimeApi.commit",
    "TimeApi.committed",
    "TimeApi.current",
    "TimeApi.field",
    "TimeApi.interval",
    "TimeApi.mode",
    "TimeApi.notices",
    "TimeApi.parse",
    "TimeApi.pause",
    "TimeApi.play",
    "TimeApi.playing",
    "TimeApi.ready",
    "TimeApi.seek",
    "TimeApi.setField",
    "TimeApi.setSettings",
    "TimeApi.stepBy",
    "TimeApi.timeZone",
    // The filter's own definition.
    "VisibilityApi.conditions",
    "VisibilityApi.filter",
    "VisibilityApi.showContext",
    "VisibilityApi.steps",
    "VisibilityApi.window",
];
