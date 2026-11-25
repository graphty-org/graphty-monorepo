/**
 * @file `data.steps-set`: one change to the sources and steps the graph is built from, behind the
 * `source-steps` experiment (design design/data/multiple-data-sources-design.md, sections 3 and 9).
 *
 * The command carries the edit, not the next value, so it reads the value its turn finds. It writes
 * the next value and the copies it names, rebuilds, and writes the change between the two builds
 * to the `graph` slice through the graph primitives, as the other data ops do: a removed element is
 * removed, a changed record is patched in place, a new one is added. Undo is the slice's op-log, so
 * an undo step gives back the value, the copies and the graph exactly as they were.
 */

import type { EdgeId } from "../../catalog/types";
import { duplicateEdgeError } from "../../data/edgeIdentity";
import type { LoadReport } from "../../data/report";
import { featureOff } from "../../features/resolve";
import type { HistoryCode, JoinChoices, JoinRecord, LoadedSource } from "../../session/types";
import type { SessionCommand } from "../planning";
import type { CommandDefinition, UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import type { CodedFact } from "../shared";
import { type Provenance, PROVENANCE_VALUE } from "../sources/provenance";
import type { StepsAct } from "../sources/steps/acts";
import {
    applyEdit,
    buildOf,
    type Copies,
    copiesOf,
    counted,
    diffGraph,
    EMPTY_STEPS,
    type GraphDiff,
    nodeIdsOf,
    openedAsBuilt,
    projectBuild,
    type ProjectedEdge,
    type ProjectedGraph,
    settleIds,
    SOURCE_COPIES_VALUE,
    SOURCE_EDGE_IDS_VALUE,
    SOURCE_STEPS_VALUE,
    sourceFacts,
    sourceState,
    type SourceSteps,
    type StepsEdit,
    type StepsSource,
} from "../sources/steps/project";
import { type BuildResult, READER_SOURCE } from "../sources/steps/types";
import { type DataMutation, serviceOf, SOURCE_VALUE, SOURCES_VALUE } from "./data";
import { refreshDerivedAfter } from "./derive";

/** `data.steps-set`: one edit of the sources and steps, rebuilt and written to the graph as one step. */
export interface DataStepsSetCommand {
    readonly op: "data.steps-set";
    readonly edit: StepsEdit;
    /** The rows as read of the sources the edit adds, by copy id. */
    readonly copies?: Copies;
    /** The step's label and fact when a door names them: a direct edit's are the off path's. */
    readonly as?: { readonly label: string; readonly fact: CodedFact<HistoryCode> };
}

/**
 * The graph value a slice holds, or a fallback.
 * @param ctx - The command's context.
 * @param name - The value's name.
 * @param empty - What an absent value reads as.
 * @returns The value.
 */
function valueOf<T>(ctx: UndoableContext, name: string, empty: T): T {
    return (ctx.state.graph.values.get(name) as T | undefined) ?? empty;
}

/**
 * The source an edit names.
 * @param edit - The edit.
 * @returns The source's id, or null for an edit that names none.
 */
function sourceOfEdit(edit: StepsEdit): string | null {
    if (edit.kind === "add") {
        return edit.source.id;
    }
    if (edit.kind === "act") {
        return actSource(edit.act);
    }
    return edit.kind === "remove-source" || edit.kind === "replace-copy" ? edit.id : null;
}

/**
 * The source an act reads.
 * @param act - The act.
 * @returns Its source, or null for deleting a step.
 */
function actSource(act: StepsAct): string | null {
    switch (act.act) {
        case "merge":
        case "connect":
            return act.options.from.source;
        case "link":
            return act.options.source;
        case "replace-step":
            return actSource(act.with);
        case "rename":
            return act.rename.source;
        case "remove-step":
        case "move-step":
        case "set-step-off":
            return null;
        default:
            return act.source;
    }
}

/** Each act's step label. */
const ACT_LABELS: Readonly<Record<StepsAct["act"], string>> = {
    merge: "Merged a source",
    connect: "Made edges from a source",
    extract: "Extracted nodes from a column",
    link: "Linked nodes sharing a value",
    "move-columns": "Moved columns onto nodes",
    rename: "Renamed a column",
    pick: "Picked a value",
    "remove-step": "Deleted a step",
    "move-step": "Moved a step",
    "replace-step": "Changed a join",
    "set-step-off": "Turned a step off or on",
    "add-staged": "Added a staged source",
    "set-mapping": "Changed a staged source's mapping",
};

/**
 * The step's fact.
 * @param command - The command.
 * @returns `data.steps-set` with the edit's kind and the source it names.
 */
function factOf(command: DataStepsSetCommand): CodedFact<HistoryCode> {
    if (command.as !== undefined) {
        return command.as.fact;
    }
    const { edit } = command;
    return {
        code: "data.steps-set",
        params: {
            kind: edit.kind === "act" ? edit.act.act : edit.kind,
            source: sourceOfEdit(edit),
            name: edit.kind === "add" ? edit.source.label : null,
        },
    };
}

/**
 * The step's label.
 * @param command - The command.
 * @returns "Loaded flights.csv" and the like.
 */
function labelOf(command: DataStepsSetCommand): string {
    if (command.as !== undefined) {
        return command.as.label;
    }
    const { edit } = command;
    switch (edit.kind) {
        case "add":
            return `${edit.staged === true ? "Staged" : "Loaded"} ${edit.source.label ?? "a source"}`;
        case "reader":
            return "Edited the graph";
        case "remove-edit":
            return "Took back an edit";
        case "remove-source":
            return "Removed a source";
        case "declare-type":
            return `Declared the type ${edit.entry.name}`;
        case "act":
            return ACT_LABELS[edit.act.act];
        case "replace-copy":
            return `Refreshed ${edit.label ?? "a source"}`;
        case "settle-edit":
            return "Settled an edit";
        case "resolve-step":
            return "Resolved a held step";
        case "restore":
            return "Opened the sources";
        default:
            return "Set the sources";
    }
}

/**
 * The kind `data.sources()` lists a source as.
 * @param src - The source.
 * @param join - Its join as the steps say now.
 * @returns A joined table's `join`; the derived source an element's nodeData / edgeData pair owns
 * is a file until the public kinds name it.
 */
function listedKind(src: StepsSource, join: JoinRecord | undefined): LoadedSource["kind"] {
    if (join !== undefined) {
        return "join";
    }
    return src.kind === "derived" ? "file" : src.kind;
}

/**
 * A joined table's join as its steps say now: none once no step reads the source, and its columns,
 * choices and table under the names the source's per-source renames give them, so `editJoin` with
 * the listed choices keeps a rename.
 * @param value - The value.
 * @param src - The source.
 * @returns The join, or undefined.
 */
function joinNow(value: SourceSteps, src: StepsSource): JoinRecord | undefined {
    const { join } = src;
    if (join === undefined || sourceState(value, src.id) === "staged") {
        return undefined;
    }
    const renamed = src.mapping[join.shape === "edges" ? "edges" : "nodes"]?.renamed ?? {};
    if (Object.keys(renamed).length === 0) {
        return join;
    }
    const col = (c: string): string => renamed[c] ?? c;
    const keys = (o: Readonly<Record<string, unknown>>): Record<string, unknown> =>
        Object.fromEntries(Object.entries(o).map(([k, v]) => [col(k), v]));
    const { choices, table } = join;
    return Object.freeze({
        ...join,
        columns: join.columns.map((c) => col(c)),
        choices: {
            ...choices,
            ...(choices.columns === undefined ? {} : { columns: choices.columns.map((c) => col(c)) }),
            ...(choices.clash === undefined ? {} : { clash: keys(choices.clash) as JoinChoices["clash"] }),
        },
        table: { ...table, columns: table.columns.map((c) => col(c)), rows: table.rows.map((row) => keys(row)) },
    });
}

/**
 * For a staged source: the committed source it is named like (design 5.1, 9.2), the one Replace
 * would replace.
 * @param value - The value.
 * @param src - The source.
 * @returns `{ sameName }`, or nothing.
 */
function sameNameOf(value: SourceSteps, src: StepsSource): { sameName?: string } {
    if (src.label === null || sourceState(value, src.id) !== "staged") {
        return {};
    }
    const same = Object.values(value.sources).find(
        (other) => other.id !== src.id && other.label === src.label && sourceState(value, other.id) !== "staged",
    );
    return same === undefined ? {} : { sameName: same.id };
}

/**
 * The sources list and the provenance `data.sources()` and `data.sourcesOf()` read, from the build.
 * @param value - The value.
 * @param copies - Its copies.
 * @param edgeIds - The session edge id of each built edge.
 * @returns The two graph values.
 */
function listed(
    value: SourceSteps,
    copies: Copies,
    edgeIds: Readonly<Record<string, EdgeId>>,
): { sources: readonly LoadedSource[]; provenance: Provenance } {
    const facts = sourceFacts(buildOf(value, copies), value, edgeIds);
    const provenance: Record<string, Provenance[string]> = {};
    const sources = Object.values(value.sources).map((src) => {
        const own = facts.get(src.id);
        const counts = Object.freeze({ nodes: own?.nodes.length ?? 0, edges: own?.edges.length ?? 0 });
        const join = joinNow(value, src);
        provenance[src.id] = Object.freeze({
            nodes: Object.freeze([...(own?.nodes ?? [])]),
            edges: Object.freeze([...(own?.edges ?? [])]),
        });
        return Object.freeze({
            key: src.id,
            kind: listedKind(src, join),
            ...(src.type === undefined ? {} : { type: src.type }),
            ...(src.label === null ? {} : { name: src.label }),
            ...(src.config === undefined ? {} : { config: src.config }),
            tables: src.tables,
            ...(src.tableRows === undefined ? {} : { tableRows: src.tableRows }),
            ...(src.input === undefined ? {} : { input: src.input }),
            added: Object.freeze({ nodes: own?.added.nodes ?? 0, edges: own?.added.edges ?? 0 }),
            counts,
            state: sourceState(value, src.id),
            ...sameNameOf(value, src),
            named: own?.named ?? 0,
            rowsLeftOut: Object.freeze({ ...own?.leftOut }),
            ...(src.issues === undefined ? {} : { issues: src.issues }),
            ...(join === undefined ? {} : { join, ...(join.onto === null ? {} : { joinedOnto: join.onto }) }),
        });
    });
    const reader = facts.get(READER_SOURCE);
    if (reader !== undefined && reader.nodes.length + reader.edges.length > 0) {
        provenance[READER_SOURCE] = Object.freeze({
            nodes: Object.freeze([...reader.nodes]),
            edges: Object.freeze([...reader.edges]),
        });
    }
    return { sources: Object.freeze(sources), provenance: Object.freeze(provenance) };
}

/**
 * The listed sources with those no step builds put back first: the sources a file saved without the
 * experiment brought in stay listed, with their provenance, until a replacing load starts a new graph.
 * @param ctx - The command's context.
 * @param prior - The value before the edit.
 * @param next - The value after it.
 * @param sources - The sources the steps list.
 * @param provenance - Their provenance.
 * @returns The sources and provenance to write.
 */
function withUnbuilt(
    ctx: UndoableContext,
    prior: SourceSteps,
    next: SourceSteps,
    sources: readonly LoadedSource[],
    provenance: Provenance,
): { sources: readonly LoadedSource[]; provenance: Provenance } {
    const stepped = (key: string): boolean => prior.sources[key] !== undefined || next.sources[key] !== undefined;
    // An entry saved before loads had keys has its place in the list as its key, as `sources()` reads it.
    const unbuilt = valueOf<readonly LoadedSource[]>(ctx, SOURCES_VALUE, []).filter(
        (each, at) => !stepped(each.key ?? `s${String(at + 1)}`),
    );
    if (unbuilt.length === 0) {
        return { sources, provenance };
    }
    const priorProvenance = valueOf<Provenance>(ctx, PROVENANCE_VALUE, {});
    const kept = Object.entries(priorProvenance).filter(([key]) => key !== READER_SOURCE && !stepped(key));
    return {
        sources: Object.freeze([...unbuilt, ...sources]),
        provenance: Object.freeze({ ...Object.fromEntries(kept), ...provenance }),
    };
}

/**
 * The writes that add a diff's new edges: one `add-edges` per set of columns their ends and weight
 * are read from, each with the built ids of its records in order.
 * @param edges - The edges to add, by built id, in build order.
 * @returns The writes.
 */
export function edgeAddsOf(
    edges: readonly (readonly [string, ProjectedEdge])[],
): { readonly mutation: DataMutation; readonly built: readonly string[] }[] {
    const groups = new Map<string, (readonly [string, ProjectedEdge])[]>();
    for (const each of edges) {
        const { ends, weight } = each[1];
        const k = JSON.stringify([ends.source, ends.target, weight ?? null]);
        groups.set(k, [...(groups.get(k) ?? []), each]);
    }
    return [...groups.values()].map((group) => {
        const { ends, weight } = group[0][1];
        return {
            mutation: {
                kind: "add-edges",
                records: group.map(([, e]) => e.record),
                source: ends.source,
                target: ends.target,
                repeated: "keep",
                ...(weight === undefined ? {} : { weight }),
            },
            built: group.map(([key]) => key),
        };
    });
}

/**
 * The session edge id one `add-edges` gave each of its records: fresh ids are counters handed out
 * in record order.
 * @param before - The edge ids the graph held before the write.
 * @param after - The edge ids it holds after.
 * @param built - The built id of each record, in order.
 * @param out - Where each built id's session id is written.
 */
export function freshEdgeIds(
    before: ReadonlySet<EdgeId>,
    after: Iterable<EdgeId>,
    built: readonly string[],
    out: Record<string, EdgeId>,
): void {
    const fresh = [...after].filter((id) => !before.has(id)).sort((a, b) => Number(a) - Number(b));
    built.forEach((key, at) => {
        if (fresh[at] !== undefined) {
            out[key] = fresh[at];
        }
    });
}

/**
 * Add the new edges and give back the session edge id of each by its built id.
 * @param edges - The edges to add, by built id, in build order.
 * @param ctx - The command's context.
 * @returns The ids.
 */
function addEdges(edges: readonly (readonly [string, ProjectedEdge])[], ctx: UndoableContext): Record<string, EdgeId> {
    const out: Record<string, EdgeId> = {};
    const service = serviceOf(ctx.services.data);
    for (const { mutation, built } of edgeAddsOf(edges)) {
        const before = new Set(ctx.state.graph.edges.keys());
        service.apply(mutation, ctx.draft, ctx.after);
        freshEdgeIds(before, ctx.state.graph.edges.keys(), built, out);
    }
    return out;
}

/**
 * For a replacing load, which starts a new graph: remove what the slice holds that no step built
 * (a project opened from a file, records set past the steps).
 * @param ctx - The command's context.
 * @param before - The prior build, as the session holds it.
 * @param edgeIds - The session edge id of each built edge.
 */
function removeStrays(ctx: UndoableContext, before: ProjectedGraph, edgeIds: Readonly<Record<string, EdgeId>>): void {
    const service = serviceOf(ctx.services.data);
    const built = new Set(Object.values(edgeIds));
    const strayEdges = [...ctx.state.graph.edges.keys()].filter((id) => !built.has(id));
    const strayNodes = [...ctx.state.graph.nodes.keys()].filter((id) => !before.nodes.has(id));
    if (strayEdges.length > 0) {
        service.apply({ kind: "remove-edges", ids: strayEdges }, ctx.draft, ctx.after);
    }
    if (strayNodes.length > 0) {
        service.apply({ kind: "remove-nodes", ids: strayNodes }, ctx.draft, ctx.after);
    }
}

/**
 * The source descriptor `data.source()` reads for a source, as an add writes it.
 * @param src - The source.
 * @returns Its type, name and options.
 */
function describedBy(src: StepsSource): Readonly<Record<string, unknown>> {
    return Object.freeze({
        ...(src.type === undefined ? {} : { type: src.type }),
        ...(src.label === null ? {} : { name: src.label }),
        ...(src.config === undefined ? {} : { config: src.config }),
    });
}

/**
 * The source the graph is said to come from once one is removed: the newest source left that was
 * loaded rather than merged into another, which is the one a session that never had the removed
 * source names.
 * @param value - The value without the removed source.
 * @returns The source, or undefined when none is left.
 */
function newestLoaded(value: SourceSteps): StepsSource | undefined {
    // ponytail: "merged" is read off the steps (a join.merge reads it), since a source does not
    // record whether it was staged; a source brought in by a connect act still counts as loaded.
    const merged = new Set(value.steps.flatMap((step) => (step.op === "join.merge" ? [step.source] : [])));
    const left = Object.values(value.sources);
    return [...left].reverse().find((src) => !merged.has(src.id)) ?? left.at(-1);
}

/**
 * The import report with its ends as a fresh build of the graph would leave them: the ends of the
 * last group of edges such a build adds. A record read hides the columns those ends name, so the
 * same steps read the same however they were reached (a removal, an undo, an add).
 * @param report - The report the graph holds, or undefined.
 * @param graph - The build.
 * @returns The report to write, or null when it already says so or there is nothing to say.
 */
export function reportOfBuild(report: LoadReport | undefined, graph: ProjectedGraph): LoadReport | null {
    // addEdges groups the new edges by ends and weight, in the order each group first appears.
    const first = new Map<string, ProjectedEdge["ends"]>();
    for (const { ends, weight } of graph.edges.values()) {
        const k = JSON.stringify([ends.source, ends.target, weight ?? null]);
        if (!first.has(k)) {
            first.set(k, ends);
        }
    }
    const last = [...first.values()].at(-1);
    if (report === undefined || last === undefined) {
        return null;
    }
    const { endpoints } = report;
    if (endpoints.source === last.source && endpoints.target === last.target) {
        return null;
    }
    return Object.freeze({
        ...report,
        endpoints: Object.freeze({ source: last.source, target: last.target, resolvedFrom: "declared" as const }),
    });
}

/**
 * The removals and in-place patches of a diff, in that order.
 * @param diff - The diff.
 * @param apply - Applies one mutation.
 */
export function removeAndPatch(diff: GraphDiff, apply: (mutation: DataMutation) => void): void {
    if (diff.removeEdges.length > 0) {
        apply({ kind: "remove-edges", ids: diff.removeEdges });
    }
    if (diff.removeNodes.length > 0) {
        apply({ kind: "remove-nodes", ids: diff.removeNodes });
    }
    if (diff.updateNodes.length > 0) {
        apply({ kind: "update-rows", target: "node", rows: diff.updateNodes, replace: true });
    }
    if (diff.updateEdges.length > 0) {
        apply({ kind: "update-rows", target: "edge", rows: diff.updateEdges, replace: true });
    }
}

/**
 * Whether a diff writes anything to the graph.
 * @param diff - The diff.
 * @returns True when it removes, patches or adds an element.
 */
function changesGraph(diff: GraphDiff): boolean {
    return (
        diff.removeEdges.length + diff.removeNodes.length + diff.updateNodes.length + diff.updateEdges.length > 0 ||
        diff.addNodes.length + diff.addEdges.length > 0
    );
}

const dataStepsSet: UndoableDefinition<DataStepsSetCommand> = {
    op: "data.steps-set",
    undo: { kind: "undoable", label: labelOf, fact: factOf },
    moves: false,
    // A replacing load begins a new dataset, whose step keeps the arrangement it replaced. With a
    // layout drawing the graph, every edit takes the arrangement it began from: the rebuild writes
    // records back, a layout answers a written record by laying the graph out again, and the edit's
    // undo writes them once more, so only the captured arrangement puts every node back. A session
    // with no layout takes none.
    movesWhen: (command, services) =>
        (command.edit.kind === "add" && command.edit.replace === true) || services.layout !== undefined,
    draws: true,
    variants: [
        "set",
        "add",
        "reader",
        "remove-edit",
        "remove-source",
        "declare-type",
        "merge",
        "connect",
        "extract",
        "link",
        "move-columns",
        "rename",
        "pick",
        "remove-step",
        "set-step-off",
        "add-staged",
        "set-mapping",
        "replace-copy",
        "settle-edit",
        "resolve-step",
        "restore",
    ],
    keys: () => ["graph"],
    lane: { kind: "queued", category: "data-add" },
    // A draft commit's base is compared by identity with the value it lands on.
    byReference: ["copies", "draftBase"],
    execute: (command, ctx) => {
        if (ctx.services.sourceSteps?.() === false) {
            throw featureOff("source-steps", "data");
        }
        const service = serviceOf(ctx.services.data);
        const prior = valueOf<SourceSteps>(ctx, SOURCE_STEPS_VALUE, EMPTY_STEPS);
        const priorCopies = valueOf<Copies>(ctx, SOURCE_COPIES_VALUE, {});
        const edgeIds = valueOf<Readonly<Record<string, EdgeId>>>(ctx, SOURCE_EDGE_IDS_VALUE, {});
        const all = command.copies === undefined ? priorCopies : { ...priorCopies, ...command.copies };
        const known = ctx.services.config?.().data.knownFields;
        const asked = withRepeated(applyEdit(prior, command.edit, all), known?.repeatedEdges);
        const copies = copiesOf(asked, all);
        const edited = settledFrom(command.edit, prior, priorCopies, asked, copies);
        const idPath = known?.nodeIdPath ?? "id";
        const after = projectBuild(refusingDuplicates(buildOf(edited, copies)), edited, idPath);
        const { edit } = command;
        // A restore starts from the graph a project file embedded, matched to the build; every
        // other edit from the build of the value it found.
        const opened =
            edit.kind === "restore" ? openedAsBuilt(after, ctx.state.graph.nodes, ctx.state.graph.edges) : null;
        const before = opened?.before ?? projectBuild(buildOf(prior, priorCopies), prior, idPath);
        const diff = diffGraph(before, after, opened?.edgeIds ?? edgeIds);
        // A build that changes the graph is stamped anew, so a run made over an earlier one reads stale
        // (8.6); a restore keeps the stamp the file saved.
        const next = opened === null && changesGraph(diff) ? counted(edited, copies) : edited;
        const apply = (mutation: Parameters<typeof service.apply>[0]): void => {
            service.apply(mutation, ctx.draft, ctx.after);
        };
        const adds = edit.kind === "add" && edit.staged !== true ? edit : null;
        if (adds?.replace === true) {
            removeStrays(ctx, before, edgeIds);
        }
        removeAndPatch(diff, apply);
        const declared = edit.kind === "restore" ? undefined : newlyDeclared(prior, edited);
        if (declared !== undefined) {
            // As an import of the file does: taken only while no edge is drawn yet. A source a
            // step reads for the first time (an add, a staged source added, a draft's commit)
            // brings the direction its file declares.
            service.direct(declared.directed, declared.statedBy, ctx.draft);
        }
        if (diff.addNodes.length > 0) {
            apply({ kind: "add-nodes", records: diff.addNodes, idPath });
        }
        const ids = Object.freeze({ ...diff.kept, ...addEdges(diff.addEdges, ctx) });
        const built = listed(next, copies, ids);
        const { sources, provenance } =
            adds?.replace === true ? built : withUnbuilt(ctx, prior, next, built.sources, built.provenance);
        const added = adds?.source ?? null;
        // A removal names the source left, as the off path does; an add names the one it adds.
        const named = edit.kind === "remove-source" ? newestLoaded(next) : added;
        const report = reportOfBuild(ctx.state.graph.values.get("importReport") as LoadReport | undefined, after);
        service.values?.(
            {
                [SOURCE_STEPS_VALUE]: next,
                [SOURCE_COPIES_VALUE]: copies,
                [SOURCE_EDGE_IDS_VALUE]: ids,
                [SOURCES_VALUE]: sources,
                [PROVENANCE_VALUE]: provenance,
                ...(named === null || named === undefined ? {} : { [SOURCE_VALUE]: describedBy(named) }),
                ...(report === null ? {} : { importReport: report }),
            },
            ctx.draft,
        );
        refreshDerivedAfter(ctx);
    },
};

/**
 * The edited value with its NodeIds settled: after the value before it, unless the edit begins anew.
 * @param edit - The edit.
 * @param prior - The value before.
 * @param priorCopies - Its rows as read.
 * @param asked - The value the edit makes.
 * @param copies - Its rows as read.
 * @returns The value.
 */
function settledFrom(
    edit: StepsEdit,
    prior: SourceSteps,
    priorCopies: Copies,
    asked: SourceSteps,
    copies: Copies,
): SourceSteps {
    const anew = edit.kind === "restore" || (edit.kind === "add" && edit.replace === true);
    return anew ? settleIds(EMPTY_STEPS, {}, asked, copies) : settleIds(prior, priorCopies, asked, copies);
}

/**
 * A build, refused when it holds a repeated edge under `repeatedEdges` "error", as a load without the
 * experiment refuses it.
 * @param result - The build.
 * @returns The build.
 * @throws A `GraphtyError` with `E_DUPLICATE_EDGE` when it holds such a repeat.
 */
function refusingDuplicates(result: BuildResult): BuildResult {
    if (result.duplicate !== undefined) {
        const ids = nodeIdsOf(result);
        const { from, to, repeat } = result.duplicate;
        throw duplicateEdgeError(ids.get(from), ids.get(to), repeat);
    }
    return result;
}

/**
 * The value carrying the graph's `repeatedEdges`, which the build reduces repeated edges by, as a load
 * without the experiment does.
 * @param value - The edited value.
 * @param repeatedEdges - The setting.
 * @returns The value, the same one when it already carries the setting.
 */
function withRepeated(value: SourceSteps, repeatedEdges: SourceSteps["repeatedEdges"]): SourceSteps {
    return value.repeatedEdges === repeatedEdges ? value : { ...value, repeatedEdges };
}

/**
 * The direction declared by the first source a step reads now that none read before.
 * @param prior - The value before the edit.
 * @param edited - The value after it.
 * @returns The direction, or undefined when no newly read source declares one.
 */
function newlyDeclared(prior: SourceSteps, edited: SourceSteps): StepsSource["declared"] {
    const unread = (value: SourceSteps, id: string): boolean => {
        if (value.sources[id] === undefined) {
            return true;
        }
        const state = sourceState(value, id);
        return state === "staged" || state === "held";
    };
    return Object.values(edited.sources).find(
        (src) => src.declared !== undefined && !unread(edited, src.id) && unread(prior, src.id),
    )?.declared;
}

/** The source-steps ops' definitions. */
export const SOURCE_STEPS_DEFINITIONS: readonly CommandDefinition<SessionCommand>[] = [dataStepsSet];
