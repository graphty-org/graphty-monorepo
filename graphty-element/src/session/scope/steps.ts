/**
 * @file Reading a selection built from branches and steps (`session.scope.watchSteps`): every
 * branch's and step's count, state and members, the canonical form a write fills (ids, colors),
 * the conversion of a flat rule into one (`asUnion`), and the freezing of live references on a
 * write that cannot follow them.
 *
 * Every fact here is neutral: states and reasons are codes, never words.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type {
    EdgeId,
    NodeId,
    RuleTree,
    RunId,
    Scope,
    StepReference,
    UnionBranch,
    UnionLeaf,
    UnionStep,
} from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { Histogram, HistogramOptions } from "../results/types";
import type { CodedFact } from "../shared";
import type { Bytes, UnionRead } from "../visibility/union";
import type { ScopeApi } from "./ScopeApi";

// ---------------------------------------------------------------------------------------------
// The public shape
// ---------------------------------------------------------------------------------------------

/**
 * Where a step stands: folded into its branch (`"applied"`), not yet a test (`"inert"`), waiting
 * on a run (`"pending"`), or switched off (`"off"`).
 *
 * OPEN UNION: states may be added in a minor release; handle unknown states.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export type StepState = "applied" | "inert" | "pending" | "off";

/**
 * Where a branch stands: every step it has folded (`"ready"`), one waits on a run (`"pending"`),
 * or switched off (`"off"`).
 *
 * OPEN UNION: states may be added in a minor release; handle unknown states.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export type BranchState = "ready" | "pending" | "off";

/**
 * Why a step is inert or pending, or a note on an applied one.
 *
 * Inert: `test-unset` (an untouched range, an empty pick, empty text, no test), `no-reference`,
 * `one-node-only` (a one-node option bound to several nodes; `params.option`). Pending:
 * `computing`, `run-needed` and `stale` (`params.estimateMs`), `run-paused`, `run-failed`
 * (`params.error`, an error code), `waits-for` (`params.step`, the step waited on). Applied:
 * `input-empty`, `reference-empty`, `frozen-from` (`params.reference`).
 *
 * OPEN UNION: codes may be added in a minor release; handle unknown codes.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export type StepReasonCode =
    | "test-unset"
    | "no-reference"
    | "one-node-only"
    | "computing"
    | "run-needed"
    | "stale"
    | "run-paused"
    | "run-failed"
    | "waits-for"
    | "input-empty"
    | "reference-empty"
    | "frozen-from";

/**
 * One step as `watchSteps` reads it. Every scope is one `selection.apply`, `scope.count` and
 * `sets` accept.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface StepReading {
    readonly id: string;
    readonly state: StepState;
    readonly reason: CodedFact<StepReasonCode> | null;
    /** How many elements the branch holds after this step. */
    readonly count: number;
    /** The branch before this step. */
    readonly input: Scope;
    /** The branch after this step. */
    readonly members: Scope;
    /** Whether the step's result depends on where it sits: computed on So far, or below a step of the other family. */
    readonly orderMatters: boolean;
    /** The session run behind the step's value, when it reads one. */
    readonly run: RunId | null;
    /** Whether the element froze a live reference in it. */
    readonly frozen: boolean;
}

/**
 * One branch as `watchSteps` reads it.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface BranchReading {
    readonly id: string;
    readonly color: string;
    readonly state: BranchState;
    /** Why it is pending: the first pending step's reason. */
    readonly reason: CodedFact<StepReasonCode> | null;
    /** How many elements it holds: a pending branch's last ready count, 0 when it was never ready. */
    readonly count: number;
    readonly members: Scope;
    readonly steps: readonly StepReading[];
}

/**
 * A selection built from branches, read now.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface StepsReading {
    /** The rule as the element holds it: ids and colors filled. */
    readonly rule: UnionLeaf;
    /** The elements in a ready branch that is on, out of the base. */
    readonly total: { readonly count: number; readonly of: number };
    /** The ids of the branches that are on and wait on a run. */
    readonly pending: readonly string[];
    /** Everything in a ready branch that is on. */
    readonly result: Scope;
    readonly branches: readonly BranchReading[];
    /**
     * The first branch that is on and holds an element, or null.
     * @param id - A node id (a node selection) or an edge id (an edge selection).
     * @returns The branch's id, or null.
     */
    branchOf(id: NodeId | EdgeId): string | null;
}

/**
 * A live reading: `current` is synchronous, and the callback hears every change.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface StepsWatch {
    readonly current: StepsReading;
    /** Stop watching. */
    end(): void;
}

/**
 * The options a selection built from steps reads.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface ScopeStepOptions {
    /**
     * A run that follows the pointer starts only when estimated under this many milliseconds; a
     * slower one waits (`run-paused`) until the pointer settles. Unset: no limit.
     */
    readonly liveMs?: number;
    /** A run estimated above this many milliseconds waits for `allowRun` (`run-needed`). Unset: no limit. */
    readonly askAboveMs?: number;
    /**
     * The colors a new branch is given, in order: the first one no other branch of its rule holds.
     * The palette never wraps: a branch past its size is refused with `E_CAP_EXCEEDED`.
     */
    readonly branchPalette?: readonly string[];
}

/**
 * Where a step would be written, for `checkStep`.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface StepCheckOptions {
    readonly side: UnionLeaf["side"];
    readonly within: UnionLeaf["within"];
    /** A style layer's selector, or a visibility filter condition. */
    readonly host: "selector" | "filter";
}

/**
 * How one value is distributed over a scope: `session.scope.histogram`. Numbers are binned as a
 * run's field is (`kind: "numeric"`); anything else is counted by value, most elements first
 * (`kind: "categorical"`), each value of an unstable field naming the best-connected member that
 * holds it, so "the group of X" can be saved and followed across re-runs. `missing` counts the
 * elements of the scope with no value, `of` the elements of the scope.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export type ValueHistogram =
    | (Histogram & { readonly kind: "numeric"; readonly missing: number; readonly of: number })
    | {
          readonly kind: "categorical";
          readonly values: readonly {
              readonly value: string | number | boolean;
              readonly count: number;
              /** The best-connected node holding the value, for a field whose values are unstable names. */
              readonly member?: NodeId;
          }[];
          readonly missing: number;
          readonly of: number;
      };

/**
 * What `session.scope.histogram` reads.
 * Experimental: may change or be removed in a minor release.
 * @beta
 */
export interface ValueHistogramOptions extends HistogramOptions {
    /** The elements counted. Absent: the whole graph. */
    readonly within?: Scope;
    /** Count the values as categories, or bin them as numbers. Absent: numbers when every value is one. */
    readonly as?: "numeric" | "categorical";
}

/**
 * The branch colors when a session sets none: six hues each at least 3:1 against both a white and
 * a near-black panel, clear of the selection's gold ring and blue edge band.
 */
export const DEFAULT_BRANCH_PALETTE: readonly string[] = Object.freeze([
    "#009E73",
    "#D55E00",
    "#AA4499",
    "#999933",
    "#1192E8",
    "#CC6677",
]);

// ---------------------------------------------------------------------------------------------
// Writing: ids, colors and frozen references
// ---------------------------------------------------------------------------------------------

/**
 * A union leaf with every branch and step id filled, and every branch color: a missing id is the
 * first `b<n>` or `s<n>` the leaf does not hold; a missing color is the first palette color no
 * other branch holds. What is given is kept.
 * @param leaf - The leaf, validated.
 * @param palette - The branch palette.
 * @returns The leaf, the same object when nothing was missing.
 * @throws `E_CAP_EXCEEDED` when a branch needs a color and the palette is used up.
 */
export function canonicalUnion(leaf: UnionLeaf, palette: readonly string[]): UnionLeaf {
    const used = new Set<string>();
    for (const branch of leaf.branches) {
        if (branch.id !== undefined) {
            used.add(branch.id);
        }

        for (const step of branch.steps) {
            if (step.id !== undefined) {
                used.add(step.id);
            }
        }
    }

    const mint = (prefix: string): string => {
        let n = 1;
        while (used.has(`${prefix}${String(n)}`)) {
            n++;
        }

        const id = `${prefix}${String(n)}`;
        used.add(id);
        return id;
    };
    const colors = new Set(leaf.branches.flatMap((branch) => (branch.color === undefined ? [] : [branch.color])));
    let changed = false;
    const branches = leaf.branches.map((branch): UnionBranch => {
        const steps = branch.steps.map((step): UnionStep => {
            if (step.id !== undefined) {
                return step;
            }

            changed = true;
            return { ...step, id: mint("s") };
        });
        if (
            branch.id !== undefined &&
            branch.color !== undefined &&
            steps.every((step, at) => step === branch.steps[at])
        ) {
            return branch;
        }

        changed = true;
        return { ...branch, id: branch.id ?? mint("b"), color: branch.color ?? nextColor(palette, colors), steps };
    });

    return changed ? { ...leaf, branches } : leaf;
}

/**
 * The first palette color not yet used, marked used.
 * @param palette - The palette.
 * @param used - The colors held.
 * @returns The color.
 * @throws `E_CAP_EXCEEDED` when every color is held.
 */
function nextColor(palette: readonly string[], used: Set<string>): string {
    const color = palette.find((each) => !used.has(each));
    if (color === undefined) {
        throw new GraphtyError({
            code: "E_CAP_EXCEEDED",
            message: `A selection holds at most ${String(palette.length)} branches: the branch palette is used up.`,
            source: "data",
            details: { reason: "branch-palette-used-up", size: palette.length },
        });
    }

    used.add(color);
    return color;
}

/**
 * Every union leaf in a rule tree, at any depth, passed through `each`.
 * @param tree - The tree.
 * @param each - What to do with one leaf.
 * @returns The tree, the same object when nothing changed.
 */
export function mapUnions(tree: RuleTree, each: (leaf: UnionLeaf) => UnionLeaf): RuleTree {
    switch (tree.kind) {
        case "union":
            return each(tree);
        case "all":
        case "any": {
            const of = tree.of.map((member) => mapUnions(member, each));
            return of.every((member, at) => member === tree.of[at]) ? tree : { ...tree, of };
        }
        case "not": {
            const of = mapUnions(tree.of, each);
            return of === tree.of ? tree : { ...tree, of };
        }
        default:
            return tree;
    }
}

/** The live references a write that cannot follow them freezes. */
type LiveReference = "selection" | "hovered-or-selected";

/**
 * A union leaf with every live reference (`"selection"`, `"hovered-or-selected"`) replaced by the
 * nodes it holds now, and the step marked with what it was frozen from: what a filter condition
 * or a kept set stores, because neither follows the pointer.
 * @param leaf - The leaf.
 * @param now - The nodes each live reference holds now.
 * @returns The leaf, the same object when it read nothing live.
 */
export function freezeLiveReferences(leaf: UnionLeaf, now: (reference: LiveReference) => readonly NodeId[]): UnionLeaf {
    let changed = false;
    const branches = leaf.branches.map((branch) => {
        const steps = branch.steps.map((step) => {
            let from: LiveReference | undefined;
            const freeze = (reference: StepReference | undefined): StepReference | undefined => {
                if (reference !== "selection" && reference !== "hovered-or-selected") {
                    return reference;
                }

                from = reference;
                return { nodes: [...now(reference)] };
            };
            const rule = freezeRule(step.rule, freeze);
            if (rule === step.rule || from === undefined) {
                return step;
            }

            changed = true;
            return { ...step, rule, frozenFrom: from };
        });
        return steps.every((step, at) => step === branch.steps[at]) ? branch : { ...branch, steps };
    });

    return changed ? { ...leaf, branches } : leaf;
}

/**
 * A step rule with its references passed through `freeze`.
 * @param rule - The rule.
 * @param freeze - Maps a reference.
 * @returns The rule, the same object when no reference moved.
 */
function freezeRule(
    rule: RuleTree,
    freeze: (reference: StepReference | undefined) => StepReference | undefined,
): RuleTree {
    switch (rule.kind) {
        case "hops":
        case "touching":
        case "nonempty": {
            const of = freeze(rule.of);
            return of === rule.of ? rule : { ...rule, of };
        }
        case "same-value": {
            const as = freeze(rule.as);
            return as === rule.as ? rule : { ...rule, as };
        }
        case "member": {
            const of = freeze(rule.of);
            return of === rule.of ? rule : { ...rule, of: of as Scope };
        }
        case "measure": {
            if (rule.bind === undefined) {
                return rule;
            }

            const bind = Object.fromEntries(
                Object.entries(rule.bind).map(([name, reference]) => [name, freeze(reference)]),
            );
            return Object.entries(bind).every(([name, reference]) => reference === rule.bind?.[name])
                ? rule
                : { ...rule, bind: bind as Record<string, StepReference> };
        }
        default:
            return rule;
    }
}

/**
 * A flat rule as one union leaf: a leaf, or an `all` of leaves and `not`s, is one branch starting
 * with all, a Keep step per leaf and an Except step per `not`; an `any` of leaves is one branch
 * per leaf, each starting with none and adding it. Anything else is null, and a union is itself.
 * @param rule - The rule.
 * @param options - The side and base the leaf reads.
 * @param options.side - The side.
 * @param options.within - The base.
 * @returns The leaf, or null.
 */
export function asUnion(
    rule: RuleTree,
    options: { readonly side: UnionLeaf["side"]; readonly within: UnionLeaf["within"] },
): UnionLeaf | null {
    const { side, within } = options;
    const isLeaf = (tree: RuleTree): boolean => !["all", "any", "not", "union"].includes(tree.kind);
    switch (rule.kind) {
        case "union":
            return rule;
        case "any":
            return rule.of.every(isLeaf)
                ? {
                      kind: "union",
                      side,
                      within,
                      branches: rule.of.map((leaf) => ({ start: "none", steps: [{ op: "add", rule: leaf }] })),
                  }
                : null;
        case "all": {
            const steps: UnionStep[] = [];
            for (const member of rule.of) {
                if (member.kind === "not" && isLeaf(member.of)) {
                    steps.push({ op: "except", rule: member.of });
                } else if (isLeaf(member)) {
                    steps.push({ op: "keep", rule: member });
                } else {
                    return null;
                }
            }

            return { kind: "union", side, within, branches: [{ start: "all", steps }] };
        }
        case "not":
            return isLeaf(rule.of)
                ? {
                      kind: "union",
                      side,
                      within,
                      branches: [{ start: "all", steps: [{ op: "except", rule: rule.of }] }],
                  }
                : null;
        default:
            return { kind: "union", side, within, branches: [{ start: "all", steps: [{ op: "keep", rule }] }] };
    }
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

/** What turning a raw reading into a public one needs. */
export interface ReadingSources {
    /**
     * A half's members as a scope.
     * @param side - The side.
     * @param bytes - The members.
     * @returns The scope.
     */
    scopeOf(side: UnionLeaf["side"], bytes: Bytes): Scope;
    /**
     * The index of an id on a side, or -1.
     * @param side - The side.
     * @param id - The id.
     * @returns The index.
     */
    indexOf(side: UnionLeaf["side"], id: NodeId | EdgeId): number;
    /**
     * The session run behind a step's value, or null.
     * @param step - The step.
     * @returns The run's id.
     */
    runOf(step: UnionStep): RunId | null;
}

/**
 * Count the ones in some bytes.
 * @param bytes - The bytes.
 * @returns The count.
 */
function ones(bytes: Bytes): number {
    let count = 0;
    for (const byte of bytes) {
        count += byte;
    }

    return count;
}

/**
 * A scope made only when it is read.
 * @param make - Makes it.
 * @returns The getter.
 */
function lazy(make: () => Scope): () => Scope {
    let made: Scope | undefined;
    return () => (made ??= make());
}

/**
 * The public reading of a raw one.
 * @param leaf - The canonical leaf.
 * @param read - The raw reading.
 * @param sources - What it needs.
 * @returns The reading.
 */
export function stepsReadingOf(leaf: UnionLeaf, read: UnionRead, sources: ReadingSources): StepsReading {
    const { side } = leaf;
    const branches = read.branches.map((branch, at): BranchReading => {
        const spec = leaf.branches[at];
        const members = lazy(() => sources.scopeOf(side, branch.members));
        const steps = branch.steps.map((step, index): StepReading => {
            const given = spec.steps[index];
            const input = lazy(() => sources.scopeOf(side, step.input));
            const after = lazy(() => sources.scopeOf(side, step.members));
            return {
                id: given.id ?? "",
                state: step.state,
                reason: step.reason as CodedFact<StepReasonCode> | null,
                count: ones(step.members),
                get input(): Scope {
                    return input();
                },
                get members(): Scope {
                    return after();
                },
                orderMatters: step.orderMatters,
                run: sources.runOf(given),
                frozen: given.frozenFrom !== undefined,
            };
        });

        return {
            id: spec.id ?? "",
            color: spec.color ?? "",
            state: branch.state,
            reason: branch.reason as CodedFact<StepReasonCode> | null,
            count: ones(branch.members),
            get members(): Scope {
                return members();
            },
            steps,
        };
    });
    const result = lazy(() => sources.scopeOf(side, read.total));

    return {
        rule: leaf,
        total: { count: ones(read.total), of: ones(read.base) },
        pending: read.branches.flatMap((branch, at) =>
            branch.state === "pending" ? [leaf.branches[at].id ?? ""] : [],
        ),
        get result(): Scope {
            return result();
        },
        branches,
        branchOf(id: NodeId | EdgeId): string | null {
            const index = sources.indexOf(side, id);
            if (index < 0) {
                return null;
            }

            const found = read.branches.findIndex((branch) => branch.state !== "off" && branch.members[index] === 1);
            return found < 0 ? null : (leaf.branches[found].id ?? null);
        },
    };
}

// ---------------------------------------------------------------------------------------------
// The surface
// ---------------------------------------------------------------------------------------------

/** The part of `session.scope` that reads and steers a selection built from steps. */
export type ScopeStepsApi = Pick<
    ScopeApi,
    "watchSteps" | "asUnion" | "checkStep" | "setOptions" | "options" | "allowRun" | "cancelRun"
>;

/** What {@link createScopeSteps} reads. */
export interface ScopeStepsSources {
    /**
     * Read a canonical leaf now.
     * @param leaf - The leaf.
     * @returns The raw reading.
     */
    read(leaf: UnionLeaf): UnionRead;
    /** Turning bytes and ids into scopes and indices. */
    readonly reading: Omit<ReadingSources, "runOf">;
    /**
     * Check a rule tree as a write door does.
     * @param tree - The tree.
     */
    assertRule(tree: RuleTree): void;
    /**
     * The input signature of a leaf, or null when it cannot be enumerated (always re-read).
     * @param leaf - The leaf.
     * @returns The signature.
     */
    signature(leaf: UnionLeaf): string | null;
    /**
     * Watch the session's inputs. Absent: a watch never hears a change.
     * @param watch - The watch.
     * @returns Stops it.
     */
    readonly subscribe?: (watch: {
        signature(): string | null;
        resolve(): unknown;
        ready(resolution: unknown): void;
        cost(): number;
    }) => () => void;
    /** The step runs, once built. */
    readonly stepRuns?: () => StepRunsLike | undefined;
    /**
     * The base a session run read, so a filter step reading a filtered-graph run is refused.
     * @param run - The run.
     * @returns Its scope, or undefined.
     */
    readonly runScopeOf?: (run: RunId) => Scope | undefined;
}

/** The part of the step runs the surface reaches. */
export interface StepRunsLike {
    allow(step: UnionStep, within: UnionLeaf["within"]): void;
    cancel(step: UnionStep, within: UnionLeaf["within"]): void;
    runOf(step: UnionStep, within: UnionLeaf["within"]): RunId | null;
}

/**
 * Check run limits and a branch palette.
 * @param options - The options.
 * @throws `E_OPTION_RANGE` when one is out of range.
 */
function assertStepOptions(options: ScopeStepOptions): void {
    for (const name of ["liveMs", "askAboveMs"] as const) {
        const value = options[name];
        if (value !== undefined && !(typeof value === "number" && Number.isFinite(value) && value >= 0)) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `scope.setOptions: ${name} is a number of milliseconds, from 0.`,
                source: "data",
                details: { option: name, value },
            });
        }
    }

    const palette = options.branchPalette;
    if (palette !== undefined && (palette.length === 0 || !palette.every((color) => typeof color === "string"))) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: "scope.setOptions: branchPalette is a list of at least one color.",
            source: "data",
            details: { option: "branchPalette" },
        });
    }
}

/**
 * The step of a leaf with an id.
 * @param rule - The leaf.
 * @param stepId - The id.
 * @returns The step.
 * @throws `E_BAD_COMMAND` when no step has it.
 */
function stepOf(rule: UnionLeaf, stepId: string): UnionStep {
    const step = rule.branches.flatMap((branch) => branch.steps).find((each) => each.id === stepId);
    if (step === undefined) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `The selection has no step "${stepId}".`,
            source: "data",
            details: { step: stepId },
        });
    }

    return step;
}

/**
 * The paths of the runs a rule reads, `results.<run>.*`.
 * @param tree - The rule.
 * @returns The run ids.
 */
function runsRead(tree: RuleTree): string[] {
    const loose = tree as unknown as Readonly<Record<string, unknown>>;
    const path = [loose.path, loose.attribute, loose.reads].find(
        (each): each is string => typeof each === "string" && each.startsWith("results."),
    );
    const own = path === undefined ? [] : [path.slice("results.".length).split(".")[0]];
    switch (tree.kind) {
        case "all":
        case "any":
            return [...own, ...tree.of.flatMap(runsRead)];
        case "not":
            return [...own, ...runsRead(tree.of)];
        default:
            return own;
    }
}

/**
 * The steps surface of one session's scope resolver.
 * @param sources - What it reads.
 * @returns The surface.
 */
export function createScopeSteps(sources: ScopeStepsSources): ScopeStepsApi {
    let options: ScopeStepOptions = Object.freeze({});

    const canonical = (
        rule: RuleTree,
        given: { side?: UnionLeaf["side"]; within?: UnionLeaf["within"] } = {},
    ): UnionLeaf => {
        const { side, within } = given;
        let leaf: UnionLeaf | null = null;
        if (rule.kind === "union") {
            leaf = rule;
        } else if (side !== undefined && within !== undefined) {
            leaf = asUnion(rule, { side, within });
        }

        if (leaf === null) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "watchSteps reads a union leaf, or a rule asUnion converts with the side and base given.",
                source: "data",
                details: { reason: "not-a-union" },
            });
        }

        sources.assertRule(leaf);
        return canonicalUnion(leaf, options.branchPalette ?? DEFAULT_BRANCH_PALETTE);
    };
    const readingNow = (leaf: UnionLeaf, read: UnionRead): StepsReading =>
        stepsReadingOf(leaf, read, {
            ...sources.reading,
            runOf: (step) => sources.stepRuns?.()?.runOf(step, leaf.within) ?? null,
        });

    return {
        watchSteps(rule, onChange, given = {}) {
            const leaf = canonical(rule, given);
            const first = sources.read(leaf);
            let current = readingNow(leaf, first);
            let last = digestOf(current, first);
            let ended = false;
            let queued = false;
            const stop =
                sources.subscribe?.({
                    signature: () => sources.signature(leaf),
                    resolve: () => sources.read(leaf),
                    ready: (resolution) => {
                        const raw = resolution as UnionRead;
                        current = readingNow(leaf, raw);
                        const digest = digestOf(current, raw);
                        if (ended || digest === last) {
                            return;
                        }

                        last = digest;
                        if (queued) {
                            return;
                        }

                        // At most once a turn: several inputs moving together are heard once.
                        queued = true;
                        queueMicrotask(() => {
                            queued = false;
                            if (!ended) {
                                onChange(current);
                            }
                        });
                    },
                    cost: () => 1,
                }) ?? (() => undefined);

            return {
                get current(): StepsReading {
                    return current;
                },
                end(): void {
                    ended = true;
                    stop();
                },
            };
        },
        asUnion,
        checkStep(step, where) {
            const leaf: UnionLeaf = {
                kind: "union",
                side: where.side,
                within: where.within,
                branches: [{ start: "all", steps: [step] }],
            };
            if (where.host === "filter" && where.within === "visible") {
                return { code: "circular-scope", params: {} };
            }

            if (where.host === "filter" && runsRead(step.rule).some((run) => sources.runScopeOf?.(run) === "visible")) {
                return { code: "circular-scope", params: {} };
            }

            try {
                sources.assertRule(leaf);
            } catch (error) {
                const failure = error as { code?: string; details?: { reason?: unknown } };
                const reason = failure.details?.reason;
                return { code: typeof reason === "string" ? reason : (failure.code ?? "E_BAD_COMMAND"), params: {} };
            }

            return null;
        },
        setOptions(next) {
            assertStepOptions(next);
            const merged = Object.entries({ ...options, ...next }).filter(([name, value]) =>
                name in next ? value !== undefined : true,
            );
            options = Object.freeze(Object.fromEntries(merged));
        },
        get options(): ScopeStepOptions {
            return options;
        },
        allowRun(rule, stepId) {
            sources.stepRuns?.()?.allow(stepOf(rule, stepId), rule.within);
        },
        cancelRun(rule, stepId) {
            sources.stepRuns?.()?.cancel(stepOf(rule, stepId), rule.within);
        },
    };
}

/**
 * A short hash of some bytes.
 * @param bytes - The bytes.
 * @returns The hash.
 */
function hashBytes(bytes: Bytes): number {
    let hash = 0x811c9dc5;
    for (let index = 0; index < bytes.length; index++) {
        if (bytes[index] === 1) {
            hash = Math.imul(hash ^ index, 0x01000193) >>> 0;
        }
    }

    return hash;
}

/**
 * What changes when a reading changes: every count, state, reason and membership.
 * @param reading - The reading.
 * @param raw - The raw reading, whose members are hashed.
 * @returns The digest.
 */
function digestOf(reading: StepsReading, raw: UnionRead): string {
    return JSON.stringify([
        hashBytes(raw.total),
        raw.branches.map((branch) => [hashBytes(branch.members), branch.steps.map((step) => hashBytes(step.members))]),
        reading.total,
        reading.branches.map((branch) => [
            branch.state,
            branch.reason,
            branch.count,
            branch.steps.map((step) => [step.state, step.reason, step.count, step.orderMatters, step.run]),
        ]),
    ]);
}

/** What {@link valueHistogram} counts. */
export interface HistogramInput {
    /** How many elements the half has. */
    readonly count: number;
    /**
     * One element's value.
     * @param index - The element's dense index.
     * @returns The value.
     */
    read(index: number): unknown;
    /** The elements counted, or null for every one. */
    readonly within: Bytes | null;
    /** Whether the values are unstable names, so each value names a member. */
    readonly unstable: boolean;
    /**
     * A node's degree and id, for the member an unstable value names; absent on the edge half.
     * @param index - The node's dense index.
     * @returns Its degree and id.
     */
    readonly node?: (index: number) => { readonly degree: number; readonly id: NodeId };
    /**
     * Bins numbers as a run's field is binned.
     * @param column - The values, NaN where none.
     * @param options - The bin count and scale.
     * @returns The histogram.
     */
    bin(column: { readonly length: number; get(index: number): number }, options: HistogramOptions): Histogram;
}

/**
 * How one value is distributed over the elements counted: see {@link ValueHistogram}.
 * @param input - What to count.
 * @param options - The bins, the scale and the reading.
 * @returns The histogram.
 */
export function valueHistogram(input: HistogramInput, options: ValueHistogramOptions = {}): ValueHistogram {
    const indices: number[] = [];
    for (let index = 0; index < input.count; index++) {
        if (input.within === null || input.within[index] === 1) {
            indices.push(index);
        }
    }

    const values = indices.map((index) => input.read(index));
    const measured = (value: unknown): value is string | number | boolean =>
        (typeof value === "number" && Number.isFinite(value)) ||
        typeof value === "string" ||
        typeof value === "boolean";
    const missing = values.filter((value) => !measured(value)).length;
    const numeric =
        options.as === "numeric" ||
        (options.as === undefined &&
            !input.unstable &&
            values.every((value) => !measured(value) || typeof value === "number"));
    if (numeric) {
        const histogram = input.bin(
            { length: values.length, get: (at) => (typeof values[at] === "number" ? values[at] : Number.NaN) },
            options,
        );
        return Object.freeze({ ...histogram, kind: "numeric", missing, of: indices.length });
    }

    // Map keeps first-seen order, and the sort below is stable, so a tie keeps it too.
    const counts = new Map<string | number | boolean, { count: number; best?: { degree: number; id: NodeId } }>();
    values.forEach((value, at) => {
        if (!measured(value)) {
            return;
        }

        const entry = counts.get(value) ?? { count: 0 };
        entry.count++;
        const node = input.unstable ? input.node?.(indices[at]) : undefined;
        if (node !== undefined && (entry.best === undefined || node.degree > entry.best.degree)) {
            entry.best = node;
        }

        counts.set(value, entry);
    });

    return Object.freeze({
        kind: "categorical",
        values: Object.freeze(
            [...counts]
                .sort((a, b) => b[1].count - a[1].count)
                .map(([value, entry]) =>
                    Object.freeze({
                        value,
                        count: entry.count,
                        ...(entry.best === undefined ? {} : { member: entry.best.id }),
                    }),
                ),
        ),
        missing,
        of: indices.length,
    });
}
