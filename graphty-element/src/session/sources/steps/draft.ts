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
import { checkClash, refuseBoth } from "./acts";
import { isStaged, ownSpace } from "./build";
import {
    addSource,
    applyEdit,
    buildOf,
    checkSpace,
    type Copies,
    type OverlapQuestion,
    overlapQuestion,
    type SourceSteps,
    type StepsEdit,
    withSourceRules,
} from "./project";
import type { ClashRule, Mapping, RowFilter, Step } from "./types";

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
}

/** What `setMapping` may change on a source the draft owns. */
export interface MappingPatch {
    /** The id space its node keys live in; naming one means a later Add never asks the overlap question. */
    readonly space?: string;
    /** Its node type, written as its whole-source rule; `null` gives it none. */
    readonly type?: string | null;
    /** Roles of its node rows, merged into its node mapping. */
    readonly nodes?: Partial<NonNullable<Mapping["nodes"]>>;
    /** Roles of its edge rows, merged into its edge mapping. */
    readonly edges?: Partial<NonNullable<Mapping["edges"]>>;
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
    const copies = more === undefined ? state.copies : Object.freeze({ ...state.copies, ...more });
    const value = applyEdit(state.value, edit, copies);
    const origins = carried(state.value.steps, value.steps, state.origins);
    return { ...state, value, copies, owned: new Set([...state.owned, ...touched(edit)]), origins };
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
    const next = draftApply(state, {
        kind: "act",
        act: { act: "add-staged", source: id, ...(overlap === undefined ? {} : { overlap }) },
    });
    const asking = new Set(state.asking);
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
    const questions = { ...state.questions, [id]: { ...q, answer } };
    const asking = new Set([...(state.asking ?? []), ...Object.keys(questions)]);
    const fresh = refreshed(state.value, questions, asking, state.given ?? {}, state.copies);
    const next =
        JSON.stringify(fresh.value) === JSON.stringify(state.value)
            ? state
            : draftApply(state, { kind: "set", value: fresh.value });
    return { ...next, questions: fresh.questions };
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
    // Rules for some columns keep "*" for the rest, as a door's rule per column writes it (3.10).
    const held = typeof step.clash === "object" ? step.clash : { "*": step.clash ?? "keep" };
    const patched: Record<string, unknown> = {
        clash: typeof patch.clash === "object" ? { ...held, ...patch.clash } : patch.clash,
        except: patch.except,
        ignoreCase: patch.ignoreCase,
        ignoreSpaces: patch.ignoreSpaces,
        repeated,
        off: patch.off,
    };
    const given = Object.entries(patched).filter(([, v]) => v !== undefined);
    // A null or false takes the choice off; anything else sets it.
    const keys = new Set(given.map(([k]) => k));
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
 * @param value - The value.
 * @param id - The source's id.
 * @param patch - The change.
 * @returns The `set` edit that makes the change.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source, `E_SPACE_RESERVED` for a
 *   `graph:` space, or `E_BAD_COMMAND` for roles of a table the source does not hold (reason
 *   `no-nodes` or `no-edges`).
 */
export function mappingEdit(value: SourceSteps, id: string, patch: MappingPatch): StepsEdit {
    const src = value.sources[id] as SourceSteps["sources"][string] | undefined;
    if (src === undefined) {
        throw refused("E_LOAD_UNKNOWN", `No source has key ${JSON.stringify(id)}.`, {
            key: id,
            known: Object.keys(value.sources),
        });
    }
    checkSpace(patch.space);
    const { nodes, edges } = src.mapping;
    if (nodes === undefined && (patch.nodes !== undefined || patch.space !== undefined)) {
        throw refused("E_BAD_COMMAND", `Source ${id} holds no node rows.`, { reason: "no-nodes", source: id });
    }
    if (edges === undefined && patch.edges !== undefined) {
        throw refused("E_BAD_COMMAND", `Source ${id} holds no edge rows.`, { reason: "no-edges", source: id });
    }
    const mapping: Mapping = {
        ...(nodes === undefined
            ? {}
            : { nodes: { ...nodes, ...patch.nodes, ...(patch.space === undefined ? {} : { space: patch.space }) } }),
        ...(edges === undefined ? {} : { edges: { ...edges, ...patch.edges } }),
    };
    const next = {
        ...src,
        mapping,
        ...(patch.space === undefined ? {} : { spacePicked: true }),
        ...(patch.type === undefined ? {} : { stagedType: patch.type }),
    };
    let { types } = value;
    if (patch.type !== undefined) {
        // The source's whole-source and end rules are written again from its new type (9.1).
        const own = (rule: (typeof types)[number]["rules"][number]): boolean =>
            rule.source === id &&
            (Object.keys(rule).length === 1 || (rule.end !== undefined && rule.part === undefined));
        types = withSourceRules(
            types.map((t) => (t.kind === "node" ? { ...t, rules: t.rules.filter((r) => !own(r)) } : t)),
            next,
        );
    }
    return { kind: "set", value: { ...value, sources: { ...value.sources, [id]: next }, types } };
}
