/**
 * @file A draft's preview (design design/data/multiple-data-sources-design.md, sections 5.3 and
 * 5.6), behind the `source-steps` experiment: the difference between the committed build and the
 * draft's, counted over every row. Pure, and free of Babylon.js, Lit and the DOM.
 */

import type { Path } from "../../../catalog/types";
import type { ValuesWhere } from "../../commands/derive";
import { compileExpressionValue } from "../../styles/predicate";
import type { SourceDraftPreviewSource as PreviewSource } from "../../types";
import type { DraftState } from "./draft";
import { buildOf, type EditRow, editRows, sourceState, type SourceSteps, type StepRow, stepRows } from "./project";
import { element } from "./provenance";
import { type ChangeCounts, changeCounts, editStates } from "./refresh";
import type { BuildIssue, BuildResult, ElementRef, StepStats } from "./types";

/** The counts of a step that are numbers, besides its place and part. */
const NUMBERS = [
    "newNodes",
    "newEdges",
    "mergedEdges",
    "matched",
    "unmatched",
    "fanOut",
    "rowsDiffer",
    "merged",
    "typeDiffers",
    "untouched",
    "keptNew",
    "selfLoops",
    "emptyKey",
    "repeatedKept",
    "parallelPairs",
    "namedOnly",
    "repeated1",
    "repeated2",
] as const;

/** The counts of a step kept by name. */
const BY_NAME = [
    "valuesDiffer",
    "ruleType",
    "rowsDifferIn",
    "endsMeet",
    "endsMissing",
    "newNodeTypes",
    "newEdgeTypes",
] as const;

/** A step's counts minus the committed ones. */
type StatsChange = Record<(typeof NUMBERS)[number], number> & Record<(typeof BY_NAME)[number], Record<string, number>>;

/** How many nodes and edges a build holds, in all and by type. */
interface Totals {
    readonly nodes: number;
    readonly edges: number;
    readonly nodeTypes: Readonly<Record<string, number>>;
    readonly edgeTypes: Readonly<Record<string, number>>;
}

/** One step of the draft, with how it stands against the committed steps. */
interface PreviewStep extends StepRow {
    readonly state: "new" | "edited" | "kept";
    readonly committed: number | null;
    readonly change: StatsChange | null;
}

/** One outcome of a preview. */
export type PreviewIssue =
    | Exclude<BuildIssue, { readonly code: "W_REFERENCE_UNBOUND" }>
    | { readonly code: "W_REFERENCE_UNBOUND"; readonly params: { ref: ElementRef } }
    | {
          readonly code: "W_STEP_REMOVED";
          readonly params: { step: number; reason: "source-removed" | "step-removed" | "source-held"; source: string };
      }
    | { readonly code: "W_FILTER_HELD"; readonly params: { filter: string; column: string } }
    | {
          readonly code: "W_EDIT_SOURCE_CHANGED";
          readonly params: { edit: string; was: unknown; now: unknown; picked?: string };
      }
    | StepRow["valuesDiffer"][number]
    | { readonly code: "W_FAN_OUT" | "W_UNMATCHED"; readonly params: { step: number; rows: number } }
    | { readonly code: "W_UNTOUCHED"; readonly params: { step: number; nodes: number } }
    | { readonly code: "W_PARALLEL_EDGES"; readonly params: { step: number; pairs: number } }
    | { readonly code: "W_SELF_LOOPS"; readonly params: { step: number; count: number } }
    | { readonly code: "W_ROWS_DIFFER"; readonly params: { step: number; column: string; keys: number } }
    | { readonly code: "W_NODE_NAMED_ONLY"; readonly params: { step: number; source: string; nodes: number } }
    | { readonly code: "W_EDGE_END_MISSING"; readonly params: { step: number; space: string; ends: number } };

/** What a draft would do. */
export interface PreviewData extends ChangeCounts {
    readonly before: Totals;
    readonly after: Totals;
    readonly steps: readonly PreviewStep[];
    readonly sources: readonly PreviewSource[];
    readonly edits: readonly EditRow[];
    readonly issues: readonly PreviewIssue[];
}

/** A filter condition, by the paths it reads: what `W_FILTER_HELD` checks. */
interface FilterRead {
    readonly filter: string;
    readonly paths: readonly string[];
    /** The source a source-scoped condition judges by its own values. */
    readonly source?: string;
}

/** What the session holds besides the sources and steps that a preview checks. */
export interface PreviewContext {
    /** The pins, note targets and reader edits that bind in the committed build, by what holds them. */
    readonly refs: ReadonlyMap<string, ElementRef>;
    /** The filter conditions that are on and hide or show. */
    readonly filters: readonly FilterRead[];
    /**
     * Works the computed columns out again over an expression reader, as a commit does: their
     * values per kind, by path and dense index.
     */
    readonly derive?: (valuesWhere: ValuesWhere) => {
        readonly node: ReadonlyMap<Path, readonly unknown[]>;
        readonly edge: ReadonlyMap<Path, readonly unknown[]>;
    };
}

const present = (v: unknown): boolean => v !== undefined && v !== null && v !== "";

/**
 * Reads an expression over a build's elements, as the query engine reads it over the session's: a
 * `data.` path reads the element's value. An expression reading anything else (a run's result) is
 * one the draft leaves as it is, so every element answers it.
 * @param result - The build.
 * @returns The reader.
 */
function buildValuesWhere(result: BuildResult): ValuesWhere {
    return (where, target, overlay) => {
        const els = [...(target === "node" ? result.nodes : result.edges).values()];
        const value = (index: number, path: Path): unknown => {
            if (overlay?.has(path) === true) {
                return overlay.get(path)?.[index];
            }
            return path.startsWith("data.") ? els[index].values[path.slice("data.".length)] : undefined;
        };
        const compiled = compileExpressionValue(where, {
            value,
            has: (index, path) => present(value(index, path)),
            idOf: null,
            indexOf: null,
        });
        if (compiled.paths.some((p) => !p.startsWith("data.") && overlay?.has(p) !== true)) {
            return els.map(() => true);
        }
        return els.map((_el, index) => compiled.value(index) ?? null);
    };
}

/**
 * The totals of a build.
 * @param result - The build.
 * @returns Its counts.
 */
function totals(result: BuildResult): Totals {
    const by = (els: Iterable<{ readonly type: string | null }>): Record<string, number> => {
        const out: Record<string, number> = {};
        for (const { type } of els) {
            if (type !== null) {
                out[type] = (out[type] ?? 0) + 1;
            }
        }
        return out;
    };
    return {
        nodes: result.nodes.size,
        edges: result.edges.size,
        nodeTypes: by(result.nodes.values()),
        edgeTypes: by(result.edges.values()),
    };
}

/**
 * A step's counts minus the committed ones; a missing side counts 0.
 * @param after - The draft's counts.
 * @param before - The committed counts.
 * @returns The change.
 */
function statsChange(after: StepStats | null, before: StepStats | null): StatsChange {
    const out = {} as StatsChange;
    for (const k of NUMBERS) {
        out[k] = (after?.[k] ?? 0) - (before?.[k] ?? 0);
    }
    for (const k of BY_NAME) {
        const a = after?.[k] ?? {};
        const b = before?.[k] ?? {};
        const moved: Record<string, number> = {};
        for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
            const d = (a[name] ?? 0) - (b[name] ?? 0);
            if (d !== 0) {
                moved[name] = d;
            }
        }
        out[k] = moved;
    }
    return out;
}

/**
 * What one source supplies, names and leaves unread in a build.
 * @param result - The build.
 * @param id - The source.
 * @returns Its counts.
 */
function sourceCounts(
    result: BuildResult,
    id: string,
): { nodes: number; edges: number; named: number; noStep: number } {
    let nodes = 0;
    let named = 0;
    for (const n of result.nodes.values()) {
        nodes += n.loads.includes(id) ? 1 : 0;
        named += n.named.includes(id) ? 1 : 0;
    }
    let edges = 0;
    for (const e of result.edges.values()) {
        edges += e.loads.includes(id) ? 1 : 0;
    }
    const noStep = [...(result.fates.get(id)?.values() ?? [])].filter((f) => f.fate === "left-out:no-step").length;
    return { nodes, edges, named, noStep };
}

/**
 * How much one by-name count moved; a name the change leaves out did not move.
 * @param change - The step's change, or null for a new step.
 * @param count - The count.
 * @param name - The column or space.
 * @returns The difference, or undefined for a new step.
 */
function byName(change: StatsChange | null, count: "rowsDifferIn" | "endsMissing", name: string): number | undefined {
    return change === null ? undefined : (change[count][name] ?? 0);
}

/**
 * The outcomes a step's counts report when the draft makes them: on a new or edited step every
 * count, on a kept one only the counts that moved.
 * @param row - The step.
 * @returns Its outcomes.
 */
function stepIssues(row: PreviewStep): PreviewIssue[] {
    const st = row.buckets;
    if (st === null) {
        return [];
    }
    const made = (n: number, d: number | undefined): boolean => n > 0 && (row.change === null || d !== 0);
    const c = row.change;
    const step = row.index;
    const out: PreviewIssue[] = [];
    if (made(st.fanOut, c?.fanOut)) {
        out.push({ code: "W_FAN_OUT", params: { step, rows: st.fanOut } });
    }
    if (made(st.unmatched, c?.unmatched)) {
        out.push({ code: "W_UNMATCHED", params: { step, rows: st.unmatched } });
    }
    if (made(st.untouched, c?.untouched)) {
        out.push({ code: "W_UNTOUCHED", params: { step, nodes: st.untouched } });
    }
    if (made(st.parallelPairs, c?.parallelPairs)) {
        out.push({ code: "W_PARALLEL_EDGES", params: { step, pairs: st.parallelPairs } });
    }
    if (made(st.selfLoops, c?.selfLoops)) {
        out.push({ code: "W_SELF_LOOPS", params: { step, count: st.selfLoops } });
    }
    for (const [column, keys] of Object.entries(st.rowsDifferIn)) {
        if (made(keys, byName(c, "rowsDifferIn", column))) {
            out.push({ code: "W_ROWS_DIFFER", params: { step, column, keys } });
        }
    }
    if (made(st.namedOnly, c?.namedOnly)) {
        out.push({ code: "W_NODE_NAMED_ONLY", params: { step, source: row.source, nodes: st.namedOnly } });
    }
    for (const [space, ends] of Object.entries(st.endsMissing)) {
        if (made(ends, byName(c, "endsMissing", space))) {
            out.push({ code: "W_EDGE_END_MISSING", params: { step, space, ends } });
        }
    }
    if (row.change === null || row.state === "edited" || Object.keys(c?.valuesDiffer ?? {}).length > 0) {
        out.push(...row.valuesDiffer);
    }
    return out;
}

/**
 * The committed steps the draft takes out or no longer builds (`W_STEP_REMOVED`).
 * @param base - The committed value.
 * @param value - The draft's value.
 * @param rows - The draft's steps.
 * @param matched - The committed places the draft's steps hold.
 * @returns The outcomes.
 */
function removedSteps(
    base: SourceSteps,
    value: SourceSteps,
    rows: readonly PreviewStep[],
    matched: ReadonlySet<number>,
): PreviewIssue[] {
    const out: PreviewIssue[] = [];
    base.steps.forEach((step, index) => {
        if (!matched.has(index)) {
            const reason = value.sources[step.source] === undefined ? "source-removed" : "step-removed";
            out.push({ code: "W_STEP_REMOVED", params: { step: index, reason, source: step.source } });
        }
    });
    for (const row of rows) {
        if (row.held && row.committed !== null && base.sources[row.source]?.held !== true) {
            out.push({
                code: "W_STEP_REMOVED",
                params: { step: row.committed, reason: "source-held", source: row.source },
            });
        }
    }
    return out;
}

/**
 * The filter conditions that read a column no element of a build carries (`W_FILTER_HELD`).
 * @param result - The build.
 * @param filters - The conditions.
 * @param removed - The sources the draft takes out, whose conditions its commit takes out too.
 * @param derive - Works the computed columns out again, as the commit does.
 * @returns The outcomes.
 */
function heldFilters(
    result: BuildResult,
    filters: readonly FilterRead[],
    removed: ReadonlySet<string>,
    derive?: PreviewContext["derive"],
): PreviewIssue[] {
    const els = [...result.nodes.values(), ...result.edges.values()];
    const fresh = derive?.(buildValuesWhere(result));
    const computes = (col: string): boolean =>
        [fresh?.node, fresh?.edge].some((kind) => kind?.get(`data.${col}`)?.some((v) => present(v)) === true);
    const out: PreviewIssue[] = [];
    for (const f of filters) {
        if (f.source !== undefined && removed.has(f.source)) {
            continue;
        }
        const columns = f.paths.filter((p) => p.startsWith("data.")).map((p) => p.slice("data.".length));
        if (columns.length === 0 || columns.length < f.paths.length) {
            continue;
        }
        const carried = columns.some(
            (col) =>
                (f.source === undefined && computes(col)) ||
                els.some((el) => present(f.source === undefined ? el.values[col] : el.own[f.source]?.[col]?.v)),
        );
        if (!carried) {
            out.push({ code: "W_FILTER_HELD", params: { filter: f.filter, column: f.paths[0] } });
        }
    }
    return out;
}

/**
 * The outcomes of a preview that read the session as well as the draft: the references the draft
 * unbinds and the filters it holds. They change when a filter, note, pin or reader edit does.
 * @param base - The committed value and copies.
 * @param state - The draft.
 * @param context - The references and filters the session holds.
 * @returns `W_REFERENCE_UNBOUND`, then `W_FILTER_HELD`.
 */
export function contextIssues(
    base: Omit<DraftState, "owned">,
    state: DraftState,
    context: PreviewContext,
): PreviewIssue[] {
    const b1 = buildOf(state.value, state.copies);
    const removed = new Set(Object.keys(base.value.sources).filter((id) => state.value.sources[id] === undefined));
    return [...unboundRefs(b1, context.refs.values()), ...heldFilters(b1, context.filters, removed, context.derive)];
}

/**
 * What committing a draft would do (5.3, 5.6).
 * @param base - The committed value and copies.
 * @param state - The draft.
 * @param context - The references and filters the session holds.
 * @returns The preview.
 */
export function previewOf(base: Omit<DraftState, "owned">, state: DraftState, context: PreviewContext): PreviewData {
    const b0 = buildOf(base.value, base.copies);
    const b1 = buildOf(state.value, state.copies);
    const { value } = state;
    const before = stepRows(base.value, b0, base.copies);
    const matched = new Set<number>();
    const steps = stepRows(value, b1, state.copies).map((row, i): PreviewStep => {
        const was = state.origins === undefined ? i : state.origins[i];
        if (was === null || was === undefined) {
            return { ...row, state: "new", committed: null, change: null };
        }
        matched.add(was);
        const same = JSON.stringify(base.value.steps[was]) === JSON.stringify(value.steps[i]);
        return {
            ...row,
            state: same ? "kept" : "edited",
            committed: was,
            change: statsChange(row.buckets, before[was].buckets),
        };
    });
    const ids = new Set([...Object.keys(base.value.sources), ...Object.keys(value.sources)]);
    const sources = [...ids].map((id): PreviewSource => {
        const now = sourceCounts(b1, id);
        const was = sourceCounts(b0, id);
        return {
            source: id,
            state: value.sources[id] === undefined ? "removed" : sourceState(value, id),
            ...now,
            change: {
                nodes: now.nodes - was.nodes,
                edges: now.edges - was.edges,
                named: now.named - was.named,
                noStep: now.noStep - was.noStep,
            },
        };
    });
    const movedBefore = new Set(
        editStates(base.value, base.copies)
            .filter((s) => s.state === "source-changed")
            .map((s) => s.id),
    );
    const edits = editRows(value, state.copies);
    const moved = edits
        .filter((e) => e.state === "source-changed" && !movedBefore.has(e.id))
        .map((e): PreviewIssue => ({
            code: "W_EDIT_SOURCE_CHANGED",
            params: {
                edit: e.id,
                was: e.was ?? null,
                now: e.now ?? null,
                ...(e.picked === undefined ? {} : { picked: e.picked }),
            },
        }));
    const issues: PreviewIssue[] = [
        ...removedSteps(base.value, value, steps, matched),
        ...contextIssues(base, state, context),
        ...moved,
        ...steps.flatMap((row) => stepIssues(row)),
        ...b1.issues.filter(
            (i): i is Exclude<BuildIssue, { code: "W_REFERENCE_UNBOUND" }> => i.code !== "W_REFERENCE_UNBOUND",
        ),
    ];
    return {
        before: totals(b0),
        after: totals(b1),
        ...changeCounts(b0, b1),
        steps,
        sources,
        edits,
        issues,
    };
}

/**
 * The references that bind in the committed build and not in the draft's, one per element.
 * @param result - The draft's build.
 * @param refs - The references.
 * @returns One `W_REFERENCE_UNBOUND` per element.
 */
function unboundRefs(result: BuildResult, refs: Iterable<ElementRef>): PreviewIssue[] {
    const seen = new Map<string, PreviewIssue>();
    for (const ref of refs) {
        if (element(result, ref) === null) {
            const k = "space" in ref ? `n\u0001${ref.space}\u0001${ref.key}` : `e\u0001${ref.load}\u0001${ref.key}`;
            seen.set(k, { code: "W_REFERENCE_UNBOUND", params: { ref } });
        }
    }
    return [...seen.values()];
}
