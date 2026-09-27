/**
 * @file A set's status, derived on read (design/sets/sets-design.md sections 3.4, 5.2 and 5.3).
 *
 * Status is computed from what the definition reads (`./dependencies`), the runs and sets it
 * names, the captures its held items have, and the outcome the last pass over it recorded (the
 * summary in `./cache`). It never resolves, so a panel may ask for every row.
 *
 * | Found                                          | Freshness                    | Reason                  |
 * |------------------------------------------------|------------------------------|-------------------------|
 * | a named set or run that is gone                 | `detached`                   | `missing-set`, `missing-run` |
 * | a named set that is not current                 | as that set                  | `input`                 |
 * | a run whose declared inputs changed             | `out-of-date`                | `run-out-of-date`       |
 * | the same, its algorithm no longer registered    | `cannot-rerun`               | `missing-capability`    |
 * | a run's algorithm no longer registered          | (unchanged)                  | `missing-capability`    |
 * | a run that recorded another revision scheme     | (unchanged)                  | `revision-unknown`      |
 * | a held execution that is no longer current      | (unchanged); `earlierRuns`   | `values-not-kept` without a capture |
 * | a ring of references, an unknown kind, a rule that cannot compile | `unresolvable` | `cycle`, `missing-capability`, `invalid` |
 * | edge members two edges carry, at the last pass  | (unchanged)                  | `ambiguous-parallel-edge` |
 *
 * The worst freshness wins, in the order current, out-of-date, cannot-rerun, detached,
 * unresolvable.
 *
 * WHEN A RUN IS OUT OF DATE, for sets: only when a declared input changed. A run over a kept set is
 * out of date when the set's revision moved since the run recorded it (unknown, never "changed",
 * when the two revisions are of different scheme versions); a run over a frozen scope (`{ nodes }`,
 * `{ where }`, `{ define }`, `"graph"`, `"largest-component"`) when that scope's membership moved.
 * A change of `"visible"` or `"selection"` never counts: the run froze its scope when it started.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { inducedEdgeLeaf, speaksEdges } from "../../catalog/sets/parse";
import type { RunId, Scope, SetDefinition, SetId } from "../../catalog/types";
import { isGraphtyError } from "../../errors/GraphtyError";
import { type HeldCaptures, heldItems } from "./captures";
import { dependenciesOf, type DependencySources, referentReading, setCycle } from "./dependencies";
import { opaqueName } from "./prepare";
import type { Resolution } from "./resolve";
import type { ElementSet, SetStatus, SetStatusReason } from "./types";

type Freshness = SetStatus["freshness"];

/** Freshness from best to worst. */
const RANK: Readonly<Record<Freshness, number>> = { current: 0, "out-of-date": 1, "cannot-rerun": 2, detached: 3, unresolvable: 4 };

/** What status reads about one run. */
export interface StatusRun {
    readonly id: RunId;
    /** What the run is called now. */
    readonly label: string;
    readonly algorithm: string;
    /** Whether the algorithm is still registered, so the run could be re-run. */
    readonly registered: boolean;
    /** The token of the run's current result, or undefined while it has none. */
    readonly execution: string | undefined;
    /** What the run recorded about its scope when it ran. */
    readonly scope: { readonly spec: Scope; readonly set?: { readonly id: SetId; readonly revision: string } };
    /**
     * Whether the membership of the run's scope moved since it ran. Read only for a frozen scope.
     * @returns True when it moved.
     */
    scopeMoved(): boolean;
    /** The captures the run keeps for held items. */
    readonly captures: HeldCaptures;
}

/** What status reads. */
export interface StatusSources {
    /** The kept sets, their tombstones and the issued-id register. */
    readonly sets: {
        get(id: SetId): ElementSet | undefined;
        tombstone(id: SetId): { readonly name: string } | undefined;
    };
    /** Where references are looked up, for cycles, readings and a query's paths. */
    readonly dependencies: DependencySources;
    /**
     * One run. Absent: no run exists.
     * @param id - The run.
     * @returns The run, or undefined when there is none.
     */
    readonly run?: (id: RunId) => StatusRun | undefined;
    /**
     * What the last pass over a kept set found, when it resolved the set's current definition.
     * @param record - The set.
     * @returns The outcome, or undefined when no pass has.
     */
    readonly outcome?: (record: ElementSet) => { readonly problem?: Resolution["problem"]; readonly ambiguousEdges: number } | undefined;
}

/**
 * The version prefix of a revision: `r1` of `r1:<hex>`.
 * @param revision - The revision.
 * @returns The prefix.
 */
function schemeOf(revision: string): string {
    const colon = revision.indexOf(":");

    return colon === -1 ? revision : revision.slice(0, colon);
}

/**
 * Whether a run's declared inputs changed (see the file comment).
 * @param run - The run.
 * @param sets - The kept sets.
 * @param sets.get - One live set.
 * @returns `changed`, `unknown` (revisions of different schemes) or `same`.
 */
function runInputs(run: StatusRun, sets: { get(id: SetId): ElementSet | undefined }): "changed" | "unknown" | "same" {
    const recorded = run.scope.set;
    if (recorded !== undefined) {
        const live = sets.get(recorded.id);
        if (live === undefined) {
            return "same";
        }

        if (schemeOf(live.revision) !== schemeOf(recorded.revision)) {
            return "unknown";
        }

        return live.revision === recorded.revision ? "same" : "changed";
    }

    const { spec } = run.scope;
    if (spec === "visible" || spec === "selection" || (typeof spec === "object" && "set" in spec)) {
        return "same";
    }

    return run.scopeMoved() ? "changed" : "same";
}

/** Collects one status. */
class Builder {
    freshness: Freshness = "current";
    readonly reasons: SetStatusReason[] = [];
    readonly earlier = new Set<RunId>();
    private readonly keys = new Set<string>();

    worsen(freshness: Freshness): void {
        if (RANK[freshness] > RANK[this.freshness]) {
            this.freshness = freshness;
        }
    }

    reason(reason: SetStatusReason): void {
        const key = JSON.stringify(reason);
        if (!this.keys.has(key)) {
            this.keys.add(key);
            this.reasons.push(Object.freeze(reason));
        }
    }

    done(): SetStatus {
        return Object.freeze({ freshness: this.freshness, reasons: Object.freeze(this.reasons), earlierRuns: Object.freeze([...this.earlier]) });
    }
}

/**
 * The reason a pass's problem stands for.
 * @param problem - The error the pass carried.
 * @returns The reason.
 */
function reasonOfProblem(problem: NonNullable<Resolution["problem"]>): SetStatusReason {
    const details = (problem.details ?? {}) as { reason?: unknown; through?: unknown; needs?: unknown };
    if (details.reason === "cycle" && Array.isArray(details.through)) {
        return { kind: "cycle", through: details.through.map(String) };
    }

    if (problem.code === "E_UNSUPPORTED") {
        return { kind: "missing-capability", name: typeof details.needs === "string" ? details.needs : problem.message };
    }

    return { kind: "invalid", message: problem.message };
}

/** A status with nothing to report. */
const CURRENT: SetStatus = Object.freeze({ freshness: "current", reasons: Object.freeze([]), earlierRuns: Object.freeze([]) });

/**
 * Status of any scope: a kept set by `{ set }`, an inline definition, a query, or a keyword (always
 * current).
 * @param scope - The canonical scope.
 * @param sources - What status reads.
 * @returns The status.
 */
export function statusOf(scope: Scope, sources: StatusSources): SetStatus {
    return new StatusWalk(sources).scope(scope);
}

/** One status call: memoises each kept set's status so a chain of sets walks each once. */
class StatusWalk {
    private readonly memo = new Map<SetId, SetStatus>();
    private readonly entered = new Set<SetId>();

    constructor(private readonly sources: StatusSources) {}

    scope(scope: Scope): SetStatus {
        if (typeof scope !== "object") {
            return CURRENT;
        }

        if ("set" in scope) {
            return this.set(scope.set);
        }

        if ("define" in scope) {
            return this.definition(scope.define, undefined);
        }

        if ("where" in scope) {
            return this.definition({ kind: "rule", where: scope.where, reading: "induced" }, undefined);
        }

        return CURRENT;
    }

    /**
     * Status of a kept set by id; a removed one is detached.
     * @param id - The set.
     * @returns The status.
     */
    set(id: SetId): SetStatus {
        const known = this.memo.get(id);
        if (known !== undefined) {
            return known;
        }

        const record = this.sources.sets.get(id);
        let status: SetStatus;
        if (record === undefined) {
            const builder = new Builder();
            builder.worsen("detached");
            builder.reason({ kind: "missing-set", id, name: this.sources.sets.tombstone(id)?.name ?? id });
            status = builder.done();
        } else if (this.entered.has(id)) {
            // A ring: the set that closes it reports the cycle itself.
            return CURRENT;
        } else {
            this.entered.add(id);
            status = this.definition(record.definition, record);
            this.entered.delete(id);
        }

        this.memo.set(id, status);

        return status;
    }

    /**
     * Status of one definition.
     * @param definition - The canonical definition.
     * @param record - The kept set holding it, when it is kept.
     * @returns The status.
     */
    definition(definition: SetDefinition, record: ElementSet | undefined): SetStatus {
        const { sources } = this;
        const builder = new Builder();

        const opaque = opaqueName(definition);
        if (opaque !== null) {
            builder.worsen("unresolvable");
            builder.reason({ kind: "missing-capability", name: opaque });

            return builder.done();
        }

        let ring: ReadonlySet<string> = new Set();
        if (record !== undefined) {
            this.createdFrom(record, builder);
            const cycle = definition.kind === "rule" ? setCycle(record.id, definition, sources.dependencies) : null;
            if (cycle !== null) {
                builder.worsen("unresolvable");
                builder.reason({ kind: "cycle", through: cycle });
                ring = new Set(cycle);
            }
        }

        try {
            if (
                definition.kind === "rule" &&
                definition.reading === "induced" &&
                speaksEdges(definition.where, referentReading(sources.dependencies), sources.dependencies.fieldKinds)
            ) {
                builder.worsen("unresolvable");
                builder.reason({ kind: "invalid", message: inducedEdgeLeaf().message });
            }

            this.dependencies(definition, record, ring, builder);
        } catch (error) {
            // A query that does not compile: the pass would resolve it to nothing.
            if (!isGraphtyError(error)) {
                throw error;
            }

            builder.worsen("unresolvable");
            builder.reason({ kind: "invalid", message: error.message });
        }

        const outcome = record === undefined ? undefined : sources.outcome?.(record);
        if (outcome?.problem !== undefined && RANK[builder.freshness] < RANK.detached) {
            builder.worsen("unresolvable");
            builder.reason(reasonOfProblem(outcome.problem));
        }

        if (outcome !== undefined && outcome.ambiguousEdges > 0) {
            builder.reason({ kind: "ambiguous-parallel-edge", count: outcome.ambiguousEdges });
        }

        return builder.done();
    }

    /**
     * A set created from a result holds that execution: when the run has moved on, "Earlier run".
     * @param record - The set.
     * @param builder - Where the status is collected.
     */
    private createdFrom(record: ElementSet, builder: Builder): void {
        const from = record.createdFrom;
        if (from.kind !== "result") {
            return;
        }

        const run = this.sources.run?.(from.item.run);
        if (run !== undefined && from.item.execution !== undefined && run.execution !== from.item.execution) {
            builder.earlier.add(run.id);
        }
    }

    /**
     * Walk what a definition reads.
     * @param definition - The definition.
     * @param record - The kept set, when it is kept.
     * @param ring - The sets on the cycle this set is caught in, which report it themselves.
     * @param builder - Where the status is collected.
     */
    private dependencies(definition: SetDefinition, record: ElementSet | undefined, ring: ReadonlySet<string>, builder: Builder): void {
        const { sources } = this;
        for (const dependency of dependenciesOf(definition, sources.dependencies.pathsOf)) {
            if (dependency.kind === "set") {
                if (dependency.id === record?.id || ring.has(dependency.id)) {
                    continue;
                }

                const input = this.set(dependency.id);
                if (sources.sets.get(dependency.id) === undefined) {
                    // The referent itself is gone: this set is detached, not merely reading one.
                    for (const reason of input.reasons) {
                        builder.reason(reason);
                    }

                    builder.worsen("detached");
                } else if (input.freshness !== "current") {
                    builder.worsen(input.freshness);
                    builder.reason({ kind: "input", id: dependency.id, freshness: input.freshness });
                }

                continue;
            }

            if (dependency.kind !== "run") {
                continue;
            }

            const run = sources.run?.(dependency.run);
            if (run === undefined) {
                builder.worsen("detached");
                builder.reason({ kind: "missing-run", run: dependency.run });
                continue;
            }

            if (dependency.execution !== undefined && dependency.execution !== run.execution) {
                // An earlier execution's values are held, not recomputed: the run's own freshness
                // is not this reference's.
                builder.earlier.add(run.id);
                const keys = heldItems([definition], run.id).get(dependency.execution);
                const kept = run.captures.get(dependency.execution);
                for (const key of keys?.keys() ?? []) {
                    if (kept?.has(key) !== true) {
                        builder.reason({ kind: "values-not-kept", run: run.id });
                    }
                }

                continue;
            }

            const inputs = runInputs(run, sources.sets);
            if (!run.registered) {
                builder.reason({ kind: "missing-capability", name: run.algorithm });
                if (inputs === "changed") {
                    builder.worsen("cannot-rerun");
                }
            } else if (inputs === "changed") {
                builder.worsen("out-of-date");
                builder.reason({ kind: "run-out-of-date", run: run.id });
            }

            if (inputs === "unknown") {
                builder.reason({ kind: "revision-unknown", run: run.id });
            }
        }
    }
}

