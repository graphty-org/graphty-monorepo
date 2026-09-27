/**
 * @file What a definition depends on, and whether a chain of references loops
 * (design/sets/sets-design.md sections 4.3 and 5.2).
 *
 * Dependencies are DERIVED from a definition, never stored. The walk:
 *
 * | Found                                                   | Dependency                          |
 * |---------------------------------------------------------|-------------------------------------|
 * | a `member` leaf `{ set: id }`                            | that set (follows it)               |
 * | a `member` leaf `"visible"`, `"selection"`, `"search"`   | the visibility filter, the selection, the search |
 * | a `member` leaf `"largest-component"`; `component`, `degree`, `neighborhood` | topology (the snapshot) |
 * | a path `results.<run>.<field>` a query or `threshold` reads | that run (follows its current execution) |
 * | an `item` leaf without `run`                            | that result (follows its current run) |
 * | an `item` leaf with `run`                               | that run of the result (holds it)   |
 * | any other path a query, `range`, `categories` or `threshold` reads | that top-level attribute field |
 *
 * A query's paths come from the compiled expression, which has no projections or wildcards, so
 * every path is static. The visibility filter and the selection are nodes of this graph: that is
 * what lets a door refuse a filter that reads `"visible"` through a kept set, and a set that
 * reaches itself through the filter.
 *
 * The walk reads definitions this element could not validate (a loaded record holding an unknown
 * leaf) as far as it can: a reference it recognises inside one still counts, so a stored set naming
 * `"search"` is still caught.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { runIdOfRef } from "../../catalog/sets/canonical";
import { readingOfScope } from "../../catalog/sets/parse";
import type { Path, Query, ResultItem, RuleTree, RunId, Scope, SetDefinition, SetId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";

/** One thing a definition reads. */
type Dependency =
    | { readonly kind: "set"; readonly id: SetId }
    | { readonly kind: "visible" }
    | { readonly kind: "selection" }
    | { readonly kind: "search" }
    | { readonly kind: "topology" }
    /** `execution` present: the reference holds that execution; absent: it follows the run. */
    | { readonly kind: "run"; readonly run: RunId; readonly execution?: string }
    | { readonly kind: "attribute"; readonly field: string };

/** A step of a reference chain: a set id, or one of the live keywords `"visible"`, `"selection"`, `"search"`. */
export type ChainStep = string;

/** Where the walk reads what a reference names. */
export interface DependencySources {
    /**
     * What a `{ set: id }` names: a kept set's definition or a saved scope's specification.
     * @param id - The id.
     * @returns The definition or scope, or undefined when nothing holds the id.
     */
    readonly referent: (id: SetId) => SetDefinition | Scope | undefined;
    /**
     * The visibility filter in force, which is what `"visible"` depends on.
     * @returns The filter, or null.
     */
    readonly visibility?: () => RuleTree | null;
    /**
     * The paths a query's compiled expression reads. Absent: a query's paths are not listed.
     * @param where - The query.
     * @returns The paths.
     */
    readonly pathsOf?: (where: Query) => readonly Path[];
    /**
     * The shape of a run's current result, which says whether an item's field is a partition
     * group. Absent, or undefined for a run: nothing is known, and nothing is refused on it.
     * @param run - The run.
     * @returns The result shape.
     */
    readonly shapeOf?: (run: RunId) => string | undefined;
    /**
     * Which halves carry a value path, `results.<run>.<field>` or `data.<field>`, so a rule read
     * `induced` over an edge field is refused. Absent: nothing is known.
     * @param path - The path.
     * @returns `"node"`, `"edge"` or both.
     */
    readonly fieldKinds?: (path: Path) => readonly string[];
}

type Loose = Readonly<Record<string, unknown>>;

/**
 * Whether a value is a plain object.
 * @param value - Any value.
 * @returns True for an object that is not an array.
 */
function isObject(value: unknown): value is Loose {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * What one path reads: a run's results, or a top-level attribute field.
 * @param path - The path.
 * @returns The run or the field.
 */
export function dependencyOf(path: Path): { run: RunId } | { field: string } {
    if (path.startsWith("results.")) {
        const dot = path.indexOf(".", "results.".length);
        return { run: path.slice("results.".length, dot === -1 ? undefined : dot) };
    }

    const key = path.startsWith("data.") ? path.slice("data.".length) : path;
    const dot = key.indexOf(".");

    return { field: dot === -1 ? key : key.slice(0, dot) };
}

/** Collects dependencies, one of each. */
class Collector {
    readonly found: Dependency[] = [];
    private readonly keys = new Set<string>();

    constructor(private readonly pathsOf: DependencySources["pathsOf"]) {}

    add(dependency: Dependency): void {
        const key = JSON.stringify(dependency);
        if (!this.keys.has(key)) {
            this.keys.add(key);
            this.found.push(dependency);
        }
    }

    path(path: unknown): void {
        if (typeof path === "string") {
            const read = dependencyOf(path);
            this.add("run" in read ? { kind: "run", run: read.run } : { kind: "attribute", field: read.field });
        }
    }

    query(where: unknown): void {
        if (typeof where === "string" && this.pathsOf !== undefined) {
            for (const path of this.pathsOf(where)) {
                this.path(path);
            }
        }
    }

    scope(scope: unknown): void {
        switch (scope) {
            case "visible":
            case "selection":
            case "search":
                this.add({ kind: scope });
                return;
            case "largest-component":
                this.add({ kind: "topology" });
                return;
            default:
                break;
        }

        if (!isObject(scope)) {
            return;
        }

        if (typeof scope.set === "string") {
            this.add({ kind: "set", id: scope.set });
        } else if (scope.where !== undefined) {
            this.query(scope.where);
        } else if (scope.define !== undefined) {
            this.definition(scope.define);
        }
    }

    tree(node: unknown): void {
        if (!isObject(node)) {
            this.query(node);
            return;
        }

        switch (node.kind) {
            case "expression":
            case "edges":
                this.query(node.where);
                return;
            case "range":
            case "categories":
                this.path(node.attribute);
                return;
            case "degree":
            case "component":
            case "neighborhood":
                this.add({ kind: "topology" });
                return;
            case "member":
                this.scope(node.of);
                return;
            case "item":
                if (isObject(node.item)) {
                    const run = runIdOfRef(node.item.result);
                    if (typeof run === "string") {
                        const execution = node.item.run;
                        this.add(
                            typeof execution === "string" ? { kind: "run", run, execution } : { kind: "run", run },
                        );
                    }
                }

                return;
            case "threshold":
                this.path(node.path);
                return;
            case "all":
            case "any":
                if (Array.isArray(node.of)) {
                    for (const operand of node.of) {
                        this.tree(operand);
                    }
                }

                return;
            case "not":
                this.tree(node.of);
                return;
            default:
        }
    }

    definition(definition: unknown): void {
        if (isObject(definition) && definition.kind === "rule") {
            this.tree(definition.where);
        }
    }
}

/**
 * What one definition, scope or rule tree reads directly, one of each, in the order met.
 * @param value - A set definition, a scope, or a rule tree (the visibility filter).
 * @param pathsOf - The paths a query reads; absent, queries list nothing.
 * @returns The dependencies.
 */
export function dependenciesOf(
    value: SetDefinition | Scope | RuleTree,
    pathsOf?: (where: Query) => readonly Path[],
): readonly Dependency[] {
    const collector = new Collector(pathsOf);
    const loose: unknown = value;
    if (isObject(loose) && (loose.kind === "rule" || loose.kind === "fixed" || loose.kind === "path")) {
        collector.definition(value);
    } else if (isObject(loose) && typeof loose.kind === "string") {
        collector.tree(value);
    } else {
        collector.scope(value);
    }

    return collector.found;
}

/**
 * The first chain of references from a value to a dependency the target accepts, depth first.
 * `{ set }` references are followed into what they name; `"visible"` is followed into the
 * visibility filter only when `throughVisible` is set. Each set is entered once, so a ring the walk
 * meets on the way terminates it instead of looping.
 * @param from - Where to start: a definition, a scope, or a rule tree.
 * @param target - Whether a dependency ends the search.
 * @param sources - Where references are looked up.
 * @param throughVisible - Whether `"visible"` leads into the visibility filter's own dependencies.
 * @returns The steps followed, ending with the one the target accepted, or null when none is reached.
 */
function findChain(
    from: SetDefinition | Scope | RuleTree,
    target: (dependency: Dependency) => boolean,
    sources: DependencySources,
    throughVisible: boolean,
): ChainStep[] | null {
    const entered = new Set<string>();

    const walk = (value: SetDefinition | Scope | RuleTree, chain: readonly ChainStep[]): ChainStep[] | null => {
        for (const dependency of dependenciesOf(value, sources.pathsOf)) {
            if (
                dependency.kind !== "set" &&
                dependency.kind !== "visible" &&
                dependency.kind !== "selection" &&
                dependency.kind !== "search"
            ) {
                continue;
            }

            const step: ChainStep = dependency.kind === "set" ? dependency.id : dependency.kind;
            if (target(dependency)) {
                return [...chain, step];
            }

            const key = dependency.kind === "set" ? `s${dependency.id}` : dependency.kind;
            if (entered.has(key)) {
                continue;
            }

            entered.add(key);
            let next: SetDefinition | Scope | RuleTree | null | undefined;
            if (dependency.kind === "set") {
                next = sources.referent(dependency.id);
            } else if (dependency.kind === "visible" && throughVisible) {
                next = sources.visibility?.();
            }

            const found = next === undefined || next === null ? null : walk(next, [...chain, step]);
            if (found !== null) {
                return found;
            }
        }

        return null;
    };

    return walk(from, []);
}

/**
 * The chain by which a definition written to set `id` would reach `id` itself, through `scope`
 * leaves, saved scopes and the visibility filter.
 * @param id - The set being written.
 * @param definition - Its new definition.
 * @param sources - Where references are looked up.
 * @returns The chain, ending with `id`, or null when there is no cycle.
 */
export function setCycle(id: SetId, definition: SetDefinition, sources: DependencySources): ChainStep[] | null {
    return findChain(definition, (dependency) => dependency.kind === "set" && dependency.id === id, sources, true);
}

/**
 * The chain by which a visibility filter would read `"visible"` or `"search"`: what it computes.
 * @param filter - The filter, or a scope inside one.
 * @param sources - Where references are looked up.
 * @returns The chain, ending with `"visible"` or `"search"`, or null.
 */
export function visibilityCycle(filter: RuleTree | Scope, sources: DependencySources): ChainStep[] | null {
    return findChain(
        filter,
        (dependency) => dependency.kind === "visible" || dependency.kind === "search",
        sources,
        false,
    );
}

/**
 * The chain by which a kept rule would read the live selection. Not followed through
 * `"visible"`: a set may follow the visible graph whatever the filter reads.
 * @param definition - The definition.
 * @param sources - Where references are looked up.
 * @returns The chain, ending with `"selection"`, or null.
 */
export function selectionChain(definition: SetDefinition, sources: DependencySources): ChainStep[] | null {
    return findChain(definition, (dependency) => dependency.kind === "selection", sources, false);
}

/**
 * How the set an id names reads, following saved scopes; undefined when nothing holds the id or
 * the chain loops.
 * @param sources - Where references are looked up.
 * @returns The lookup.
 */
export function referentReading(sources: DependencySources): (id: SetId) => string | undefined {
    const followed = new Set<SetId>();
    const reading = (id: SetId): string | undefined => {
        if (followed.has(id)) {
            return undefined;
        }

        followed.add(id);
        const referent: unknown = sources.referent(id);
        if (referent === undefined) {
            return undefined;
        }

        const isDefinition = isObject(referent) && typeof referent.kind === "string";

        return readingOfScope(isDefinition ? { define: referent } : referent, reading);
    };

    return reading;
}

/**
 * The first `item` leaf that follows a partition group across re-runs (the `group` field of a
 * `community` result), in the value itself and the definitions it carries inline. A group number
 * means nothing across re-runs, so such an item must hold its execution.
 * @param value - A definition, a scope, or a rule tree.
 * @param sources - Where a run's result shape is read; without `shapeOf` nothing is found.
 * @returns The item, or null.
 */
export function followedGroup(value: SetDefinition | Scope | RuleTree, sources: DependencySources): ResultItem | null {
    const { shapeOf } = sources;
    if (shapeOf === undefined) {
        return null;
    }

    const walk = (node: unknown): ResultItem | null => {
        if (!isObject(node)) {
            return null;
        }

        if (node.kind === "item" && isObject(node.item) && node.item.run === undefined && isObject(node.item.key)) {
            const run = runIdOfRef(node.item.result);
            const isGroup = node.item.key.field === "group" && typeof run === "string" && shapeOf(run) === "community";

            return isGroup ? (node.item as unknown as ResultItem) : null;
        }

        const children: unknown[] = [];
        if (node.kind === "rule") {
            children.push(node.where);
        } else if (node.kind === "all" || node.kind === "any") {
            children.push(...(Array.isArray(node.of) ? node.of : []));
        } else if (node.kind === "not") {
            children.push(node.of);
        } else if (node.kind === "member") {
            children.push(node.of);
        } else if (node.define !== undefined) {
            children.push(node.define);
        }

        for (const child of children) {
            const found = walk(child);
            if (found !== null) {
                return found;
            }
        }

        return null;
    };

    return walk(value);
}

/**
 * The refusal of an item that follows a partition group.
 * @param item - The item.
 * @returns The error to throw.
 */
export function followsGroup(item: ResultItem): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message:
            `Group ${String(item.key.value)} of run "${String(runIdOfRef(item.result))}" is a partition group, and a group number means ` +
            "nothing after a re-run. Hold this run (give the item its run) or create a set from its current members.",
        source: "data",
        details: { reason: "follow-group", item },
    });
}

/**
 * Refuse a value that names a set id never issued in this session, at a write door. A removed
 * set's id was issued, so it is accepted and reads as detached; only a typo, or an id from
 * another session, is refused -- which would otherwise hide everything in a filter or paint
 * nothing in a layer without a word.
 * @param value - A set definition, a scope, a rule tree, or a selector's scope.
 * @param ids - Which ids exist: the live records, and every id ever issued.
 * @param ids.get - A live record by id.
 * @param ids.register - Every id ever issued and committed.
 * @param self - The id being written, which a definition may not name but is not unknown.
 * @throws `E_BAD_COMMAND` with `details.reason` `"unknown-set"`.
 */
export function assertIssued(
    value: SetDefinition | Scope | RuleTree,
    ids: { get(id: SetId): unknown; register(): ReadonlySet<SetId> },
    self?: SetId,
): void {
    for (const dependency of dependenciesOf(value)) {
        if (
            dependency.kind === "set" &&
            dependency.id !== self &&
            ids.get(dependency.id) === undefined &&
            !ids.register().has(dependency.id)
        ) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `No set has the id "${dependency.id}". A set id is the one session.sets.create returned.`,
                source: "data",
                target: { kind: "scope", id: dependency.id },
                details: { id: dependency.id, reason: "unknown-set" },
            });
        }
    }
}
