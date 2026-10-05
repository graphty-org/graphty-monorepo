/**
 * @file Input signatures: a string built only from what one definition reads, so a resolution is
 * served again exactly while none of those inputs moved (design/sets/sets-design.md sections 5.2
 * and 6.2).
 *
 * A signature is `<store>|<serial>|<parts>`. The store and the snapshot serial are in every one.
 * The parts name the other inputs the definition reads, and nothing else:
 *
 * - `"visible"` and `"selection"`: the mask objects and their versions;
 * - `{ where }` and a rule over a query: the attribute revision of every top-level field its
 *   compiled paths read, and the execution token of every run whose results they read;
 * - `{ set }`: the identity of the saved record it names, or an explicit absent marker, and the
 *   parts of what that record holds, recursively;
 * - a kept fixed or path set with edge members: the identity and version of its seeds.
 *
 * Records and definitions are frozen and replaced on every write, so their identity is exact: a
 * rename keeps the definition object and moves nothing, an undo that restores the identical
 * record matches again.
 *
 * A definition whose inputs the context cannot enumerate (a query with no path reader, say) has
 * no signature: `null`, and it is never cached.
 *
 * Signatures are memoised per read epoch -- the store, the serial, the session input tick and
 * the identity of the saved-scope map and the kept-set list -- so a chain of sets naming one
 * base walks the base once. Without a tick the context cannot tell when an attribute or a token
 * moved, so nothing is memoised.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { runIdOfRef } from "../../catalog/sets/canonical";
import type { Query, RuleTree, Scope, ScopeId, SetDefinition, SetId } from "../../catalog/types";
import { dependencyOf } from "./dependencies";
import type { EdgeSeeds, ResolveContext } from "./resolve";

/**
 * The definition of the kept set an id names, when the context holds one: the live set's, else
 * the removed set's kept record, so a reference to a removed set reads what it read before the
 * removal (design/sets 15.3, item 33).
 * @param id - The id.
 * @param context - What the resolution reads.
 * @returns The definition, or undefined.
 */
export function keptDefinition(id: SetId, context: ResolveContext): SetDefinition | undefined {
    return (
        (context.sets?.get(id) as { readonly definition?: SetDefinition } | undefined)?.definition ??
        context.sets?.tombstone?.(id)?.record?.definition
    );
}

/** Invocation counts the complexity tests read. `walks`: saved-scope and kept-set parts computed, not memoised. */
export const signatureCounters = { walks: 0 };

const identities = new WeakMap<object, number>();
let nextIdentity = 1;

/**
 * A small number standing for an object's identity, stable for the object's life.
 * @param value - The object.
 * @returns Its number.
 */
export function identityOf(value: object): number {
    let id = identities.get(value);
    if (id === undefined) {
        id = nextIdentity++;
        identities.set(value, id);
    }

    return id;
}

/** One read epoch's memo: signature parts by set id or target key. */
export interface SignatureMemo {
    epoch: string;
    readonly parts: Map<unknown, string | null>;
}

/**
 * A fresh memo.
 * @returns It.
 */
export function createSignatureMemo(): SignatureMemo {
    return { epoch: "", parts: new Map() };
}

/**
 * The store a resolution is tagged with: the context's, or the snapshot itself when it names none.
 * @param context - What the resolution reads.
 * @returns The object.
 */
function storeOf(context: ResolveContext): object {
    return context.store ?? context.snapshot;
}

/**
 * The memo valid for the context's epoch, cleared when the epoch moved; null without a tick.
 * @param context - What the resolution reads.
 * @param memo - The memo to use.
 * @returns The memo's part map, or null.
 */
function partsFor(context: ResolveContext, memo: SignatureMemo | undefined): Map<unknown, string | null> | null {
    if (memo === undefined || context.tick === undefined) {
        return null;
    }

    const epoch = [
        identityOf(storeOf(context)),
        context.snapshot.serial,
        context.tick.value,
        context.saved === undefined ? 0 : identityOf(context.saved),
        context.sets === undefined ? 0 : identityOf(context.sets.list()),
    ].join(":");
    if (memo.epoch !== epoch) {
        memo.epoch = epoch;
        memo.parts.clear();
    }

    return memo.parts;
}

/**
 * The part of a query: what each path it reads stands at now.
 * @param where - The query.
 * @param context - What the resolution reads.
 * @param revisions - The attribute revisions its fields are read from: the nodes', unless it is an
 *     edge query.
 * @returns The part, or null when the context cannot say what the query reads.
 */
function queryPart(where: Query, context: ResolveContext, revisions = context.revisions): string | null {
    const { pathsOf, executionOf } = context;
    if (pathsOf === undefined) {
        return null;
    }

    const parts = ["w"];
    for (const path of new Set(pathsOf(where))) {
        const dependency = dependencyOf(path);
        if ("run" in dependency) {
            if (executionOf === undefined) {
                return null;
            }

            parts.push(`r${JSON.stringify(dependency.run)}=${executionOf(dependency.run) ?? "-"}`);
        } else {
            if (revisions === undefined) {
                return null;
            }

            parts.push(`a${JSON.stringify(dependency.field)}=${revisions.of(dependency.field)}`);
        }
    }

    return parts.join(",");
}

/**
 * The part of one `Scope`.
 * @param scope - The specification.
 * @param context - What the resolution reads.
 * @param parts - The epoch memo, or null.
 * @param seen - The saved ids followed so far.
 * @returns The part, or null when it cannot be enumerated.
 */
function scopePart(
    scope: Scope,
    context: ResolveContext,
    parts: Map<unknown, string | null> | null,
    seen: Set<ScopeId>,
): string | null {
    switch (scope) {
        case "graph":
            return "g";
        case "largest-component":
            // Topology: the serial says it all.
            return "lc";
        case "visible": {
            const { visibility } = context;
            if (visibility === undefined) {
                return "g";
            }

            const nodes = visibility.nodes();
            const edges = visibility.edges();

            return `v${identityOf(nodes)}.${nodes.version}.${identityOf(edges)}.${edges.version}`;
        }

        case "selection": {
            const mask = context.selection?.nodes();

            return mask === undefined ? "sel-" : `sel${identityOf(mask)}.${mask.version}`;
        }

        default:
            break;
    }

    if ("nodes" in scope) {
        // The ids are in the key; what they bind is the serial's.
        return "n";
    }

    if ("where" in scope) {
        return queryPart(scope.where, context);
    }

    if ("define" in scope) {
        // The definition is in the key; what it reads is the part.
        return contentPart(scope.define, context, parts, seen);
    }

    return savedPart(scope.set, context, parts, seen);
}

/**
 * The part of what an inline definition reads, beyond its own content (which is in the key).
 * @param definition - The definition.
 * @param context - What the resolution reads.
 * @param parts - The epoch memo, or null.
 * @param seen - The ids followed so far.
 * @returns The part, or null.
 */
function contentPart(
    definition: SetDefinition,
    context: ResolveContext,
    parts: Map<unknown, string | null> | null,
    seen: Set<ScopeId>,
): string | null {
    switch (definition.kind) {
        case "fixed":
        case "path":
            return "d";
        case "rule":
            return rulePart(definition.where, context, parts, seen);
        default:
            return "x";
    }
}

/**
 * The part of a rule's `where`: a query's paths, or each leaf's inputs in tree order.
 * @param where - The query or tree.
 * @param context - What the resolution reads.
 * @param parts - The epoch memo, or null.
 * @param seen - The ids followed so far.
 * @returns The part, or null when some leaf's inputs cannot be enumerated.
 */
function rulePart(
    where: Query | RuleTree,
    context: ResolveContext,
    parts: Map<unknown, string | null> | null,
    seen: Set<ScopeId>,
): string | null {
    if (typeof where === "string") {
        return queryPart(where, context);
    }

    const loose = where as { readonly kind: string };
    switch (where.kind) {
        case "expression":
            return queryPart(where.where, context);
        case "edges": {
            const part =
                context.edgeRevisions === undefined ? null : queryPart(where.where, context, context.edgeRevisions);
            return part === null ? null : `e${part}`;
        }
        case "range":
        case "categories": {
            const dependency = dependencyOf(where.attribute);
            if ("run" in dependency) {
                const token = context.executionOf?.(dependency.run);
                return context.executionOf === undefined ? null : `r${JSON.stringify(dependency.run)}=${token ?? "-"}`;
            }

            return context.revisions === undefined
                ? null
                : `a${JSON.stringify(dependency.field)}=${context.revisions.of(dependency.field)}`;
        }
        case "item": {
            // Follow or hold, the members move exactly when the run's current execution does.
            const run = String(runIdOfRef(where.item.result));
            return context.executionOf === undefined
                ? null
                : `r${JSON.stringify(run)}=${context.executionOf(run) ?? "-"}`;
        }
        case "threshold": {
            const dependency = dependencyOf(where.path);
            if ("run" in dependency) {
                return context.executionOf === undefined
                    ? null
                    : `r${JSON.stringify(dependency.run)}=${context.executionOf(dependency.run) ?? "-"}`;
            }

            // A data threshold ranks whichever half carries the field: both revisions key it.
            const { revisions, edgeRevisions } = context;
            return revisions === undefined || edgeRevisions === undefined
                ? null
                : `a${JSON.stringify(dependency.field)}=${revisions.of(dependency.field)}.${edgeRevisions.of(dependency.field)}`;
        }
        case "degree":
        case "component":
        case "neighborhood":
        case "isolated":
        case "self-loop":
        case "repeated-edge":
            // Topology and ids: the serial and the key say it all.
            return "t";
        case "member": {
            const part = scopePart(where.of, context, parts, seen);
            return part === null ? null : `(${part})`;
        }
        case "all":
        case "any":
        case "not": {
            const operands = where.kind === "not" ? [where.of] : where.of;
            const inner: string[] = [];
            for (const operand of operands) {
                const part = rulePart(operand, context, parts, seen);
                if (part === null) {
                    return null;
                }

                inner.push(part);
            }

            return `${where.kind}[${inner.join(";")}]`;
        }
        default:
            // An unknown leaf makes its definition opaque, which resolves to nothing.
            return `x${loose.kind}`;
    }
}

/**
 * The part of a named saved scope: its record's identity, or the absent marker, and its content.
 * @param id - The saved id.
 * @param context - What the resolution reads.
 * @param parts - The epoch memo, or null.
 * @param seen - The saved ids followed so far.
 * @returns The part, or null.
 */
function savedPart(
    id: ScopeId,
    context: ResolveContext,
    parts: Map<unknown, string | null> | null,
    seen: Set<ScopeId>,
): string | null {
    const key = `saved:${id}`;
    if (parts?.has(key) === true) {
        return parts.get(key) ?? null;
    }

    let part: string | null;
    const record = context.saved?.get(id);
    const definitionOf = record === undefined ? keptDefinition(id, context) : undefined;
    const kept = definitionOf === undefined ? undefined : { definition: definitionOf };
    if (kept !== undefined) {
        // A kept set named by `{ set }`: keyed by its definition's identity, so a rename hits.
        if (seen.has(id)) {
            // A ring resolves to nothing; nothing about it can move without a set write.
            return `k${JSON.stringify(id)}@`;
        }

        signatureCounters.walks++;
        const { definition } = kept as { readonly definition: SetDefinition };
        seen.add(id);
        const inner = definitionPart(id, definition, context, parts, seen);
        seen.delete(id);
        part = inner === null ? null : `k${JSON.stringify(id)}#${identityOf(definition)}(${inner})`;
    } else if (record === undefined) {
        part = `s${JSON.stringify(id)}!`;
    } else if (seen.has(id)) {
        // A ring resolves to a refusal; nothing about it can move without a saved write.
        return `s${JSON.stringify(id)}@`;
    } else {
        signatureCounters.walks++;
        seen.add(id);
        const inner = scopePart(record.spec, context, parts, seen);
        seen.delete(id);
        part = inner === null ? null : `s${JSON.stringify(id)}#${identityOf(record)}(${inner})`;
    }

    parts?.set(key, part);

    return part;
}

/**
 * The input signature of one `Scope`.
 * @param scope - The specification.
 * @param context - What the resolution reads.
 * @param memo - The epoch memo, when the caller keeps one.
 * @returns The signature, or null when the scope must not be cached.
 */
export function scopeSignature(scope: Scope, context: ResolveContext, memo?: SignatureMemo): string | null {
    const part = scopePart(scope, context, partsFor(context, memo), new Set());

    return part === null ? null : `${identityOf(storeOf(context))}|${context.snapshot.serial}|${part}`;
}

/**
 * The seeds part of a set with edge members.
 * @param seeds - The set's seeds, if any.
 * @returns The part.
 */
function seedsPart(seeds: EdgeSeeds | undefined): string {
    return seeds === undefined ? "-" : `${identityOf(seeds)}.${seeds.version}`;
}

/**
 * The part of a kept set's definition.
 * @param id - The set's id, which its seeds are filed under.
 * @param definition - Its frozen definition.
 * @param context - What the resolution reads.
 * @param parts - The epoch memo, or null.
 * @param seen - The ids followed so far, this one included.
 * @returns The part, or null.
 */
function definitionPart(
    id: SetId,
    definition: SetDefinition,
    context: ResolveContext,
    parts: Map<unknown, string | null> | null,
    seen: Set<ScopeId>,
): string | null {
    switch (definition.kind) {
        case "fixed":
            // `in`, not a read: reading `edges` would materialise a fixed set's compact members.
            return "edges" in definition ? `f${seedsPart(context.sets?.seedsOf(id))}` : "f";
        case "path":
            return `p${seedsPart(context.sets?.seedsOf(id))}`;
        case "rule":
            return rulePart(definition.where, context, parts, seen);
        default:
            // Opaque: resolves to nothing, which only the serial can move.
            return "x";
    }
}

/**
 * The input signature of a kept set's definition.
 * @param id - The set's id, which its seeds are filed under.
 * @param definition - Its frozen definition.
 * @param context - What the resolution reads.
 * @param memo - The epoch memo, when the caller keeps one.
 * @returns The signature, or null when it must not be cached.
 */
export function definitionSignature(
    id: SetId,
    definition: SetDefinition,
    context: ResolveContext,
    memo?: SignatureMemo,
): string | null {
    const parts = partsFor(context, memo);
    const key = `set:${id}:${identityOf(definition)}`;
    let part: string | null | undefined = parts?.get(key);
    if (part === undefined && parts?.has(key) !== true) {
        signatureCounters.walks++;
        part = definitionPart(id, definition, context, parts, new Set([id]));
        parts?.set(key, part);
    }

    return part === null || part === undefined
        ? null
        : `${identityOf(storeOf(context))}|${context.snapshot.serial}|${part}`;
}
