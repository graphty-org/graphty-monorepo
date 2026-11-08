/**
 * @file Every reader honors the working graph (design/working-graph/design.md section 9).
 *
 * The owner's agreement (2026-11-07): every reader uses the view -- what the filter and the time
 * window leave shown -- and only the readers that must see everything read the whole graph, by
 * name. This test finds the readers itself: it walks the `GraphSession` interface in the committed
 * API report (`api/session.api.md`), so a method added to the session tomorrow fails here until it
 * is classified below.
 *
 * Each member is one of:
 *
 * - a view reader, with a probe. With the option on and a filter hiding one node, the probe answers
 *   exactly as it does on the same graph with that node removed; and asked with its whole-graph word
 *   it answers as on the graph with nothing hidden;
 * - a whole reader: it reads the whole graph with no scope named, and is one of the agreement's named
 *   cases. It is listed, with its case, in `working-graph-whole-readers.json`, which
 *   `tools/check-working-graph.mjs` lets only shrink. Its probe answers as on the graph with nothing
 *   hidden; a listed reader that now reads the view, or that the session no longer has, fails here;
 * - not a reader of the graph's shape: it writes, it reads one thing the caller names, or it reads
 *   something other than nodes and edges.
 *
 * Layouts and algorithms are covered by test/browser/working-graph-every-reader.test.ts, which needs
 * a renderer.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

/** The rows of the whole-readers list. */
interface WholeRow {
    /** The member, as this file names it. */
    readonly reader: string;
    /** Which of the agreement's named cases it is. */
    readonly case: string;
    /** Why it reads the whole graph. */
    readonly reason: string;
}

const WHOLE_ROWS = (
    JSON.parse(readFileSync(new URL("../../working-graph-whole-readers.json", import.meta.url), "utf8")) as {
        readers: readonly WholeRow[];
    }
).readers;

/**
 * Every member of `GraphSession` in an API report, descending into the members whose type is an
 * interface the report declares. A method is named with `()`.
 * @param report - The report's text.
 * @returns The members, as dotted paths.
 */
export function sessionMembers(report: string): string[] {
    const bodies = new Map<string, { extendsList: string | undefined; body: string }>();
    const declaration = /^export (?:interface|class) (\w+)(?:<[^>]*>)?(?: extends ([^{]+))? \{\n([\s\S]*?)^\}/gm;
    for (const match of report.matchAll(declaration)) {
        bodies.set(match[1], { extendsList: match[2], body: match[3] });
    }

    const found = new Set<string>();
    const walk = (name: string, prefix: string, seen: ReadonlySet<string>): void => {
        const declared = bodies.get(name);
        if (declared === undefined || seen.has(name)) {
            return;
        }

        const inside = new Set([...seen, name]);
        for (const parent of declared.extendsList?.split(",") ?? []) {
            walk(parent.trim().replace(/<.*$/, ""), prefix, inside);
        }

        for (const line of declared.body.split("\n")) {
            const member = /^ {4}(?:readonly )?(\w+)\??(?:<[^(]*>)?(\(|: )(.*)$/.exec(line);
            if (member === null) {
                continue;
            }

            const [, key, kind, rest] = member;
            const type = rest.replace(/;$/, "").trim();
            if (kind === "(") {
                found.add(`${prefix}${key}()`);
            } else if (bodies.has(type)) {
                walk(type, `${prefix}${key}.`, inside);
            } else {
                found.add(`${prefix}${key}`);
            }
        }
    };
    walk("GraphSession", "", new Set());
    return [...found];
}

/** A probe: what a reader answers on a session. */
type Ask = (session: GraphSession) => unknown;

/** A view reader: what it answers naming no scope, and naming the whole graph. */
interface ViewReader {
    /** The reader with no scope named. */
    readonly view: Ask;
    /** The reader naming the whole graph, when it has a word for it. */
    readonly whole?: Ask;
    /** It reads the filter over all time, the window aside (design decision 39). */
    readonly windowAside?: true;
}

/**
 * A reader that answers both, each under its own name: the whole graph's count beside what is
 * shown. Its view half on the filtered graph answers as its whole half on the graph without the
 * hidden node, and its whole half as on the graph with nothing hidden.
 */
interface BothReader {
    /** The half that counts what is shown. */
    readonly shown: Ask;
    /** The half that counts the whole graph. */
    readonly all: Ask;
}

/** Why a member is not a reader of the graph's shape. */
type NotAReader =
    /** It reads the filter's own conditions and masks, which the agreement reads over everything. */
    | "the filter's own"
    /** It changes the graph, the project or the session. */
    | "writes"
    /** It reads only the one node, edge, run, set, scope, rule or layer the caller names. */
    | "names its target"
    /** It reads something other than the graph's nodes and edges: settings, files, history. */
    | "not the graph"
    /** It reads state that is already the reader's own: the selection, a run's stored result. */
    | "state";

/** The name of the color-by-type layer every probe session holds, so the style readers have one to read. */
const LAYER = "By type";

/**
 * The id of the probes' layer in a session.
 * @param session - The session.
 * @returns Its id.
 */
const layerOf = (session: GraphSession): string => session.styles.list().find(({ name }) => name === LAYER)?.id ?? "";

/**
 * Every member of the session, and what it is. A whole reader is named here with its probe and
 * listed, with its case, in the JSON file.
 */
const MEMBERS: Readonly<
    Record<
        string,
        ViewReader | BothReader | NotAReader | { readonly wholeProbe: Ask } | { readonly wholeByDefault: Ask }
    >
> = {
    acceleration: "not the graph",
    "assets.add()": "writes",
    "assets.allowHosts()": "writes",
    "assets.files()": "not the graph",
    "assets.find()": "not the graph",
    "assets.get()": "not the graph",
    "assets.inspect()": "not the graph",
    "assets.list()": "not the graph",
    "assets.offer()": "writes",
    "assets.ready()": "not the graph",
    "assets.remove()": "writes",
    "assets.setLimits()": "writes",
    "assets.states()": "not the graph",
    "assets.supply()": "writes",
    "assets.waiting()": "not the graph",
    canRedo: "not the graph",
    canUndo: "not the graph",
    capabilities: "not the graph",
    catalog: "not the graph",
    "config.author": "not the graph",
    "config.background": "not the graph",
    "config.data": "not the graph",
    "config.editableBase": "not the graph",
    "config.framing.extent": "not the graph",
    "config.framing.padding": "not the graph",
    "config.layoutBehavior": "not the graph",
    "config.layoutTransition": "not the graph",
    "config.name": "not the graph",
    "config.pinnedStyle": "not the graph",
    "config.runAlgorithmsOnLoad": "not the graph",
    "config.runPlacement": "not the graph",
    "config.selectionStyle": "not the graph",
    "config.startingRows": "not the graph",
    "config.viewRotation": "not the graph",
    "config.acceleration": "not the graph",
    "config.backgroundColor": "not the graph",
    "config.inEffect()": "not the graph",
    "config.set()": "writes",
    "data.addEdges()": "writes",
    "data.addNodes()": "writes",
    "data.attributes()": "not the graph",
    "data.checkSource()": "not the graph",
    "data.clear()": "writes",
    "data.collapse()": "writes",
    "data.declare()": "writes",
    "data.edge()": "names its target",
    "data.edgePage()": {
        view: (s) => s.data.edgePage({ limit: 50 }),
        whole: (s) => s.data.edgePage({ limit: 50, scope: "graph" }),
    },
    "data.edges()": { view: (s) => s.data.edges() },
    "data.editJoin()": "writes",
    "data.editJoinReport()": "not the graph",
    "data.expand()": "writes",
    "data.fingerprint()": "not the graph",
    "data.fix()": "writes",
    "data.generate()": "writes",
    "data.hiddenColumns()": "not the graph",
    "data.histogram()": {
        view: (s) => s.data.histogram({ kind: "node", name: "weight" }),
        whole: (s) => s.data.histogram({ kind: "node", name: "weight" }, { scope: "graph" }),
    },
    "data.ignoreIssue()": "writes",
    "data.ignoreIssues()": "writes",
    "data.import()": "writes",
    "data.issues()": "not the graph",
    "data.joins()": "not the graph",
    "data.lastImport()": "not the graph",
    "data.listSource()": "not the graph",
    "data.loadDataset()": "writes",
    "data.loadedWeight()": "not the graph",
    "data.loads()": "not the graph",
    "data.loadSample()": "writes",
    "data.matchesSource()": "not the graph",
    "data.more()": "writes",
    "data.name()": "names its target",
    "data.neighbors()": {
        view: (s) => s.data.neighbors("a"),
        whole: (s) => s.data.neighbors("a", { scope: "graph" }),
    },
    "data.node()": "names its target",
    "data.nodePage()": {
        view: (s) => s.data.nodePage({ limit: 50 }),
        whole: (s) => s.data.nodePage({ limit: 50, scope: "graph" }),
    },
    "data.nodes()": { view: (s) => s.data.nodes() },
    "data.nodeSource()": "names its target",
    "data.pendingSourceLoads()": "not the graph",
    "data.prepare()": "writes",
    "data.previewSource()": "not the graph",
    "data.previewType()": "not the graph",
    "data.readableValues()": "not the graph",
    "data.refresh()": "writes",
    "data.reloadSource()": "writes",
    "data.removeEdges()": "writes",
    "data.removeNodes()": "writes",
    "data.removeSource()": "writes",
    "data.renameColumn()": "writes",
    "data.renameSource()": "writes",
    "data.replaceSource()": "writes",
    "data.resultColumns()": "not the graph",
    "data.runPendingSourceLoad()": "writes",
    "data.setHidden()": "writes",
    "data.setRole()": "writes",
    "data.setType()": "writes",
    "data.setValueLabel()": "writes",
    "data.snapshot()": { wholeProbe: (s) => s.data.snapshot().nodeCount },
    "data.source()": "not the graph",
    "data.sources()": "not the graph",
    "data.sourcesOf()": "names its target",
    "data.statistics()": {
        view: (s) => s.data.statistics(),
        whole: (s) => s.data.statistics({ scope: "all" }),
    },
    "data.store.directionSettledBy": "not the graph",
    "data.store.getSnapshot()": { wholeProbe: (s) => s.data.store.getSnapshot().nodeCount },
    "data.store.lastImport": "not the graph",
    "data.store.positions.capacity": "not the graph",
    "data.store.positions.count": "not the graph",
    "data.store.positions.generation": "not the graph",
    "data.store.positions.isPinned()": "names its target",
    "data.store.positions.isPlaced()": "names its target",
    "data.store.positions.pinnedCount": "state",
    "data.store.positions.placedCount": "state",
    "data.store.positions.read()": "names its target",
    "data.store.seededNodeCount": "not the graph",
    "data.store.undirected()": "names its target",
    "data.structureValue()": {
        view: (s) => s.data.structureValue("a", "graphty.degree"),
        whole: (s) => s.data.structureValue("a", "graphty.degree", { scope: "graph" }),
    },
    "data.structureValues()": "not the graph",
    "data.testSource()": "not the graph",
    "data.undirected()": "names its target",
    "data.updateEdges()": "writes",
    "data.updateNodes()": "writes",
    "data.valueCounts()": {
        view: (s) => s.data.valueCounts("data.type"),
        whole: (s) => s.data.valueCounts("data.type", { scope: "graph" }),
    },
    "data.valueLabels()": "not the graph",
    "dispose()": "writes",
    "estimate()": "names its target",
    "execute()": "writes",
    "features.enabled": "not the graph",
    "features.unknown": "not the graph",
    "find()": {
        view: (s) => s.find("host"),
        whole: (s) => s.find("host", { scope: "graph" }),
    },
    "fingerprint()": "not the graph",
    "history.bytes": "not the graph",
    "history.cancel()": "writes",
    "history.clear()": "writes",
    "history.limitBytes": "not the graph",
    "history.limitSteps": "not the graph",
    "history.nextUndo": "not the graph",
    "history.pending": "not the graph",
    "history.position": "not the graph",
    "history.restoreTo()": "writes",
    "history.steps": "not the graph",
    "history.version": "not the graph",
    "journal.cap": "not the graph",
    "journal.clear()": "writes",
    "journal.entries": "not the graph",
    "journal.get()": "not the graph",
    "journal.subscribe()": "not the graph",
    "layout.arrangedDimension": "not the graph",
    "layout.dimension": "not the graph",
    "layout.engine": "not the graph",
    "layout.id": "not the graph",
    "layout.locationColumns()": "not the graph",
    "layout.optionInEffect()": "not the graph",
    "layout.options": "not the graph",
    "layout.set()": "writes",
    "layout.setDimension()": "writes",
    "network.allow()": "writes",
    "network.deny()": "writes",
    "network.pending()": "not the graph",
    "network.policy": "not the graph",
    "network.setPolicy()": "writes",
    "network.setProjectHosts()": "writes",
    "notes.add()": "writes",
    "notes.authors()": "not the graph",
    "notes.counts()": "not the graph",
    "notes.get()": "not the graph",
    "notes.list()": "not the graph",
    "notes.mergeDocument()": "writes",
    "notes.remove()": "writes",
    "notes.status()": "not the graph",
    "notes.toDocument()": "not the graph",
    "notes.update()": "writes",
    "on()": "not the graph",
    "plan()": "names its target",
    "positions.capacity": "not the graph",
    "positions.count": "not the graph",
    "positions.generation": "not the graph",
    "positions.isPinned()": "names its target",
    "positions.isPlaced()": "names its target",
    "positions.pinnedCount": "state",
    "positions.placedCount": "state",
    "positions.read()": "names its target",
    "positions.pin()": "writes",
    "positions.pinned": "state",
    "positions.set()": "writes",
    "positions.unpin()": "writes",
    "project.dirty": "not the graph",
    "project.id": "not the graph",
    "project.markSaved()": "writes",
    "project.name": "not the graph",
    "project.open()": "writes",
    "project.rename()": "writes",
    "project.save()": "writes",
    "recipe()": "not the graph",
    "recommendLayout()": { view: (s) => s.recommendLayout() },
    "redo()": "writes",
    "results.get()": "state",
    "results.has()": "state",
    "results.path()": "state",
    "results.roots": "state",
    "results.term()": "state",
    "run()": "writes",
    "runs.answered()": "state",
    "runs.batch()": "writes",
    "runs.bindings()": "state",
    "runs.get()": "state",
    "runs.layers()": "state",
    "runs.list()": "state",
    "runs.move()": "writes",
    "runs.painting()": "state",
    "runs.queue": "state",
    "runs.readers()": "state",
    "runs.remove()": "writes",
    "runs.start()": "writes",
    "scope.allowRun()": "writes",
    "scope.asUnion()": "names its target",
    "scope.cancelRun()": "writes",
    "scope.checkStep()": "names its target",
    "scope.count()": "names its target",
    "scope.edit()": "writes",
    "scope.histogram()": { wholeProbe: (s) => s.scope.histogram("data.weight") },
    "scope.list()": "state",
    "scope.options.askAboveMs": "not the graph",
    "scope.options.branchPalette": "not the graph",
    "scope.options.liveMs": "not the graph",
    "scope.remove()": "writes",
    "scope.resolve()": "names its target",
    "scope.save()": "writes",
    "scope.setOptions()": "writes",
    "scope.watchSteps()": "names its target",
    seededNodeCount: "not the graph",
    "selection.apply()": {
        view: async (s) => {
            await s.selection.apply({ where: "type == 'host'" });
            return [...s.selection.nodes];
        },
    },
    "selection.cap": "not the graph",
    "selection.checkRule()": "names its target",
    "selection.clear()": "writes",
    "selection.count()": {
        view: (s) => s.selection.count({ where: "type == 'host'" }),
    },
    "selection.edgeMask()": "state",
    "selection.edges": "state",
    "selection.has()": "state",
    "selection.hover()": "writes",
    "selection.hovered": "state",
    "selection.hoverPreview": "state",
    "selection.layerSelector": "state",
    "selection.nodeMask()": "state",
    "selection.nodes": "state",
    "selection.origin": "state",
    "selection.originPaths": "state",
    "selection.previewHover()": "writes",
    "selection.promote()": "writes",
    "selection.size": "state",
    "selection.statistics()": "state",
    "selection.truncated": "state",
    "setAccelerator()": "writes",
    "sets.addMembers()": "writes",
    "sets.combine()": "writes",
    "sets.containing()": "state",
    "sets.create()": "writes",
    "sets.createFrom()": "writes",
    "sets.createPath()": "writes",
    "sets.get()": "state",
    "sets.list()": "state",
    "sets.offers()": "state",
    "sets.pathKind()": "state",
    "sets.redefine()": "writes",
    "sets.remove()": "writes",
    "sets.removeMembers()": "writes",
    "sets.rename()": "writes",
    "sets.restore()": "writes",
    "sets.status()": "names its target",
    "sets.usedBy()": "state",
    "shaders.add()": "writes",
    "shaders.approve()": "writes",
    "shaders.availability()": "not the graph",
    "shaders.check()": "not the graph",
    "shaders.list()": "not the graph",
    "shaders.remove()": "writes",
    "shaders.replace()": "writes",
    "shaders.source()": "not the graph",
    "shaders.status()": "not the graph",
    "shaders.thumbnail()": "not the graph",
    "snapshot()": { wholeProbe: (s) => s.snapshot().nodeCount },
    "status.counts": {
        shown: (s) => [s.status.counts.visibleNodes, s.status.counts.visibleEdges],
        all: (s) => [s.status.counts.nodes, s.status.counts.edges],
    },
    "status.directed": "not the graph",
    "status.ready": "not the graph",
    "styles.add()": "writes",
    "styles.addFolder()": "writes",
    "styles.addRow()": "writes",
    "styles.agreement()": "names its target",
    "styles.applyTemplate()": "writes",
    "styles.categories()": { view: (s) => s.styles.categories(layerOf(s), "node.color") },
    "styles.colors()": "names its target",
    "styles.counts()": {
        view: (s) => {
            const { matched, painted, noValue } = s.styles.counts(layerOf(s));
            return { matched, painted, noValue };
        },
        whole: (s) => {
            const { matched, painted, noValue } = s.styles.counts(layerOf(s), { scope: "graph" });
            return { matched, painted, noValue };
        },
    },
    "styles.defaultValue()": "not the graph",
    "styles.deleteRow()": "writes",
    "styles.encode()": "writes",
    "styles.explain()": "names its target",
    "styles.get()": "not the graph",
    "styles.groups()": { view: (s) => s.styles.groups(layerOf(s), "data.type") },
    "styles.hideRow()": "writes",
    "styles.highlight()": "writes",
    "styles.highlightStyle()": "names its target",
    "styles.layerGroups()": "names its target",
    "styles.layersUnder()": "names its target",
    "styles.legend()": { wholeByDefault: (s) => s.styles.legend() },
    "styles.legendOf()": { wholeByDefault: (s) => s.styles.legendOf(layerOf(s)) },
    "styles.list()": "not the graph",
    "styles.lockRow()": "writes",
    "styles.mark()": "writes",
    "styles.move()": "writes",
    "styles.moveRow()": "writes",
    "styles.parts()": "not the graph",
    "styles.pinRow()": "writes",
    "styles.preview()": "names its target",
    "styles.proposeEncoding()": "names its target",
    "styles.remove()": "writes",
    "styles.removeBySource()": "writes",
    "styles.renameRow()": "writes",
    "styles.replaceColor()": "writes",
    "styles.resolveToStatic()": "writes",
    "styles.restoreStartingRows()": "writes",
    "styles.sequence()": "names its target",
    "styles.setDefaultPalettes()": "writes",
    "styles.setFoldBelow()": "writes",
    "styles.setHighlightColor()": "writes",
    "styles.settled()": "not the graph",
    "styles.setValueEntries()": "writes",
    "styles.setValueEntry()": "writes",
    "styles.setValueHidden()": "writes",
    "styles.showBranches()": "writes",
    "styles.showingBranches": "state",
    "styles.shownBranches": "state",
    "styles.toDocument()": "not the graph",
    "styles.toFile()": "not the graph",
    "styles.tree()": "not the graph",
    "styles.update()": "writes",
    "styles.updateMany()": "writes",
    "styles.validate()": "not the graph",
    "styles.valueAt()": "names its target",
    "styles.writeRow()": "writes",
    "time.atEnd": "state",
    "time.atStart": "state",
    "time.bins()": {
        view: (s) => s.time.bins({ count: 4, from: 1, to: 6 }),
        whole: (s) => s.time.bins({ count: 4, from: 1, to: 6, scope: "all" }),
        windowAside: true,
    },
    "time.candidates()": "not the graph",
    "time.changes()": "not the graph",
    "time.commit()": "writes",
    "time.committed": "state",
    "time.current": "state",
    "time.extent()": { wholeProbe: (s) => s.time.extent() },
    "time.field": "not the graph",
    "time.interval": "not the graph",
    "time.mode": "not the graph",
    "time.notices()": "not the graph",
    "time.parse()": "not the graph",
    "time.pause()": "writes",
    "time.play()": "writes",
    "time.playing": "state",
    "time.ready": "state",
    "time.seek()": "writes",
    "time.series()": "writes",
    "time.setField()": "writes",
    "time.setSettings()": "writes",
    "time.settings.ageFade": "not the graph",
    "time.settings.missing": "not the graph",
    "time.settings.mode": "not the graph",
    "time.settings.outside": "not the graph",
    "time.settings.results": "not the graph",
    "time.settings.step": "not the graph",
    "time.settings.timeZone": "not the graph",
    "time.spanOf()": "names its target",
    "time.stepBy()": "writes",
    "time.timeZone": "not the graph",
    "time.window()": "writes",
    "transaction()": "writes",
    "undo()": "writes",
    "views.remove()": "writes",
    "views.save()": "writes",
    "visibility.addCondition()": "writes",
    "visibility.conditionCounts()": "the filter's own",
    "visibility.conditions": "the filter's own",
    "visibility.draft()": "writes",
    "visibility.edgeMask()": "the filter's own",
    "visibility.edges": "the filter's own",
    "visibility.filter": "the filter's own",
    "visibility.isVisible()": "names its target",
    "visibility.nodeMask()": "the filter's own",
    "visibility.nodes": "the filter's own",
    "visibility.removeCondition()": "writes",
    "visibility.set()": "writes",
    "visibility.setConditions()": "writes",
    "visibility.setSteps()": "writes",
    "visibility.setWindow()": "writes",
    "visibility.showContext": "the filter's own",
    "visibility.steps": "the filter's own",
    "visibility.summary.totalEdges": "the filter's own",
    "visibility.summary.totalNodes": "the filter's own",
    "visibility.summary.visibleEdges": "the filter's own",
    "visibility.summary.visibleNodes": "the filter's own",
    "visibility.summaryOf()": "names its target",
    "visibility.updateCondition()": "writes",
    "visibility.window": "the filter's own",
    workingGraph: "not the graph",
};

/** A run that answers nothing; no probe starts one. */
function executeNothing(context: RunExecutionContext): Promise<RunOutcome> {
    const result = createRunResult({
        runId: context.runId,
        shape: "node-metric",
        fields: [],
        measured: { nodes: 0, edges: 0 },
        nodes: [],
        edges: [],
        caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "none", facts: [], notes: [] },
        durationMs: 1,
    });
    return Promise.resolve({ result, summary: result.summary() });
}

/** The shown nodes: two hosts, two services, in a line. */
const SHOWN = [
    { id: "a", type: "host", weight: 1, seen: 1 },
    { id: "b", type: "host", weight: 2, seen: 2 },
    { id: "c", type: "service", weight: 3, seen: 3 },
    { id: "d", type: "service", weight: 4, seen: 4 },
];

/** The node the filter hides: added last, so the shown rows are the same with or without it. */
const HIDDEN = { id: "x", type: "host", weight: 10, seen: 5 };

/** The shown edges, then the hidden node's. */
const SHOWN_EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "d" },
];
const HIDDEN_EDGES = [
    { source: "a", target: "x" },
    { source: "x", target: "d" },
];

/** What hides the node: the filter, or the time window. */
type Hider = "filter" | "window";

/**
 * A session with the working graph on and the probes' style layer.
 * @param withHidden - Whether the graph holds the node that is hidden.
 * @param hider - What hides it, or null for nothing hidden.
 * @returns The session.
 */
async function sessionOf(withHidden: boolean, hider: Hider | null): Promise<GraphSession> {
    const session = createGraphSession({
        runs: { execute: executeNothing },
        features: ["timeline"],
        workingGraph: true,
    });
    await session.data.addNodes(withHidden ? [...SHOWN, HIDDEN] : SHOWN);
    await session.data.addEdges(withHidden ? [...SHOWN_EDGES, ...HIDDEN_EDGES] : SHOWN_EDGES);
    await session.time.setField({ nodes: { start: "seen" } });
    await session.styles.add({
        name: LAYER,
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.type", scale: "ordinal", palette: "okabe-ito" } },
    });
    if (hider === "filter") {
        await session.visibility.set({ kind: "member", of: { nodes: SHOWN.map(({ id }) => id) } });
    } else if (hider === "window") {
        // Half-open: the hidden node's moment is the window's end.
        await session.visibility.setWindow({ attribute: "data.seen", from: 1, to: HIDDEN.seen });
    }

    await session.styles.settled();
    return session;
}

/**
 * An answer as plain data, so two sessions' answers compare by value.
 * @param value - The answer.
 * @returns Its plain form.
 */
function plain(value: unknown): unknown {
    if (value instanceof Map) {
        return [...value].map(([key, each]) => [plain(key), plain(each)]);
    }

    if (value instanceof Set || ArrayBuffer.isView(value)) {
        return [...(value as Iterable<unknown>)].map(plain);
    }

    if (Array.isArray(value)) {
        return value.map(plain);
    }

    if (value !== null && typeof value === "object") {
        // A revision is a change counter, which differs between two sessions built differently.
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key, each]) => typeof each !== "function" && key !== "revision")
                .map(([key, each]) => [key, plain(each)]),
        );
    }

    return value;
}

/**
 * A plain answer without the marks a reader puts on a hidden item it was allowed to find.
 * @param value - The plain answer.
 * @returns It without `excludedBy`.
 */
function unmarked(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(unmarked);
    }

    if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => key !== "excludedBy")
                .map(([key, each]) => [key, unmarked(each)]),
        );
    }

    return value;
}

/**
 * What a probe answers on each of three sessions: one node hidden, without that node, and with
 * nothing hidden.
 * @param ask - The probe.
 * @param hider - What hides the node.
 * @returns The three answers.
 */
async function answers(
    ask: Ask,
    hider: Hider = "filter",
): Promise<{ filtered: unknown; without: unknown; unfiltered: unknown }> {
    const sessions = await Promise.all([sessionOf(true, hider), sessionOf(false, null), sessionOf(true, null)]);
    try {
        const [filtered, without, unfiltered] = await Promise.all(sessions.map(async (each) => plain(await ask(each))));
        return { filtered, without, unfiltered };
    } finally {
        for (const each of sessions) {
            each.dispose();
        }
    }
}

const REPORT = readFileSync(new URL("../../api/session.api.md", import.meta.url), "utf8");
const LISTED = new Map(WHOLE_ROWS.map((row) => [row.reader, row]));

describe("every member of the session is classified", () => {
    it("names each member of the API report, and nothing the report does not have", () => {
        const members = sessionMembers(REPORT);
        assert.isAbove(members.length, 300, "the report walk found the session's members");
        const unclassified = members.filter((member) => !(member in MEMBERS));
        assert.deepStrictEqual(unclassified, [], "classify every new member: a view reader with a probe, or why not");
        const gone = Object.keys(MEMBERS).filter((member) => !members.includes(member));
        assert.deepStrictEqual(gone, [], "a classified member the session no longer has");
    });

    it("lists a member as a whole reader exactly when it is classified as one", () => {
        const whole = Object.entries(MEMBERS)
            .filter(([, kind]) => typeof kind === "object" && "wholeProbe" in kind)
            .map(([member]) => member);
        assert.sameMembers([...LISTED.keys()], whole);
    });
});

describe("a view reader answers as on the graph without what is hidden", () => {
    for (const [member, kind] of Object.entries(MEMBERS)) {
        if (typeof kind !== "object" || !("view" in kind)) {
            continue;
        }

        it(member, async () => {
            const view = await answers(kind.view);
            assert.deepStrictEqual(view.filtered, view.without, `${member} with no scope reads the view`);
            assert.notDeepEqual(view.unfiltered, view.without, `${member}'s probe tells the two graphs apart`);
            if (kind.windowAside !== true) {
                const windowed = await answers(kind.view, "window");
                assert.deepStrictEqual(windowed.filtered, windowed.without, `${member} reads the time window too`);
            }
            if (kind.whole !== undefined) {
                const whole = await answers(kind.whole);
                // A reader allowed to find hidden items marks them hidden; the marks aside, it reads it all.
                assert.deepStrictEqual(
                    unmarked(whole.filtered),
                    unmarked(whole.unfiltered),
                    `${member} naming the graph reads it all`,
                );
            }
        });
    }
});

describe("a reader of both answers each over its own graph", () => {
    for (const [member, kind] of Object.entries(MEMBERS)) {
        if (typeof kind !== "object" || !("shown" in kind)) {
            continue;
        }

        it(member, async () => {
            const shown = await answers(kind.shown);
            const all = await answers(kind.all);
            assert.deepStrictEqual(shown.filtered, all.without, `${member}'s shown half reads the view`);
            assert.deepStrictEqual(all.filtered, all.unfiltered, `${member}'s whole half reads it all`);
            assert.notDeepEqual(all.unfiltered, all.without, `${member}'s probe tells the two graphs apart`);
        });
    }
});

describe("a style reader that is whole by default paints hidden nodes as they are", () => {
    // Design section 4, "Styling, Whole by default": a hidden node keeps its style (agreed point 4),
    // so what a layer paints, and the legend's painted count, are the whole graph's. A rule's
    // `within: "visible"` is how a layer reads only what is shown; it is named, not listed.
    for (const [member, kind] of Object.entries(MEMBERS)) {
        if (typeof kind !== "object" || !("wholeByDefault" in kind)) {
            continue;
        }

        it(member, async () => {
            const whole = await answers(kind.wholeByDefault);
            assert.deepStrictEqual(whole.filtered, whole.unfiltered, `${member} reads the whole graph`);
        });
    }
});

describe("a listed whole reader reads the whole graph", () => {
    for (const [member, kind] of Object.entries(MEMBERS)) {
        if (typeof kind !== "object" || !("wholeProbe" in kind)) {
            continue;
        }

        it(`${member} (${LISTED.get(member)?.case ?? "not listed"})`, async () => {
            const whole = await answers(kind.wholeProbe);
            assert.deepStrictEqual(whole.filtered, whole.unfiltered, `${member} reads the whole graph`);
            assert.notDeepEqual(whole.filtered, whole.without, `${member} is stale: it reads the view now`);
        });
    }
});
