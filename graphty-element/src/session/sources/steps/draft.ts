/**
 * @file A draft of the sources and steps (design design/data/multiple-data-sources-design.md,
 * section 5.6), behind the `source-steps` experiment.
 *
 * A draft holds its own copy of the committed value and copies, and applies the same edits the
 * committed doors dispatch ({@link applyEdit}) to that copy only. Its one write to the project is its
 * commit: the whole value, as one `data.steps-set` `set`. The few changes no committed door makes
 * (a step's choices, a staged source's mapping) are worked out here and applied as a `set` too, so
 * every act goes through the same edit. Pure, and free of Babylon.js, Lit and the DOM.
 */

import { GraphtyError } from "../../../errors/GraphtyError";
import {
    checkClash,
    checkShared,
    checkSplit,
    existingOf,
    extractOf,
    mapped,
    type MappingPatch,
    refuseBoth,
    rowsCopies,
} from "./acts";

export type { MappingPatch } from "./acts";
import { isStaged, ownSpace } from "./build";
import {
    addSource,
    applyEdit,
    buildOf,
    type Copies,
    nodeIdsOf,
    type OverlapQuestion,
    overlapQuestion,
    type SourceSteps,
    stepAct,
    type StepsEdit,
} from "./project";
import type { Aggregate, BuildResult, BuiltEdge, BuiltNode, ClashRule, EdgesStep, RowFilter, Step } from "./types";

/** The steps that may reduce a repeated key's rows by `aggregate` (3.3). */
const AGGREGATES: ReadonlySet<Step["op"]> = new Set(["join.merge", "join.node-values", "join.edges"]);

/** A draft's value, its copies, and the sources whose mapping it may change. */
export interface DraftState {
    readonly value: SourceSteps;
    readonly copies: Copies;
    /** The sources the draft staged, added or acted on: the ones `setMapping` may change. */
    readonly owned: ReadonlySet<string>;
    /**
     * Each step's place in the committed value, or null for a step the draft made; absent, every
     * step is at its own committed place.
     */
    readonly origins?: readonly (number | null)[];
    /** The key-overlap questions its adds asked (a draft opened with `askOverlap`), by source. */
    readonly questions?: Readonly<Record<string, AskedOverlap>>;
    /**
     * Every source a draft opened with `askOverlap` added, whether or not it met anything or was
     * given an answer: an answer to one may make a later one meet, or stop meeting, nodes.
     */
    readonly asking?: ReadonlySet<string>;
    /** The answers its adds were given (`overlap`), by source: fixed, never asked. */
    readonly given?: Readonly<Record<string, "merge" | "separate">>;
}

/** A key-overlap question a draft's add asked, and its answer so far. */
export interface AskedOverlap extends OverlapQuestion {
    /** Null until answered; the source is kept separate meanwhile. */
    readonly answer: "merge" | "separate" | null;
    /** The edge ends Keep separate moved out of the proposed space with the nodes. */
    readonly ends: readonly ("sourceSpace" | "targetSpace")[];
}

/** What `editStep` may change on one step. A `null` or `false` takes the choice off. */
export interface StepPatch {
    /** One rule for every column, or rules for some columns that keep the step's other rules. */
    readonly clash?: ClashRule | Readonly<Record<string, ClashRule>>;
    /** The rows the step leaves out, by one column's values. */
    readonly except?: RowFilter | null;
    readonly ignoreCase?: boolean;
    readonly ignoreSpaces?: boolean;
    /** How two rows naming one key settle; `"both"` only on a `join.edges` step. */
    readonly repeated?: "first" | "last" | "both" | null;
    /** Keep the step but build nothing from it. */
    readonly off?: boolean;
    /** A merge's node 2 that names no node 1: kept as its own node, or dropped. */
    readonly unmatchedFrom?: "keep" | "drop";
    /** Per column, how the rows of one repeated key are reduced; `null` takes it off. */
    readonly aggregate?: Aggregate | null;
    /** What a Connect's row does when an edge already joins its ends. */
    readonly existing?: "add" | "merge";
    /** A link's hub cap. */
    readonly maxShared?: number;
    /** How many values a link's pair must share. */
    readonly minShared?: number;
    /** The separator an Extract's cells hold several values by; `null` takes it off. */
    readonly split?: string | null;
}

/**
 * A refusal.
 * @param code - Its code.
 * @param message - For developers.
 * @param details - Its parameters.
 * @returns The error.
 */
function refused(
    code: "E_BAD_COMMAND" | "E_LOAD_UNKNOWN",
    message: string,
    details: Record<string, unknown>,
): GraphtyError {
    return new GraphtyError({ code, message, source: "data", details });
}

/**
 * The sources an edit stages, adds or acts on.
 * @param edit - The edit.
 * @returns Their ids.
 */
function touched(edit: StepsEdit): readonly string[] {
    switch (edit.kind) {
        case "add":
            return [edit.source.id];
        case "declare-type":
            return edit.entry.rules.map((rule) => rule.source);
        case "act": {
            const { act } = edit;
            switch (act.act) {
                case "merge":
                case "connect":
                    return [act.options.from.source];
                case "link":
                    return [act.options.source];
                case "rename":
                    return [act.rename.source];
                case "extract":
                case "move-columns":
                case "add-staged":
                    return [act.source];
                default:
                    return [];
            }
        }
        default:
            return [];
    }
}

/**
 * The state an edit makes, building nothing. A refused edit throws and leaves `state` as it was.
 * @param state - The draft now.
 * @param edit - The edit, as a committed door would dispatch it.
 * @param more - The rows as read of a source the edit stages.
 * @returns The next state.
 */
export function draftApply(state: DraftState, edit: StepsEdit, more?: Copies): DraftState {
    return recounted(applied(state, edit, more));
}

/**
 * The state an edit makes, its key-overlap questions left as they were.
 * @param state - The draft now.
 * @param edit - The edit.
 * @param more - The rows as read of a source the edit stages.
 * @returns The next state.
 */
function applied(state: DraftState, edit: StepsEdit, more?: Copies): DraftState {
    const copies = more === undefined ? state.copies : Object.freeze({ ...state.copies, ...more });
    const value = applyEdit(state.value, edit, copies);
    const origins = carried(state.value.steps, value.steps, state.origins);
    return { ...state, value, copies, owned: new Set([...state.owned, ...touched(edit)]), origins };
}

/**
 * The state with every source the draft added asking worked out again from its value now, so its
 * questions are the ones `data.add` would ask of the steps as they stand: an answer, a removed
 * source or a removed step changes which nodes a later source meets.
 * @param state - The draft.
 * @returns The state with its sources' mappings, issues and questions current.
 */
function recounted(state: DraftState): DraftState {
    const questions = state.questions ?? {};
    const asking = new Set([...(state.asking ?? []), ...Object.keys(questions)]);
    if (asking.size === 0) {
        return state;
    }
    const fresh = refreshed(state.value, questions, asking, state.given ?? {}, state.copies);
    const next =
        JSON.stringify(fresh.value) === JSON.stringify(state.value)
            ? state
            : applied(state, { kind: "set", value: fresh.value });
    return { ...next, questions: fresh.questions };
}

/**
 * Add a staged source (5.5). Asked, a key overlap is kept separate and recorded as an open question
 * instead of settled; an `overlap` given answers it at once, as the committed door does.
 * @param state - The draft now.
 * @param id - The staged source.
 * @param overlap - The caller's answer, if any.
 * @param ask - Whether the draft asks the question.
 * @returns The next state.
 */
export function draftAdd(
    state: DraftState,
    id: string,
    overlap: "separate" | "merge" | undefined,
    ask: boolean,
): DraftState {
    const src = state.value.sources[id] as SourceSteps["sources"][string] | undefined;
    const asked =
        ask && src !== undefined && isStaged(state.value, id) ? overlapQuestion(state.value, src, state.copies) : null;
    // A source added again (its add step removed meanwhile) is asked afresh, not recounted by its old answer.
    const { [id]: _old, ...others } = state.questions ?? {};
    const asking = new Set(state.asking);
    asking.delete(id);
    const next = draftApply(
        { ...state, questions: others, asking },
        { kind: "act", act: { act: "add-staged", source: id, ...(overlap === undefined ? {} : { overlap }) } },
    );
    const { [id]: _was, ...given }: Record<string, "merge" | "separate"> = { ...state.given };
    if (ask && src !== undefined) {
        // Recounted after every answer, a given overlap with it as its fixed answer.
        asking.add(id);
        if (overlap !== undefined) {
            given[id] = overlap;
        }
    } else {
        asking.delete(id);
    }
    if (asked === null || src === undefined) {
        const { [id]: _settled, ...rest } = next.questions ?? {};
        return { ...next, questions: rest, asking, given };
    }
    // Recorded even when answered at once, so a recount can put the keys back in the proposed space.
    const was = src.mapping.edges;
    const now = next.value.sources[id].mapping.edges;
    const ends = (["sourceSpace", "targetSpace"] as const).filter((end) => was?.[end] !== now?.[end]);
    const q = { ...asked, answer: overlap ?? null, ends };
    return { ...next, questions: { ...next.questions, [id]: q }, asking, given };
}

/**
 * Answer a key-overlap question the draft asked: Merge moves the source's keys, and the edge ends
 * Keep separate moved, back into the space it proposed; Keep separate leaves them in its own.
 * @param state - The draft now.
 * @param id - The source asked about.
 * @param answer - The answer.
 * @returns The next state.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` (reason `no-question`) when the draft asked the
 *   source nothing, or the source is no longer added.
 */
export function draftAnswer(state: DraftState, id: string, answer: "merge" | "separate"): DraftState {
    const q = state.questions?.[id];
    const src = state.value.sources[id] as SourceSteps["sources"][string] | undefined;
    if (q === undefined || src === undefined || isStaged(state.value, id) || state.given?.[id] !== undefined) {
        throw refused("E_BAD_COMMAND", `The draft asked source ${id} no key-overlap question.`, {
            reason: "no-question",
            source: id,
        });
    }
    return recounted({ ...state, questions: { ...state.questions, [id]: { ...q, answer } } });
}

/**
 * A source with its node keys, and the edge ends named, moved from one space to another.
 * @param src - The source.
 * @param from - The space they leave.
 * @param to - The space they move to.
 * @param ends - The edge ends that move with the keys.
 * @returns The moved source.
 */
function moved(
    src: SourceSteps["sources"][string],
    from: string,
    to: string,
    ends: AskedOverlap["ends"],
): SourceSteps["sources"][string] {
    const move = (space: string | undefined): string | undefined => (space === from ? to : space);
    const { nodes, edges } = src.mapping;
    const out = edges === undefined ? undefined : { ...edges };
    for (const end of ends) {
        if (out !== undefined) {
            out[end] = move(out[end]);
        }
    }
    const mapping = {
        ...src.mapping,
        ...(nodes === undefined ? {} : { nodes: { ...nodes, space: move(nodes.space) } }),
        ...(out === undefined ? {} : { edges: out }),
    };
    return { ...src, mapping };
}

/**
 * Every source the draft added asking worked out again from the value now, in step order, as
 * `data.add` would have given it had each been added in its place with its answer: an answer to one
 * source changes which nodes a later one meets. A source that now meets nodes is asked (kept
 * separate until answered), and one that meets nothing asks nothing and keeps its proposed space.
 * @param value - The draft's value.
 * @param questions - The questions asked, with their answers.
 * @param asking - The sources the draft added asking.
 * @param given - The answers their adds were given, which always win.
 * @param copies - The rows as read.
 * @returns The value with each such source's mapping and issues, and the questions now.
 */
function refreshed(
    value: SourceSteps,
    questions: Readonly<Record<string, AskedOverlap>>,
    asking: ReadonlySet<string>,
    given: Readonly<Record<string, "merge" | "separate">>,
    copies: Copies,
): { value: SourceSteps; questions: Readonly<Record<string, AskedOverlap>> } {
    const sources = { ...value.sources };
    const out: Record<string, AskedOverlap> = {};
    const at = (id: string): number => value.steps.findIndex((s) => s.op === "join.add" && s.source === id);
    for (const id of [...asking].sort((x, y) => at(x) - at(y))) {
        const q = questions[id] as AskedOverlap | undefined;
        const src = value.sources[id] as SourceSteps["sources"][string] | undefined;
        if (at(id) < 0 || src === undefined) {
            if (q !== undefined) {
                out[id] = q;
            }
            continue;
        }
        const before = { ...value, sources, steps: value.steps.slice(0, at(id)) };
        const { issues: _old, ...bare } = q === undefined ? src : moved(src, ownSpace(id), q.space, q.ends);
        const now = overlapQuestion(before, bare, copies);
        const fixed = given[id] ?? q?.answer ?? null;
        const answer = now === null ? "separate" : (fixed ?? "separate");
        sources[id] = addSource(before, bare, copies, answer).sources[id];
        if (now !== null) {
            const ends = (["sourceSpace", "targetSpace"] as const).filter(
                (end) => bare.mapping.edges?.[end] === now.space,
            );
            out[id] = { ...now, answer: fixed, ends };
        }
    }
    return { value: { ...value, sources }, questions: out };
}

/**
 * The key-overlap questions still open: asked, unanswered, of a source the draft still adds.
 * @param state - The draft.
 * @returns Each source asked about with its question.
 */
export function openQuestions(state: DraftState): readonly (AskedOverlap & { readonly source: string })[] {
    return Object.entries(state.questions ?? {})
        .filter(([id, q]) => q.answer === null && id in state.value.sources && !isStaged(state.value, id))
        .map(([source, q]) => ({ ...q, source }));
}

/**
 * Each step's committed place after an edit. An edit keeps the steps it leaves alone as the same
 * objects, so those keep their place; a step it rewrites (an edited choice, a renamed column) takes
 * the place of the step it replaced, the unclaimed earlier step of the same op, source and part, in
 * order. Every other step is new.
 * @param before - The steps before the edit.
 * @param after - The steps after it.
 * @param origins - The committed places before it; absent, each step's own place.
 * @returns The committed places after it.
 */
function carried(
    before: readonly Step[],
    after: readonly Step[],
    origins: readonly (number | null)[] | undefined,
): (number | null)[] {
    const was = (i: number): number | null => (origins === undefined ? i : (origins[i] ?? null));
    const at = new Map(before.map((s, i) => [s, i]));
    const claimed = new Set<number>();
    const out = after.map((s) => {
        const i = at.get(s);
        if (i === undefined || claimed.has(i)) {
            return undefined;
        }
        claimed.add(i);
        return i;
    });
    const key = (s: Step): string => `${s.op}\u0001${s.source}\u0001${s.op === "join.edges" ? String(s.part) : ""}`;
    return out.map((i, n) => {
        if (i === undefined) {
            const k = key(after[n]);
            i = before.findIndex((s, j) => !claimed.has(j) && key(s) === k);
            if (i < 0) {
                return null;
            }
            claimed.add(i);
        }
        return was(i);
    });
}

/**
 * Build a draft state once, so its acts and reads share the build.
 * @param state - The state.
 * @returns The state.
 */
export function built(state: DraftState): DraftState {
    buildOf(state.value, state.copies);
    return state;
}

/**
 * What a patch of what a Connect's row does when an edge already joins its ends sets on its step.
 * @param value - The value.
 * @param step - The step.
 * @param choice - The choice, or undefined to leave it.
 * @returns The step's `existing` and `columns`, or null to leave them.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` (reason `existing`) for a step no Connect made.
 */
function existingPatch(
    value: SourceSteps,
    step: Step,
    choice: StepPatch["existing"],
): ReturnType<typeof existingOf> | null {
    if (choice === undefined) {
        return null;
    }
    const act = stepAct(value, step);
    if (act?.act !== "connect") {
        throw refused("E_BAD_COMMAND", "Only a Connect's step takes an existing choice.", {
            reason: "existing",
            op: step.op,
        });
    }
    return existingOf(act.to !== undefined && act.to.keepRow !== true, choice);
}

/**
 * What a patch sets on the step of a link or an Extract.
 * @param step - The step.
 * @param patch - The choices.
 * @returns The step's `link` or `extract`, or nothing to leave them.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`: reason `link` or `extract` for a step of another kind,
 *   `max-shared`, `min-shared` or `split` for a value it cannot take.
 */
function valuePatch(step: Step, patch: StepPatch): { link?: EdgesStep["link"]; extract?: EdgesStep["extract"] } {
    const { maxShared, minShared, split } = patch;
    const out: { link?: EdgesStep["link"]; extract?: EdgesStep["extract"] } = {};
    if (maxShared !== undefined || minShared !== undefined) {
        if (step.op !== "join.edges" || step.link === undefined) {
            throw refused("E_BAD_COMMAND", "Only a link's step takes a hub cap or a minimum.", {
                reason: "link",
                op: step.op,
            });
        }
        checkShared(maxShared, minShared);
        out.link = {
            ...step.link,
            maxShared: maxShared ?? step.link.maxShared,
            minShared: minShared ?? step.link.minShared,
        };
    }
    if (split !== undefined) {
        // An edge source's Extract with no separator moves its columns in a step of its own: it is made again instead.
        const extract = extractOf(step)?.extract;
        if (extract === undefined) {
            throw refused("E_BAD_COMMAND", "Only an Extract's step takes a separator.", {
                reason: "extract",
                op: step.op,
            });
        }
        checkSplit(split);
        const { split: _was, ...rest } = extract;
        out.extract = split === null ? rest : { ...rest, split };
    }
    return out;
}

/**
 * Change one step's choices (3.3, 3.10): its clash rules, the rows it leaves out, how it matches
 * text and repeated rows, and whether it is off.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param index - The step's place.
 * @param patch - The choices.
 * @returns The `set` edit that makes the change.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` for no step at `index` (reason `no-step`) or a
 *   `repeated` the step cannot take (reason `repeated-both` or `repeated`), or `E_CLASH_RULE_TYPE`
 *   for a rule that orders values a column does not hold as numbers.
 */
export function stepEdit(value: SourceSteps, copies: Copies, index: number, patch: StepPatch): StepsEdit {
    const step = value.steps[index] as Step | undefined;
    if (step === undefined) {
        throw refused("E_BAD_COMMAND", `No step at ${String(index)}.`, { reason: "no-step", index });
    }
    const { repeated } = patch;
    if (repeated !== undefined && repeated !== null) {
        if (step.op === "join.add") {
            throw refused("E_BAD_COMMAND", "A join.add step takes no repeated choice.", {
                reason: "repeated",
                op: step.op,
            });
        }
        refuseBoth(step.op, repeated);
    }
    if (patch.unmatchedFrom !== undefined && step.op !== "join.merge") {
        throw refused("E_BAD_COMMAND", `A ${step.op} step takes no unmatchedFrom choice.`, {
            reason: "unmatched-from",
            op: step.op,
        });
    }
    if (patch.aggregate !== undefined && !AGGREGATES.has(step.op)) {
        throw refused("E_BAD_COMMAND", `A ${step.op} step takes no aggregate choice.`, {
            reason: "aggregate",
            op: step.op,
        });
    }
    const existing = existingPatch(value, step, patch.existing);
    // Rules for some columns keep "*" for the rest, as a door's rule per column writes it (3.10).
    const held = typeof step.clash === "object" ? step.clash : { "*": step.clash ?? "keep" };
    const patched: Record<string, unknown> = {
        clash: typeof patch.clash === "object" ? { ...held, ...patch.clash } : patch.clash,
        except: patch.except,
        ignoreCase: patch.ignoreCase,
        ignoreSpaces: patch.ignoreSpaces,
        repeated,
        off: patch.off,
        unmatchedFrom: patch.unmatchedFrom,
        aggregate: patch.aggregate,
        ...valuePatch(step, patch),
    };
    const given = Object.entries(patched).filter(([, v]) => v !== undefined);
    // A null or false takes the choice off; anything else sets it.
    const keys = new Set([...given.map(([k]) => k), ...(existing === null ? [] : ["existing", "columns"])]);
    given.push(...Object.entries(existing ?? {}));
    const next: Record<string, unknown> = Object.fromEntries([
        ...Object.entries(step).filter(([k]) => !keys.has(k)),
        ...given.filter(([, v]) => v !== null && v !== false),
    ]);
    const out: SourceSteps = {
        ...value,
        steps: value.steps.map((s, i) => (i === index ? (next as unknown as Step) : s)),
    };
    if (patch.clash !== undefined) {
        checkClash(out, copies, index, next.clash as NonNullable<Step["clash"]>);
    }
    return { kind: "set", value: out };
}

/**
 * Change the mapping, space or type of one source (5.6): what a staged source the draft adds may
 * still change while the draft is open.
 * @param state - The draft.
 * @param id - The source's id.
 * @param patch - The change.
 * @returns The draft with the change made.
 */
export function mappingApply(state: DraftState, id: string, patch: MappingPatch): DraftState {
    const more = rowsCopies(state.value, state.copies, id, patch);
    const copies = more === undefined ? state.copies : { ...state.copies, ...more };
    return draftApply(state, { kind: "set", value: mapped(state.value, id, patch, copies) }, more);
}

/** What a draft's commit does to one element (design 10, row 12), as `graphty.draft` reads it. */
export type DraftMark = "merged" | "new" | "changed" | "removed" | "unchanged";

/** Each element's mark: nodes by NodeId, edges by built edge id. */
export interface DraftMarks {
    readonly nodes: ReadonlyMap<string, DraftMark>;
    readonly edges: ReadonlyMap<string, DraftMark>;
}

/**
 * What committing a draft does to each element, from the committed build and the draft's: a node
 * the draft's build folds more keys or rows into is `merged`, one it builds with other values
 * `changed`, one only it builds `new`, one only the committed build holds `removed`, and the rest
 * `unchanged`; edges likewise. Committed nodes are named by their committed NodeId and, where
 * it differs, by the draft's; new ones by the draft's.
 * @param base - The committed value and copies.
 * @param state - The draft.
 * @returns The marks.
 */
export function draftMarks(base: Omit<DraftState, "owned">, state: DraftState): DraftMarks {
    const b0 = buildOf(base.value, base.copies);
    const b1 = buildOf(state.value, state.copies);
    const ids0 = nodeIdsOf(b0);
    const ids1 = nodeIdsOf(b1);
    const more = moreFolded(b0, b1);
    const nodes = new Map<string, DraftMark>();
    for (const [id, o] of b0.nodes) {
        nodes.set(String(ids0.get(id)), nodeMark(o, b1.nodes.get(id), more.has(id)));
    }
    // After draws the draft's NodeIds: a committed node the draft spells otherwise (its space
    // written out once a staged type's keys overlap) reads its mark there too. A draft NodeId that
    // spells a committed node's keeps the drawn node's mark.
    for (const [id, o] of b1.nodes) {
        const key = String(ids1.get(id));
        if (!nodes.has(key)) {
            const was = b0.nodes.get(id);
            nodes.set(key, was === undefined ? "new" : nodeMark(was, o, more.has(id)));
        }
    }
    const edges = new Map<string, DraftMark>();
    for (const [id, o] of b0.edges) {
        edges.set(id, edgeMark(o, b1.edges.get(id), more.has(id)));
    }
    for (const id of b1.edges.keys()) {
        if (!b0.edges.has(id)) {
            edges.set(id, "new");
        }
    }
    return { nodes, edges };
}

/**
 * The elements the draft's build folds more rows into than the committed one's: a merge of edge rows
 * into nodes, or a Connect's rows into the edges already joining their ends.
 * @param b0 - The committed build.
 * @param b1 - The draft's.
 * @returns Their internal ids in the draft's build.
 */
function moreFolded(b0: BuildResult, b1: BuildResult): ReadonlySet<string> {
    const counts = (b: BuildResult): Map<string, number> => {
        const out = new Map<string, number>();
        for (const byCount of b.drill.values()) {
            for (const { element = "" } of [...(byCount.get("merged") ?? []), ...(byCount.get("mergedEdges") ?? [])]) {
                const id = b.aliases.get(element) ?? b.edgeAliases.get(element) ?? element;
                out.set(id, (out.get(id) ?? 0) + 1);
            }
        }
        return out;
    };
    const was = counts(b0);
    return new Set([...counts(b1)].filter(([id, n]) => n > (was.get(id) ?? 0)).map(([id]) => id));
}

/**
 * Whether two builds of one element hold the same values.
 * @param a - One.
 * @param b - The other.
 * @returns True when they do.
 */
function sameValues(a: BuiltNode | BuiltEdge, b: BuiltNode | BuiltEdge): boolean {
    return JSON.stringify(a.values) === JSON.stringify(b.values);
}

/**
 * What a draft does to one committed node.
 * @param was - The committed node.
 * @param now - The draft's build of it, if any.
 * @param folded - Whether the draft folds more rows into it.
 * @returns Its mark.
 */
function nodeMark(was: BuiltNode, now: BuiltNode | undefined, folded: boolean): DraftMark {
    if (now === undefined) {
        return "removed";
    }
    if (folded || now.aliases.length > was.aliases.length) {
        return "merged";
    }
    return sameValues(was, now) ? "unchanged" : "changed";
}

/**
 * What a draft does to one committed edge.
 * @param was - The committed edge.
 * @param now - The draft's build of it, if any.
 * @param folded - Whether the draft folds more rows into it.
 * @returns Its mark.
 */
function edgeMark(was: BuiltEdge, now: BuiltEdge | undefined, folded: boolean): DraftMark {
    if (now === undefined) {
        return "removed";
    }
    if (folded) {
        return "merged";
    }
    return sameValues(was, now) && was.from === now.from && was.to === now.to ? "unchanged" : "changed";
}
